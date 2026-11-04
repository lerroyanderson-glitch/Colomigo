'use strict';
const topicButtons = [...document.querySelectorAll('.topic-button')];
const searchInput = document.getElementById('story-search');
let activeTopic = 'all';
function filterStories(){
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll('.story-card').forEach(card => {
    const matches = (activeTopic === 'all' || card.dataset.category === activeTopic) && card.textContent.toLowerCase().includes(query);
    card.hidden = !matches;
    if(matches) visible++;
  });
  document.getElementById('no-results').hidden = visible !== 0;
}
topicButtons.forEach(button=>button.addEventListener('click',()=>{
  activeTopic=button.dataset.topic;
  topicButtons.forEach(item=>{
    const selected=item===button;
    item.classList.toggle('selected',selected);
    item.setAttribute('aria-pressed',String(selected));
  });
  filterStories();
}));
searchInput.addEventListener('input',filterStories);
function displayDate(iso){
  const date = new Date(iso+'T12:00:00Z');
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'UTC'}).format(date);
}
function wireCard(story){
  const card=document.createElement('article');card.className='story-card wire-card';card.dataset.category=story.category;
  const meta=document.createElement('div');meta.className='story-meta';
  const category=document.createElement('span');category.textContent=({power:'POWER',ai:'AI & COOLING',network:'CONNECTIVITY',market:'MARKET MOVES'})[story.category];
  const time=document.createElement('time');time.dateTime=story.published;time.textContent=displayDate(story.published);
  meta.append(category,time);
  const heading=document.createElement('h3');heading.textContent=story.title;
  const link=document.createElement('a');link.href=story.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=story.source+' · Source ↗';
  card.append(meta,heading,link);return card;
}
async function loadWire(){
  const status=document.getElementById('wire-status');
  try{
    const response=await fetch('/insights/feed.json',{cache:'no-store'});
    if(!response.ok)throw Error('News feed not available');
    const feed=await response.json();
    if(!Array.isArray(feed.stories)||!/^\d{4}-\d{2}-\d{2}$/.test(feed.updated_at))throw Error('Invalid feed');
    const valid=feed.stories.filter(story=>{
      try{
        const url=new URL(story.url);
        return url.protocol==='https:'&&['power','market','ai','network'].includes(story.category)
          &&typeof story.title==='string'&&story.title.length<210
          &&typeof story.source==='string'&&story.source.length<90
          &&/^\d{4}-\d{2}-\d{2}$/.test(story.published);
      }catch{return false;}
    }).slice(0,6);
    if(!valid.length)throw Error('No sourced headlines');
    document.getElementById('wire-grid').replaceChildren(...valid.map(wireCard));
    const old=Math.floor((Date.now()-Date.parse(feed.updated_at+'T00:00:00Z'))/86400000)>21;
    status.textContent='Last sourced '+displayDate(feed.updated_at)+(old?'. Next editorial refresh is due.':'. Headlines checked on a 21-day cycle.');
    filterStories();
  }catch{
    status.textContent='Live feed unavailable; showing the last saved source selection.';
  }
}
loadWire();
const anchor=Date.UTC(2026,10,3);
const cycle=Math.max(0,Math.floor((Date.now()-anchor)/(21*86400000)));
const start=new Date(anchor+cycle*21*86400000);
const end=new Date(anchor+(cycle+1)*21*86400000-86400000);
const formatter=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const dateRange=formatter.format(start).toUpperCase()+'–'+formatter.format(end).toUpperCase();
document.getElementById('issue-dates').textContent=dateRange;
document.getElementById('pulse-dates').textContent='CURRENT PULSE / '+dateRange;
const polls=[
  {id:'constraints',question:'What is your biggest constraint in a colocation decision?',answers:[
    ['power','Available power','Verify power, not promises.','Ask for energized capacity, available kW, redundancy, and supported delivery dates.'],
    ['contract','Contract flexibility','Know the entire term.','Compare renewal notice dates, escalators, exit provisions and one-time versus recurring charges.'],
    ['network','Connectivity options','Map the network ecosystem.','Validate required carriers, diverse paths, cross-connect availability and monthly charges.'],
    ['timing','Deployment timing','Build a milestone plan.','Separate power provisioning, facility readiness, carrier turn-up, testing and approvals.']]},
  {id:'workloads',question:'What workload is shaping your next capacity decision?',answers:[
    ['ai','AI / GPU workloads','Start with density.','Validate power per rack, cooling approach and facility readiness before comparing prices.'],
    ['enterprise','Core enterprise applications','Design for resilience.','Confirm redundancy, support coverage and recovery requirements.'],
    ['recovery','Disaster recovery','Test the recovery path.','Review geographic separation, network diversity and recovery time requirements.'],
    ['edge','Edge / latency-sensitive workloads','Measure the network path.','Compare carrier availability, interconnection costs and proximity to users.']]},
  {id:'horizon',question:'When will you next reassess your colocation?',answers:[
    ['soon','Within 6 months','Check notice dates now.','Find renewal deadlines and request comparable options before committing.'],
    ['medium','In 6 to 12 months','Use your planning runway.','Gather utilization, growth and cost baselines for a structured review.'],
    ['later','More than 12 months away','Build a benchmark.','Track capacity, service and spending trends ahead of renewal.'],
    ['unsure','Not sure yet','Find the contract.','Confirm the agreement end date, auto-renewal clause and decision owner.']]}
];
const poll=polls[cycle%polls.length],storageKey='colomigo-pulse-'+cycle+'-'+poll.id;
const form=document.getElementById('pulse-form'),choices=document.getElementById('poll-answers'),result=document.getElementById('poll-result'),status=document.getElementById('poll-status');
document.getElementById('poll-question').textContent=poll.question;
choices.replaceChildren();
poll.answers.forEach(answer=>{
  const label=document.createElement('label');label.className='poll-choice';
  const radio=document.createElement('input');radio.type='radio';radio.name='choice';radio.value=answer[0];
  label.append(radio,document.createTextNode(answer[1]));choices.append(label);
});
function showResult(id){
  const answer=poll.answers.find(item=>item[0]===id);
  if(!answer)return;
  form.hidden=true;result.hidden=false;
  document.getElementById('result-title').textContent=answer[2];
  document.getElementById('result-body').textContent=answer[3];
  status.textContent='Private browser-local selection only. No public votes are counted.';
}
try{const saved=localStorage.getItem(storageKey);if(saved)showResult(saved);}catch{status.textContent='Browser storage unavailable; your selection is not saved.';}
form.addEventListener('submit',event=>{
  event.preventDefault();
  const checked=form.querySelector('input[name="choice"]:checked');
  if(!checked){status.textContent='Select an answer first.';return;}
  try{localStorage.setItem(storageKey,checked.value);}catch{}
  showResult(checked.value);
});
document.getElementById('change-answer').addEventListener('click',()=>{
  try{localStorage.removeItem(storageKey);}catch{}
  result.hidden=true;form.hidden=false;form.reset();
  status.textContent='No votes are transmitted or tallied.';
});
