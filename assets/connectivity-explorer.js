'use strict';
(() => {
  const root = document.getElementById('connectivity-explorer');
  if (!root) return;
  // Reviewed public examples, not an inventory of Colo-Migo supplier capacity.
  const markets = [
    {id:'seattle', name:'Seattle', x:125, y:80, aws:'Equinix SE2 / Digital Realty SEA10', google:'Equinix SE2/SE3', fiber:'Equinix SE2'},
    {id:'la', name:'Los Angeles', x:125, y:300, aws:'CoreSite LA1', google:'CoreSite LA1', fiber:'CoreSite LA1'},
    {id:'dallas', name:'Dallas', x:385, y:345, aws:'Equinix DA2', google:'Equinix DA1', fiber:'Equinix DA2'},
    {id:'chicago', name:'Chicago', x:565, y:170, aws:'CoreSite CH1', google:'CoreSite CH1', fiber:'CoreSite CH1'},
    {id:'atlanta', name:'Atlanta', x:640, y:315, aws:'Digital Realty ATL13', google:'Equinix AT1', fiber:'Digital Realty ATL13'},
    {id:'ashburn', name:'Northern Virginia', x:745, y:210, aws:'Digital Realty IAD38', google:'Equinix Ashburn campus', fiber:'Equinix DC2'}
  ];
  const clouds = {
    aws:{name:'AWS', service:'Direct Connect', source:'https://aws.amazon.com/directconnect/locations/'},
    azure:{name:'Microsoft Azure', service:'ExpressRoute', source:'https://learn.microsoft.com/en-us/azure/expressroute/expressroute-locations-providers'},
    google:{name:'Google Cloud', service:'Dedicated Interconnect', source:'https://docs.cloud.google.com/network-connectivity/docs/interconnect/concepts/choosing-colocation-facilities'}
  };
  const ns = 'http://www.w3.org/2000/svg';
  const markers = root.querySelector('.market-markers');
  const marketSelect = root.querySelector('#market-select');
  const serviceSelect = root.querySelector('#cloud-select');
  const modeSelect = root.querySelector('#connection-layer');
  let selected = markets[2];
  const buttons = new Map();
  for (const market of markets) {
    const option = document.createElement('option');
    option.value = market.id; option.textContent = market.name;
    marketSelect.append(option);
    const g = document.createElementNS(ns,'g');
    g.setAttribute('transform',`translate(${market.x} ${market.y})`);
    g.setAttribute('role','button'); g.setAttribute('tabindex','0');
    g.setAttribute('aria-label',`Explore ${market.name}`);
    g.classList.add('market-marker');
    const halo = document.createElementNS(ns,'circle'); halo.setAttribute('r','17'); halo.classList.add('market-halo');
    const dot = document.createElementNS(ns,'circle'); dot.setAttribute('r','6');
    const label = document.createElementNS(ns,'text'); label.setAttribute('x','0'); label.setAttribute('y','-25'); label.setAttribute('text-anchor',market.id==='ashburn'?'end':'middle'); label.textContent = market.name;
    g.append(halo,dot,label); markers.append(g); buttons.set(market.id,g);
    function choose() { selected = market; render(); }
    g.addEventListener('click',choose);
    g.addEventListener('keydown',event => { if(event.key==='Enter'||event.key===' ') {event.preventDefault(); choose();} });
  }
  function addCard(parent,title,service,detail,url) {
    const card = document.createElement('article'); card.className = 'connection-card';
    const heading = document.createElement('h4'); heading.textContent = title;
    const type = document.createElement('p'); type.className='connection-type'; type.textContent = service;
    const info = document.createElement('p'); info.textContent = detail;
    const link = document.createElement('a'); link.href=url; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent='View provider source';
    card.append(heading,type,info,link); parent.append(card);
  }
  function render() {
    marketSelect.value = selected.id;
    for(const [id,button] of buttons) button.setAttribute('aria-pressed',String(id===selected.id));
    root.querySelector('#market-heading').textContent = selected.name;
    const cards = root.querySelector('#connection-results'); cards.replaceChildren();
    const fiber = modeSelect.value==='carrier';
    const diagram = root.querySelector('.access-links');
    diagram.replaceChildren();
    function draw(tag,attributes,text) {
      const element = document.createElementNS(ns,tag);
      for(const [name,value] of Object.entries(attributes)) element.setAttribute(name,String(value));
      if(text) element.textContent=text;
      diagram.append(element);
    }
    draw('text',{x:36,y:32,class:'diagram-caption'},'MARKET-LEVEL SERVICES · SCHEMATIC');
    draw('rect',{x:36,y:92,width:300,height:70,rx:2,class:'diagram-node'});
    draw('text',{x:186,y:133,'text-anchor':'middle',class:'diagram-label'},selected.name);
    const services = fiber ? [{name:'Zayo',service:'IP transit presence'}] : Object.entries(clouds).filter(([key])=>serviceSelect.value==='all'||serviceSelect.value===key).map(([,cloud])=>cloud);
    services.forEach((cloud,index)=>{
      const y = services.length===1 ? 127 : 70+index*70;
      draw('path',{d:`M336 127 C440 127 440 ${y} 540 ${y}`,class:'diagram-link'});
      draw('rect',{x:540,y:y-27,width:320,height:54,rx:2,class:'diagram-node'});
      draw('text',{x:560,y:y-3,class:'diagram-label'},cloud.name);
      draw('text',{x:560,y:y+17,class:'diagram-service'},cloud.service);
    });
    serviceSelect.disabled=fiber;
    root.querySelector('#layer-summary').textContent = fiber ? 'Example carrier presence in this market' : 'Documented private cloud access in this market';
    if (fiber) {
      addCard(cards,'Zayo','IP transit presence',`Listed facility example: ${selected.fiber}. A listed point of presence is not proof of a specific fiber path or diverse route.`,'https://www.zayo.com/ipt-carrier-map/');
      const route = document.createElement('a'); route.className='network-map-link'; route.href='https://www.zayo.com/network/'; route.target='_blank'; route.rel='noopener noreferrer'; route.textContent='Explore Zayo’s network maps'; cards.append(route);
    } else {
      for(const [key,cloud] of Object.entries(clouds)) {
        if(serviceSelect.value!=='all'&&serviceSelect.value!==key) continue;
        const place = key==='azure' ? `Microsoft lists an ExpressRoute peering location in ${selected.id==='ashburn'?'the Washington DC market':selected.name}. Check its source for locations and connectivity partners.` : `Example connection location: ${selected[key]}.`;
        addCard(cards,cloud.name,cloud.service,place,cloud.source);
      }
    }
    root.querySelector('#map-announcement').textContent=`${selected.name}: ${fiber?'carrier presence':serviceSelect.options[serviceSelect.selectedIndex].text+' cloud access'} displayed.`;
  }
  marketSelect.addEventListener('change',()=>{selected=markets.find(m=>m.id===marketSelect.value);render();});
  serviceSelect.addEventListener('change',render); modeSelect.addEventListener('change',render);
  root.querySelector('.explorer-controls').hidden=false;
  root.querySelector('.explorer-layout').hidden=false;
  render();
})();
