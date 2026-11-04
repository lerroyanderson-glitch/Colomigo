import test from "node:test";
import assert from "node:assert/strict";
import pollApi, {currentPoll, calculateResults} from "../worker.mjs";

class FakeD1 {
  constructor() { this.rows = new Map(); }
  prepare(sql) {
    const db=this;
    return {
      bind(...values) {
        return {
          async all() {
            assert.match(sql, /GROUP BY choice_id/);
            const [pollId]=values;
            const counts=new Map();
            for (const row of db.rows.values()) {
              if (row.poll_id===pollId) counts.set(row.choice_id,(counts.get(row.choice_id)||0)+1);
            }
            return {results:[...counts].map(([choice_id,votes])=>({choice_id,votes}))};
          },
          async first() {
            assert.match(sql, /SELECT choice_id/);
            const [pollId,hash]=values;
            return db.rows.get(pollId+':'+hash) || null;
          },
          async run() {
            assert.match(sql, /ON CONFLICT/);
            const [poll_id,voter_hash,choice_id]=values;
            db.rows.set(poll_id+':'+voter_hash,{poll_id,voter_hash,choice_id});
            return {success:true};
          }
        };
      }
    };
  }
}
const idA = "c2a38301-eac9-4404-b761-20348a63ec71";
const idB = "13bb7baa-cbf7-47e1-84ea-1f4f8fd398a3";
const base = "https://colomigo-polls.example.test";
const allowedOrigin = "https://colomigo.com";
function env() {
  return {DB:new FakeD1(),POLL_PEPPER:"DUMMY_TEST_ONLY_SECRET_GREATER_THAN_32_CHARS",ALLOWED_ORIGINS:allowedOrigin};
}
async function request(e,path,method="GET",body=null,voter=null,origin=allowedOrigin) {
  const headers = {"Origin":origin};
  if (method === "POST") headers["Content-Type"]="application/json";
  if (voter) headers["X-Colomigo-Voter"]=voter;
  const req = new Request(base+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});
  const res=await pollApi.fetch(req,e);
  let payload=null;
  if(res.status!==204)payload=await res.json();
  return {status:res.status,payload,headers:res.headers};
}
test("rounding is stable, exact and total-aware",()=>{
  const opts=[{id:"a",label:"A"},{id:"b",label:"B"},{id:"c",label:"C"}];
  assert.deepEqual(calculateResults(opts,[]).options.map(o=>o.percent),[0,0,0]);
  const distribution=calculateResults(opts,[{choice_id:"a",votes:1},{choice_id:"b",votes:1},{choice_id:"c",votes:1}]);
  assert.equal(distribution.totalVotes,3);
  assert.deepEqual(distribution.options.map(o=>o.percent),[34,33,33]);
});
test("GET does not reveal tallies to an unvoted browser",async()=>{
  const e=env(), p=currentPoll();
  const r=await request(e,"/v1/poll","GET",null,idA);
  assert.equal(r.status,200);
  assert.equal(r.payload.poll.id,p.id);
  assert.equal(r.payload.results,null);
  assert.equal(r.payload.votedChoice,null);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"),allowedOrigin);
});
test("votes are shared and a retry or change does not inflate counts",async()=>{
  const e=env(),p=currentPoll(),[first,second]=p.options;
  const vote=(voter,choice)=>request(e,"/v1/vote","POST",{pollId:p.id,choiceId:choice,voterId:voter},voter);
  let response=await vote(idA,first.id);
  assert.equal(response.status,200);
  assert.equal(response.payload.results.totalVotes,1);
  assert.equal(response.payload.results.options.find(o=>o.id===first.id).percent,100);
  response=await vote(idA,first.id);
  assert.equal(response.payload.results.totalVotes,1,"retry must not add a vote");
  response=await vote(idB,second.id);
  assert.equal(response.payload.results.totalVotes,2);
  assert.equal(response.payload.results.options.find(o=>o.id===first.id).percent,50);
  response=await vote(idA,second.id);
  assert.equal(response.payload.results.totalVotes,2);
  assert.equal(response.payload.results.options.find(o=>o.id===second.id).percent,100);
  assert.equal(e.DB.rows.size,2);
  const readBack=await request(e,"/v1/poll","GET",null,idA);
  assert.equal(readBack.payload.votedChoice,second.id);
  assert.equal(readBack.payload.results.totalVotes,2);
});
test("invalid choices, identifiers and outdated polls are rejected",async()=>{
  const e=env(),p=currentPoll();
  for(const body of [
    {pollId:p.id,choiceId:"not-an-option",voterId:idA},
    {pollId:p.id,choiceId:p.options[0].id,voterId:"not-a-uuid"}
  ]) {
    const r=await request(e,"/v1/vote","POST",body);
    assert.equal(r.status,400);
  }
  const changed=await request(e,"/v1/vote","POST",{pollId:"old-poll",choiceId:p.options[0].id,voterId:idA});
  assert.equal(changed.status,409);
  assert.equal(e.DB.rows.size,0);
});
test("CORS and missing configuration fail closed",async()=>{
  const e=env();
  const rejected=await request(e,"/v1/poll","GET",null,idA,"https://untrusted.example");
  assert.equal(rejected.status,403);
  const preflight=await request(e,"/v1/vote","OPTIONS",null,idA);
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Headers"),"Content-Type, X-Colomigo-Voter");
  const disabled=await request({DB:e.DB},"/v1/poll","GET",null,idA);
  assert.equal(disabled.status,503);
});
