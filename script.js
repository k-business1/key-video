
var API = 'https://script.google.com/macros/s/AKfycbxVdY-_WNOhxAEVqAMi2E1Q6R0KVBWnhq7EQGwNj21BWpbIOfi7phMt3y85qEhs9tXQ/exec';
var EMOJIS = ['💬','😂','❤️','😭','🔥','😍','👍','🤣','😮','💯','😎','🎬'];
var S = {user:null,adminToken:null,movies:[],settings:{},pages:{},curMovie:null,
         heroMovies:[],heroIdx:0,heroTimer:null,activeCat:'all',activeType:'all',
         srTimer:null,pingTimer:null,selEmoji:'💬'};

var YT_READY=false,YT_QUEUE=[],ytPlayer=null;
var comedyList=[],comedyIdx=0,autoNextTimer=null,autoNextCount=0,AN_SECS=5;

function onYouTubeIframeAPIReady(){YT_READY=true;var fn;while((fn=YT_QUEUE.shift())){try{fn();}catch(e){}}}
(function(){var tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';document.head.appendChild(tag);})();

function buildComedyList(currentId){
  comedyList=S.movies.filter(function(m){return m.category==='comedy';});
  comedyList.sort(function(a,b){var na=parseInt(a.id),nb=parseInt(b.id);if(!isNaN(na)&&!isNaN(nb))return na-nb;return String(a.id).localeCompare(String(b.id));});
  comedyIdx=0;for(var i=0;i<comedyList.length;i++){if(String(comedyList[i].id)===String(currentId)){comedyIdx=i;break;}}
}

function startAutoNext(){
  if(!comedyList.length)return;
  var nextIdx=(comedyIdx+1)%comedyList.length;
  var nextMovie=comedyList[nextIdx];
  if(!nextMovie)return;
  var banner=document.getElementById('autoNextBanner');if(!banner)return;
  document.getElementById('anTitle').textContent=nextMovie.name;
  document.getElementById('anPos').textContent='Comedy '+(nextIdx+1)+' / '+comedyList.length+(nextIdx===0?'  ↩ Looping back to start':'');
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
      var b=document.getElementById('autoNextBanner');if(b)b.classList.remove('show');
      comedyIdx=goToIdx;stopCurrentVideo();openMovie(goToId,true);
    }
  },1000);
}
function cancelAutoNext(){clearInterval(autoNextTimer);autoNextTimer=null;var b=document.getElementById('autoNextBanner');if(b)b.classList.remove('show');var p=document.getElementById('anProg');if(p)p.style.width='0%';toast('Auto-play cancelled');}
function clearAutoNext(){clearInterval(autoNextTimer);autoNextTimer=null;var b=document.getElementById('autoNextBanner');if(b)b.classList.remove('show');var p=document.getElementById('anProg');if(p)p.style.width='0%';}
function stopCurrentVideo(){
  try{if(ytPlayer&&typeof ytPlayer.destroy==='function'){ytPlayer.destroy();}ytPlayer=null;}catch(e){}
  var vw=document.getElementById('vidWrap');if(vw){vw.innerHTML='';vw.style.display='none';}
  var cw=document.getElementById('mmCovW');if(cw)cw.style.display='block';
}

function h(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cap(s){return s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';}
function fmtDate(d){var dt=new Date(d);return isNaN(dt)?d:dt.toLocaleDateString();}
function toast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='show'+(type?' '+type:'');clearTimeout(t._t);t._t=setTimeout(function(){t.className='';},3000);}

var pbarW=0,pbarT;
function pStart(){pbarW=0;var el=document.getElementById('pbar');el.className='';el.style.width='0%';clearInterval(pbarT);pbarT=setInterval(function(){pbarW=Math.min(pbarW+Math.random()*8,88);el.style.width=pbarW+'%';},120);}
function pDone(){clearInterval(pbarT);var el=document.getElementById('pbar');el.style.width='100%';setTimeout(function(){el.className='done';setTimeout(function(){el.style.width='0%';el.className='';},500);},300);}

function api(action,data,cb){
  pStart();
  fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(Object.assign({},data||{},{action:action})),redirect:'follow'})
  .then(function(r){return r.json();})
  .then(function(res){pDone();if(cb)cb(res);})
  .catch(function(e){pDone();toast('Connection error','terr');console.error(e);document.getElementById('pgLoad').style.display='none';});
}

window.onload=function(){
  try{var u=sessionStorage.getItem('km_u');if(u)S.user=JSON.parse(u);}catch(e){}
  try{var a=sessionStorage.getItem('km_a');if(a)S.adminToken=a;}catch(e){}
  updateNavUI();
  api('getSettings',{},function(r){
    if(r.ok){S.settings=r.settings;applySettings();}
    api('getPages',{},function(pr){if(pr.ok)S.pages=pr.pages||{};});
    loadMovies();
    if(S.user){loadNotifs();startPing();}
    api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'visit',country:S.user?S.user.country:'',details:navigator.language});
  });
};

function applySettings(){
  var s=S.settings,sn=s['site_name']||'KEYTUBE';
  document.title=sn;
  var e=document.getElementById('snEl');if(e)e.textContent=sn;
  var fb=document.getElementById('fbrand');if(fb)fb.textContent=sn;
  if(s['favicon_url']&&s['favicon_url'].trim()){
    var lk=document.querySelector("link[rel~='icon']")||document.createElement('link');
    lk.rel='icon';lk.href=s['favicon_url'];document.head.appendChild(lk);
  }
  if(s['background_url']){document.body.style.backgroundImage='url('+s['background_url']+')';document.body.style.backgroundSize='cover';document.body.style.backgroundAttachment='fixed';}
  if(s['ads_top'])document.getElementById('adTop').innerHTML=s['ads_top'];
  if(s['ads_middle'])document.getElementById('adMid').innerHTML=s['ads_middle'];
  if(s['ads_bottom'])document.getElementById('adBot').innerHTML=s['ads_bottom'];
  if(s['app_download_url']&&s['app_download_url'].trim()){document.getElementById('appBanner').classList.add('show');document.getElementById('appDlBtn').dataset.url=s['app_download_url'];}
}
function downloadApp(){var url=document.getElementById('appDlBtn').dataset.url||'';if(url)window.open(url,'_blank');else toast('App URL not set yet','terr');}

function showLoginReq(){document.getElementById('loginReq').classList.add('show');var f=document.querySelector('.lr-fill');if(f){f.style.width='0%';void f.offsetWidth;f.style.width='100%';}}
function hideLoginReq(){document.getElementById('loginReq').classList.remove('show');}

function startPing(){clearInterval(S.pingTimer);pingOnline();S.pingTimer=setInterval(pingOnline,30000);}
function pingOnline(){if(S.user)api('pingOnline',{gmail:S.user.gmail,country:S.user.country||''},null);}

function getUserSeed(gmail){var s=0;for(var i=0;i<gmail.length;i++)s+=gmail.charCodeAt(i)*(i+1);return Math.abs(s)||42;}
function seededShuffle(arr,seed){var a=arr.slice();for(var i=a.length-1;i>0;i--){seed=(seed*9301+49297)%233280;var j=Math.floor((seed/233280)*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}

function loadMovies(cat,type,year,minRating,country){
  api('getMovies',{isLoggedIn:!!S.user,category:cat||S.activeCat,type:type||S.activeType,year:year||'',minRating:minRating||'',country:country||''},function(r){
    document.getElementById('pgLoad').style.display='none';
    if(!r.ok){toast(r.msg,'terr');return;}
    S.movies=r.movies||[];renderAll();
  });
}

function renderAll(){
  var raw=S.movies.slice().reverse();
  var nw=raw.filter(function(m){return m.isNew;}),old=raw.filter(function(m){return !m.isNew;});
  var mv=nw.concat(old);
  var feat=mv.filter(function(m){return m.featured;});
  if(!feat.length)feat=mv.slice(0,Math.min(5,mv.length));
  S.heroMovies=feat;S.heroIdx=0;
  if(feat.length){document.getElementById('hero').style.display='block';buildHeroDots();renderHero(0);startHeroTimer();}
  var tPool=mv.filter(function(m){return !m.isNew;}).slice(0,30);
  if(S.user)tPool=seededShuffle(tPool,getUserSeed(S.user.gmail));
  renderRow('tRow',tPool.slice(0,20));
  if(S.user){
    var newItems=mv.filter(function(m){return m.isNew;}),ns=document.getElementById('newSec');
    if(newItems.length){ns.classList.remove('hidden');renderRow('nRow',newItems.slice(0,20));}else ns.classList.add('hidden');
    document.getElementById('guestBanner').style.display='none';
  }else{document.getElementById('newSec').classList.add('hidden');document.getElementById('guestBanner').style.display='block';}
  var grid=mv.slice();
  if(S.user){var s2=getUserSeed(S.user.gmail)+7777;var gN=grid.filter(function(m){return m.isNew;});var gO=seededShuffle(grid.filter(function(m){return !m.isNew;}),s2);grid=gN.concat(gO);}
  renderGrid(grid);
}

function renderHero(i){
  var m=S.heroMovies[i];if(!m)return;
  document.getElementById('hCover').src=m.cover||'';
  document.getElementById('hTitle').textContent=m.name;
  document.getElementById('hDesc').textContent=m.description||'';
  document.getElementById('hBadge').textContent=m.isNew?'🆕 New':'⭐ Featured';
  document.getElementById('hMeta').innerHTML='<span class="hrat">⭐ '+(m.rating||'?')+'</span><span>'+h(m.year)+'</span><span>'+cap(m.category)+'</span>';
  document.querySelectorAll('.hdot').forEach(function(d,j){d.classList.toggle('active',j===i);});
}
function buildHeroDots(){var c=document.getElementById('hDots');c.innerHTML='';S.heroMovies.forEach(function(_,i){var d=document.createElement('span');d.className='hdot'+(i===0?' active':'');d.onclick=function(){heroGoTo(i);};c.appendChild(d);});}
function heroGoTo(i){S.heroIdx=i;renderHero(i);}
function heroPlay(){var m=S.heroMovies[S.heroIdx];if(m)openMovie(m.id,true);}
function heroInfo(){var m=S.heroMovies[S.heroIdx];if(m)openMovie(m.id,false);}
function startHeroTimer(){clearInterval(S.heroTimer);S.heroTimer=setInterval(function(){S.heroIdx=(S.heroIdx+1)%S.heroMovies.length;renderHero(S.heroIdx);},6000);}
function renderRow(id,movies){var c=document.getElementById(id);if(!c)return;c.innerHTML='';if(!movies.length){c.innerHTML='<p style="color:var(--t2);font-size:.79rem;padding:8px 0">Nothing here yet.</p>';return;}movies.forEach(function(m){c.appendChild(mkCard(m,'row'));});}
function renderGrid(movies){var g=document.getElementById('mGrid'),e=document.getElementById('emptySt');g.innerHTML='';if(!movies.length){e.classList.remove('hidden');document.getElementById('emptyMsg').textContent=S.user?'No content found.':'Sign in to see more.';return;}e.classList.add('hidden');movies.forEach(function(m){g.appendChild(mkCard(m,'grid'));});}

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
    '<div class="cbadges">'+getCatBadge(m)+(m.isNew?'<span class="cbg cb-n">NEW</span>':'')+(m.season?'<span class="cbg cb-e">S'+h(m.season)+'</span>':'')+'</div>'+
    '<div class="chov"><div class="cpl">▶</div></div></div>'+
    '<div class="ci"><div class="ctit">'+h(m.name)+'</div><div class="csub"><span class="crat">⭐ '+(m.rating||'—')+'</span><span>'+h(m.year)+'</span></div></div>';
  d.onclick=function(){openMovie(m.id,false);};return d;
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

function playVideo(m){
  var vw=document.getElementById('vidWrap'),cw=document.getElementById('mmCovW'),desc=document.getElementById('mmDesc');
  clearAutoNext();
  if(m.category==='comedy'){
    buildComedyList(m.id);
    var ytM=(m.videoURL||'').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    if(ytM){
      vw.innerHTML='<div id="ytPlayerDiv" style="width:100%;height:100%"></div>';
      vw.style.display='block';cw.style.display='none';if(desc)desc.classList.add('hidden-desc');
      vw.scrollIntoView({behavior:'smooth',block:'start'});
      var videoId=ytM[1];
      var createPlayer=function(){
        try{if(ytPlayer&&typeof ytPlayer.destroy==='function')ytPlayer.destroy();ytPlayer=null;}catch(e){}
        var el=document.getElementById('ytPlayerDiv');if(!el)return;
        ytPlayer=new YT.Player(el,{height:'100%',width:'100%',videoId:videoId,
          playerVars:{autoplay:1,rel:0,modestbranding:1,playsinline:1},
          events:{onStateChange:function(evt){if(evt.data===0)startAutoNext();}}});
      };
      if(YT_READY)createPlayer();else YT_QUEUE.push(createPlayer);
      api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'play',country:'',details:m.name});
      return;
    }
    if(/\.(mp4|webm|ogg)(\?.*)?$/i.test((m.videoURL||'').trim())){
      vw.innerHTML='<video controls autoplay id="comedyVid" style="width:100%;height:100%;background:#000" src="'+h(m.videoURL)+'">Not supported.</video>';
      vw.style.display='block';cw.style.display='none';if(desc)desc.classList.add('hidden-desc');
      vw.scrollIntoView({behavior:'smooth',block:'start'});
      var vid=document.getElementById('comedyVid');if(vid)vid.onended=function(){startAutoNext();};
      api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'play',country:'',details:m.name});
      return;
    }
  }
  vw.innerHTML=buildPlayer(m.videoURL);vw.style.display='block';cw.style.display='none';
  if(desc)desc.classList.add('hidden-desc');
  vw.scrollIntoView({behavior:'smooth',block:'start'});
  api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'play',country:'',details:m.name});
}

async function segDownload(url,filename,movieId,movieName){
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
    if('caches' in window){try{var cache=await caches.open('kkkkk');await cache.put('/downloads/'+filename,new Response(blob));}catch(ce){}}
    var bUrl=URL.createObjectURL(blob);var a=document.createElement('a');a.href=bUrl;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(bUrl);},5000);
    spd.textContent='✅ Downloaded!';
    api('logDownload',{gmail:S.user.gmail,movieId:movieId,movieName:movieName,status:'completed'});
    toast('Download complete ✓','tok');setTimeout(function(){prog.classList.remove('show');},3000);
  }catch(err){
    spd.textContent='Error: '+err.message;toast('Download failed','terr');setTimeout(function(){prog.classList.remove('show');},3000);
    window.open(url,'_blank');
  }
}

function openMovie(id,autoPlay){
  api('getMovie',{id:id},function(r){
    if(!r.ok){toast(r.msg,'terr');return;}
    var m=r.movie;S.curMovie=m;
    var vw=document.getElementById('vidWrap');vw.innerHTML='';vw.style.display='none';
    document.getElementById('mmCovW').style.display='block';
    document.getElementById('mmCovI').src=m.cover||'';
    document.getElementById('mmBadges').innerHTML=getCatBadge(m)+(m.isNew?'<span class="cbg cb-n">NEW</span>':'')+(m.type==='series'?'<span class="cbg cb-e">📺 Series</span>':'');
    document.getElementById('mmTitle').textContent=m.name;
    document.getElementById('mmMeta').innerHTML=
      '<span class="mm-rat">⭐ '+(m.rating||'N/A')+'</span>'+
      '<span>📅 '+h(m.year)+'</span><span>🌍 '+h(m.country||'International')+'</span>'+
      (m.season?'<span>S'+h(m.season)+'</span>':'')+(m.episode?'<span>E'+h(m.episode)+'</span>':'');
    var descEl=document.getElementById('mmDesc');descEl.textContent=m.description||'';descEl.classList.remove('hidden-desc');
    document.getElementById('dlProg').classList.remove('show');
    var acts=document.getElementById('mmActs');acts.innerHTML='';
    if(m.videoURL){
      var pb=document.createElement('button');pb.className='mmb mmb-play';
      pb.innerHTML='▶ Play'+(m.category==='comedy'?' 😂':m.category==='song'?' 🎵':m.category==='news'?' 📰':'');
      pb.onclick=function(){playVideo(m);};acts.appendChild(pb);
    }
    if(m.downloadURL){
      var db=document.createElement('button');db.className='mmb';db.innerHTML='⬇ Download';
      db.onclick=function(){if(!S.user){showLoginReq();return;}segDownload(m.downloadURL,(m.name.replace(/[^a-z0-9]/gi,'_')||'video')+'.mp4',m.id,m.name);};
      acts.appendChild(db);
    }
    var inPL=false;
    var plb=document.createElement('button');plb.className='mmb';
    function updPL(){plb.innerHTML=inPL?'✓ In Playlist':'📋 + Playlist';}updPL();
    plb.onclick=function(){
      if(!S.user){showLoginReq();return;}
      if(inPL){api('removeFromPlaylist',{gmail:S.user.gmail,movieId:m.id},function(r2){if(r2.ok){inPL=false;updPL();toast('Removed from playlist');}else toast(r2.msg,'terr');});}
      else{api('addToPlaylist',{gmail:S.user.gmail,movieId:m.id},function(r2){if(r2.ok){inPL=true;updPL();toast('Added to playlist ✓','tok');}else toast(r2.msg,'terr');});}
    };acts.appendChild(plb);
    loadComments(m.id);openOv('movOv');
    api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'view',country:'',details:m.name});
    if(autoPlay&&m.videoURL)setTimeout(function(){playVideo(m);},300);
  });
}
function cMovie(){clearAutoNext();stopCurrentVideo();cOv('movOv');}

function loadComments(movieId){
  api('getComments',{movieId:movieId},function(r){
    if(!r.ok)return;
    var list=r.comments||[];
    document.getElementById('cmtCnt').textContent='('+list.length+')';
    var cl=document.getElementById('cmtList');cl.innerHTML='';
    list.forEach(function(c){
      var d=document.createElement('div');d.className='cmt-item';
      var init=(c.name||c.gmail||'?')[0].toUpperCase();
      d.innerHTML='<div class="cmt-av">'+init+'</div><div style="flex:1"><div style="display:flex;gap:5px;align-items:center"><span class="cmt-name">'+h(c.name||c.gmail)+'</span><span class="cmt-emoji">'+h(c.emoji||'💬')+'</span></div><div class="cmt-txt">'+h(c.comment)+'</div><div class="cmt-date">'+fmtDate(c.date)+'</div></div>'+(S.adminToken?'<span class="cmt-del" onclick="admDelCmt(\''+c.id+'\')">🗑</span>':'');
      cl.appendChild(d);
    });
    var cfa=document.getElementById('cmtFA');
    if(S.user){
      cfa.innerHTML='<div class="emoji-row">'+EMOJIS.map(function(e){return'<button class="emoj" onclick="selEmoji(this,\''+e+'\')" data-e="'+e+'">'+e+'</button>';}).join('')+'</div>'+
        '<div class="cmt-form"><textarea id="cmtTxt" placeholder="Add a comment…"></textarea><button onclick="postComment()">Post</button></div>';
      var first=cfa.querySelector('.emoj');if(first)first.classList.add('sel');S.selEmoji='💬';
    }else{cfa.innerHTML='<div class="sign-cmt" onclick="cMovie();showAuth(\'login\')">🔒 Sign in to comment</div>';}
  });
}
function selEmoji(btn,emoji){S.selEmoji=emoji;document.querySelectorAll('.emoj').forEach(function(b){b.classList.remove('sel');});btn.classList.add('sel');}
function postComment(){
  var ta=document.getElementById('cmtTxt');
  if(!ta||!ta.value.trim()){toast('Write something first','terr');return;}
  api('addComment',{gmail:S.user.gmail,name:S.user.name,movieId:S.curMovie.id,comment:ta.value.trim(),emoji:S.selEmoji},function(r){
    if(r.ok){toast('Comment posted ✓','tok');ta.value='';loadComments(S.curMovie.id);}else toast(r.msg,'terr');
  });
}

function showPlaylist(){
  if(!S.user){showLoginReq();return;}
  api('getPlaylist',{gmail:S.user.gmail},function(r){
    if(!r.ok){toast(r.msg,'terr');return;}
    renderGrid(r.movies||[]);
    document.getElementById('gTitle').textContent='📋 My Playlist ('+(r.movies||[]).length+')';
    document.querySelector('main').scrollIntoView({behavior:'smooth'});
  });
}

function loadNotifs(){
  if(!S.user)return;
  api('getNotifications',{gmail:S.user.gmail},function(r){
    if(!r.ok)return;
    var list=r.notifications||[];
    var dot=document.getElementById('notifDot');
    dot.className='notif-dot'+(list.filter(function(n){return !n.isRead;}).length?' on':'');
    var nl=document.getElementById('notifList');nl.innerHTML='';
    if(!list.length){nl.innerHTML='<div style="padding:16px;text-align:center;font-size:.8rem;color:var(--t2)">No notifications</div>';return;}
    list.forEach(function(n){
      var d=document.createElement('div');d.className='np-item'+(n.isRead?'':' unread');
      d.innerHTML='<div class="np-title">'+(n.type==='download'?'📱 ':n.type==='new'?'✨ ':'🔔 ')+h(n.title)+'</div><div class="np-msg">'+h(n.message)+'</div><div class="np-date">'+fmtDate(n.date)+'</div>';
      d.onclick=function(){if(!n.isRead){api('markNotifRead',{gmail:S.user.gmail,notifId:n.id},null);d.classList.remove('unread');dot.classList.remove('on');}};
      nl.appendChild(d);
    });
  });
}
function markAllRead(){
  if(!S.user)return;
  api('getNotifications',{gmail:S.user.gmail},function(r){
    (r.notifications||[]).filter(function(n){return !n.isRead;}).forEach(function(n){api('markNotifRead',{gmail:S.user.gmail,notifId:n.id},null);});
    setTimeout(loadNotifs,600);document.getElementById('notifDot').classList.remove('on');
  });
}
function toggleNotif(){document.getElementById('notifPanel').classList.toggle('open');}

function showPage(key){
  var pg=S.pages[key]||{title:cap(key),content:'No content yet.'};
  document.getElementById('pageTit').textContent=pg.title;
  document.getElementById('pageBody').textContent=pg.content;
  openOv('pageOv');
}

function onSearch(v){clearTimeout(S.srTimer);if(!v.trim()){cSearch();return;}S.srTimer=setTimeout(function(){execSearch(v.trim());},360);}
function doSBtn(){var v=document.getElementById('si').value.trim();if(v)execSearch(v);else cSearch();}
function execSearch(q){
  api('searchMovies',{query:q,isLoggedIn:!!S.user},function(r){
    if(!r.ok)return;
    var so=document.getElementById('srOv');so.classList.add('open');
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
function cSearch(){document.getElementById('srOv').classList.remove('open');document.getElementById('si').value='';}

var advOpen=false;
function toggleAdv(){advOpen=!advOpen;document.getElementById('advF').classList.toggle('open',advOpen);document.getElementById('fArrow').textContent=advOpen?'▲':'▼';}
function applyF(){var yr=document.getElementById('fYear').value,rat=document.getElementById('fRat').value,co=document.getElementById('fCo').value,tp=document.getElementById('fType2').value;loadMovies(S.activeCat,tp||S.activeType,yr,rat,co);}
function clearF(){document.getElementById('fYear').value='';document.getElementById('fRat').value='';document.getElementById('fCo').value='';document.getElementById('fType2').value='all';loadMovies();}
function setCat(cat,btn){
  S.activeCat=cat;document.querySelectorAll('.cp').forEach(function(b){b.classList.remove('active');});if(btn)btn.classList.add('active');
  S.activeType=cat==='series'?'series':cat==='song'?'song':cat==='news'?'news':'all';
  loadMovies(cat,S.activeType);document.querySelector('main').scrollIntoView({behavior:'smooth'});
}
function setCatByName(cat){document.querySelectorAll('.cp').forEach(function(b){if(b.textContent.toLowerCase().indexOf(cat)>=0)setCat(cat,b);});}
function fType(type){S.activeType=type;loadMovies(S.activeCat,type);document.querySelector('main').scrollIntoView({behavior:'smooth'});}
function showNew(){if(!S.user){showLoginReq();return;}var nw=S.movies.filter(function(m){return m.isNew;});renderGrid(nw);document.getElementById('gTitle').textContent='✨ New Releases ('+nw.length+')';document.querySelector('main').scrollIntoView({behavior:'smooth'});}
function goHome(){S.activeCat='all';S.activeType='all';clearF();window.scrollTo({top:0,behavior:'smooth'});}
function sRow(id,dir){var el=document.getElementById(id);if(el)el.scrollBy({left:dir*350,behavior:'smooth'});}

function showAuth(tab){stab(tab||'login');openOv('authOv');}
function stab(tab){
  ['login','register'].forEach(function(t){document.getElementById('tab-'+t).classList.toggle('active',t===tab);document.getElementById('form-'+t).classList.toggle('hidden',t!==tab);});
  document.getElementById('authTitle').textContent=tab==='register'?'Create Account':'Sign in to KEYTUBE';
  ['liErr','reErr'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='';});
}
function onDblYear(){document.getElementById('adP').value='';var er=document.getElementById('adErr');if(er)er.textContent='';openOv('adminAuthOv');}
function doLogin(){
  var em=document.getElementById('liE').value.trim(),pw=document.getElementById('liP').value,er=document.getElementById('liErr');
  if(!em||!pw){er.textContent='Fill all fields';return;}
  api('login',{gmail:em,password:pw},function(r){
    if(r.ok){S.user=r.user;sessionStorage.setItem('km_u',JSON.stringify(r.user));cOv('authOv');updateNavUI();loadMovies();loadNotifs();startPing();toast('Welcome, '+r.user.name+' 👋','tok');}
    else er.textContent=r.msg;
  });
}
function doRegister(){
  var nm=document.getElementById('reN').value.trim(),em=document.getElementById('reE').value.trim(),pw=document.getElementById('reP').value,co=document.getElementById('reCo').value,er=document.getElementById('reErr');
  if(!nm||!em||!pw){er.textContent='Fill all required fields';return;}
  api('register',{name:nm,gmail:em,password:pw,country:co},function(r){
    if(r.ok){S.user=r.user;sessionStorage.setItem('km_u',JSON.stringify(r.user));cOv('authOv');updateNavUI();loadMovies();startPing();toast('Welcome '+nm+' 🎉','tok');}
    else er.textContent=r.msg;
  });
}
function doAdminAuth(){
  var pw=document.getElementById('adP').value,er=document.getElementById('adErr');
  api('adminLogin',{password:pw},function(r){
    if(r.ok){S.adminToken=r.token;sessionStorage.setItem('km_a',r.token);cOv('adminAuthOv');updateNavUI();openAdmin();toast('Admin access granted ✓','tok');}
    else er.textContent=r.msg;
  });
}
function logout(){S.user=null;S.adminToken=null;sessionStorage.removeItem('km_u');sessionStorage.removeItem('km_a');clearInterval(S.pingTimer);updateNavUI();loadMovies();toast('Signed out 👋');}
function adminLogout(){if(!confirm('Log out of admin?'))return;S.adminToken=null;sessionStorage.removeItem('km_a');updateNavUI();closeAdmin();toast('Admin logged out 👋');}
function updateNavUI(){
  var u=S.user;
  document.getElementById('siBtn').style.display=u?'none':'';document.getElementById('suBtn').style.display=u?'none':'';
  document.getElementById('uChip').style.display=u?'':'none';document.getElementById('admNavBtn').style.display=S.adminToken?'':'none';
  document.getElementById('admDropI').style.display=S.adminToken?'':'none';document.getElementById('notifBtn').style.display=u?'':'none';
  if(u)document.getElementById('avEl').textContent=(u.name||u.gmail||'U')[0].toUpperCase();
}
function toggleDrop(){document.getElementById('udrop').classList.toggle('open');}
function cd(){document.getElementById('udrop').classList.remove('open');}
document.addEventListener('click',function(e){
  var uc=document.getElementById('uChip'),ud=document.getElementById('udrop');
  var nb=document.getElementById('notifBtn'),np=document.getElementById('notifPanel');
  if(uc&&ud&&!uc.contains(e.target)&&!ud.contains(e.target))ud.classList.remove('open');
  if(nb&&np&&!nb.contains(e.target)&&!np.contains(e.target))np.classList.remove('open');
});
function showProfile(){if(S.user)toast(S.user.name+' | '+S.user.gmail+(S.user.country?' | '+S.user.country:''));}

function openOv(id){document.getElementById(id).classList.add('open');}
function cOv(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){cSearch();cOv('authOv');cOv('adminAuthOv');cMovie();cOv('pageOv');}});

function openAdmin(){document.getElementById('admPanel').classList.add('open');aTab('dash');}
function closeAdmin(){document.getElementById('admPanel').classList.remove('open');}
function aTab(tab){
  document.querySelectorAll('.atb').forEach(function(b){b.classList.remove('act');});
  var tabs=['dash','movies','users','comments','notif','pages','traffic','settings'];
  var idx=tabs.indexOf(tab);if(idx>=0)document.querySelectorAll('.atb')[idx].classList.add('act');
  document.getElementById('abody').innerHTML='<div style="display:grid;place-items:center;padding:80px"><div class="spin"></div></div>';
  ({dash:aDash,movies:aMovies,users:aUsers,comments:aComments,notif:aNotif,pages:aPages,traffic:aTraffic,settings:aSettings})[tab]();
}
function aDash(){
  api('getStats',{token:S.adminToken},function(r){
    if(!r.ok){aErr(r.msg);return;}var s=r.stats;
    api('getOnlineUsers',{token:S.adminToken},function(lo){
      var lc=lo.ok?lo.count:0,lu=lo.ok?lo.users:[];
      document.getElementById('abody').innerHTML=
        '<div class="stats-r">'+[['👥','Users',s.users],['🎬','Movies',s.movies],['💬','Comments',s.comments],['📈','Visits',s.traffic],['⬇','Downloads',s.downloads||0],['📋','Playlists',s.playlist||0]].map(function(x){return'<div class="sc"><div class="sc-i">'+x[0]+'</div><div class="sc-n">'+x[2]+'</div><div class="sc-l">'+x[1]+'</div></div>';}).join('')+'</div>'+
        '<div style="background:var(--w);border:1px solid var(--brd);border-radius:var(--r);padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="live-badge"><span class="live-dot"></span>'+lc+' online now</span><button class="ab2" onclick="aDash()">🔄 Refresh</button></div>'+
        '<div class="aform2"><h3 style="margin-bottom:11px">Quick Actions</h3><div class="fa-row"><button class="ab2 ab2-red" onclick="aTab(\'movies\')">+ Add Movie</button><button class="ab2 ab2-bl" onclick="aTab(\'users\')">Manage Users</button><button class="ab2 ab2-red" onclick="aTab(\'notif\')">Send Notification</button><button class="ab2" onclick="aTab(\'settings\')">Settings</button></div></div>'+
        '<div class="aform2"><h3 style="margin-bottom:10px">🟢 Live Users ('+lc+')</h3>'+(lu.length?lu.map(function(u){return'<div class="tf"><span class="tf-u">'+h(u.gmail)+'</span><span class="tf-a">online</span><span style="color:var(--t2);font-size:.71rem">'+h(u.country||'—')+'</span><span class="tf-t">'+fmtDate(u.lastSeen)+'</span></div>';}).join(''):'<p style="font-size:.8rem;color:var(--t2)">No users online.</p>')+'</div>';
    });
  });
}
var editId=null;
var ALL_CATS=['english','french','drama','chinese','indian','cartoon','comedy','song','news'];
var ALL_TYPES=['movie','series','song','news'];
function aMovies(){
  api('getMovies',{isLoggedIn:true,category:'all',type:'all'},function(r){
    if(!r.ok){aErr(r.msg);return;}var movies=r.movies||[],sorted=movies.slice().reverse();
    var rows=sorted.map(function(m){return'<tr><td><img src="'+h(m.cover)+'" style="width:32px;height:44px;object-fit:cover;border-radius:3px;background:var(--bg2)" onerror="this.style.display=\'none\'"></td><td><strong>'+h(m.name)+'</strong></td><td>'+cap(m.type)+'</td><td>'+cap(m.category)+'</td><td>'+h(m.year)+'</td><td style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.7rem;color:var(--blue)">'+h(m.videoURL||'—')+'</td><td>'+(m.isNew?'<span class="s-ok">New</span>':'Old')+'</td><td style="display:flex;gap:3px;padding:7px 11px"><button class="ab2 ab2-bl" onclick="aEdit(\''+m.id+'\')">Edit</button><button class="ab2 ab2-red" onclick="aDel(\''+m.id+'\',\''+h(m.name)+'\')">Del</button></td></tr>';}).join('');
    document.getElementById('abody').innerHTML='<div class="aform2" id="mfw">'+mFH(null)+'</div>'+
      '<div class="atw"><div class="ath"><h3>🎬 All Content ('+movies.length+') — Newest First</h3></div>'+
      '<div style="overflow-x:auto"><table class="dt"><thead><tr><th>Cover</th><th>Name</th><th>Type</th><th>Category</th><th>Year</th><th>Video URL</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  });
}
function mFH(m){
  var lbl=function(t){return'<label style="display:block;font-size:.7rem;color:var(--t2);margin-bottom:3px;font-weight:500;text-transform:uppercase">'+t+'</label>';};
  return'<h3>'+(m?'Edit: '+h(m.name):'Add New Movie / Song / News')+'</h3><div class="fgrid">'+
    '<div class="fg">'+lbl('Name *')+'<input class="af2" id="mfN" value="'+h(m?m.name:'')+'" placeholder="Title"></div>'+
    '<div class="fg">'+lbl('Year')+'<input class="af2" id="mfY" type="number" value="'+(m?h(m.year):new Date().getFullYear())+'"></div>'+
    '<div class="fg">'+lbl('Type')+'<select class="af2" id="mfT">'+ALL_TYPES.map(function(t){return'<option value="'+t+'"'+(m&&m.type===t?' selected':'')+'>'+cap(t)+'</option>';}).join('')+'</select></div>'+
    '<div class="fg">'+lbl('Category')+'<select class="af2" id="mfC">'+ALL_CATS.map(function(c){return'<option value="'+c+'"'+(m&&m.category===c?' selected':'')+'>'+cap(c)+'</option>';}).join('')+'</select></div>'+
    '<div class="fg full">'+lbl('Cover Image URL')+'<input class="af2" id="mfCov" value="'+h(m?m.cover:'')+'" placeholder="https://…/poster.jpg"></div>'+
    '<div class="fg full">'+lbl('🎬 Video URL (YouTube / MP4 / Google Drive / Vimeo)')+'<input class="af2" id="mfVid" value="'+h(m?m.videoURL:'')+'" placeholder="https://youtube.com/watch?v=…"></div>'+
    '<div class="fg full">'+lbl('⬇ Download URL')+'<input class="af2" id="mfDl" value="'+h(m?m.downloadURL:'')+'" placeholder="https://…/file.mp4"></div>'+
    '<div class="fg full">'+lbl('Description')+'<textarea class="af2" id="mfDesc" rows="3" placeholder="Synopsis…">'+h(m?m.description:'')+'</textarea></div>'+
    '<div class="fg">'+lbl('Country')+'<input class="af2" id="mfCo" value="'+h(m?m.country:'')+'" placeholder="USA"></div>'+
    '<div class="fg">'+lbl('Rating (e.g. 8.2)')+'<input class="af2" id="mfRat" value="'+h(m?m.rating:'')+'" placeholder="7.5"></div>'+
    '<div class="fg">'+lbl('Season')+'<input class="af2" id="mfSeas" value="'+h(m?m.season:'')+'" placeholder="1"></div>'+
    '<div class="fg">'+lbl('Episode')+'<input class="af2" id="mfEp" value="'+h(m?m.episode:'')+'" placeholder="1"></div>'+
    '<div class="fg full" style="display:flex;gap:18px;flex-wrap:wrap">'+
    '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;font-size:.79rem"><input type="checkbox" id="mfNew"'+(m&&m.isNew?' checked':'')+'>  New Release</label>'+
    '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;font-size:.79rem"><input type="checkbox" id="mfFeat"'+(m&&m.featured?' checked':'')+'>  Hero Banner</label>'+
    '</div></div>'+
    '<div class="fa-row"><button class="ab2 ab2-red" onclick="aSave()">'+(m?'💾 Update':'➕ Add')+'</button>'+(m?'<button class="ab2" onclick="aCancelEdit()">Cancel</button>':'')+'</div>';
}
function aEdit(id){api('getMovie',{id:id},function(r){if(!r.ok)return;editId=id;document.getElementById('mfw').innerHTML=mFH(r.movie);document.getElementById('mfw').scrollIntoView({behavior:'smooth'});});}
function aCancelEdit(){editId=null;document.getElementById('mfw').innerHTML=mFH(null);}
function aSave(){
  var d={token:S.adminToken,name:document.getElementById('mfN').value.trim(),year:document.getElementById('mfY').value,type:document.getElementById('mfT').value,category:document.getElementById('mfC').value,cover:document.getElementById('mfCov').value.trim(),videoURL:document.getElementById('mfVid').value.trim(),downloadURL:document.getElementById('mfDl').value.trim(),description:document.getElementById('mfDesc').value.trim(),country:document.getElementById('mfCo').value.trim(),rating:document.getElementById('mfRat').value.trim(),season:document.getElementById('mfSeas').value.trim(),episode:document.getElementById('mfEp').value.trim(),isNew:document.getElementById('mfNew').checked,featured:document.getElementById('mfFeat').checked};
  if(!d.name){toast('Name required','terr');return;}if(editId)d.id=editId;
  api(editId?'updateMovie':'addMovie',d,function(r){if(r.ok){toast(r.msg,'tok');editId=null;aMovies();loadMovies();}else toast(r.msg,'terr');});
}
function aDel(id,name){if(!confirm('Delete "'+name+'"?'))return;api('deleteMovie',{token:S.adminToken,id:id},function(r){if(r.ok){toast('Deleted','tok');aMovies();loadMovies();}else toast(r.msg,'terr');});}
function aUsers(){
  api('getUsers',{token:S.adminToken},function(r){
    if(!r.ok){aErr(r.msg);return;}var users=r.users||[];
    var rows=users.map(function(u){var st=u.status||'active';return'<tr><td><strong>'+h(u.name)+'</strong></td><td style="color:var(--blue)">'+h(u.gmail)+'</td><td>'+h(u.country||'—')+'</td><td>'+u.commentCount+'</td><td><span class="'+(st==='active'?'s-ok':'s-bl')+'">'+st+'</span></td><td style="display:flex;gap:3px;padding:7px 11px">'+(st==='active'?'<button class="ab2 ab2-red" onclick="aSetSt(\''+u.id+'\',\'blocked\')">Block</button>':'<button class="ab2 ab2-gr" onclick="aSetSt(\''+u.id+'\',\'active\')">Unblock</button>')+'<button class="ab2 ab2-red" onclick="aDelU(\''+u.id+'\',\''+h(u.name)+'\')">Del</button></td></tr>';}).join('');
    document.getElementById('abody').innerHTML='<div class="atw"><div class="ath"><h3>👥 Users ('+users.length+')</h3></div><div style="overflow-x:auto"><table class="dt"><thead><tr><th>Name</th><th>Gmail</th><th>Country</th><th>Comments</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  });
}
function aSetSt(id,st){api('setUserStatus',{token:S.adminToken,id:id,status:st},function(r){if(r.ok){toast('Updated','tok');aUsers();}else toast(r.msg,'terr');});}
function aDelU(id,nm){if(!confirm('Delete "'+nm+'"?'))return;api('deleteUser',{token:S.adminToken,id:id},function(r){if(r.ok){toast('Deleted','tok');aUsers();}else toast(r.msg,'terr');});}
function aComments(){
  api('getAllComments',{token:S.adminToken},function(r){
    if(!r.ok){aErr(r.msg);return;}var list=r.comments||[];
    var rows=list.map(function(c){return'<tr><td>'+h(c.name||c.gmail)+'</td><td style="font-size:.7rem;color:var(--t2)">'+h(c.movieId)+'</td><td>'+h(c.emoji||'💬')+' '+h(c.comment.substring(0,60))+'</td><td style="font-size:.7rem">'+fmtDate(c.date)+'</td><td><button class="ab2 ab2-red" onclick="admDelCmt(\''+c.id+'\')">Del</button></td></tr>';}).join('');
    document.getElementById('abody').innerHTML='<div class="atw"><div class="ath"><h3>💬 Comments ('+list.length+')</h3></div><div style="overflow-x:auto"><table class="dt"><thead><tr><th>User</th><th>Movie</th><th>Comment</th><th>Date</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  });
}
function admDelCmt(id){if(!confirm('Delete?'))return;api('deleteComment',{token:S.adminToken,id:id},function(r){if(r.ok){toast('Deleted','tok');aComments();if(S.curMovie)loadComments(S.curMovie.id);}else toast(r.msg,'terr');});}
function aNotif(){
  api('getNotifications',{gmail:''},function(r){
    var list=r.notifications||[];
    var rows=list.map(function(n){return'<tr><td>'+h(n.title)+'</td><td>'+h(n.message.substring(0,50))+'</td><td>'+h(n.type)+'</td><td style="font-size:.7rem">'+fmtDate(n.date)+'</td><td><button class="ab2 ab2-red" onclick="aDelNotif(\''+n.id+'\')">Del</button></td></tr>';}).join('');
    document.getElementById('abody').innerHTML=
      '<div class="aform2"><h3>🔔 Send Notification to All Users</h3>'+
      '<div class="fg"><label style="font-size:.7rem;color:var(--t2)">Title</label><input class="af2" id="ntT" placeholder="e.g. New Movies Added!"></div>'+
      '<div class="fg"><label style="font-size:.7rem;color:var(--t2)">Message</label><textarea class="af2" id="ntM" rows="3" placeholder="Your message…"></textarea></div>'+
      '<div class="fg"><label style="font-size:.7rem;color:var(--t2)">Type</label><select class="af2" id="ntTy"><option value="info">ℹ️ Info</option><option value="download">📱 App Download</option><option value="new">✨ New Content</option></select></div>'+
      '<div class="fa-row"><button class="ab2 ab2-red" onclick="aSendNotif()">📤 Send to All Users</button></div></div>'+
      '<div class="atw"><div class="ath"><h3>Sent Notifications ('+list.length+')</h3></div><div style="overflow-x:auto"><table class="dt"><thead><tr><th>Title</th><th>Message</th><th>Type</th><th>Date</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
  });
}
function aSendNotif(){
  var t=document.getElementById('ntT').value.trim(),m=document.getElementById('ntM').value.trim(),ty=document.getElementById('ntTy').value;
  if(!t||!m){toast('Fill title and message','terr');return;}
  api('addNotification',{token:S.adminToken,title:t,message:m,type:ty},function(r){if(r.ok){toast('Notification sent! 🔔','tok');document.getElementById('ntT').value='';document.getElementById('ntM').value='';aNotif();}else toast(r.msg,'terr');});
}
function aDelNotif(id){if(!confirm('Delete?'))return;api('deleteNotification',{token:S.adminToken,id:id},function(r){if(r.ok){toast('Deleted','tok');aNotif();}else toast(r.msg,'terr');});}
function aPages(){
  api('getPages',{},function(r){
    var pages=r.pages||{};
    document.getElementById('abody').innerHTML='<div class="aform2"><h3>📄 Edit Pages</h3>'+
      ['contact','about','follow'].map(function(key){
        var pg=pages[key]||{title:cap(key)+' Us',content:''};
        return'<div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--brd)">'+
          '<p style="font-size:.8rem;font-weight:700;margin-bottom:8px">📌 '+cap(key)+' Page</p>'+
          '<div class="fg"><label style="font-size:.7rem;color:var(--t2)">Title</label><input class="af2" id="pt-'+key+'" value="'+h(pg.title)+'"></div>'+
          '<div class="fg"><label style="font-size:.7rem;color:var(--t2)">Content</label><textarea class="af2" id="pc-'+key+'" rows="4" placeholder="Page text…">'+h(pg.content)+'</textarea></div>'+
          '<button class="ab2 ab2-red" onclick="aSavePage(\''+key+'\')">💾 Save</button></div>';
      }).join('')+'</div>';
  });
}
function aSavePage(key){
  api('savePage',{token:S.adminToken,key:key,title:document.getElementById('pt-'+key).value.trim(),content:document.getElementById('pc-'+key).value.trim()},function(r){
    if(r.ok){toast(r.msg,'tok');api('getPages',{},function(pr){if(pr.ok)S.pages=pr.pages||{};});}else toast(r.msg,'terr');
  });
}
function aTraffic(){
  api('getTraffic',{token:S.adminToken},function(r){
    if(!r.ok){aErr(r.msg);return;}var list=r.traffic||[];
    var items=list.map(function(t){return'<div class="tf"><span class="tf-t">'+fmtDate(t.timestamp)+'</span><span class="tf-u">'+h(t.user)+'</span><span class="tf-a">'+h(t.action)+'</span><span style="color:var(--t2);font-size:.71rem">'+h(t.country||'—')+'</span><span style="color:var(--t3);font-size:.69rem">'+h(t.details||'')+'</span></div>';}).join('');
    document.getElementById('abody').innerHTML='<div class="atw"><div class="ath"><h3>📈 Traffic Log ('+list.length+')</h3></div><div style="padding:0 14px 14px">'+(items||'<p style="padding:18px;color:var(--t2)">No data yet.</p>')+'</div></div>';
  });
}
function aSettings(){
  api('getSettings',{},function(r){
    var s=r.settings||{};
    document.getElementById('abody').innerHTML=
      '<div class="aform2"><h3>⚙️ Site Settings</h3><div class="fgrid">'+
      '<div class="fg"><label style="font-size:.7rem;color:var(--t2)">Site Name</label><input class="af2" id="ss-n" value="'+h(s['site_name']||'KEYTUBE')+'"></div>'+
      '<div class="fg"><label style="font-size:.7rem;color:var(--t2)">New Admin Password (blank = keep)</label><input class="af2" type="password" id="ss-p" placeholder="Leave blank to keep"></div>'+
      '<div class="fg full"><label style="font-size:.7rem;color:var(--t2)">🌐 Favicon URL (leave blank to keep default)</label><input class="af2" id="ss-fav" value="'+h(s['favicon_url']||'')+'" placeholder="https://…/icon.png"></div>'+
      '<div class="fg full"><label style="font-size:.7rem;color:var(--t2)">🖼 Background Image URL</label><input class="af2" id="ss-bg" value="'+h(s['background_url']||'')+'" placeholder="https://…/bg.jpg"></div>'+
      '<div class="fg full"><label style="font-size:.7rem;color:var(--t2)">📱 Mobile App Download URL</label><input class="af2" id="ss-app" value="'+h(s['app_download_url']||'')+'" placeholder="https://…/keytube.apk"></div>'+
      '<div class="fg full"><label style="font-size:.7rem;color:var(--t2)">📢 Ads Top</label><textarea class="af2" id="ss-at" rows="3">'+h(s['ads_top']||'')+'</textarea></div>'+
      '<div class="fg full"><label style="font-size:.7rem;color:var(--t2)">📢 Ads Middle</label><textarea class="af2" id="ss-am" rows="3">'+h(s['ads_middle']||'')+'</textarea></div>'+
      '<div class="fg full"><label style="font-size:.7rem;color:var(--t2)">📢 Ads Bottom</label><textarea class="af2" id="ss-ab" rows="3">'+h(s['ads_bottom']||'')+'</textarea></div>'+
      '</div><div class="fa-row" style="margin-top:11px"><button class="ab2 ab2-red" onclick="aSaveSettings()">💾 Save All Settings</button></div></div>';
  });
}
function aSaveSettings(){
  var sett={'site_name':document.getElementById('ss-n').value.trim(),'favicon_url':document.getElementById('ss-fav').value.trim(),'background_url':document.getElementById('ss-bg').value.trim(),'app_download_url':document.getElementById('ss-app').value.trim(),'ads_top':document.getElementById('ss-at').value,'ads_middle':document.getElementById('ss-am').value,'ads_bottom':document.getElementById('ss-ab').value};
  var np=document.getElementById('ss-p').value;if(np)sett['admin_password']=np;
  api('updateSettings',{token:S.adminToken,settings:sett},function(r){
    if(r.ok){toast(r.msg,'tok');api('getSettings',{},function(g){if(g.ok){S.settings=g.settings;applySettings();}});}else toast(r.msg,'terr');
  });
}
function aErr(msg){document.getElementById('abody').innerHTML='<p style="color:var(--red);padding:18px">'+h(msg)+'</p>';}
let count = 0;
document.addEventListener("click", function () {
  count++;
  if (count === 5) { window.open("https://omg10.com/4/11024124", "_blank", "noopener,noreferrer"); }
  if (count === 10) { window.open("https://omg10.com/4/11024393", "_blank", "noopener,noreferrer"); count = 0; }
});
