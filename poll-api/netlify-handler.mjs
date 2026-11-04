// Platform-agnostic poll handler used by Netlify Functions.
// All public vote totals are calculated from committed SQL ballots.
import { currentPoll, calculateResults } from "./worker.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function voterHash(pollId, voterId) {
  // v4 UUID values are unpredictable (~122 random bits). Store only one-way hashes.
  // There is no plaintext voter ID, account, name or email in the ballot table.
  const data = new TextEncoder().encode(pollId + ":" + voterId);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
}
function reply(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers:{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer"
  }});
}

export function makePollHandler(getDatabase) {
  return async function pollHandler(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return reply({error:"Wrong origin"},403);
    if (!["GET","POST"].includes(request.method)) return reply({error:"Method not allowed"},405);
    const poll = currentPoll();
    let db;
    try { db = getDatabase(); }
    catch { return reply({error:"Database not configured"},503); }
    if (!db || typeof db.sql !== "function") return reply({error:"Database unavailable"},503);

    try {
      if (request.method === "GET") {
        const id = request.headers.get("X-Colomigo-Voter");
        let votedChoice = null;
        if (id && UUID.test(id)) {
          const hash = await voterHash(poll.id,id);
          const existing = await db.sql`
            SELECT choice_id FROM poll_votes
            WHERE poll_id = ${poll.id} AND voter_hash = ${hash} LIMIT 1
          `;
          votedChoice = existing[0]?.choice_id || null;
        }
        let results = null;
        if (votedChoice) {
          const counts = await db.sql`
            SELECT choice_id, COUNT(*)::int AS votes FROM poll_votes
            WHERE poll_id = ${poll.id} GROUP BY choice_id
          `;
          results = calculateResults(poll.options, counts);
        }
        return reply({poll,votedChoice,results});
      }

      const length=Number(request.headers.get("Content-Length")||0);
      if (length > 2048) return reply({error:"Request too large"},413);
      const raw=await request.text();
      if(raw.length>2048) return reply({error:"Request too large"},413);
      let body;
      try {body=JSON.parse(raw);} catch {return reply({error:"Invalid JSON"},400);}
      if(!body || typeof body!=="object" || Array.isArray(body)) return reply({error:"Invalid vote"},400);
      if(body.pollId!==poll.id) return reply({error:"This poll has rotated. Refresh to see the new question."},409);
      if(typeof body.voterId!=="string" || !UUID.test(body.voterId) ||
         !poll.options.some(option => option.id===body.choiceId)) {
        return reply({error:"Invalid ballot"},400);
      }

      const hash=await voterHash(poll.id,body.voterId);
      // Atomic UPSERT: one browser ID per cycle, even under simultaneous requests.
      await db.sql`
        INSERT INTO poll_votes (poll_id,voter_hash,choice_id)
        VALUES (${poll.id}, ${hash}, ${body.choiceId})
        ON CONFLICT (poll_id,voter_hash)
        DO UPDATE SET choice_id = EXCLUDED.choice_id, updated_at=NOW()
      `;
      const counts=await db.sql`
        SELECT choice_id, COUNT(*)::int AS votes FROM poll_votes
        WHERE poll_id = ${poll.id} GROUP BY choice_id
      `;
      return reply({poll,votedChoice:body.choiceId,results:calculateResults(poll.options,counts)});
    } catch (error) {
      console.error("poll query failed",error?.name||"unknown");
      return reply({error:"Voting is temporarily unavailable"},503);
    }
  };
}
