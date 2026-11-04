import test from "node:test";
import assert from "node:assert/strict";
import { makePollHandler } from "../netlify-handler.mjs";
import { currentPoll, currentFieldPoll } from "../worker.mjs";

const idA="c2a38301-eac9-4404-b761-20348a63ec71";
const idB="13bb7baa-cbf7-47e1-84ea-1f4f8fd398a3";

function memoryDb() {
  const records=new Map();
  const sql=async (strings,...args)=>{
    const statement=strings.join("?").replace(/\s+/g," ").trim();
    if(statement.startsWith("SELECT choice_id FROM poll_votes")) {
      const [pollId,hash]=args;
      const hit=records.get(pollId+":"+hash);
      return hit?[{choice_id:hit.choice}]:[];
    }
    if(statement.startsWith("INSERT INTO poll_votes")) {
      const [pollId,hash,choice]=args;
      records.set(pollId+":"+hash,{choice});
      return [];
    }
    if(statement.startsWith("SELECT choice_id, COUNT(*)")) {
      const [pollId]=args;
      const aggregate=new Map();
      for(const [key,value] of records) {
        if(key.startsWith(pollId+":"))aggregate.set(value.choice,(aggregate.get(value.choice)||0)+1);
      }
      return [...aggregate].map(([choice_id,votes])=>({choice_id,votes}));
    }
    throw Error("Unexpected SQL: "+statement);
  };
  return {sql,records};
}
function makeClient(db){
  const handler=makePollHandler(()=>db);
  return async ({method="GET",origin="https://colomigo.com",voter=null,body=null,scope=null}={})=>{
    const headers={Origin:origin};
    if(voter)headers["X-Colomigo-Voter"]=voter;
    if(method==="POST")headers["Content-Type"]="application/json";
    const req=new Request("https://colomigo.com/.netlify/functions/poll"+(scope?"?scope="+scope:""),{
      method,headers,body:body===null?undefined:JSON.stringify(body)
    });
    const res=await handler(req);
    return {status:res.status,payload:await res.json()};
  };
}
test("new browser sees question, not results", async()=>{
  const call=makeClient(memoryDb());
  const response=await call({voter:idA});
  assert.equal(response.status,200);
  assert.equal(response.payload.poll.id,currentPoll().id);
  assert.equal(response.payload.votedChoice,null);
  assert.equal(response.payload.results,null);
});
test("actual shared percentages, updates and reload use committed ballots",async()=>{
  const db=memoryDb();
  const call=makeClient(db);
  const poll=currentPoll();
  const a=poll.options[0].id,b=poll.options[1].id;
  const cast=(voter,choice)=>call({method:"POST",voter,body:{pollId:poll.id,choiceId:choice,voterId:voter}});
  let result=await cast(idA,a);
  assert.equal(result.status,200);
  assert.equal(result.payload.results.totalVotes,1);
  assert.equal(result.payload.results.options[0].percent,100);
  result=await cast(idB,b);
  assert.equal(result.payload.results.totalVotes,2);
  assert.deepEqual(result.payload.results.options.slice(0,2).map(x=>x.percent),[50,50]);
  result=await cast(idA,a);
  assert.equal(result.payload.results.totalVotes,2);
  result=await cast(idA,b);
  assert.equal(result.payload.results.totalVotes,2);
  assert.equal(result.payload.results.options[1].percent,100);
  assert.equal(db.records.size,2);
  const read=await call({voter:idB});
  assert.equal(read.payload.results.totalVotes,2);
  assert.equal(read.payload.votedChoice,b);
});
test("invalid option, changed cycle, origin and missing database fail",async()=>{
  const call=makeClient(memoryDb());
  const poll=currentPoll();
  const base={pollId:poll.id,choiceId:poll.options[0].id,voterId:idA};
  assert.equal((await call({method:"POST",body:{...base,choiceId:"unlisted"}})).status,400);
  assert.equal((await call({method:"POST",body:{...base,pollId:"old"}})).status,409);
  assert.equal((await call({origin:"https://evil.example"})).status,403);
  assert.equal((await makeClient(null)()).status,503);
});
test("each 21-day cycle has a separate poll id and separate total",()=>{
  const first=currentPoll(Date.UTC(2026,10,3));
  const second=currentPoll(Date.UTC(2026,10,24));
  const third=currentPoll(Date.UTC(2026,11,15));
  assert.equal(first.cycle,0);
  assert.equal(second.cycle,1);
  assert.equal(third.cycle,2);
  assert.notEqual(first.id,second.id);
  assert.equal(first.endsAt,second.startsAt);
});

test("field-note yes/no poll has separate recorded totals and rotates with the issue",async()=>{
  const db=memoryDb();
  const call=makeClient(db);
  const main=currentPoll(), field=currentFieldPoll();
  assert.notEqual(field.id,main.id);
  assert.deepEqual(field.options.map(option=>option.id),["yes","no"]);
  const initial=await call({voter:idA,scope:"field"});
  assert.equal(initial.payload.poll.id,field.id);
  assert.equal(initial.payload.results,null);
  const cast=(voter,choice)=>call({method:"POST",voter,body:{pollId:field.id,choiceId:choice,voterId:voter}});
  assert.equal((await cast(idA,"yes")).payload.results.totalVotes,1);
  assert.equal((await cast(idB,"no")).payload.results.totalVotes,2);
  assert.equal((await cast(idA,"no")).payload.results.totalVotes,2);
  const results=await call({voter:idB,scope:"field"});
  assert.equal(results.payload.results.options.find(option=>option.id==="no").percent,100);
  assert.equal((await call({voter:idA})).payload.votedChoice,null);
  assert.equal((await call({method:"POST",body:{pollId:field.id,choiceId:"other",voterId:idA}})).status,400);
  assert.notEqual(currentFieldPoll(Date.UTC(2026,10,24)).id, currentFieldPoll(Date.UTC(2026,10,3)).id);
});
