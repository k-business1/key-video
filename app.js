/* ============================================================
   KEYTUBE — shared app logic (used by BOTH index.html and watch.html)
   Keeps the same backend API / actions as before. Nothing here
   changes how the Google Apps Script backend is called.
   ============================================================ */

var API = 'https://script.google.com/macros/s/AKfycbxVdY-_WNOhxAEVqAMi2E1Q6R0KVBWnhq7EQGwNj21BWpbIOfi7phMt3y85qEhs9tXQ/exec';
var EMOJIS = ['💬','😂','❤️','😭','🔥','😍','👍','🤣','😮','💯','😎','🎬'];

var S = {user:null,settings:{},pages:{},srTimer:null,pingTimer:null,selEmoji:'💬'};

function h(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cap(s){return s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';}
function fmtDate(d){var dt=new Date(d);return isNaN(dt)?d:dt.toLocaleDateString();}
function toast(msg,type){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.className='show'+(type?' '+type:'');clearTimeout(t._t);t._t=setTimeout(function(){t.className='';},3000);}
function qs(name){return new URLSearchParams(window.location.search).get(name);}

var pbarW=0,pbarT;
function pStart(){pbarW=0;var el=document.getElementById('pbar');if(!el)return;el.className='';el.style.width='0%';clearInterval(pbarT);pbarT=setInterval(function(){pbarW=Math.min(pbarW+Math.random()*8,88);el.style.width=pbarW+'%';},120);}
function pDone(){clearInterval(pbarT);var el=document.getElementById('pbar');if(!el)return;el.style.width='100%';setTimeout(function(){el.className='done';setTimeout(function(){el.style.width='0%';el.className='';},500);},300);}

function api(action,data,cb){
  pStart();
  fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(Object.assign({},data||{},{action:action})),redirect:'follow'})
  .then(function(r){return r.json();})
  .then(function(res){pDone();if(cb)cb(res);})
  .catch(function(e){pDone();toast('Connection error','terr');console.error(e);var pl=document.getElementById('pgLoad');if(pl)pl.style.display='none';});
}

/* ── boot: restore session, load settings/pages ── */
function bootApp(after){
  try{var u=sessionStorage.getItem('km_u');if(u)S.user=JSON.parse(u);}catch(e){}
  updateHeaderUI();
  api('getSettings',{},function(r){
    if(r.ok){S.settings=r.settings;applySettings();}
    api('getPages',{},function(pr){if(pr.ok)S.pages=pr.pages||{};});
    if(S.user){loadNotifs();startPing();}
    api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'visit',country:S.user?S.user.country:'',details:navigator.language});
    if(after)after();
  });
}

function applySettings(){
  var s=S.settings,sn=s['site_name']||'KEYTUBE';
  document.title=sn;
  var e=document.getElementById('snEl');if(e)e.textContent=sn;
  var fb=document.getElementById('fbrand');if(fb)fb.textContent=sn;
  if(s['favicon_url']&&s['favicon_url'].trim()){
    var lk=document.querySelector("link[rel~='icon']")||document.createElement('link');
    lk.rel='icon';lk.href=s['favicon_url'];document.head.appendChild(lk);
  }
  if(s['app_download_url']&&s['app_download_url'].trim()){
    var ab=document.getElementById('appBanner');
    if(ab){ab.classList.add('show');document.getElementById('appDlBtn').dataset.url=s['app_download_url'];}
  }
}
function downloadApp(){var b=document.getElementById('appDlBtn');var url=b?b.dataset.url||'':'';if(url)window.open(url,'_blank');else toast('App URL not set yet','terr');}

function showLoginReq(){var el=document.getElementById('loginReq');if(!el)return;el.classList.add('show');var f=document.querySelector('.lr-fill');if(f){f.style.width='0%';void f.offsetWidth;f.style.width='100%';}}
function hideLoginReq(){var el=document.getElementById('loginReq');if(el)el.classList.remove('show');}

function startPing(){clearInterval(S.pingTimer);pingOnline();S.pingTimer=setInterval(pingOnline,30000);}
function pingOnline(){if(S.user)api('pingOnline',{gmail:S.user.gmail,country:S.user.country||''},null);}

/* ── header: avatar dropdown / notifications / search ── */
function updateHeaderUI(){
  var u=S.user;
  var si=document.getElementById('siBtn'),su=document.getElementById('suBtn'),uc=document.getElementById('uChip'),nb=document.getElementById('notifBtn');
  if(si)si.style.display=u?'none':'';
  if(su)su.style.display=u?'none':'';
  if(uc)uc.style.display=u?'':'none';
  if(nb)nb.style.display=u?'':'none';
  var av=document.getElementById('avEl');if(av&&u)av.textContent=(u.name||u.gmail||'U')[0].toUpperCase();
}
function toggleDrop(){var d=document.getElementById('udrop');if(d)d.classList.toggle('open');}
function cd(){var d=document.getElementById('udrop');if(d)d.classList.remove('open');}
function toggleNotif(){var n=document.getElementById('notifPanel');if(n)n.classList.toggle('open');}
document.addEventListener('click',function(e){
  var uc=document.getElementById('uChip'),ud=document.getElementById('udrop');
  var nb=document.getElementById('notifBtn'),np=document.getElementById('notifPanel');
  if(uc&&ud&&!uc.contains(e.target)&&!ud.contains(e.target))ud.classList.remove('open');
  if(nb&&np&&!nb.contains(e.target)&&!np.contains(e.target))np.classList.remove('open');
});
function showProfile(){if(S.user)toast(S.user.name+' | '+S.user.gmail+(S.user.country?' | '+S.user.country:''));}

function loadNotifs(){
  if(!S.user)return;
  api('getNotifications',{gmail:S.user.gmail},function(r){
    if(!r.ok)return;
    var list=r.notifications||[];
    var dot=document.getElementById('notifDot');
    if(dot)dot.className='notif-dot'+(list.filter(function(n){return !n.isRead;}).length?' on':'');
    var nl=document.getElementById('notifList');if(!nl)return;nl.innerHTML='';
    if(!list.length){nl.innerHTML='<div style="padding:16px;text-align:center;font-size:.8rem;color:var(--t2)">No notifications</div>';return;}
    list.forEach(function(n){
      var d=document.createElement('div');d.className='np-item'+(n.isRead?'':' unread');
      d.innerHTML='<div class="np-title">'+(n.type==='download'?'📱 ':n.type==='new'?'✨ ':'🔔 ')+h(n.title)+'</div><div class="np-msg">'+h(n.message)+'</div><div class="np-date">'+fmtDate(n.date)+'</div>';
      d.onclick=function(){if(!n.isRead){api('markNotifRead',{gmail:S.user.gmail,notifId:n.id},null);d.classList.remove('unread');if(dot)dot.classList.remove('on');}};
      nl.appendChild(d);
    });
  });
}
function markAllRead(){
  if(!S.user)return;
  api('getNotifications',{gmail:S.user.gmail},function(r){
    (r.notifications||[]).filter(function(n){return !n.isRead;}).forEach(function(n){api('markNotifRead',{gmail:S.user.gmail,notifId:n.id},null);});
    setTimeout(loadNotifs,600);var dot=document.getElementById('notifDot');if(dot)dot.classList.remove('on');
  });
}

/* ── auth ── */
function showAuth(tab){stab(tab||'login');openOv('authOv');}
function stab(tab){
  ['login','register'].forEach(function(t){var ta=document.getElementById('tab-'+t),fo=document.getElementById('form-'+t);if(ta)ta.classList.toggle('active',t===tab);if(fo)fo.classList.toggle('hidden',t!==tab);});
  var at=document.getElementById('authTitle');if(at)at.textContent=tab==='register'?'Create Account':'Sign in to KEYTUBE';
  ['liErr','reErr'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='';});
}
function doLogin(){
  var em=document.getElementById('liE').value.trim(),pw=document.getElementById('liP').value,er=document.getElementById('liErr');
  if(!em||!pw){er.textContent='Fill all fields';return;}
  api('login',{gmail:em,password:pw},function(r){
    if(r.ok){S.user=r.user;sessionStorage.setItem('km_u',JSON.stringify(r.user));cOv('authOv');updateHeaderUI();loadNotifs();startPing();toast('Welcome, '+r.user.name+' 👋','tok');if(window.onAuthChanged)onAuthChanged();}
    else er.textContent=r.msg;
  });
}
function doRegister(){
  var nm=document.getElementById('reN').value.trim(),em=document.getElementById('reE').value.trim(),pw=document.getElementById('reP').value,co=document.getElementById('reCo').value,er=document.getElementById('reErr');
  if(!nm||!em||!pw){er.textContent='Fill all required fields';return;}
  api('register',{name:nm,gmail:em,password:pw,country:co},function(r){
    if(r.ok){S.user=r.user;sessionStorage.setItem('km_u',JSON.stringify(r.user));cOv('authOv');updateHeaderUI();startPing();toast('Welcome '+nm+' 🎉','tok');if(window.onAuthChanged)onAuthChanged();}
    else er.textContent=r.msg;
  });
}
function logout(){S.user=null;sessionStorage.removeItem('km_u');clearInterval(S.pingTimer);updateHeaderUI();toast('Signed out 👋');if(window.onAuthChanged)onAuthChanged();}

function openOv(id){var e=document.getElementById(id);if(e)e.classList.add('open');}
function cOv(id){var e=document.getElementById(id);if(e)e.classList.remove('open');}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){cSearch();cOv('authOv');cOv('pageOv');}});

function showPage(key){
  var pg=S.pages[key]||{title:cap(key),content:'No content yet.'};
  var t=document.getElementById('pageTit'),b=document.getElementById('pageBody');
  if(t)t.textContent=pg.title;if(b)b.textContent=pg.content;
  openOv('pageOv');
}

/* ── search (shared overlay) ── */
function onSearch(v){clearTimeout(S.srTimer);if(!v.trim()){cSearch();return;}S.srTimer=setTimeout(function(){execSearch(v.trim());},360);}
function doSBtn(){var i=document.getElementById('si');var v=i?i.value.trim():'';if(v)execSearch(v);else cSearch();}
function openSearch(){var so=document.getElementById('srOv');if(so)so.classList.add('open');var i=document.getElementById('si');if(i)i.focus();}
function execSearch(q){
  api('searchMovies',{query:q,isLoggedIn:!!S.user},function(r){
    if(!r.ok)return;
    openSearch();
    document.getElementById('srQ').textContent=q;
    var exact=r.exact||[],sim=r.similar||[];
    document.getElementById('srSub').textContent=exact.length+' exact  ·  '+sim.length+' similar';
    var ex=document.getElementById('srEx');ex.innerHTML='';
    if(exact.length){var g=document.createElement('div');g.className='gw';exact.forEach(function(m){g.appendChild(mkCard(m,'grid'));});ex.appendChild(g);}
    else ex.innerHTML='<div class="nomatch"><h3>No exact match for "'+h(q)+'"</h3><p>Showing similar results ↓</p></div>';
    var sm=document.getElementById('srSim');sm.innerHTML='';
    if(sim.length){var t2=document.createElement('div');t2.className='sr-st';t2.textContent='Similar Results';var g2=document.createElement('div');g2.className='gw';sim.forEach(function(m){g2.appendChild(mkCard(m,'grid'));});sm.appendChild(t2);sm.appendChild(g2);}
  });
}
function cSearch(){var so=document.getElementById('srOv');if(so)so.classList.remove('open');var i=document.getElementById('si');if(i)i.value='';}

/* ── card renderer (used by Home rows/grid AND Watch's "More Like This") ──
   Tapping a card navigates to the separate watch.html page (real page nav,
   not a modal) — exactly like tapping a video in a real app opens a new screen. */
function getCatBadge(m){
  if(m.category==='comedy')return'<span class="cbg cb-comedy">😂 Comedy</span>';
  if(m.category==='song')return'<span class="cbg cb-song">🎵 Song</span>';
  if(m.category==='news')return'<span class="cbg cb-news">📰 News</span>';
  return'<span class="cbg cb-c">'+cap(m.category||'')+'</span>';
}
function mkCard(m,mode){
  var d=document.createElement('div');d.className='mc';if(mode==='grid')d.style.width='100%';
  var ph='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><rect fill="%23f2f2f2" width="160" height="240"/><text x="80" y="130" text-anchor="middle" fill="%23ccc" font-size="42">🎬</text></svg>';
  d.innerHTML='<div class="ct"><img src="'+(m.cover||ph)+'" alt="'+h(m.name)+'" loading="lazy" onerror="this.src=\''+ph+'\'">'+
    '<div class="cbadges">'+getCatBadge(m)+(m.isNew?'<span class="cbg cb-n">NEW</span>':'')+(m.season?'<span class="cbg cb-e">S'+h(m.season)+'</span>':'')+'</div></div>'+
    '<div class="ci"><div class="ctit">'+h(m.name)+'</div><div class="crat">⭐ '+(m.rating||'—')+' <span style="color:var(--t2);font-weight:400">· '+h(m.year)+'</span></div></div>';
  d.onclick=function(){goToWatch(m.id);};return d;
}
function goToWatch(id){window.location.href='watch.html?id='+encodeURIComponent(id);}

/* ── download (used on watch.html) — records completed downloads locally
   so the Home page's Downloads tab can list them ── */
async function segDownload(url,filename,movie){
  if(!S.user){showLoginReq();return;}
  var prog=document.getElementById('dlProg'),bar=document.getElementById('dlBar'),pct=document.getElementById('dlPct'),spd=document.getElementById('dlSpd');
  prog.classList.add('show');bar.style.width='0%';pct.textContent='0%';spd.textContent='Connecting…';
  try{
    var resp=await fetch(url,{redirect:'follow'});if(!resp.ok)throw new Error('HTTP '+resp.status);
    var total=parseInt(resp.headers.get('Content-Length')||'0');
    var reader=resp.body.getReader(),chunks=[],received=0,start=Date.now();
    while(true){var res=await reader.read();if(res.done)break;chunks.push(res.value);received+=res.value.length;var p=total?Math.round(received/total*100):Math.min(Math.round(received/1024/100),90);bar.style.width=p+'%';pct.textContent=p+'%';var el=(Date.now()-start)/1000;var kbps=el>0?Math.round(received/el/1024):0;spd.textContent=kbps+' KB/s — '+Math.round(received/1024)+' KB';}
    bar.style.width='100%';pct.textContent='100%';spd.textContent='Saving…';
    var blob=new Blob(chunks);
    var bUrl=URL.createObjectURL(blob);var a=document.createElement('a');a.href=bUrl;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(bUrl);},5000);
    spd.textContent='✅ Downloaded!';
    api('logDownload',{gmail:S.user.gmail,movieId:movie.id,movieName:movie.name,status:'completed'});
    try{
      var list=JSON.parse(localStorage.getItem('km_downloads')||'[]');
      list=list.filter(function(x){return String(x.id)!==String(movie.id);});
      list.push({id:movie.id,name:movie.name,cover:movie.cover,category:movie.category,rating:movie.rating,year:movie.year});
      localStorage.setItem('km_downloads',JSON.stringify(list));
    }catch(e){}
    toast('Download complete ✓','tok');setTimeout(function(){prog.classList.remove('show');},3000);
  }catch(err){
    spd.textContent='Error: '+err.message;toast('Download failed','terr');setTimeout(function(){prog.classList.remove('show');},3000);
    window.open(url,'_blank');
  }
}

/* ============================================================
   VIDEO PLAYBACK — works for ANY category (comedy, song, news,
   movie, series…) and auto-advances within the SAME category when
   a video ends, exactly like before. Also fits fully inside the
   phone frame on mobile (no stretching/cropping/overflow).
   ============================================================ */
var YT_READY=false,YT_QUEUE=[],ytPlayer=null;
var catList=[],catIdx=0,autoNextTimer=null,autoNextCount=0,AN_SECS=5;
var CAT_META={
  comedy:{icon:'😂',label:'Next Comedy · Auto-playing'},
  song:{icon:'🎵',label:'Next Song · Auto-playing'},
  news:{icon:'📰',label:'Next News · Auto-playing'},
  series:{icon:'📺',label:'Next Episode · Auto-playing'}
};
function catMeta(cat){return CAT_META[cat]||{icon:'▶',label:'Next Up · Auto-playing'};}
function onYouTubeIframeAPIReady(){YT_READY=true;var fn;while((fn=YT_QUEUE.shift())){try{fn();}catch(e){}}}
(function(){var tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';document.head.appendChild(tag);})();

function buildCategoryList(allMovies,currentId,category){
  catList=allMovies.filter(function(m){return m.category===category;});
  catList.sort(function(a,b){var na=parseInt(a.id),nb=parseInt(b.id);if(!isNaN(na)&&!isNaN(nb))return na-nb;return String(a.id).localeCompare(String(b.id));});
  catIdx=0;for(var i=0;i<catList.length;i++){if(String(catList[i].id)===String(currentId)){catIdx=i;break;}}
}
function startAutoNext(category){
  if(!catList.length)return;
  var nextIdx=(catIdx+1)%catList.length;
  var nextMovie=catList[nextIdx];
  if(!nextMovie)return;
  var banner=document.getElementById('autoNextBanner');if(!banner)return;
  var meta=catMeta(category);
  document.getElementById('anIcon').textContent=meta.icon;
  document.getElementById('anLabel').textContent=meta.label;
  document.getElementById('anTitle').textContent=nextMovie.name;
  document.getElementById('anPos').textContent=cap(category)+' '+(nextIdx+1)+' / '+catList.length+(nextIdx===0?'  ↩ Looping back to start':'');
  banner.classList.add('show');
  autoNextCount=AN_SECS;
  var DASH=119.4;
  function tick(){
    var numEl=document.getElementById('anNum'),ringEl=document.getElementById('anRingFill'),progEl=document.getElementById('anProg');
    if(numEl)numEl.textContent=autoNextCount;
    if(ringEl)ringEl.style.strokeDashoffset=DASH*(autoNextCount/AN_SECS);
    if(progEl)progEl.style.width=((AN_SECS-autoNextCount)/AN_SECS*100)+'%';
  }
  tick();
  clearInterval(autoNextTimer);
  autoNextTimer=setInterval(function(){
    autoNextCount--;tick();
    if(autoNextCount<=0){
      var goToId=nextMovie.id,goToIdx=nextIdx;
      clearInterval(autoNextTimer);autoNextTimer=null;
      banner.classList.remove('show');
      catIdx=goToIdx;
      window.location.href='watch.html?id='+encodeURIComponent(goToId)+'&auto=1';
    }
  },1000);
}
function cancelAutoNext(){clearInterval(autoNextTimer);autoNextTimer=null;var b=document.getElementById('autoNextBanner');if(b)b.classList.remove('show');var p=document.getElementById('anProg');if(p)p.style.width='0%';toast('Auto-play cancelled');}
function clearAutoNext(){clearInterval(autoNextTimer);autoNextTimer=null;var b=document.getElementById('autoNextBanner');if(b)b.classList.remove('show');var p=document.getElementById('anProg');if(p)p.style.width='0%';}

function isMobileView(){return window.matchMedia('(max-width:620px)').matches;}
function enterFullscreenPlayer(vw){
  if(!isMobileView())return;
  vw.classList.add('mfs');
  if(!document.getElementById('mfsCloseBtn')){
    var b=document.createElement('button');
    b.id='mfsCloseBtn';b.className='mfs-close';b.innerHTML='✕';
    b.onclick=function(){exitFullscreenPlayer();};
    document.body.appendChild(b);
  }
}
function exitFullscreenPlayer(){
  var vw=document.getElementById('vidWrap');if(vw)vw.classList.remove('mfs');
  var b=document.getElementById('mfsCloseBtn');if(b)b.remove();
}
function stopCurrentVideo(){
  try{if(ytPlayer&&typeof ytPlayer.destroy==='function'){ytPlayer.destroy();}ytPlayer=null;}catch(e){}
  var vw=document.getElementById('vidWrap');if(vw){vw.innerHTML='';vw.style.display='none';}
  exitFullscreenPlayer();
}

function buildPlayer(url){
  url=(url||'').trim();if(!url)return'<p style="padding:20px;color:#999;text-align:center">No video link.</p>';
  var yt=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if(yt)return'<iframe src="https://www.youtube.com/embed/'+yt[1]+'?autoplay=1&rel=0" allowfullscreen allow="autoplay;encrypted-media" style="width:100%;height:100%;border:none"></iframe>';
  var vi=url.match(/vimeo\.com\/(\d+)/);
  if(vi)return'<iframe src="https://player.vimeo.com/video/'+vi[1]+'?autoplay=1" allowfullscreen allow="autoplay" style="width:100%;height:100%;border:none"></iframe>';
  var dm=url.match(/dailymotion\.com\/video\/([a-z0-9]+)/i);
  if(dm)return'<iframe src="https://www.dailymotion.com/embed/video/'+dm[1]+'?autoplay=1" allowfullscreen allow="autoplay" style="width:100%;height:100%;border:none"></iframe>';
  var gd=url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if(gd)return'<iframe src="https://drive.google.com/file/d/'+gd[1]+'/preview" allowfullscreen allow="autoplay" style="width:100%;height:100%;border:none"></iframe>';
  if(/\.(mp4|webm|ogg|mkv|mov)(\?.*)?$/i.test(url))return'<video controls autoplay src="'+h(url)+'" style="width:100%;height:100%;background:#000">Not supported.</video>';
  return'<iframe src="'+h(url)+'" allowfullscreen allow="autoplay;encrypted-media" style="width:100%;height:100%;border:none"></iframe>';
}

/* plays ANY category and, once it ends, auto-advances within the SAME category */
function playVideo(m,allMovies){
  var vw=document.getElementById('vidWrap'),hero=document.getElementById('heroMedia');
  clearAutoNext();
  buildCategoryList(allMovies,m.id,m.category);
  var category=m.category;

  var ytM=(m.videoURL||'').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if(ytM){
    vw.innerHTML='<div id="ytPlayerDiv" style="width:100%;height:100%"></div>';
    vw.style.display='block';if(hero)hero.classList.add('hidden');
    enterFullscreenPlayer(vw);
    vw.scrollIntoView({behavior:'smooth',block:'start'});
    var videoId=ytM[1];
    var createPlayer=function(){
      try{if(ytPlayer&&typeof ytPlayer.destroy==='function')ytPlayer.destroy();ytPlayer=null;}catch(e){}
      var el=document.getElementById('ytPlayerDiv');if(!el)return;
      ytPlayer=new YT.Player(el,{height:'100%',width:'100%',videoId:videoId,
        playerVars:{autoplay:1,rel:0,modestbranding:1,playsinline:1},
        events:{onStateChange:function(evt){if(evt.data===0)startAutoNext(category);}}});
    };
    if(YT_READY)createPlayer();else YT_QUEUE.push(createPlayer);
    api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'play',country:'',details:m.name});
    return;
  }
  if(/\.(mp4|webm|ogg)(\?.*)?$/i.test((m.videoURL||'').trim())){
    vw.innerHTML='<video controls autoplay id="curVid" style="width:100%;height:100%;background:#000" src="'+h(m.videoURL)+'">Not supported.</video>';
    vw.style.display='block';if(hero)hero.classList.add('hidden');
    enterFullscreenPlayer(vw);
    vw.scrollIntoView({behavior:'smooth',block:'start'});
    var vid=document.getElementById('curVid');if(vid)vid.onended=function(){startAutoNext(category);};
    api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'play',country:'',details:m.name});
    return;
  }
  vw.innerHTML=buildPlayer(m.videoURL);vw.style.display='block';if(hero)hero.classList.add('hidden');
  enterFullscreenPlayer(vw);
  vw.scrollIntoView({behavior:'smooth',block:'start'});
  api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'play',country:'',details:m.name});
}
