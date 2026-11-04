// Colo-Migo shared poll API — Cloudflare Worker with D1 transactional ballots.
// Anonymous, browser-scoped voting: each browser ID can hold one ballot per 21-day issue.
// No voter identifier is stored in plaintext; only a keyed HMAC digest is persisted.

const ANCHOR_UTC = Date.UTC(2026, 10, 3);
const CYCLE_MS = 21 * 24 * 60 * 60 * 1000;

const POLLS = [
  {
    key: "constraints",
    question: "What is your biggest constraint in a colocation decision?",
    options: [
      { id: "power", label: "Available power", tipTitle: "Verify power, not promises.", tip: "Ask for energized capacity, available kW, redundancy and supported delivery dates." },
      { id: "contract", label: "Contract flexibility", tipTitle: "Know the entire term.", tip: "Compare renewal notice dates, escalators, exit provisions and one-time versus recurring charges." },
      { id: "network", label: "Connectivity options", tipTitle: "Map the network ecosystem.", tip: "Validate required carriers, diverse paths, cross-connect availability and recurring costs." },
      { id: "timing", label: "Deployment timing", tipTitle: "Build a milestone plan.", tip: "Separate power provisioning, facility readiness, carrier turn-up, testing and approvals." }
    ]
  },
  {
    key: "workloads",
    question: "What workload is shaping your next capacity decision?",
    options: [
      { id: "ai", label: "AI / GPU workloads", tipTitle: "Start with density.", tip: "Validate kW per rack, cooling design and facility readiness before comparing prices." },
      { id: "enterprise", label: "Core enterprise applications", tipTitle: "Design for resilience.", tip: "Confirm redundancy, support coverage and recovery requirements." },
      { id: "recovery", label: "Disaster recovery", tipTitle: "Test the recovery path.", tip: "Review geographic separation, network diversity and recovery time requirements." },
      { id: "edge", label: "Edge / latency-sensitive workloads", tipTitle: "Measure the network path.", tip: "Compare carrier options, interconnection costs and proximity to users." }
    ]
  },
  {
    key: "horizon",
    question: "When will you next reassess your colocation?",
    options: [
      { id: "soon", label: "Within 6 months", tipTitle: "Check notice dates now.", tip: "Find renewal deadlines and request comparable options before committing." },
      { id: "medium", label: "In 6 to 12 months", tipTitle: "Use your planning runway.", tip: "Gather utilization, growth and cost baselines for a structured review." },
      { id: "later", label: "More than 12 months away", tipTitle: "Build a benchmark.", tip: "Track capacity, service and spending trends ahead of renewal." },
      { id: "unsure", label: "Not sure yet", tipTitle: "Find the contract.", tip: "Confirm the agreement end date, auto-renewal clause and decision owner." }
    ]
  }
];

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function currentPoll(now = Date.now()) {
  const cycle = Math.max(0, Math.floor((now - ANCHOR_UTC) / CYCLE_MS));
  const template = POLLS[cycle % POLLS.length];
  return {
    id: template.key + "-" + cycle,
    question: template.question,
    cycle,
    startsAt: new Date(ANCHOR_UTC + cycle * CYCLE_MS).toISOString(),
    endsAt: new Date(ANCHOR_UTC + (cycle + 1) * CYCLE_MS).toISOString(),
    options: template.options
  };
}

// The field-note question follows the same issue clock but keeps its own ballot.
const FIELD_QUESTIONS = [
  "Before committing, can you verify when the capacity will be energized?",
  "Can the proposed facility support your workload's actual power and cooling needs?",
  "Do you have a contractually supported date for the capacity you need?"
];
export function currentFieldPoll(now = Date.now()) {
  const issue = currentPoll(now);
  return {
    id: `field-${issue.cycle}`,
    question: FIELD_QUESTIONS[issue.cycle % FIELD_QUESTIONS.length],
    cycle: issue.cycle,
    startsAt: issue.startsAt,
    endsAt: issue.endsAt,
    options: [
      {id:"yes",label:"Yes"},
      {id:"no",label:"No"}
    ]
  };
}

export function calculateResults(options, rows) {
  const counts = new Map(rows.map(row => [row.choice_id, Number(row.votes) || 0]));
  const totalVotes = options.reduce((sum, option) => sum + (counts.get(option.id) || 0), 0);
  const entries = options.map((option, index) => {
    const count = counts.get(option.id) || 0;
    const exact = totalVotes ? count * 100 / totalVotes : 0;
    return {id: option.id, label: option.label, count, percent: Math.floor(exact), remainder: exact - Math.floor(exact), index};
  });
  let remaining = totalVotes ? 100 - entries.reduce((sum, entry) => sum + entry.percent, 0) : 0;
  for (const entry of [...entries].sort((a,b) => b.remainder - a.remainder || a.index - b.index)) {
    if (remaining-- <= 0) break;
    entry.percent += 1;
  }
  return {
    totalVotes,
    options: entries.map(({id,label,count,percent}) => ({id,label,count,percent}))
  };
}

function origins(env) {
  return new Set(
    String(env.ALLOWED_ORIGINS || "https://colomigo.com,https://www.colomigo.com")
      .split(",").map(item=>item.trim()).filter(Boolean)
  );
}
function cors(origin, allowed) {
  const headers = {"Vary":"Origin","Cache-Control":"no-store"};
  if (origin && allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Colomigo-Voter";
    headers["Access-Control-Max-Age"] = "3600";
  }
  return headers;
}
function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {...headers, "Content-Type":"application/json; charset=utf-8",
      "X-Content-Type-Options":"nosniff"}
  });
}
async function voterHash(secret, pollId, visitorId) {
  // HMAC prevents a stolen DB from easily checking known UUIDs without the server secret.
  const bytes = new TextEncoder();
  const key = await crypto.subtle.importKey("raw",bytes.encode(secret),
      {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature = await crypto.subtle.sign("HMAC",key,bytes.encode(pollId + ":" + visitorId));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function getResults(db, poll) {
  const rows = await db.prepare(
    "SELECT choice_id, COUNT(*) AS votes FROM poll_votes WHERE poll_id = ? GROUP BY choice_id"
  ).bind(poll.id).all();
  return calculateResults(poll.options, rows.results || []);
}
function publicPoll(poll) {
  return {
    id:poll.id, question:poll.question, cycle:poll.cycle,
    startsAt:poll.startsAt, endsAt:poll.endsAt,
    options:poll.options.map(({id,label,tipTitle,tip}) => ({id,label,tipTitle,tip}))
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = !origin || origins(env).has(origin);
    const headers = cors(origin,allowed);

    if (!allowed) return json({error:"Origin not permitted"},403,headers);
    if (request.method === "OPTIONS") {
      return new Response(null, {status:204,headers});
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return json({status:env.DB && env.POLL_PEPPER ? "ready" : "unconfigured"}, env.DB && env.POLL_PEPPER ? 200 : 503, headers);
    }
    if (!["/v1/poll","/v1/vote"].includes(url.pathname)) {
      return json({error:"Not found"},404,headers);
    }
    if (!env.DB || typeof env.POLL_PEPPER !== "string" || env.POLL_PEPPER.length < 32) {
      return json({error:"Poll service is not configured"},503,headers);
    }

    const poll = currentPoll();
    try {
      if (url.pathname === "/v1/poll" && request.method === "GET") {
        const visitorId = request.headers.get("X-Colomigo-Voter");
        let votedChoice = null;
        if (visitorId && UUID_V4.test(visitorId)) {
          const hash = await voterHash(env.POLL_PEPPER,poll.id,visitorId);
          const row = await env.DB.prepare(
            "SELECT choice_id FROM poll_votes WHERE poll_id = ? AND voter_hash = ?"
          ).bind(poll.id,hash).first();
          if (row) votedChoice = row.choice_id;
        }
        // Results are revealed only after this browser has cast a vote.
        return json({poll:publicPoll(poll),votedChoice,
            results:votedChoice ? await getResults(env.DB,poll) : null},200,headers);
      }

      if (url.pathname === "/v1/vote" && request.method === "POST") {
        if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
          return json({error:"JSON content type required"},415,headers);
        }
        const length = Number(request.headers.get("Content-Length") || 0);
        if (length > 2048) return json({error:"Request too large"},413,headers);
        let body;
        try { body = await request.json(); } catch { return json({error:"Invalid JSON"},400,headers); }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return json({error:"Invalid vote"},400,headers);
        }
        if (body.pollId !== poll.id) {
          return json({error:"Poll has changed. Refresh and vote on the current question.",poll:publicPoll(poll)},409,headers);
        }
        if (typeof body.voterId !== "string" || !UUID_V4.test(body.voterId) ||
            !poll.options.some(option => option.id === body.choiceId)) {
          return json({error:"Invalid voter or choice"},400,headers);
        }
        const hash = await voterHash(env.POLL_PEPPER,poll.id,body.voterId);
        // The unique key makes simultaneous or repeat submissions count as ONE ballot.
        // An updated choice replaces the previous one, not a new vote.
        await env.DB.prepare(
          "INSERT INTO poll_votes (poll_id,voter_hash,choice_id) VALUES (?,?,?) " +
          "ON CONFLICT(poll_id,voter_hash) DO UPDATE SET " +
          "choice_id=excluded.choice_id, updated_at=CURRENT_TIMESTAMP"
        ).bind(poll.id,hash,body.choiceId).run();
        return json({poll:publicPoll(poll),votedChoice:body.choiceId,
            results:await getResults(env.DB,poll)},200,headers);
      }
      return json({error:"Method not allowed"},405,headers);
    } catch (error) {
      console.error("Poll service error", error && error.name ? error.name : "unknown");
      return json({error:"The poll service is temporarily unavailable"},503,headers);
    }
  }
};
