
const DB='./genshin_master_db.json',API='/api/uid',UID=/^\d{8,10}$/;
const ASSET_ROOT='https://raw.githubusercontent.com/kgirtxd/Genshin-Assets/master',ENKA_UI='https://enka.network/ui/';
const CHAR_ASSET_ALIAS={Qin:'jean',Ambor:'amber',Feiyan:'yanfei',Liuyun:'xianyun',Momoka:'kirara',Liney:'lyney',Alhatham:'alhaitham',Baizhuer:'baizhu',SkirkNew:'skirk',Yae:'yae-miko',Yunjin:'yun-jin',PlayerBoy:'traveler-anemo',PlayerGirl:'traveler-anemo'};
const ELEMENT_ASSETS={Fire:{label:'炎',file:'Element_Pyro.png'},Water:{label:'水',file:'Element_Hydro.png'},Electric:{label:'雷',file:'Element_Electro.png'},Ice:{label:'氷',file:'Element_Cryo.png'},Dendro:{label:'草',file:'Element_Dendro.png'},Wind:{label:'風',file:'Element_Anemo.png'},Rock:{label:'岩',file:'Element_Geo.png'}};
const FALLBACK={
FIGHT_PROP_BASE_HP:'基礎HP',FIGHT_PROP_HP:'HP',FIGHT_PROP_HP_PERCENT:'HP%',
FIGHT_PROP_BASE_ATTACK:'基礎攻撃力',FIGHT_PROP_ATTACK:'攻撃力',FIGHT_PROP_ATTACK_PERCENT:'攻撃力%',
FIGHT_PROP_BASE_DEFENSE:'基礎防御力',FIGHT_PROP_DEFENSE:'防御力',FIGHT_PROP_DEFENSE_PERCENT:'防御力%',
FIGHT_PROP_CRITICAL:'会心率',FIGHT_PROP_CRITICAL_HURT:'会心ダメージ',FIGHT_PROP_ELEMENT_MASTERY:'元素熟知',
FIGHT_PROP_CHARGE_EFFICIENCY:'元素チャージ効率',FIGHT_PROP_PHYSICAL_ADD_HURT:'物理ダメージ',
FIGHT_PROP_FIRE_ADD_HURT:'炎元素ダメージ',FIGHT_PROP_WATER_ADD_HURT:'水元素ダメージ',FIGHT_PROP_GRASS_ADD_HURT:'草元素ダメージ',
FIGHT_PROP_ELEC_ADD_HURT:'雷元素ダメージ',FIGHT_PROP_ICE_ADD_HURT:'氷元素ダメージ',
FIGHT_PROP_WIND_ADD_HURT:'風元素ダメージ',FIGHT_PROP_ROCK_ADD_HURT:'岩元素ダメージ'
};
const EQUIP={EQUIP_BRACER:'生の花',EQUIP_NECKLACE:'死の羽',EQUIP_SHOES:'時の砂',EQUIP_RING:'空の杯',EQUIP_DRESS:'理の冠',EQUIP_WEAPON:'武器'};
const el=id=>document.getElementById(id);
const App={
db:{},enkaChars:{},locJa:{},props:{...FALLBACK},equip:{...EQUIP},data:null,chars:[],history:[],
busy:false,selected:null,filter:{q:'',element:'all',sort:'level'},
status(m,c=''){el('status').textContent=m;el('dot').className='dot '+c},
toast(m){const x=el('toast');x.textContent=m;x.classList.add('show');clearTimeout(this._toast);this._toast=setTimeout(()=>x.classList.remove('show'),2200)},
get(o,p,f='-'){try{return p.split('.').reduce((a,k)=>a?.[k],o)??f}catch{return f}},
name(id){const dyn=this.enkaChars[String(id)]||{},hash=dyn.NameTextMapHash!=null?String(dyn.NameTextMapHash):'',localized=this.locJa[hash];if(localized)return localized;const e=this.db[String(id)];if(typeof e==='string')return e;if(e&&typeof e==='object'){for(const k of ['name','Name','displayName','title']){if(typeof e[k]==='string')return e[k];if(e[k]&&typeof e[k]==='object')for(const l of ['ja','jp','ja-JP','ja_JP'])if(typeof e[k][l]==='string')return e[k][l]}}return 'Unknown (ID:'+id+')'},
stat(id){return this.props[id]||FALLBACK[id]||id||'-'},
assetSlug(sideIconName){const suffix=String(sideIconName||'').replace(/^UI_AvatarIcon_Side_/,'');if(!suffix)return '';if(CHAR_ASSET_ALIAS[suffix])return CHAR_ASSET_ALIAS[suffix];return suffix.replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/_/g,'-').replace(/[^A-Za-z0-9-]+/g,'-').toLowerCase()},
devSlug(c){const side=c?.asset?.SideIconName||c?.asset?.sideIconName||'';const suffix=String(side).replace(/^UI_AvatarIcon_Side_/,'');return CHAR_ASSET_ALIAS[suffix]||suffix.replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/_/g,'-').replace(/[^A-Za-z0-9-]+/g,'-').toLowerCase()},charImage(c,portrait=false){const asset=c?.asset||{},side=asset.SideIconName||asset.sideIconName||'',slug=this.devSlug(c),urls=[];if(slug)urls.push(GENSHIN_DEV+'/characters/'+encodeURIComponent(slug)+'/'+(portrait?'portrait':'icon'));if(side)urls.push(ENKA_UI+String(side).replace('_Side','')+'.png');const oldSlug=this.assetSlug(side);if(oldSlug)urls.push(ASSET_ROOT+'/'+(portrait?'CharacterPortrait/':'CharacterIcon/')+oldSlug+(portrait?'.png':'_icon.png'));return {src:urls[0]||'',fallbacks:urls.slice(1)}},imageAttrs(im){return 'src="'+this.esc(im?.src||'')+'" data-images="'+this.esc(JSON.stringify(im?.fallbacks||[]))+'" onerror="App.imageError(this)"'},imageError(img){try{const urls=JSON.parse(img.dataset.images||'[]'),i=Number(img.dataset.imageIndex||0)+1;if(i>=urls.length){img.removeAttribute('src');img.classList.add('is-missing');return}img.dataset.imageIndex=String(i);img.src=urls[i]}catch{img.removeAttribute('src')}},assetFor(id){return {...(this.db[String(id)]||{}),...(this.enkaChars[String(id)]||{})}},
itemImage(q){const icon=q?.flat?.icon;return icon?ENKA_UI+icon+'.png':''},
esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')},
num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d},
pct(v){const n=this.num(v);return Math.abs(n)<=2?n*100:n},
fmt(v){const n=Number(v);if(!Number.isFinite(n))return String(v??'-');return Number.isInteger(n)?String(n):n.toFixed(2)},
slot(f,q){const t=f?.equipType||f?.pos||f?.itemType||q?.equipType||q?.pos;if(t&&this.equip[t])return this.equip[t];if(t==='ITEM_WEAPON'||f?.weaponStats||q?.weapon)return '武器';if(t==='ITEM_RELIQUARY'||f?.reliquaryMainstat||f?.reliquarySubstats||q?.reliquary)return '聖遺物';return '装備'},
getLevel(c){return this.num(this.get(c,'propMap.4001.val',this.get(c,'level',0)))},
getConst(c){return this.num(this.get(c,'talentIdList.length',0))},
getFetter(c){return this.num(this.get(c,'fetterInfo.expLevel',0))},
getStats(c){
 const m=c.fightPropMap||c.fightProp||{};
 const val=k=>this.num(m[k]);
 return {hp:val('2000'),atk:val('2001'),def:val('2002'),em:val('28'),cr:this.pct(val('20')),cd:this.pct(val('22')),er:this.pct(val('23'))};
},
getElement(c){
 const id=String(c.avatarId??c.avatar_id??c.id);
 const asset=this.assetFor(id),e=asset.Element||asset.element;
 return ELEMENT_ASSETS[e]?.label||'？？？';
},
elementImage(c){
 const a=this.assetFor(c.id),e=a.Element||a.element,asset=ELEMENT_ASSETS[e];
 return asset?ASSET_ROOT+'/Elements/'+asset.file:'';
},
elementHtml(c){
 const src=this.elementImage(c);
 return src?'<img class="element-icon" src="'+this.esc(src)+'" alt="">' :'';
},
artifactScore(f){
 let score=0,subs=f?.reliquarySubstats||[];
 for(const s of subs){const p=this.stat(s.appendPropId),v=this.num(s.statValue);if(p.includes('会心率'))score+=v*2;if(p.includes('会心ダメージ'))score+=v;if(p.includes('攻撃力%'))score+=v*0.7;if(p.includes('元素熟知'))score+=v*0.25;if(p.includes('元素チャージ'))score+=v*0.35}
 return Math.round(score*10)/10;
},
artifactData(c){
 const arr=[];
 for(const q of c.equipList||[]){const f=q.flat||{};if(f.itemType==='ITEM_RELIQUARY'||f.reliquaryMainstat||f.reliquarySubstats){
   const main=f.reliquaryMainstat||{},subs=f.reliquarySubstats||[];
   arr.push({slot:this.slot(f,q),set:f.setNameTextMapHash||'セット情報不明',level:this.get(q,'reliquary.level',this.get(q,'level',0)),rank:f.rankLevel||0,icon:f.icon||'',
   main:this.stat(main.mainPropId||main.appendPropId)+' '+this.fmt(main.statValue),subs:subs.map(s=>this.stat(s.appendPropId)+' +'+this.fmt(s.statValue)),score:this.artifactScore(f),raw:q});
 }}
 return arr;
},
weaponData(c){
 const arr=[];
 for(const q of c.equipList||[]){const f=q.flat||{};if(f.itemType==='ITEM_WEAPON'||f.weaponStats||q.weapon){
   arr.push({name:f.nameTextMapHash||'装備武器',level:this.get(q,'weapon.level',this.get(q,'level',0)),rank:f.rankLevel||f.rank||0,icon:f.icon||'',stats:(f.weaponStats||[]).map(s=>this.stat(s.appendPropId)+' '+this.fmt(s.statValue)),raw:q});
 }}
 return arr;
},
async init(){
 const last=localStorage.getItem('genshin_uid');if(last)el('uid').value=last;
 try{const r=await fetch(DB+'?v=4',{cache:'no-store'}),j=await r.json();this.db=j.avatars||{};this.props={...FALLBACK,...(j.props||{})};this.equip={...EQUIP,...(j.equipType||{})} ;this.status('データベース準備完了','ok')}catch(e){this.status('DB読込失敗・内蔵定義で動作中','bad')}
 this.history=JSON.parse(localStorage.getItem('genshin_history')||'[]');this.renderHistory();
},
async run(uidValue=el('uid').value.trim(),silent=false){
 if(this.busy)return;if(!UID.test(uidValue)){this.toast('UIDは8〜10桁の数字で入力してください');return}
 this.busy=true;el('run').disabled=true;el('dot').className='dot busy';localStorage.setItem('genshin_uid',uidValue);
 this.status('Enka.Networkからプロフィールを取得中...','busy');
 try{
  const c=new AbortController(),tm=setTimeout(()=>c.abort(),18000);
  let r;try{r=await fetch(API+'?uid='+encodeURIComponent(uidValue),{headers:{Accept:'application/json'},cache:'no-store',signal:c.signal})}finally{clearTimeout(tm)}
  let d={};try{d=await r.json()}catch{}
  if(!r.ok)throw Error(d.error||'HTTP '+r.status);if(!d.playerInfo)throw Error('公開プロフィールが見つかりません。');
  const ids=(d.avatarInfoList||[]).map(x=>String(x.avatarId??x.avatar_id??x.id)).filter(Boolean);try{const mr=await fetch(CHAR_API+'?ids='+encodeURIComponent(ids.join(',')),{cache:'no-store'}),mj=await mr.json();this.enkaChars=mj.enkaCharacters||{};this.locJa=mj.locJa||{};}catch(e){this.enkaChars={};this.locJa={};}this.data=d;this.build();this.saveHistory(uidValue,d);this.renderAll();this.status('解析完了 · '+this.chars.length+'キャラクター · 画像対応','ok');if(!silent)this.toast('解析完了');
 }catch(e){this.status(e.name==='AbortError'?'APIタイムアウト':e.message,'bad');if(!silent)this.toast('取得に失敗しました')}
 finally{this.busy=false;el('run').disabled=false}
},
build(){
 const a=this.data.avatarInfoList||[];
 this.chars=a.map(x=>{const id=x.avatarId??x.avatar_id??x.id;const stats=this.getStats(x);const arts=this.artifactData(x);return{
  id,name:this.name(id),element:this.getElement(x),elementKey:this.db[String(id)]?.element||'',level:this.getLevel(x),fetter:this.getFetter(x),constellations:this.getConst(x),stats,arts,weapons:this.weaponData(x),asset:this.assetFor(id),data:x
 }});
},
saveHistory(uid,d){
 const item={uid,name:d.playerInfo?.nickname||'-',ar:d.playerInfo?.level||0,wl:d.playerInfo?.worldLevel||0,count:(d.avatarInfoList||[]).length,time:Date.now(),data:d};
 this.history=[item,...this.history.filter(x=>x.uid!==uid)].slice(0,8);localStorage.setItem('genshin_history',JSON.stringify(this.history));this.renderHistory();
},
renderHistory(){
 const box=el('history');if(!this.history.length){box.innerHTML='<span class="muted">解析履歴はここに表示されます</span>';return}
 box.innerHTML=this.history.map((h,i)=>'<button class="'+(i===0?'fav':'')+'" data-h="'+this.esc(h.uid)+'">'+this.esc(h.name)+' · '+this.esc(h.uid)+'</button>').join('');
 box.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>this.run(b.dataset.h));
},
renderAll(){this.renderHeader();this.renderDashboard();this.renderChars();this.renderCompare();this.renderRaw()},
theaterText(p){
 const act=Number(p?.theaterActIndex),stars=Number(p?.theaterStarIndex),mode=Number(p?.theaterModeIndex);
 if(!Number.isFinite(act)||act<=0)return '未挑戦';
 const parts=['第'+act+'幕'];
 if(Number.isFinite(stars))parts.push(stars+'★');
 if(Number.isFinite(mode))parts.push('モード '+mode);
 return parts.join(' · ');
},
stygianText(p){
 const diff=Number(p?.stygianIndex),seconds=Number(p?.stygianSeconds);
 if(!Number.isFinite(diff))return '未挑戦';
 const parts=['難易度 '+diff];
 if(Number.isFinite(seconds))parts.push(seconds+'秒');
 return parts.join(' · ');
},
renderHeader(){
 const p=this.data.playerInfo||{},a=this.chars;
 el('name').textContent=p.nickname||'-';el('ar').textContent=p.level??'-';el('wl').textContent=p.worldLevel??'-';el('count').textContent=a.length;
 el('ach').textContent=p.finishAchievementNum??'-';el('abyss').textContent=(p.towerFloorIndex&&p.towerLevelIndex)?p.towerFloorIndex+'-'+p.towerLevelIndex:'-';
 el('theater').textContent=this.theaterText(p);el('stygian').textContent=this.stygianText(p);
 el('signature').textContent=p.signature||'—';el('last').textContent=new Date().toLocaleString('ja-JP');
},
renderDashboard(){
 const a=this.chars,p=this.data.playerInfo||{},withArts=a.filter(x=>x.arts.length),score=a.flatMap(x=>x.arts).map(x=>x.score);
 el('dash').innerHTML='<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="title">公開キャラ育成状況</div><div class="sub">PUBLIC CHARACTER / PROGRESSION</div></div></div><div class="panel-body"><div class="kpis">'+
 [['キャラ',a.length],['Lv.90',a.filter(x=>x.level>=90).length],['好感度10',a.filter(x=>x.fetter>=10).length],['完凸',a.filter(x=>x.constellations>=6).length]].map(x=>'<div class="mini-card"><div class="label">'+x[0]+'</div><strong>'+x[1]+'</strong></div>').join('')+
 '</div><div style="height:12px"></div><div class="label">公開キャラ Lv.90率</div><div class="progress" style="margin-top:7px"><i style="width:'+(a.length?Math.round(a.filter(x=>x.level>=90).length/a.length*100):0)+'%"></i></div><div class="muted" style="margin-top:5px">'+(a.length?Math.round(a.filter(x=>x.level>=90).length/a.length*100):0)+'%</div></div></section>'+
 '<section class="panel"><div class="panel-head"><div><div class="title">公開キャラ分布</div><div class="sub">PUBLIC CHARACTER DATA ONLY</div></div></div><div class="panel-body"><div class="chart">'+
 [['炎',a.filter(x=>x.element==='炎').length],['水',a.filter(x=>x.element==='水').length],['雷',a.filter(x=>x.element==='雷').length],['氷',a.filter(x=>x.element==='氷').length],['草',a.filter(x=>x.element==='草').length],['風',a.filter(x=>x.element==='風').length],['岩',a.filter(x=>x.element==='岩').length]].map(x=>'<div class="bar-row"><span>'+x[0]+'</span><div class="bar"><i style="width:'+(a.length?x[1]/a.length*100:0)+'%"></i></div><b>'+x[1]+'</b></div>').join('')+
 '</div></div></section></div><div class="record-grid"><section class="panel"><div class="panel-head"><div><div class="title">幻想シアター</div><div class="sub">IMAGINARIUM THEATER</div></div></div><div class="panel-body"><div class="kpis"><div class="mini-card"><div class="label">最高到達幕</div><strong>'+ (p.theaterActIndex??'-') +'</strong></div><div class="mini-card"><div class="label">獲得星</div><strong>'+ (p.theaterStarIndex??'-') +'★</strong></div><div class="mini-card"><div class="label">モード</div><strong>'+ (p.theaterModeIndex??'-') +'</strong></div></div><div class="muted" style="margin-top:9px">'+this.esc(this.theaterText(p))+'</div></div></section><section class="panel"><div class="panel-head"><div><div class="title">幽境の激戦</div><div class="sub">STYGIAN ONSLAUGHT</div></div></div><div class="panel-body"><div class="kpis"><div class="mini-card"><div class="label">難易度</div><strong>'+ (p.stygianIndex??'-') +'</strong></div><div class="mini-card"><div class="label">クリアタイム</div><strong>'+ (p.stygianSeconds??'-') +'秒</strong></div><div class="mini-card"><div class="label">ID</div><strong>'+ (p.stygianId??'-') +'</strong></div></div><div class="muted" style="margin-top:9px">'+this.esc(this.stygianText(p))+'</div></div></section></div>';
},
filtered(){
 let a=[...this.chars],f=this.filter,q=f.q.toLowerCase();
 if(q)a=a.filter(x=>(x.name+' '+x.element).toLowerCase().includes(q));
 if(f.element!=='all')a=a.filter(x=>x.element===f.element);
 const sorts={level:(x,y)=>y.level-x.level,score:(x,y)=>(y.arts.reduce((s,z)=>s+z.score,0)-x.arts.reduce((s,z)=>s+z.score,0)),cr:(x,y)=>y.stats.cr-x.stats.cr,name:(x,y)=>x.name.localeCompare(y.name,'ja')};
 a.sort(sorts[f.sort]||sorts.level);return a;
},
renderChars(){
 const a=this.filtered();el('charsCount').textContent=a.length+' / '+this.chars.length;
 el('chars').innerHTML=a.length ? a.map(c=>{const im=this.charImage(c);const tags=c.arts.slice(0,2).map(x=>'<span class="tag2">'+this.esc(x.main)+'</span>').join('');return '<article class="character-card" data-char="'+c.id+'"><div class="char-identity"><div class="char-image-wrap"><img class="char-avatar" src="'+this.esc(im.src)+'" data-images="'+this.esc(JSON.stringify(im.fallbacks||[]))+'" onerror="App.imageError(this)" alt=""></div><div class="char-top"><div><div class="char-name">'+this.esc(c.name)+'</div><div class="char-level"><span class="element-label">'+this.elementHtml(c)+this.esc(c.element)+' · Lv.'+c.level+'</span></div></div><span class="pill">★'+c.constellations+'</span></div></div><div class="char-stats"><div class="char-stat"><b>'+this.fmt(c.stats.cr)+'%</b><span>会心率</span></div><div class="char-stat"><b>'+this.fmt(c.stats.cd)+'%</b><span>会心ダメ</span></div><div class="char-stat"><b>'+this.fmt(c.stats.er)+'%</b><span>チャージ</span></div></div><div class="char-tags">'+tags+'<span class="tag2">聖遺物 '+c.arts.length+'/5</span></div></article>';}).join('') : '<div class="empty">条件に一致するキャラクターがありません。</div>';
 el('chars').querySelectorAll('[data-char]').forEach(x=>x.onclick=()=>this.openChar(Number(x.dataset.char)));
},
openChar(id){
 const c=this.chars.find(x=>x.id==id);if(!c)return;this.selected=c;
 const rows=(o)=>Object.entries(o).map(([k,v])=>'<div class="kv"><span>'+k+'</span><b>'+this.fmt(v)+'</b></div>').join('');
 const cim=this.charImage(c,true);
 el('modalTitle').textContent=c.name+' · キャラクター詳細';el('modalBody').innerHTML='<div class="character-hero"><div class="portrait-wrap"><img class="char-portrait" src="'+this.esc(cim.src)+'" data-images="'+this.esc(JSON.stringify(cim.fallbacks||[]))+'" onerror="App.imageError(this)" alt=""></div><div><div class="hero-character-name">'+this.esc(c.name)+'</div><div class="muted">'+this.esc(c.element)+' · Lv.'+c.level+' · 命ノ星座 '+c.constellations+'</div></div></div><div style="height:10px"></div><div class="detail-grid"><div class="detail-box"><h4>基本情報</h4>'+rows({元素:c.element,レベル:c.level,好感度:c.fetter,命ノ星座:c.constellations})+'</div><div class="detail-box"><h4>戦闘ステータス</h4>'+rows({'HP':c.stats.hp,'攻撃力':c.stats.atk,'防御力':c.stats.def,'元素熟知':c.stats.em,'会心率':c.stats.cr+'%','会心ダメージ':c.stats.cd+'%','元素チャージ':c.stats.er+'%'})+'</div></div><div style="height:10px"></div><div class="detail-box"><h4>武器</h4>'+ (c.weapons.length?c.weapons.map(w=>{const im=this.itemImage(w.raw);return '<div class="equipment-row"><div class="equipment-image">'+(im?'<img src="'+this.esc(im)+'" alt="" loading="lazy">':'')+'</div><div><div class="kv"><span>'+this.esc(String(w.name))+' · Lv.'+w.level+'</span><b>精錬 '+w.rank+'</b></div>'+w.stats.map(s=>'<div class="muted" style="padding:2px 0">'+this.esc(s)+'</div>').join('')+'</div></div>'}).join(''):'<div class="empty">公開武器なし</div>')+'</div><div style="height:10px"></div><div class="detail-box"><h4>聖遺物 · 簡易評価</h4><div class="artifacts">'+(c.arts.length?c.arts.map(x=>'<div class="artifact-row">'+(x.icon?'<div class="artifact-image"><img src="'+this.esc(ENKA_UI+x.icon+'.png')+'" alt="" loading="lazy"></div>':'<div class="artifact-image"></div>')+'<div class="artifact-slot">'+this.esc(x.slot)+'</div><div><div class="artifact-set">'+this.esc(String(x.set))+'</div><div class="substats">'+x.subs.map(s=>'<span class="substat">'+this.esc(s)+'</span>').join('')+'</div></div><div class="cv">Score '+x.score+'</div></div>').join(''):'<div class="empty">公開聖遺物なし</div>')+'</div></div>';
 el('modal').classList.add('show');
},
renderCompare(){
 const p=this.data?.playerInfo||{};el('compare').innerHTML='<div class="compare-grid"><div class="compare-card"><h3>現在</h3>'+this.compareRows({UID:el('uid').value,プレイヤー:p.nickname||'-',AR:p.level??'-',WL:p.worldLevel??'-',公開キャラ:this.chars.length,実績:p.finishAchievementNum??'-'})+'</div><div class="compare-card"><h3>公開キャラ育成状況</h3>'+this.compareRows({'Lv.90':this.chars.filter(x=>x.level>=90).length,'Lv.80以上':this.chars.filter(x=>x.level>=80).length,'好感度10':this.chars.filter(x=>x.fetter>=10).length,'完凸':this.chars.filter(x=>x.constellations>=6).length})+'</div><div class="compare-card"><h3>聖遺物</h3>'+this.compareRows({'公開聖遺物数':this.chars.reduce((n,c)=>n+c.arts.length,0),'評価80+':this.chars.reduce((n,c)=>n+c.arts.filter(x=>x.score>=80).length,0),'評価60+':this.chars.reduce((n,c)=>n+c.arts.filter(x=>x.score>=60).length,0),'平均Score':this.avgScore()})+'</div></div><div class="panel" style="margin-top:10px"><div class="panel-head"><div><div class="title">スナップショット比較</div><div class="sub">履歴から過去データを選択できます</div></div></div><div class="panel-body"><div class="toolbar-left"><select id="compareHistory">'+this.history.filter(x=>x.uid===el('uid').value).map((x,i)=>'<option value="'+i+'">'+new Date(x.time).toLocaleString('ja-JP')+'</option>').join('')+'</select><span class="muted">この画面の集計対象は、UIDで取得できた公開キャラクターのみです。</span></div></div></div>';
},
compareRows(o){return Object.entries(o).map(([k,v])=>'<div class="compare-row"><span>'+this.esc(k)+'</span><b>'+this.esc(v)+'</b></div>').join('')},
avgScore(){const x=this.chars.flatMap(c=>c.arts).map(a=>a.score);return x.length?Math.round(x.reduce((a,b)=>a+b,0)/x.length*10)/10:'-'},
renderRaw(){el('raw').textContent=this.data?JSON.stringify(this.data,null,2):'UIDを解析するとRaw JSONが表示されます。'},
download(type){
 if(!this.data){this.toast('先にUIDを解析してください');return}
 const uid=this.data.uid||el('uid').value.trim();let content,mime,ext;
 if(type==='json'){content=JSON.stringify(this.data,null,2);mime='application/json';ext='json'}
 else if(type==='html'){content='<!doctype html><meta charset="utf-8"><title>Genshin Report</title><pre>'+this.esc(JSON.stringify(this.data,null,2))+'</pre>';mime='text/html';ext='html'}
 else {const rows=[['Character','Element','Level','Constellation','Crit Rate','Crit DMG','ER','Artifact Count','Artifact Score']];for(const c of this.chars)rows.push([c.name,c.element,c.level,c.constellations,c.stats.cr,c.stats.cd,c.stats.er,c.arts.length,c.arts.reduce((s,a)=>s+a.score,0)]);const q=s=>{s=String(s??'');return /[",\\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};content='\\ufeff'+rows.map(r=>r.map(q).join(',')).join('\\n');mime='text/csv';ext='csv'}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:mime}));a.download='genshin_'+uid+'_'+new Date().toISOString().slice(0,10)+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);this.toast('書き出しました');
},
clear(){this.data=null;this.chars=[];this.selected=null;['name','ar','wl','count','ach','abyss','signature','last'].forEach(x=>el(x).textContent='-');el('dash').innerHTML='<div class="empty">UIDを解析するとダッシュボードが表示されます。</div>';el('chars').innerHTML='<div class="empty">UIDを解析してください。</div>';el('compare').innerHTML='<div class="empty">UIDを解析してください。</div>';el('raw').textContent='UIDを解析するとRaw JSONが表示されます。';this.status('入力待ち');},
copyRaw(){if(!this.data)return this.toast('コピーするデータがありません');navigator.clipboard?.writeText(JSON.stringify(this.data,null,2)).then(()=>this.toast('Raw JSONをコピーしました')).catch(()=>this.toast('コピーできませんでした'))}
};
function setTab(id){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+id));}
document.addEventListener('click',e=>{const t=e.target.closest('.tab');if(t)setTab(t.dataset.tab)});
el('run').onclick=()=>App.run();el('clear').onclick=()=>App.clear();el('uid').onkeydown=e=>{if(e.key==='Enter')App.run()};el('theme').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem('genshin_theme',document.body.classList.contains('light')?'light':'dark')};
el('search').oninput=e=>{App.filter.q=e.target.value;App.renderChars()};el('element').onchange=e=>{App.filter.element=e.target.value;App.renderChars()};el('sort').onchange=e=>{App.filter.sort=e.target.value;App.renderChars()};
el('copyRaw').onclick=()=>App.copyRaw();document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>App.download(b.dataset.export));
el('closeModal').onclick=()=>el('modal').classList.remove('show');el('modal').onclick=e=>{if(e.target===el('modal'))el('modal').classList.remove('show')};
el('history').addEventListener('click',e=>{const b=e.target.closest('[data-h]');if(b)App.run(b.dataset.h)});
if(localStorage.getItem('genshin_theme')==='light')document.body.classList.add('light');
App.init();
