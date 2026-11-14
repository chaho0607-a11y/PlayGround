const units=[
 {id:'mira',name:'서미라',role:'전직 역무원',mark:'月',color:'#b8a283',hp:92,max:92,san:10,maxSan:25,speed:[3,6],skills:[
  {name:'표 검표',sin:'분노',symbol:'R',color:'#c97868',base:4,coin:4,n:1,desc:'기본 공격 · 적중 시 정신력 +2',effect:'calm'},
  {name:'막차 안내',sin:'우울',symbol:'S',color:'#7d9bac',base:3,coin:5,n:2,desc:'2연격 · 앞면마다 +5 위력',effect:'double'},
  {name:'개찰구 폐쇄',sin:'오만',symbol:'P',color:'#c2a15d',base:6,coin:7,n:2,cost:3,desc:'강한 2연격 · 흐트러짐 피해 +8',effect:'heavy'}]},
 {id:'dojin',name:'강도진',role:'야간 경비',mark:'刃',color:'#93a9a0',hp:108,max:108,san:2,maxSan:25,speed:[2,5],skills:[
  {name:'손전등 후려치기',sin:'탐식',symbol:'G',color:'#a88168',base:5,coin:3,n:1,desc:'적중 시 다음 공격 위력 -1',effect:'weaken'},
  {name:'안전선 돌파',sin:'분노',symbol:'R',color:'#c97868',base:2,coin:6,n:2,desc:'2연격 · 앞면마다 +6 위력',effect:'double'},
  {name:'비상 제동',sin:'나태',symbol:'L',color:'#b0a96e',base:6,coin:5,n:3,cost:3,desc:'3연격 · 마지막 타격 강화',effect:'brake'}]},
 {id:'yun',name:'윤해진',role:'분실물 담당',mark:'⌁',color:'#a69abb',hp:78,max:78,san:18,maxSan:25,speed:[4,7],skills:[
  {name:'유리 조각',sin:'질투',symbol:'E',color:'#aa86ad',base:3,coin:4,n:2,desc:'2연격 · 앞면마다 +4 위력',effect:'double'},
  {name:'승객 명부',sin:'우울',symbol:'S',color:'#7d9bac',base:5,coin:4,n:1,desc:'정신력 낮은 적에게 큰 피해',effect:'focus'},
  {name:'이름을 불러',sin:'오만',symbol:'P',color:'#c2a15d',base:4,coin:6,n:3,cost:3,desc:'3연격 · 정신력 +4',effect:'call'}]}
];
const enemy={hp:180,max:180,stagger:0,maxStagger:60,weak:false};
let turn=1,selected=0,orders={},sin=[],busy=false,gameOver=false,enemyPowerDown=0;
const $=s=>document.querySelector(s), teamList=$('#teamList'),skillRow=$('#skillRow'),targetRow=$('#targetRow');
const sinColors={분노:'#c97868',우울:'#7d9bac',오만:'#c2a15d',탐식:'#a88168',나태:'#b0a96e',질투:'#aa86ad'};
function roll(a,b){return Math.floor(Math.random()*(b-a+1))+a}function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function alive(){return units.filter(u=>u.hp>0)}
function log(text){$('#combatLog').innerHTML=`<span class="log-mark">!</span><span>${text}</span>`}
function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1900)}
function render(){
 teamList.innerHTML=units.map((u,i)=>`<div class="unit-card ${i===selected?'selected':''} ${u.hp<=0?'dead':''} ${orders[u.id]?'ordered':''}" data-unit="${i}"><div class="unit-avatar" style="color:${u.color}">${u.mark}</div><div class="unit-info"><div class="unit-name">${u.name}<span style="color:#aaa;font:8px var(--mono)">${u.hp>0?u.hp+' HP':'전투 불능'}</span></div><div class="unit-role">${u.role} · 정신력 ${u.san>=0?'+':''}${u.san}</div><div class="mini-hp"><i style="width:${u.hp/u.max*100}%;background:${u.hp/u.max<.3?'#d27868':''}"></i></div></div><div class="unit-extra">${u.hp>0?`${u.speed[0]}–${u.speed[1]}<small>SPEED</small>`:'—'}</div></div>`).join('');
 teamList.querySelectorAll('.unit-card').forEach(el=>el.onclick=()=>{if(busy)return;selected=+el.dataset.unit;if(units[selected].hp<=0){toast('전투 불능인 인원은 명령할 수 없습니다.');return}render()});
 const u=units[selected];
 if(!u||u.hp<=0){skillRow.innerHTML='<div class="helper">전투 가능한 인원을 선택하세요.</div>';targetRow.innerHTML='';return}
 skillRow.innerHTML=u.skills.map((s,i)=>{const locked=s.cost&&(sin.length<s.cost);return `<button class="skill-card ${orders[u.id]?.skill===i?'chosen':''} ${locked?'locked':''}" data-skill="${i}" ${busy||locked?'disabled':''}><div class="skill-top"><span class="skill-name">${s.name}</span><span class="skill-cost" style="color:${sinColors[s.sin]}">${s.cost?`◆ ${s.cost}`:'FREE'}</span></div><div class="skill-desc">${s.desc}</div><div class="skill-dice">${Array.from({length:s.n},(_,j)=>`<span class="coin attack">${s.base}${j?' +':''}</span>`).join('')}<span class="coin final">+${s.coin} × ${s.n}</span></div></button>`}).join('');
 skillRow.querySelectorAll('.skill-card').forEach(el=>el.onclick=()=>choose(+el.dataset.skill));
 const order=orders[u.id]; targetRow.innerHTML=`<span>${order?'대상 부위 선택':'기술을 선택하면 명령이 등록됩니다.'}</span><div class="target-choices"><button class="target-btn ${order?.target==='head'?'active':''}" ${!order||busy?'disabled':''} data-target="head">머리 · 흐트러짐↑</button><button class="target-btn ${order?.target==='body'?'active':''}" ${!order||busy?'disabled':''} data-target="body">몸통 · 안정</button></div>`;
 targetRow.querySelectorAll('.target-btn').forEach(el=>el.onclick=()=>{if(!order)return;order.target=el.dataset.target;render()});
 const count=Object.keys(orders).length;$('#orderCount').textContent=`${count} / ${alive().length}`;$('#resolveBtn').disabled=busy||count<alive().length||gameOver;$('#helperText').textContent=count===alive().length?'모든 명령 준비 완료. 실행을 누르세요.':`${alive().length-count}명의 명령이 남았습니다. 수감자를 선택하고 기술을 지정하세요.`;
 $('#sinTotal').textContent=sin.length;$('#sinPips').innerHTML=Array.from({length:12},(_,i)=>`<i class="sin-pip ${i<sin.length?'on':''}" style="${i<sin.length?`background:${sinColors[sin[i]]}`:''}"></i>`).join('');
 $('#enemyHpText').textContent=`${Math.max(0,enemy.hp)} / ${enemy.max}`;$('#enemyHpBar').style.width=`${Math.max(0,enemy.hp)/enemy.max*100}%`;$('#staggerText').textContent=`${enemy.stagger} / ${enemy.maxStagger}`;$('#staggerBar').style.width=`${enemy.stagger/enemy.maxStagger*100}%`;
 $('#enemyFigure').classList.toggle('down',enemy.stagger>=enemy.maxStagger);$('#enemyStatus').innerHTML=`${enemy.stagger>=enemy.maxStagger?'<span class="status-chip">흐트러짐</span>':''}${enemyPowerDown?'<span class="status-chip">위력 감소</span>':''}`;
 $('#turnNum').textContent=String(turn).padStart(2,'0');$('#footerState').textContent=busy?'CLASH IN PROGRESS':'AWAITING ORDERS';
 const phase=$('#phase');phase.innerHTML=`<span class="phase-no">${String(turn).padStart(2,'0')}</span><span>작전 단계<br><b>${busy?'충돌 진행 중':'명령을 내리십시오'}</b></span>`;
 $('#intentName').textContent=enemy.stagger>=enemy.maxStagger?'흐트러짐 — 공격 불가':'회수 열차';$('#intentDesc').textContent=enemy.stagger>=enemy.maxStagger?'이번 턴 행동하지 못합니다':`무작위 수감자에게 · ${10+turn}–${16+turn}`;
}
function choose(i){if(busy)return;const u=units[selected],s=u.skills[i];if(s.cost&&sin.length<s.cost){toast(`공명 자원 ${s.cost}개가 필요합니다.`);return}if(orders[u.id]?.skill===i){delete orders[u.id]}else{orders[u.id]={skill:i,target:'body'}}render()}
$('#resolveBtn').onclick=resolve;
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function resolve(){if(busy||Object.keys(orders).length<alive().length)return;busy=true;render();$('#resolveBtn').disabled=true;$('#helperText').textContent='운명이 주사위를 굴립니다…';
 const queued=alive().map(u=>({u,...orders[u.id],speed:roll(...u.speed)})).sort((a,b)=>b.speed-a.speed);
 // Resonance: consecutive matching sin types grant bonus power and extra sanity.
 let resonance=0,last=null;for(const q of queued){const s=q.u.skills[q.skill];if(last===s.sin)resonance++;last=s.sin}
 const chainBonus=resonance?Math.min(3,resonance):0;let clashBreak=false;
 if(chainBonus)toast(`공명 ${resonance+1}연쇄! 기술 위력 +${chainBonus}`);
 for(let k=0;k<queued.length;k++){
  const q=queued[k];if(enemy.hp<=0)break;if(q.u.hp<=0)continue;const s=q.u.skills[q.skill];
  if(s.cost){sin.splice(0,s.cost)}
  $('#enemyFigure').classList.remove('hit');void $('#enemyFigure').offsetWidth;
  $('#enemyFigure').classList.add('hit');await wait(300);
  const count=s.n, enemyDice=enemy.stagger>=enemy.maxStagger?0:roll(10,16)+turn-enemyPowerDown;
  let ownPower=s.base+chainBonus+Math.floor(q.u.san/10);let clashWin=false;
  // The first coin clashes against the telegraphed enemy die; winning cancels that hit.
  const first=ownPower+roll(0,s.coin);
  if(enemyDice===0||first>=enemyDice){clashWin=true;clashBreak=true;log(`${q.u.name}의 ${s.name} — 충돌 승리! (${first} vs ${enemyDice||'—'})`);}
  else{log(`${q.u.name}의 ${s.name} — 충돌 패배 (${first} vs ${enemyDice})`);q.u.hp=Math.max(0,q.u.hp-Math.max(5,enemyDice-first+5));q.u.san=clamp(q.u.san-3,-25,25);$('#app').classList.add('shake');setTimeout(()=>$('#app').classList.remove('shake'),300);render();await wait(230);}
  if(q.u.hp<=0){log(`${q.u.name}이(가) 쓰러졌다…`);render();await wait(300);continue}
  let damage=0;
  for(let n=0;n<count;n++){
   const face=roll(0,s.coin);const power=s.base+(face>0?face:0)+chainBonus+Math.floor(q.u.san/10)+(n===count-1&&s.effect==='brake'?5:0);
   let d=power+roll(3,6);if(q.target==='head')d=Math.floor(d*.8);if(enemy.stagger>=enemy.maxStagger)d=Math.floor(d*1.5);if(s.effect==='focus')d+=Math.max(0,Math.floor((10-q.u.san)/2));
   enemy.hp=Math.max(0,enemy.hp-d);damage+=d;if(q.target==='head')enemy.stagger+=Math.ceil(d*.55);else enemy.stagger+=Math.ceil(d*.28);
   if(s.effect==='heavy')enemy.stagger+=4;if(enemy.hp<=0)break;
  }
  if(s.effect==='calm')q.u.san=clamp(q.u.san+2,-25,25);if(s.effect==='call')q.u.san=clamp(q.u.san+4,-25,25);if(s.effect==='weaken')enemyPowerDown=2;
  enemy.stagger=clamp(enemy.stagger,0,enemy.maxStagger);sin.push(s.sin);if(chainBonus)q.u.san=clamp(q.u.san+1,-25,25);
  log(`${q.u.name} — ${s.name}: ${damage} 피해${q.target==='head'?' · 머리 명중':''}`);render();await wait(480);
  if(enemy.stagger>=enemy.maxStagger&&enemy.hp>0){log('유리창의 승객이 흐트러졌다! 다음 공격에 취약해진다.');await wait(300)}
 }
 if(enemy.hp<=0){busy=false;orders={};render();endGame(true);return}
 // Enemy's attack: clash result controls damage, unless staggered. Speed priority does not prevent the final attack.
 if(enemy.stagger>=enemy.maxStagger){log('흐트러진 적은 공격하지 못했다.');await wait(550);enemy.stagger=Math.max(0,enemy.stagger-30);}
 else if(clashBreak){log('충돌에서 밀린 승객이 공격을 거둬들였다. 적의 의도가 취소된다.');await wait(500);}
 else{
  const candidates=alive();if(candidates.length){const target=candidates[roll(0,candidates.length-1)];const incoming=roll(10,16)+turn-enemyPowerDown;const defense=roll(6,12)+Math.max(0,Math.floor(target.san/12));log(`회수 열차가 ${target.name}에게 돌진한다… (${incoming} 위력)`);await wait(450);
   if(defense>=incoming){log(`${target.name}의 회피 성공! ${defense} vs ${incoming}`);target.san=clamp(target.san+2,-25,25)}else{const dmg=roll(13,20)+Math.max(0,incoming-defense);target.hp=Math.max(0,target.hp-dmg);target.san=clamp(target.san-4,-25,25);$('#app').classList.add('shake');setTimeout(()=>$('#app').classList.remove('shake'),300);log(`${target.name} 피격 — ${dmg} 피해, 정신력 -4`);$('#enemyFigure').classList.add('flash')}
  }
 }
 await wait(350);$('#enemyFigure').classList.remove('flash','hit');enemyPowerDown=Math.max(0,enemyPowerDown-1);turn++;orders={};busy=false;selected=alive().length?units.indexOf(alive()[0]):0;render();
 if(!alive().length){endGame(false);return}log('열차가 다시 한 번 어둠 속으로 미끄러진다. 다음 명령을 내리세요.');
}
function endGame(win){gameOver=true;const m=$('#resultModal');m.classList.remove('hidden');$('#resultIcon').textContent=win?'✦':'◌';$('#resultTitle').textContent=win?'종착역에 도착했습니다':'막차는 떠나 버렸다';$('#resultText').textContent=win?`유리창의 승객은 산산이 부서졌다. ${turn}번째 운행에서 세 사람은 각자의 이름을 기억해냈다. 이 야간 기록은 여기서 끝난다.`:'마지막 수감자의 호흡이 끊겼다. 그러나 다음 막차는 또다시 00:17에 도착한다.';$('#resolveBtn').disabled=true}
$('#restartBtn').onclick=()=>location.reload();$('#soundBtn').onclick=()=>toast('정적만 들려옵니다.');
render();