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
// Live poll: results are obtained exclusively from the deployed D1 API.
const pollStatus = document.getElementById('poll-status');
const pollForm = document.getElementById('pulse-form');
const pollChoices = document.getElementById('poll-answers');
const pollResult = document.getElementById('poll-result');
const voteButton = pollForm.querySelector('button[type="submit"]');
const apiUrl = String(window.COLOMIGO_POLL_API_URL || '').trim().replace(/\\/$/, '');
let livePoll = null;
let browserVoter = null;

function pollMessage(message) {
  pollStatus.textContent = message;
}
function disablePoll(message) {
  pollForm.hidden = true;
  pollResult.hidden = true;
  pollMessage(message);
}
function getBrowserVoter() {
  const key = 'colomigo-anonymous-voter-v1';
  const stored = localStorage.getItem(key);
  if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) return stored;
  if (!crypto.randomUUID) throw new Error('Secure browser ID is unavailable');
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  if (localStorage.getItem(key) !== id) throw new Error('Browser ID was not saved');
  return id;
}
async function pollRequest(path, init={}) {
  const response = await fetch(apiUrl + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Colomigo-Voter': browserVoter,
      ...(init.headers || {})
    },
    cache: 'no-store'
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Poll service unavailable');
  return payload;
}
const dateLabel = iso => new Intl.DateTimeFormat('en-US', {
  month:'short', day:'numeric', timeZone:'UTC'
}).format(new Date(iso));
function renderPoll(poll) {
  livePoll = poll;
  document.getElementById('poll-question').textContent = poll.question;
  const endExclusive = new Date(poll.endsAt);
  endExclusive.setUTCDate(endExclusive.getUTCDate() - 1);
  const range = dateLabel(poll.startsAt).toUpperCase() + '–' + dateLabel(endExclusive.toISOString()).toUpperCase();
  document.getElementById('pulse-dates').textContent = 'CURRENT PULSE / ' + range;
  document.getElementById('issue-dates').textContent = range;
  pollChoices.replaceChildren();
  poll.options.forEach(option => {
    const label = document.createElement('label');
    label.className = 'poll-choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'choice'; input.value = option.id;
    label.append(input, document.createTextNode(option.label));
    pollChoices.append(label);
  });
  pollForm.hidden = false;
}
function displayVoteResults(payload) {
  if (!payload.results || !Array.isArray(payload.results.options) ||
      !Number.isInteger(payload.results.totalVotes)) {
    throw new Error('Voting results not available');
  }
  pollForm.hidden = true;
  pollResult.hidden = false;
  const selected = payload.poll.options.find(option => option.id === payload.votedChoice);
  if (!selected) throw new Error('Vote response missing selected answer');
  document.getElementById('result-title').textContent = selected.tipTitle;
  document.getElementById('result-body').textContent = selected.tip;
  const total = payload.results.totalVotes;
  const totalLabel = document.getElementById('vote-total');
  totalLabel.textContent = total.toLocaleString() + (total === 1 ? ' vote' : ' votes') + ' cast';
  const container = document.getElementById('poll-percentages');
  container.replaceChildren();
  payload.results.options.forEach(option => {
    const row = document.createElement('div'); row.className='vote-result-row';
    if (option.id === payload.votedChoice) row.classList.add('is-my-vote');
    const heading = document.createElement('div'); heading.className='vote-result-heading';
    const title = document.createElement('span'); title.textContent = option.label;
    const amount = document.createElement('strong'); amount.textContent = option.percent + '%';
    heading.append(title,amount);
    const track=document.createElement('div'); track.className='vote-bar';
    track.setAttribute('role','progressbar');
    track.setAttribute('aria-label', option.label);
    track.setAttribute('aria-valuemin','0');
    track.setAttribute('aria-valuemax','100');
    track.setAttribute('aria-valuenow', String(option.percent));
    const fill=document.createElement('span'); fill.style.width=option.percent + '%';
    track.append(fill);
    row.append(heading,track);
    container.append(row);
  });
  pollMessage('Live community results after your vote. One ballot per browser per issue; you can change your selection.');
}

pollForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!livePoll || !browserVoter) return;
  const checked = pollForm.querySelector('input[name="choice"]:checked');
  if (!checked) {pollMessage('Choose an option before submitting.'); return;}
  voteButton.disabled = true;
  pollMessage('Saving your vote securely…');
  try {
    const response = await pollRequest('/v1/vote', {
      method:'POST',
      body:JSON.stringify({pollId:livePoll.id, choiceId:checked.value, voterId:browserVoter})
    });
    renderPoll(response.poll);
    displayVoteResults(response);
  } catch(error) {
    pollMessage(error.message + '. Your selection was not confirmed; try again.');
  } finally {
    voteButton.disabled = false;
  }
});

document.getElementById('change-answer').addEventListener('click', () => {
  pollResult.hidden = true;
  pollForm.hidden = false;
  pollForm.reset();
  pollMessage('Changing your choice will update your existing vote, not add a second vote.');
});

async function initializeSharedPoll() {
  if (!/^https:\/\/[^\s/]+/i.test(apiUrl)) {
    disablePoll('Community voting is being configured. No votes are being accepted yet.');
    return;
  }
  try {
    browserVoter = getBrowserVoter();
  } catch {
    disablePoll('Community voting requires browser storage to remember your ballot. Enable site storage to participate.');
    return;
  }
  pollMessage('Connecting to the community poll…');
  try {
    const payload = await pollRequest('/v1/poll');
    if (!payload.poll || !Array.isArray(payload.poll.options)) throw new Error('Invalid poll configuration');
    renderPoll(payload.poll);
    if (payload.votedChoice) displayVoteResults(payload);
    else pollMessage('Submit one vote to unlock live community percentages.');
  } catch {
    disablePoll('Community voting is temporarily unavailable. No vote has been recorded.');
  }
}
initializeSharedPoll();
