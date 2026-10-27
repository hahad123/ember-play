(function(root){
'use strict';
function create(options){
 const E=options.core||root.Ember, wxapi=options.wx, canvas=options.canvas, ctx=canvas.getContext('2d');
 const W=1440,H=900, KEY='ember-balance-v1';
 const C={bg:'#dfd0ad',paper:'#f5e8c8',ink:'#382e25',muted:'#897b60',line:'#bc9e6a',gold:'#b48638',red:'#a8442c',teal:'#476a58',night:'#302c26'};
 const art={};
 for(const name of ['units','map','battle']){
  const img=wxapi?wxapi.createImage():new Image();
  art[name]={img,ready:false};img.onload=()=>art[name].ready=true;
  img.onerror=()=>notify('美术资源未加载，请保留完整 assets 文件夹。');
  img.src=options.artData?.[name]||root.EmberArtData?.[name]||'assets/'+name+'.png';
 }
 function artwork(name,x,y,w,h){if(!art[name].ready)return false;ctx.drawImage(art[name].img,x,y,w,h);return true;}
 function figure(col,row,x,y,w,h,flip=false){
  if(!art.units.ready)return false;
  const img=art.units.img,sw=img.width/4,sh=img.height/5;
  ctx.save();if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);x=0;y=0;}
  ctx.drawImage(img,col*sw+sw*.008,row*sh+sh*.03,sw*.984,sh*.95,x,y,w,h);ctx.restore();return true;
 }
 function factionIndex(){return game.faction?E.FACTIONS.indexOf(game.faction):selectedFaction;}
 let scale=1,screenW=W,screenH=H,buttons=[],screen='factions',selectedFaction=0,character=0,selectedCity=1,selectedUnit=null,tab='map',modal=null,toast='',toastUntil=0,clock=0,last=0,lastAccrue=0,lastSave=0,adBusy=false,hover='',drag=null,game;
 function read(){try{return JSON.parse(wxapi?wxapi.getStorageSync(KEY):localStorage.getItem(KEY));}catch{return null;}}
 game=new E.Game(read());if(game.faction)screen='map';
 function save(){try{const value=game.serialize();if(wxapi)wxapi.setStorageSync(KEY,value);else localStorage.setItem(KEY,value);}catch{notify('存档写入失败，请检查存储空间或浏览器权限。');}}
 function notify(s){toast=s;toastUntil=Date.now()+3600;}
 function resize(){
  const info=wxapi?(wxapi.getWindowInfo?wxapi.getWindowInfo():wxapi.getSystemInfoSync()):{windowWidth:window.innerWidth,windowHeight:window.innerHeight,pixelRatio:window.devicePixelRatio};
  screenW=info.windowWidth;screenH=info.windowHeight;scale=Math.min(screenW/W,screenH/H);
  const dpr=Math.min(info.pixelRatio||1,2);canvas.width=Math.round((wxapi?screenW:W*scale)*dpr);canvas.height=Math.round((wxapi?screenH:H*scale)*dpr);
  if(canvas.style){canvas.style.width=W*scale+'px';canvas.style.height=H*scale+'px';}
  ctx.setTransform(scale*dpr,0,0,scale*dpr,wxapi?(screenW-W*scale)*dpr/2:0,wxapi?(screenH-H*scale)*dpr/2:0);
 }
 function rr(x,y,w,h,r=12){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
 function box(x,y,w,h,fill,stroke=null,r=12){
  rr(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(fill===C.paper&&w>100&&h>80){const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#fff4d333');g.addColorStop(.5,'#b48b3808');g.addColorStop(1,'#8b592a22');ctx.fillStyle=g;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();if(fill===C.paper&&w>200&&h>200){rr(x+5,y+5,w-10,h-10,Math.max(3,r-4));ctx.strokeStyle='#bca06a66';ctx.stroke();}}
 }
 function text(s,x,y,size=18,color=C.ink,weight='normal',align='left'){ctx.font=weight+' '+size+'px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y);}
 function lines(s,x,y,max=25,size=17,color=C.muted){let row='',line=0;for(const ch of s){if(ch==='\n'||row.length>=max){text(row,x,y+line*(size+11),size,color);line++;row='';if(ch==='\n')continue;}row+=ch;}if(row)text(row,x,y+line*(size+11),size,color);}
 function line(x,y,a,b,color=C.line,width=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function dot(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
 function button(label,x,y,w,h,fn,style='primary',disabled=false,id=label){
  const over=hover===id&&!disabled;
  const fill=disabled?'#dedbce':style==='primary'?(over?'#587e74':C.teal):style==='red'?C.red:style==='dark'?C.night:over?'#eee4ce':C.paper;
  box(x,y,w,h,fill,style==='outline'?C.line:null,8);
  if(!disabled){rr(x+2,y+2,w-4,h-4,6);ctx.strokeStyle=style==='outline'?'#fff5d6':'#d5b36b';ctx.lineWidth=1;ctx.stroke();line(x+9,y+h-4,x+w-9,y+h-4,'#211d2333',2);}
  text(label,x+w/2,y+h/2,16,disabled?'#9b9c90':['primary','red','dark'].includes(style)?'#fff7e7':C.ink,'bold','center');
  buttons.push({x,y,w,h,fn,disabled,id});
 }
 function hit(x,y,w,h,fn,id){buttons.push({x,y,w,h,fn,disabled:false,id});}
 function pill(s,x,y,color=C.teal){box(x,y,ctx.measureText(s).width+24,26,color,null,5);text(s,x+12,y+13,12,'#fff7e7');}
 function emblem(f,x,y,r=43){
  dot(x,y,r+7,f.color+'22');dot(x,y,r,f.color);dot(x,y,r-6,C.night);
  ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.stroke();text(f.mark,x,y+1,r*.78,'#e9dbb8','bold','center');
 }
 function mountain(x,y,w,h,color){ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x-w*.2,y-h*.55);ctx.lineTo(x-w*.1,y-h*.42);ctx.lineTo(x+w*.06,y-h);ctx.lineTo(x+w*.32,y-h*.36);ctx.lineTo(x+w/2,y);ctx.closePath();ctx.fillStyle=color;ctx.fill();}
 function castle(x,y,size,color,flag=true){
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);
  ctx.save();ctx.scale(1,.3);dot(0,42,40,'#362f2b44');ctx.restore();
  box(-32,-15,64,34,'#8f907b','#493e30',2);
  for(let row=0;row<3;row++){line(-31,-6+row*10,31,-6+row*10,'#bfc1a4',1);for(let col=0;col<5;col++)line(-29+col*14+(row%2)*5,-15+row*10,-29+col*14+(row%2)*5,-6+row*10,'#656f5e');}
  for(const tx of [-36,21]){box(tx,-31,15,51,'#aaa58b','#493e30',2);box(tx+4,-21,6,12,'#343a30',null,2);}
  box(-20,-46,40,30,color,'#493e30',2);box(-11,-36,22,14,'#463d2c',null,2);
  ctx.beginPath();ctx.moveTo(-29,-46);ctx.quadraticCurveTo(-11,-45,0,-62);ctx.quadraticCurveTo(11,-45,29,-46);ctx.lineTo(23,-38);ctx.lineTo(-23,-38);ctx.closePath();ctx.fillStyle='#46544b';ctx.fill();ctx.strokeStyle='#382d25';ctx.lineWidth=2;ctx.stroke();
  for(let k=0;k<6;k++)box(-28+k*11,-22,6,9,'#c0b99a','#675c43',1);
  box(-9,-7,18,27,C.night,'#4c3b27',9);line(0,-62,0,-89,'#564630',2);
  if(flag){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(1,-68);ctx.lineTo(27,-62);ctx.lineTo(1,-53);ctx.fill();}
  ctx.restore();
 }
 function soldier(x,y,color,star=1,size=1,facing=1){
  if(figure(factionIndex(),star-1,x-28.5*size,y-38*size,57*size,57*size,facing<0))return;
  ctx.save();ctx.translate(x,y);ctx.scale(size*facing,size);dot(0,-19,7,'#d8c5a3');
  box(-9,-11,18,20,color,null,3);ctx.fillStyle=C.night;ctx.fillRect(-8,8,6,10);ctx.fillRect(3,8,6,10);
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-8,-22);ctx.lineTo(0,-32);ctx.lineTo(8,-22);ctx.fill();
  line(12,-28,12,13,'#685a48',2);line(9,-29,12,-38,'#c6c8bd',3);
  if(star>1){box(-13,-9,7,22,'#b9a376',null,2);}
  if(star===3){ctx.fillStyle='#d2ab57';ctx.fillRect(-4,-31,8,4);}
  ctx.restore();
 }
 function header(subtitle){
  box(0,0,W,88,C.night,null,0);text('烬土争衡',40,37,30,'#f1e4c7','bold');text('JIN TU · BORDERLANDS',42,67,10,'#a6afa2');
  text(subtitle,268,44,18,'#d2d6c7');
  if(game.faction){
   for(const [i,label,value] of [[0,'粮',Math.floor(game.state.grain)],[1,'金',Math.floor(game.state.gold)],[2,'城',game.state.owned.length+'/6']]){
    const x=822+i*149;box(x,22,133,44,'#2d3c3f',null,7);dot(x+22,44,12,i===0?'#c7a15a':i===1?'#b8a86a':'#78968c');text(label,x+22,44,12,C.night,'bold','center');text(value,x+48,44,18,'#f5ead0','bold');
   }
   button('设置',1289,22,108,44,()=>modal={type:'settings'},'dark');
  }else{text('架空历史策略 · 首章原型',1395,44,15,'#bdc4b5','normal','right');}
 }
 function footer(){text('架空历史策略玩法，与真实历史无关。',32,875,13,C.muted);text('P0 · 边塞初章    /    本地自动存档',1408,875,12,C.muted,'normal','right');}
 function factionScreen(){
  header('择一旗帜，开启征途');text('山河待定，烽火由你落笔。',W/2,153,36,C.ink,'bold','center');
  text('王朝将倾，群雄并起。择一路势力，破城定乱。',W/2,202,18,C.muted,'normal','center');
  E.FACTIONS.forEach((f,i)=>{
   const x=56+i*334,y=260,w=310;
   box(x+3,y+8,w,420,'#d7d0bd',null,16);box(x,y,w,420,C.paper,C.line,16);
   box(x,y,w,8,f.color,null,4);
   if(!figure(i,3,x+66,y+12,178,153))emblem(f,x+w/2,y+93,49);
   text(f.tag,x+w/2,y+168,13,f.color,'bold','center');text(f.name,x+w/2,y+208,28,C.ink,'bold','center');
   text(f.desc,x+w/2,y+252,17,C.muted,'normal','center');line(x+32,y+285,x+w-32,y+285);
   text(f.units.join(' → '),x+w/2,y+315,14,C.ink,'normal','center');
   button(f.action,x+27,y+352,w-54,46,()=>{selectedFaction=i;character=0;screen='characters';},'primary',false,'faction-'+i);
  });
  text('兵种绑定势力，本档不可混编。',W/2,732,17,C.gold,'bold','center');
  text('合成升星，一屏破城     /     四路势力，兵种不混编     /     挂机养兵，回来继续定乱',W/2,780,15,C.muted,'normal','center');footer();
 }
 function characterScreen(){
  const f=E.FACTIONS[selectedFaction];header(f.name+' · 选择主将');button('← 返回势力',45,115,150,42,()=>screen='factions','outline');
  emblem(f,W/2,164,32);text('以'+f.tag+'之名，出征边塞',W/2,238,32,C.ink,'bold','center');
  f.characters.forEach((name,i)=>{
   const x=345+i*390;box(x,285,350,365,character===i?'#f2dfb1':C.paper,character===i?f.color:C.line,12);
   ctx.save();const halo=ctx.createRadialGradient(x+175,440,5,x+175,440,125);halo.addColorStop(0,f.color+'44');halo.addColorStop(1,f.color+'00');ctx.fillStyle=halo;ctx.fillRect(x+38,299,274,240);ctx.restore();
   if(!figure(selectedFaction,3+i,x+62,297,226,239))soldier(x+175,460,f.color,3,3);
   text(name,x+175,553,27,C.ink,'bold','center');
   text(i===0?'破阵 · 首门伤害 +8%':'屯田 · 挂机粮产 +10%',x+175,589,16,C.muted,'normal','center');
   button(character===i?'已选主将':'选择主将',x+77,610,196,30,()=>character=i,character===i?'primary':'outline');
  });
  button('立营 · 开启边塞征途',510,675,420,58,()=>{game.start(f.id,character);screen='map';save();notify('两张起始兵牌已入营。先合成，再进军！');});
  text('本章共六城 · 从一座起始营城出发 · 人物不改变兵种树',W/2,778,16,C.muted,'normal','center');footer();
 }
 function sidebar(){
  box(24,112,258,730,C.paper,C.line,12);emblem(game.faction,77,165,27);
  text(game.faction.name,122,153,22,C.ink,'bold');text(game.faction.characters[game.state.character],122,182,14,C.muted);
  line(45,220,260,220);
  const nav=[['map','边塞舆图','六城定乱 · 择城进军'],['camp','军营合成','同名同星 · 二合为一'],['codex','兵种图鉴','本势力专属兵树'],['journal','征途手记','军令与战事记录']];
  nav.forEach(([id,title,desc],i)=>{
   const y=243+i*80;box(39,y,228,65,tab===id?'#e2e9dd':C.paper,null,8);
   text(title,60,y+23,19,tab===id?C.teal:C.ink,'bold');text(desc,60,y+48,12,C.muted);
   if(tab===id)box(39,y+14,4,35,C.teal,null,2);
   hit(39,y,228,65,()=>{tab=id;selectedUnit=null;},'nav-'+id);
  });
  line(45,590,260,590);text('军需粮仓',47,620,18,C.ink,'bold');text('占城越多，挂机产出越高',47,650,13,C.muted);
  const rate=game.rate();text('每小时 '+Math.round(rate.grain)+' 粮 · '+rate.gold+' 金',47,679,14,C.gold);
  text('待领 '+Math.floor(game.state.bankGrain)+' 粮',47,721,24,C.teal,'bold');
  button('领取军需',45,754,216,45,()=>modal={type:'idle'},'primary');
  text('离线结算上限 8 小时',153,820,12,C.muted,'normal','center');
 }
 function mapPosition(city){return {x:300+city.x*.78,y:210+city.y*.84};}
 function worldMap(){
  text('边塞州',318,142,29,C.ink,'bold');pill('第一州 · 黄土关隘',435,128,C.teal);
  text('烽火连营，先定一州。',318,181,16,C.muted);text('已占领 '+game.state.owned.length+' / 6',1066,145,16,C.gold,'bold','right');
  box(306,207,790,510,'#e2dfcb',null,12);
  ctx.save();rr(306,207,790,510,12);ctx.clip();
  if(!artwork('map',306,207,790,510)){
   for(let i=0;i<12;i++)mountain(320+i*81,337+(i%3)*34,150,95+(i%4)*20,'#bdc5b3');
  }
  ctx.setLineDash([8,7]);
  for(let i=1;i<6;i++){
   const a=mapPosition(E.CITIES[i-1]),b=mapPosition(E.CITIES[i]);
   line(a.x,a.y,b.x,b.y,'#533a20aa',6);line(a.x,a.y,b.x,b.y,game.state.owned.includes(i-1)?'#fff0bd':'#e0cc9d',3);
  }
  ctx.setLineDash([]);
  E.CITIES.forEach(city=>{
   const {x,y}=mapPosition(city),owned=game.state.owned.includes(city.id),open=game.accessible(city.id),selected=selectedCity===city.id;
   if(selected){dot(x,y,49,'#f6edcf');ctx.beginPath();ctx.arc(x,y,48,0,Math.PI*2);ctx.strokeStyle=C.gold;ctx.lineWidth=2;ctx.stroke();}
   if(open){ctx.beginPath();ctx.arc(x,y,43+Math.sin(clock*2)*3,0,Math.PI*2);ctx.strokeStyle='#ae825855';ctx.lineWidth=2;ctx.stroke();}
   castle(x,y+2,city.boss?.9:.7,owned?C.teal:open?C.red:'#8f9687');
   box(x-55,y+23,110,28,owned?'#eaf0df':'#f4efdd',null,5);text(city.name,x,y+37,15,owned?C.teal:C.ink,'bold','center');
   if(owned)text('已占领',x,y+60,11,C.teal,'normal','center');else if(open)text(city.owner===game.state.faction?'同旗 · 可劝降':'敌城 · 须攻破',x,y+60,11,C.red,'normal','center');
   hit(x-54,y-48,108,118,()=>selectedCity=city.id,'city-'+city.id);
  });ctx.restore();
  box(306,736,790,105,C.paper,C.line,10);text('六州征途',329,763,15,C.ink,'bold');
  ['边塞','中原','江淮','巴山','岭海','王畿'].forEach((r,i)=>{dot(345+i*132,806,5,i===0?C.teal:'#cbcbbb');text(r,362+i*132,806,14,i===0?C.teal:C.muted);});
  text('P0 开放边塞州，其余州后续扩展',1073,762,12,C.muted,'normal','right');
  cityPanel();
 }
 function cityPanel(){
  const city=E.CITIES[selectedCity],owned=game.state.owned.includes(city.id),accessible=game.accessible(city.id),ally=city.owner===game.state.faction;
  box(1116,112,300,730,C.paper,C.line,12);text(city.boss?'边塞主城':'城池情报',1140,147,13,C.gold,'bold');
  castle(1265,242,1.5,owned?C.teal:C.red);text(city.name,1266,312,32,C.ink,'bold','center');
  text(owned?'我方领地':E.FACTIONS.find(f=>f.id===city.owner).name+' 驻军',1266,351,14,owned?C.teal:C.red,'normal','center');
  line(1140,384,1392,384);lines(city.desc,1140,416,14,16);
  text('城门耐久',1140,502,15,C.muted);text(city.gate,1390,502,20,C.ink,'bold','right');
  text('箭楼 / 守军',1140,542,15,C.muted);text(city.towers+' / '+city.guard,1390,542,18,C.ink,'bold','right');
  text('占领产出',1140,582,15,C.muted);text(city.grain+' 粮/时',1390,582,18,C.gold,'bold','right');
  text('我军战力 '+Math.round(game.power()),1266,631,16,C.teal,'bold','center');
  if(owned){button('已纳入疆土',1140,680,252,49,()=>{},'outline',true);text('持续为军营供给粮饷',1266,755,14,C.muted,'normal','center');}
  else{
   button(accessible?'布阵攻城':'前路未通',1140,679,252,49,()=>{screen='battle';selectedUnit=null;},'primary',!accessible);
   if(ally){const p=game.surrenderChance(city.id);button(p?'劝降 · '+Math.round(p*100)+'%':'劝降已败 · 须攻城',1140,744,252,45,()=>modal={type:'surrender',city:city.id},'outline',!p);}
   else text(accessible?'敌城不可劝降，破门方可易主。':game.state.pendingPolicy!==null?'请先颁布占城政令。':'须先占领前一座城池。',1266,768,13,C.muted,'normal','center');
  }
 }
 function unitGrid(x,y,cw=160,ch=114){
  for(let slot=0;slot<12;slot++){
   const col=slot%6,row=Math.floor(slot/6),px=x+col*(cw+10),py=y+row*(ch+10),u=game.state.roster.find(u=>u.slot===slot);
   box(px,py,cw,ch,selectedUnit===u?.id?'#efe1b9':u?C.paper:'#e7e6d6',selectedUnit===u?.id?C.gold:C.line,8);
   if(u){
    soldier(px+cw/2,py+46,game.faction.color,u.star,1.2);text('★'.repeat(u.star),px+cw/2,py+75,13,C.gold,'bold','center');
    text(game.faction.units[u.star-1],px+cw/2,py+98,14,C.ink,'bold','center');
   }else text('＋',px+cw/2,py+ch/2,24,'#b8bea9','normal','center');
   if(!game.battle)hit(px,py,cw,ch,()=>{
    if(selectedUnit&&u&&selectedUnit!==u.id){if(game.merge(selectedUnit,u.id))notify('合成成功 · 升星精兵');else {game.move(selectedUnit,slot);notify('阵位已交换');}selectedUnit=null;}
    else if(selectedUnit&&!u){game.move(selectedUnit,slot);selectedUnit=null;}
    else selectedUnit=u? (selectedUnit===u.id?null:u.id):null;
    save();
   },'slot-'+slot);
  }
 }
 function recruit(){if(game.recruit()){save();notify('新兵已入营 · '+game.faction.units[0]);}else notify(game.state.roster.length>=game.faction.cap?'人口已满，合成可腾出阵位。':'粮草不足，可领取挂机军需。');}
 function mergeAll(){const n=game.autoMerge();save();selectedUnit=null;notify(n?'完成 '+n+' 次合成':'需要两张同名同星兵牌，最高三星。');}
 function camp(){
  text('军营 · 合成升星',319,146,29,C.ink,'bold');text('点击一张兵牌，再点同星兵牌合成；点击空格移动，异星交换阵位。',319,192,16,C.muted);
  box(306,226,1110,118,C.night,null,12);emblem(game.faction,366,285,29);
  text('只募本势力兵种，永久兵牌在战败后保留。',423,267,23,'#f6ebd4','bold');text('前排先承伤 · 两张一星合二星 · 两张二星合三星',423,308,16,'#b7c4b6');
  text('前排 · 优先承受箭楼攻击',320,383,14,C.muted);unitGrid(320,412,168,114);
  text('人口 '+game.state.roster.length+' / '+game.faction.cap,321,708,18,C.ink,'bold');text('战力 '+Math.round(game.power()),520,708,18,C.teal,'bold');
  button('募兵 · '+game.cost()+' 粮',320,754,270,56,recruit,'primary',game.state.roster.length>=game.faction.cap||game.state.grain<game.cost());
  button('一键合成',610,754,240,56,mergeAll,'outline');
  button(adLabel('AD_RECRUIT','免费募兵'),870,754,300,56,()=>rewardAd('AD_RECRUIT'), 'outline',!canAd('AD_RECRUIT')||game.state.roster.length>=game.faction.cap);
  if(options.platform==='wechat')text('广告位未配置时不发奖',1195,782,12,C.muted);
 }
 function codex(){
  text('兵种图鉴',320,147,30,C.ink,'bold');text('本势力已开放一条兵线 · 其余兵线与六州为后续开发内容',320,192,16,C.muted);
  for(let i=0;i<3;i++){
   const x=323+i*365;box(x,253,335,460,C.paper,C.line,12);text('0'+(i+1)+' / 合成阶位',x+28,288,13,C.gold,'bold');
   soldier(x+168,425,game.faction.color,i+1,3.3);text('★'.repeat(i+1),x+168,508,22,C.gold,'bold','center');text(game.faction.units[i],x+168,556,28,C.ink,'bold','center');
   const stats=game.stats({star:i+1});text('攻击 '+Math.round(stats.atk)+'   体力 '+Math.round(stats.hp),x+168,604,18,C.muted,'normal','center');
   text(i===0?'兵营直接招募':i===1?'两张一星兵牌合成':'两张二星兵牌合成 · 满星',x+168,663,16,C.teal,'normal','center');
  }
  lines('不缴获敌方兵牌，不混编他营兵种。势力选择在本档内锁定。',325,777,50,17);
 }
 function journal(){
  text('征途手记',321,147,30,C.ink,'bold');text('每一次破门，都是重整山河的一笔。',321,193,17,C.muted);
  box(306,234,1110,607,C.paper,C.line,12);
  game.state.log.slice(0,9).forEach((s,i)=>{dot(340,274+i*58,4,i===0?C.red:C.gold);text(s,363,274+i*58,17,i===0?C.ink:C.muted);if(i<8)line(363,300+i*58,1380,300+i*58);});
 }
 function mapScreen(){header('第一章 / 边塞烽烟');sidebar();if(tab==='map')worldMap();if(tab==='camp')camp();if(tab==='codex')codex();if(tab==='journal')journal();footer();}
 function battleScreen(){
  const city=E.CITIES[selectedCity],b=game.battle;header(city.name+' · '+(b?b.phase==='gate'?'破门':b.phase==='street'?'巷战':'夺旗':'战前布阵'));
  if(!b)button('← 返回舆图',28,108,160,40,()=>screen='map','outline');
  else {text('战时永久兵牌保留 · 本局兵力受损',35,129,14,C.muted);button(b.paused?'继续':'暂停',1150,105,106,40,()=>b.paused=!b.paused,'outline',!!b.result);button('× '+b.speed,1274,105,133,40,()=>b.speed=b.speed===1?1.5:b.speed===1.5?2:1,'outline',!!b.result);}
  const gate=b?b.gate:city.gate,guard=b?b.guard:city.guard;
  box(24,163,1392,410,'#dce0ca',null,12);
  ctx.save();rr(24,163,1392,410,12);ctx.clip();
  const painted=artwork('battle',24,163,1392,675);
  if(!painted){
   for(let i=0;i<12;i++)mountain(i*145,315,230,100+i%3*35,'#b6c2ad');
   box(72,254,1296,142,'#9c9e87',null,0);
   for(let i=0;i<33;i++)box(73+i*40,232,25,29,'#9c9e87',null,1);
   box(650,285,140,114,gate>0?'#75624b':'#313f38',null,56);
  }
  if(gate===0){
   box(655,323,130,88,'#272b25',null,51);
   const glow=ctx.createLinearGradient(0,330,0,411);glow.addColorStop(0,'#1b211b');glow.addColorStop(1,'#695a3a');
   box(663,329,114,82,glow,null,45);
   for(let i=0;i<8;i++)box(635+i*24,407+Math.sin(i)*7,17,9,'#9f9375','#665336',2);
   text('城门已破',720,370,20,'#f0d89b','bold','center');
  }
  if(guard>0){
   const enemyCol=E.FACTIONS.findIndex(f=>f.id===city.owner);
   for(let i=0;i<Math.min(8,city.towers*2+2);i++)figure(enemyCol,0,300+i*112,263,39,42);
  }
  line(895,240,895,333,C.night,4);ctx.fillStyle=game.faction.color;ctx.beginPath();ctx.moveTo(898,240);ctx.lineTo(953,250);ctx.lineTo(898,273);ctx.fill();text('旗',920,255,13,C.paper,'bold','center');
  if(b){
   const alive=b.units.filter(u=>u.hp>0);
   alive.forEach((u,i)=>{
    const moving=b.phase==='gate'?Math.min(1,b.elapsed/3):b.phase==='street'?1.2:1.6;
    const row=Math.floor(u.slot/6);
    const x=380+(u.slot%6)*150+row*55+Math.sin(clock*3+i)*2,y=500-moving*40+row*28;
    const bob=b.paused||b.result?0:Math.sin(clock*8+i)*2;
    soldier(x-19,y-9+bob,game.faction.color,u.star,1.25);
    soldier(x+19,y-9-bob,game.faction.color,u.star,1.25);
    soldier(x,y+9+bob,game.faction.color,u.star,1.4);
    line(x-31,y-12,x-31,y-91,'#65472b',2);
    ctx.fillStyle=game.faction.color;ctx.beginPath();ctx.moveTo(x-30,y-90);ctx.lineTo(x+4,y-83+Math.sin(clock*3+i)*2);ctx.lineTo(x-30,y-66);ctx.fill();
    ctx.strokeStyle='#e5c885';ctx.lineWidth=1;ctx.stroke();
    text(game.faction.mark,x-21,y-79,10,'#ffe6ab','bold','center');
    box(x-25,y-100,50,6,'#503d2c',null,2);box(x-24,y-99,48*u.hp/u.maxHp,4,'#90b65d',null,2);
    if(!b.paused&&b.phase!=='flag'&&Math.sin(clock*3+i)>0.85)text('-'+Math.round(u.atk),690+(i%3)*27,281-(clock*35+i*10)%70,17,C.red,'bold');
   });
   if(!b.paused&&b.phase!=='flag')for(let i=0;i<city.towers;i++)line(240+i*300,280,450+i*130+(clock*120)%80,470,'#8c7a53',2);
   if(b.phase==='flag'&&!b.result)button('点旗 · 占领此城',568,432,304,55,()=>{game.capture();save();},'red');
  }else{
   box(440,448,560,55,'#f7e8c7dd','#987144',8);text('前排顶住箭雨，合成精兵再发起进攻',720,475,23,C.ink,'bold','center');
   text('击破城门 → 肃清巷战 → 点旗占城',720,526,16,C.muted,'normal','center');
  }
  ctx.restore();
  text('城门',52,598,14,C.muted);box(103,590,420,14,'#d5d4be',null,5);box(103,590,420*gate/city.gate,14,C.red,null,5);text(Math.ceil(gate)+' / '+city.gate,540,598,14,C.ink);
  text('守军 '+Math.ceil(guard),735,598,15,C.muted);text('人口 '+game.state.roster.length+'/'+game.faction.cap+'  ·  战力 '+Math.round(game.power()),1385,598,16,C.teal,'bold','right');
  if(!b){
   unitGrid(35,627,143,90); // Compact cards retain 2-row formation.
   button('募兵 · '+game.cost()+' 粮',990,630,195,47,recruit,'primary',game.state.roster.length>=game.faction.cap||game.state.grain<game.cost());
   button('一键合成',1200,630,200,47,mergeAll,'outline');
   button(adLabel('AD_RECRUIT','免费募兵'),990,693,410,43,()=>rewardAd('AD_RECRUIT'),'outline',!canAd('AD_RECRUIT')||game.state.roster.length>=game.faction.cap);
   button('擂鼓 · 开始攻城',990,759,410,73,()=>{if(game.begin(selectedCity))save();else notify('请先募兵并完成上座城的政令。');},'red',game.state.roster.length===0);
  }else{
   box(35,631,1365,205,C.paper,C.line,12);
   const stage=b.result==='victory'?'城池已定':b.result==='defeat'?'攻势受阻':b.paused?'鸣金暂歇':b.phase==='gate'?'正在破门':b.phase==='street'?'推进巷战':'守军已退 · 点击旗帜';
   text(stage,70,675,30,b.result==='defeat'?C.red:C.teal,'bold');
   const living=b.units.filter(u=>u.hp>0).length; text('存活 '+living+' / '+b.units.length+'  ·  '+b.elapsed.toFixed(1)+' 秒',70,722,18,C.muted);
   text('败退不损失永久兵牌；募兵耗粮不会退还。',70,780,15,C.muted);
   if(b.result==='victory')button('颁布政令 →',1035,699,310,68,()=>{game.leaveBattle();screen='map';selectedCity=Math.min(5,selectedCity+1);modal={type:'policy'};save();});
   else if(b.result==='defeat'){
    const cooling=Date.now()<b.cooldownUntil;
    button(cooling?'整军稍候…':'返回军营 · 再整旗鼓',1000,662,350,53,()=>{game.leaveBattle();screen='map';tab='camp';save();},'primary',cooling);
    button(adLabel('AD_REVIVE','保留阵容再战'),1000,741,350,50,()=>rewardAd('AD_REVIVE'),'outline',b.revived||!canAd('AD_REVIVE'));
   }else{text(b.paused?'点击右上角继续进军。':'自动攻城中，可自由切换 ×1 / ×1.5 / ×2。',1000,723,16,C.muted,'normal','center');}
  }
  footer();
 }
 function adLabel(id,reward){
  if(game.state.childMode)return '儿童模式 · 广告已关闭';
  if(options.platform==='wechat'&&!options.adUnits?.[id])return '暂无广告';
  const availability=game.adAvailability(id);
  if(availability.remainToday===0)return '今日次数已用完';
  if(!availability.ready)return '视频冷却中 · 请稍候';
  return (options.platform==='web'?'模拟视频':'激励视频')+' · '+reward;
 }
 function canAd(id){return !adBusy&&game.adAvailability(id).ready&&(options.platform==='web'||!!options.adUnits?.[id]);}
 function applyReward(id){
  if(!game.recordAd(id))return notify('今日次数已用完或仍在冷却。');
  let ok=false;
  if(id==='AD_IDLE_DOUBLE')ok=game.claim(2);
  if(id==='AD_RECRUIT')ok=game.recruit(true);
  if(id==='AD_REVIVE')ok=game.revive();
  if(ok){notify('完整观看奖励已领取');save();}else notify('当前状态无法领取该奖励。');
 }
 function endAd(id,ok,previousPaused){adBusy=false;modal=null;if(game.battle)game.battle.paused=previousPaused;if(ok)applyReward(id);else notify('未完整观看，不发放奖励。');}
 function rewardAd(id){
  if(!canAd(id))return notify('暂无广告，或次数已用完；可继续正常游戏。');
  if(id==='AD_RECRUIT'&&(game.battle||game.state.roster.length>=game.faction.cap))return;
  if(id==='AD_IDLE_DOUBLE'&&Math.floor(game.state.bankGrain)+Math.floor(game.state.bankGold)===0)return;
  if(id==='AD_REVIVE'&&(!game.battle||game.battle.result!=='defeat'||game.battle.revived))return;
  adBusy=true;const paused=game.battle?.paused||false;if(game.battle)game.battle.paused=true;
  if(options.platform==='web'){modal={type:'ad',id,started:Date.now(),paused};return;}
  const ad=wxapi.createRewardedVideoAd({adUnitId:options.adUnits[id]});let finished=false;
  const done=ok=>{if(finished)return;finished=true;ad.offClose(onClose);ad.offError(onError);endAd(id,ok,paused);};
  const onClose=result=>done(result?.isEnded===true),onError=()=>{done(false);notify('暂无广告，可继续正常游戏。');};
  ad.onClose(onClose);ad.onError(onError);ad.show().catch(()=>ad.load().then(()=>ad.show()).catch(onError));
 }
 function drawModal(){
  const m=modal;buttons=[];box(0,0,W,H,'#152327bb',null,0);
  const x=410,y=220,w=620,h=460;box(x,y,w,h,C.paper,null,17);
  if(m.type!=='policy')button('关闭',x+w-102,y+20,76,35,()=>{if(m.type==='ad')endAd(m.id,false,m.paused);else modal=null;},'outline');
  if(m.type==='idle'){
   text('粮仓已备，待君调度',x+35,y+56,28,C.ink,'bold');text('已占 '+game.state.owned.length+' 城 · 离线收益上限 8 小时',x+35,y+111,17,C.muted);
   text(Math.floor(game.state.bankGrain)+' 粮',x+w/2,y+197,52,C.teal,'bold','center');text('另有 '+Math.floor(game.state.bankGold)+' 金',x+w/2,y+255,20,C.gold,'normal','center');
   button('直接领取',x+35,y+320,250,54,()=>{const r=game.claim();modal=null;save();notify(r?'军需已入库':'暂无可领取的整份收益');},'primary');
   button(adLabel('AD_IDLE_DOUBLE','双倍领取'),x+302,y+320,283,54,()=>rewardAd('AD_IDLE_DOUBLE'),'outline',!canAd('AD_IDLE_DOUBLE')||Math.floor(game.state.bankGrain)+Math.floor(game.state.bankGold)===0);
   text(options.platform==='web'?'开发模拟广告 · 不连接真实广告网络':'未配置广告时可直接领取基础收益',x+w/2,y+410,14,C.muted,'normal','center');
  }
  if(m.type==='surrender'){
   text('遣使劝降 · '+E.CITIES[m.city].name,x+35,y+60,27,C.ink,'bold');text('同旗旧部，可尝试不战而定。',x+35,y+123,18,C.muted);
   text(Math.round(game.surrenderChance(m.city)*100)+'%',x+w/2,y+215,64,C.teal,'bold','center');
   lines('成功即获粮饷与产出，不获得敌方兵牌。失败后此城必须攻破，不可重复劝降。',x+35,y+291,29,17);
   button('派遣使者 · 免费',x+35,y+369,550,54,()=>{const result=game.surrender(m.city);save();if(result?.success)modal={type:'policy'};else{modal=null;notify('劝降未成，守军拒守。请整军攻城。');}});
  }
  if(m.type==='policy'){
   const id=game.state.pendingPolicy;
   text(game.state.completed?'边塞已定，重整山河':'城池已定 · 颁布政令',x+35,y+61,29,C.ink,'bold');text('为'+E.CITIES[id||0].name+'选择一道新令',x+35,y+119,18,C.muted);
   for(const [i,kind,title,desc] of [[0,'peace','安民','粮产 +6%\n累计两次提升劝降概率'],[1,'army','整军','攻势 +7%\n募兵粮耗小幅降低']]){
    const px=x+35+i*286;box(px,y+170,264,173,'#e9eadb',null,9);text(title,px+23,y+207,27,kind==='peace'?C.teal:C.red,'bold');lines(desc,px+23,y+256,13,16);
    button('颁布'+title,px,y+367,264,54,()=>{game.policy(kind);modal=null;save();notify(game.state.completed?'首章通关！六州征途将在后续版本开放。':'政令已颁，可向下一城进军。');},kind==='peace'?'primary':'red');
   }
  }
  if(m.type==='ad'){
   const left=Math.max(0,3-(Date.now()-m.started)/1000);
   text('开发模式 · 模拟激励视频',x+35,y+62,26,C.ink,'bold');text('此处为广告接口联调，不是真实广告。',x+35,y+122,17,C.muted);
   text(left>0?Math.ceil(left)+' 秒':'模拟播放完成',x+w/2,y+223,left>0?62:33,C.gold,'bold','center');
   text('中途关闭不发奖；仅完整播放后确认领取。',x+w/2,y+293,17,C.muted,'normal','center');
   button('完成观看并领取',x+35,y+358,550,56,()=>endAd(m.id,true,m.paused),'primary',left>0);
  }
  if(m.type==='settings'){
   text('行军设置',x+35,y+60,29,C.ink,'bold');text('架空历史策略玩法，与真实历史无关。',x+35,y+120,17,C.muted);
   button('儿童模式：'+(game.state.childMode?'开启 · 广告关闭':'关闭'),x+35,y+171,550,52,()=>{game.state.childMode=!game.state.childMode;save();},'outline');
   button('手动保存进度',x+35,y+242,550,52,()=>{save();notify('进度已保存至本机。');},'primary');
   button('重新开局…',x+35,y+313,550,52,()=>modal={type:'reset'},'outline');
   text('本原型仅使用本地存储，未接入统计或真实广告 SDK。',x+35,y+412,14,C.muted);
  }
  if(m.type==='reset'){
   text('重新开局？',x+35,y+65,30,C.red,'bold');lines('此操作会删除本机当前势力、兵牌与占城进度，无法撤销。',x+35,y+152,28,20);
   button('取消，继续征途',x+35,y+335,260,60,()=>modal={type:'settings'},'outline');
   button('确认删除并重新开局',x+312,y+335,273,60,()=>{game=new E.Game();screen='factions';tab='map';selectedCity=1;selectedUnit=null;modal=null;save();},'red');
  }
 }
 function render(timestamp){
  const dt=last?Math.max(0,Math.min(.25,(timestamp-last)/1000)):0;last=timestamp;clock+=dt;
  if(game.battle&&!modal)game.tick(dt);
  if(Date.now()-lastAccrue>2000){game.accrue();lastAccrue=Date.now();}
  if(game.faction&&Date.now()-lastSave>5000){save();lastSave=Date.now();}
  if(screen==='map'&&game.state.pendingPolicy!==null&&!modal)modal={type:'policy'};
  buttons=[];box(0,0,W,H,C.bg,null,0);
  if(screen==='factions')factionScreen();else if(screen==='characters')characterScreen();else if(screen==='battle')battleScreen();else mapScreen();
  if(modal)drawModal();
  if(Date.now()<toastUntil){const width=Math.min(1100,toast.length*17+54);box((W-width)/2,94,width,48,'#243b36ed',null,8);text(toast,W/2,118,17,'#f5eddc','normal','center');}
  requestFrame(render);
 }
 function position(event){
  if(wxapi){return {x:(event.clientX-(screenW-W*scale)/2)/scale,y:(event.clientY-(screenH-H*scale)/2)/scale};}
  const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)/scale,y:(event.clientY-rect.top)/scale};
 }
 function click(event){const p=position(event);const found=buttons.slice().reverse().find(b=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);if(found&&!found.disabled)found.fn();}
 // Click-to-place works on both channels; drag-and-drop uses the same rules.
 function down(event){const p=position(event);const found=buttons.slice().reverse().find(b=>!b.disabled&&b.id.startsWith('slot-')&&p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);if(found){const u=game.state.roster.find(u=>u.slot===Number(found.id.slice(5)));if(u)drag={id:u.id,x:p.x,y:p.y,moved:false};}}
 function move(event){const p=position(event);if(drag&&Math.hypot(p.x-drag.x,p.y-drag.y)>12)drag.moved=true;const found=buttons.slice().reverse().find(b=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);hover=found?.id||'';if(canvas.style)canvas.style.cursor=found&&!found.disabled?'pointer':'default';}
 function up(event){
  if(drag?.moved){const p=position(event),found=buttons.find(b=>b.id.startsWith('slot-')&&p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);if(found){const slot=Number(found.id.slice(5)),u=game.state.roster.find(u=>u.slot===slot);if(u&&u.id!==drag.id&&game.merge(drag.id,u.id))notify('合成成功 · 升星精兵');else game.move(drag.id,slot);selectedUnit=null;save();}}
  else click(event);drag=null;
 }
 const requestFrame=wxapi?(canvas.requestAnimationFrame?canvas.requestAnimationFrame.bind(canvas):root.requestAnimationFrame.bind(root)):window.requestAnimationFrame.bind(window);
 if(wxapi){
  wxapi.onTouchStart(e=>{if(e.touches[0])down(e.touches[0]);});wxapi.onTouchMove(e=>{if(e.touches[0])move(e.touches[0]);});wxapi.onTouchEnd(e=>{if(e.changedTouches[0])up(e.changedTouches[0]);});
  wxapi.onHide(()=>{game.accrue();save();});wxapi.onShow(()=>{game.accrue();last=0;});
  if(wxapi.onWindowResize)wxapi.onWindowResize(resize);
 }else{
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);down(e);});canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);
  canvas.addEventListener('pointercancel',()=>drag=null);window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{game.accrue();save();last=0;});window.addEventListener('pagehide',()=>{game.accrue();save();});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal&&modal.type!=='policy'){if(modal.type==='ad')endAd(modal.id,false,modal.paused);else modal=null;}});
 }
 resize();requestFrame(render);
 // Read-only inspection for development smoke tests; no ad-grant shortcut.
 return {snapshot:()=>JSON.parse(game.serialize()),save};
}
const API={create};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.EmberApp=API;
})(typeof globalThis!=='undefined'?globalThis:this);
