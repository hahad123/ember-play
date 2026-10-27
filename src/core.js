(function(root){
'use strict';
const FACTIONS = [
 {id:'F1',name:'流火义军',mark:'烽',tag:'烽字旗',action:'举烽旗',color:'#bc6048',desc:'人海破城，成型快',detail:'粮少人多，破门最快',units:['流民刀','义勇','破城先锋'],cap:10,cost:26,atk:12,hp:92,siege:1.35,characters:['烽寨主','流火盟首']},
 {id:'F2',name:'藩镇开府',mark:'虎',tag:'虎符',action:'受虎符',color:'#558d95',desc:'私兵均衡，稳步推进',detail:'标营结阵，攻守兼备',units:['标营刀盾','亲兵队','督标精锐'],cap:9,cost:30,atk:13,hp:125,siege:1.1,characters:['江督','秦军督']},
 {id:'F3',name:'北原铁骑',mark:'狼',tag:'狼纛',action:'扬狼纛',color:'#81949e',desc:'人少械精，破关如风',detail:'精兵破关，人口更紧',units:['甲士','精锐甲士','狼纛亲卫'],cap:7,cost:34,atk:17,hp:142,siege:1.05,characters:['北原亲贵','附旗骑首']},
 {id:'F4',name:'王畿余烬',mark:'诏',tag:'北伐',action:'兴师北伐',color:'#bd9450',desc:'残军起势，蓄锐北伐',detail:'开局艰难，三星战力强',units:['残卒','敢死队','禁军锋'],cap:8,cost:36,atk:16,hp:96,siege:1.15,characters:['持节督师','残军校尉']}
];
const CITIES = [
 {id:0,name:'烽烟营',owner:'F1',x:225,y:445,gate:0,guard:0,towers:0,grain:90,gold:8,desc:'你的起始营城 · 边塞落脚处'},
 {id:1,name:'破关堡',owner:'F1',x:420,y:363,gate:210,guard:130,towers:1,grain:110,gold:10,desc:'旧关隘，守军疲敝。适宜初试锋芒。'},
 {id:2,name:'雁门驿',owner:'F2',x:625,y:465,gate:340,guard:210,towers:2,grain:135,gold:12,desc:'驿路交汇，箭楼相护。先合成再进军。'},
 {id:3,name:'朔风寨',owner:'F3',x:675,y:267,gate:500,guard:310,towers:2,grain:160,gold:14,desc:'高坡据险，甲士驻守。前排扛住箭雨。'},
 {id:4,name:'望烽台',owner:'F4',x:866,y:380,gate:730,guard:420,towers:3,grain:190,gold:16,desc:'残垣之间伏有援军，升星精兵可破。'},
 {id:5,name:'戍烟关',owner:'F2',x:953,y:212,gate:1050,guard:620,towers:4,grain:250,gold:24,boss:true,desc:'边塞主城。破门、巷战、夺旗，定此一州。'}
];
const AD_LIMITS={AD_IDLE_DOUBLE:10,AD_REVIVE:8,AD_RECRUIT:10};
function fresh(){return {version:1,faction:null,character:0,grain:480,gold:60,roster:[],nextId:1,owned:[],policies:{peace:0,army:0},pendingPolicy:null,lastAccrual:Date.now(),bankGrain:0,bankGold:0,lastSave:0,attempted:[],adDay:'',adCounts:{},adTimes:{},childMode:false,log:[],completed:false};}
class Game {
 constructor(saved,now=Date.now()){
  this.state=fresh();this.battle=null;
  if(saved && saved.version===1 && FACTIONS.some(f=>f.id===saved.faction)){
   const s={...fresh(),...saved};
   const valid=Number.isFinite(s.grain)&&s.grain>=0&&Number.isFinite(s.gold)&&s.gold>=0&&Array.isArray(s.roster)&&s.roster.length<=10&&s.roster.every(u=>Number.isInteger(u.id)&&[1,2,3].includes(u.star)&&Number.isInteger(u.slot)&&u.slot>=0&&u.slot<12)&&new Set(s.roster.map(u=>u.id)).size===s.roster.length&&new Set(s.roster.map(u=>u.slot)).size===s.roster.length&&Array.isArray(s.owned)&&s.owned.includes(0)&&s.owned.every(i=>Number.isInteger(i)&&i>=0&&i<6)&&Number.isFinite(s.lastAccrual)&&Number.isFinite(s.bankGrain)&&s.bankGrain>=0&&Number.isFinite(s.bankGold)&&s.bankGold>=0&&s.policies&&Number.isInteger(s.policies.peace)&&s.policies.peace>=0&&Number.isInteger(s.policies.army)&&s.policies.army>=0&&Array.isArray(s.attempted)&&s.attempted.every(i=>Number.isInteger(i)&&i>0&&i<6)&&[null,1,2,3,4,5].includes(s.pendingPolicy)&&s.adCounts&&s.adTimes&&Array.isArray(s.log)&&[0,1].includes(s.character);
   if(valid){this.state=s;this.state.nextId=Math.max(s.nextId||1,...s.roster.map(u=>u.id+1));this.accrue(now);}
  }
 }
 get faction(){return FACTIONS.find(f=>f.id===this.state.faction);}
 addLog(message){this.state.log.unshift(message);this.state.log=this.state.log.slice(0,12);}
 start(id,character=0,now=Date.now()){
  if(this.state.faction || !FACTIONS.some(f=>f.id===id)||![0,1].includes(character))return false;
  Object.assign(this.state,{faction:id,character,owned:[0],lastAccrual:now,grain:id==='F4'?390:480});
  this.state.roster=[{id:1,star:1,slot:6},{id:2,star:1,slot:7}];this.state.nextId=3;
  this.addLog(this.faction.characters[character]+'率军立营，边塞征途开启。');return true;
 }
 rate(){let grain=0,gold=0;for(const id of this.state.owned){grain+=CITIES[id].grain;gold+=CITIES[id].gold;}return {grain:grain*(1+this.state.policies.peace*.06)*(this.state.character===1?1.1:1),gold};}
 accrue(now=Date.now()){
  const hours=Math.min(8,Math.max(0,(now-this.state.lastAccrual)/3600000));
  if(this.faction){const r=this.rate();this.state.bankGrain+=r.grain*hours;this.state.bankGold+=r.gold*hours;}
  this.state.lastAccrual=Math.max(this.state.lastAccrual,now);return hours;
 }
 claim(multiplier=1){
  if(multiplier!==1&&multiplier!==2)return false;
  const grain=Math.floor(this.state.bankGrain)*multiplier,gold=Math.floor(this.state.bankGold)*multiplier;
  if(grain+gold===0)return false;
  this.state.grain+=grain;this.state.gold+=gold;
  this.state.bankGrain-=Math.floor(this.state.bankGrain);this.state.bankGold-=Math.floor(this.state.bankGold);
  this.addLog('领取军需：粮 '+grain+'，金 '+gold+'。');return {grain,gold};
 }
 cost(){return Math.max(12,Math.floor(this.faction.cost*(1-Math.min(.2,this.state.policies.army*.025))));}
 recruit(free=false){
  if(!this.faction||this.battle||this.state.roster.length>=this.faction.cap)return false;
  if(!free&&this.state.grain<this.cost())return false;
  if(!free)this.state.grain-=this.cost();
  let slot=0;while(this.state.roster.some(u=>u.slot===slot))slot++;
  this.state.roster.push({id:this.state.nextId++,star:1,slot});return true;
 }
 merge(a,b){
  if(this.battle||a===b)return false;
  const x=this.state.roster.find(u=>u.id===a),y=this.state.roster.find(u=>u.id===b);
  if(!x||!y||x.star!==y.star||x.star>=3)return false;
  x.star++;this.state.roster=this.state.roster.filter(u=>u.id!==b);return true;
 }
 autoMerge(){
  if(this.battle)return 0;
  let count=0,again=true;
  while(again){again=false;for(let star=1;star<3;star++){const pair=this.state.roster.filter(u=>u.star===star);if(pair.length>=2){this.merge(pair[0].id,pair[1].id);count++;again=true;break;}}}
  return count;
 }
 move(id,slot){
  if(this.battle||!Number.isInteger(slot)||slot<0||slot>=12)return false;
  const unit=this.state.roster.find(u=>u.id===id);if(!unit)return false;
  const other=this.state.roster.find(u=>u.slot===slot);if(other)other.slot=unit.slot;
  unit.slot=slot;return true;
 }
 stats(u){const scale=[0,1,2.5,6.5][u.star]*(this.faction.id==='F4'&&u.star===3?1.2:1);return {atk:this.faction.atk*scale*(1+this.state.policies.army*.07),hp:this.faction.hp*scale};}
 power(){return this.state.roster.reduce((n,u)=>n+this.stats(u).atk*10,0);}
 accessible(id){return id>0&&id<6&&!this.state.owned.includes(id)&&this.state.owned.includes(id-1)&&this.state.pendingPolicy===null;}
 surrenderChance(id){
  if(!this.accessible(id)||CITIES[id].owner!==this.state.faction||this.state.attempted.includes(id))return 0;
  const allies=this.state.owned.filter(i=>i===0||CITIES[i].owner===this.state.faction).length;
  return Math.min(.7,.25+.05*allies+(this.power()>CITIES[id].gate? .1:0)+(this.state.policies.peace>=2?.05:0));
 }
 surrender(id,rng=Math.random,now=Date.now()){
  if(this.battle)return false;
  const chance=this.surrenderChance(id);if(!chance)return false;
  this.state.attempted.push(id);
  const success=rng()<chance;
  if(success)this.occupy(id,true,now);else this.addLog(CITIES[id].name+'拒绝劝降，须以攻城定局。');
  return {success,chance};
 }
 occupy(id,peaceful=false,now=Date.now()){
  if(this.state.owned.includes(id))return false;
  this.accrue(now);this.state.owned.push(id);this.state.grain+=peaceful?65:140+id*30;this.state.gold+=peaceful?8:18;
  this.state.pendingPolicy=id;this.state.completed=id===5;
  this.addLog(CITIES[id].name+(peaceful?'归附。':'已定，军民暂安。'));return true;
 }
 policy(kind){
  if(!['peace','army'].includes(kind)||this.state.pendingPolicy===null)return false;
  this.state.policies[kind]++;this.state.pendingPolicy=null;
  this.addLog(kind==='peace'?'颁布安民：粮产 +6%，民心渐稳。':'颁布整军：攻势 +7%，募兵粮耗降低。');return true;
 }
 begin(id,now=Date.now()){
  if(this.battle||!this.accessible(id)||!this.state.roster.length)return false;
  const city=CITIES[id];
  this.battle={city:id,phase:'gate',gate:city.gate,guard:city.guard,elapsed:0,speed:1,paused:false,capture:0,result:null,revived:false,cooldownUntil:0,units:this.state.roster.map(u=>({...u,hp:this.stats(u).hp,maxHp:this.stats(u).hp,atk:this.stats(u).atk})),startedAt:now};return true;
 }
 tick(delta){
  const b=this.battle;if(!b||b.result||b.paused||b.phase==='flag'||delta<=0)return;
  // Substeps keep outcome independent of frame rate / acceleration.
  let remaining=Math.min(delta,.25)*b.speed;
  while(remaining>1e-8&&!b.result){const dt=Math.min(.025,remaining);remaining-=dt;b.elapsed+=dt;
   const alive=b.units.filter(u=>u.hp>0);
   if(!alive.length||b.elapsed>=100){b.result='defeat';b.cooldownUntil=Date.now()+3000;this.addLog('攻势受阻，永久兵牌保留。整军后可再战。');break;}
   const atk=alive.reduce((n,u)=>n+u.atk,0);
   if(b.phase==='gate'){
    b.gate=Math.max(0,b.gate-atk*this.faction.siege*(this.state.character===0?1.08:1)*dt);
    if(b.gate===0){b.phase='street';this.addLog('城门已破！推进巷战，肃清守军。');}
   }else if(b.phase==='street'){
    b.guard=Math.max(0,b.guard-atk*dt);if(b.guard===0)b.phase='flag';
   }
   if(b.phase!=='flag'){
    // Front row shields troops behind it; defender pressure grows by city.
    alive.sort((a,c)=>a.slot-c.slot);
    const target=alive[0],city=CITIES[b.city];
    const pressure=(city.towers*6.5+b.city*1.5)*(b.phase==='street'?.75:1);
    target.hp=Math.max(0,target.hp-pressure*dt);
   }
  }
 }
 capture(now=Date.now()){
  const b=this.battle;if(!b||b.result||b.phase!=='flag')return false;
  b.result='victory';this.occupy(b.city,false,now);return true;
 }
 leaveBattle(now=Date.now()){
  if(!this.battle||(!this.battle.result&&this.battle.elapsed>0)||this.battle.result==='defeat'&&now<this.battle.cooldownUntil)return false;
  this.battle=null;return true;
 }
 revive(){const b=this.battle;if(!b||b.result!=='defeat'||b.revived)return false;b.revived=true;b.result=null;b.elapsed=0;b.units.forEach(u=>u.hp=u.maxHp*.65);return true;}
 adAvailability(id,now=Date.now()){
  if(!AD_LIMITS[id]||this.state.childMode)return {ready:false,remainToday:0};
  const day=new Date(now).toISOString().slice(0,10);
  const count=this.state.adDay===day?(this.state.adCounts[id]||0):0;
  const remainToday=Math.max(0,AD_LIMITS[id]-count);
  return {ready:remainToday>0&&now-(this.state.adTimes[id]||0)>=30000,remainToday};
 }
 recordAd(id,now=Date.now()){
  if(!this.adAvailability(id,now).ready)return false;
  const day=new Date(now).toISOString().slice(0,10);
  if(this.state.adDay!==day){this.state.adDay=day;this.state.adCounts={};}
  this.state.adCounts[id]=(this.state.adCounts[id]||0)+1;this.state.adTimes[id]=now;return true;
 }
 serialize(now=Date.now()){this.state.lastSave=now;return JSON.stringify(this.state);}
}
const API={Game,FACTIONS,CITIES,AD_LIMITS};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.Ember=API;
})(typeof globalThis!=='undefined'?globalThis:this);
