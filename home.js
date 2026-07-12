/* ============================================================
   KEYTUBE — Home dashboard page logic
   ============================================================ */
var H = {movies:[],heroMovies:[],heroIdx:0,heroTimer:null,activeCat:'all',activeType:'all'};

window.onload=function(){
  bootApp(function(){
    loadMovies();
    var t=qs('tab');
    if(t&&['home','trending','downloads','mylist'].indexOf(t)>=0)goToTab(t);
  });
};

function getUserSeed(gmail){var s=0;for(var i=0;i<gmail.length;i++)s+=gmail.charCodeAt(i)*(i+1);return Math.abs(s)||42;}
function seededShuffle(arr,seed){var a=arr.slice();for(var i=a.length-1;i>0;i--){seed=(seed*9301+49297)%233280;var j=Math.floor((seed/233280)*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}

function loadMovies(cat,type){
  api('getMovies',{isLoggedIn:!!S.user,category:cat||H.activeCat,type:type||H.activeType,year:'',minRating:'',country:''},function(r){
    document.getElementById('pgLoad').style.display='none';
    if(!r.ok){toast(r.msg,'terr');return;}
    H.movies=r.movies||[];renderAll();
  });
}

function renderAll(){
  var raw=H.movies.slice().reverse();
  var nw=raw.filter(function(m){return m.isNew;}),old=raw.filter(function(m){return !m.isNew;});
  var mv=nw.concat(old);
  var feat=mv.filter(function(m){return m.featured;});
  if(!feat.length)feat=mv.slice(0,Math.min(5,mv.length));
  H.heroMovies=feat;H.heroIdx=0;
  if(feat.length){document.getElementById('heroWrap').style.display='block';buildHeroDots();renderHero(0);startHeroTimer();}
  else document.getElementById('heroWrap').style.display='none';

  var tPool=mv.filter(function(m){return !m.isNew;}).slice(0,30);
  if(S.user)tPool=seededShuffle(tPool,getUserSeed(S.user.gmail));
  renderRow('tRow',tPool.slice(0,20));
  renderRow('trendGrid',tPool.slice(0,20),'grid');

  if(S.user){
    var newItems=mv.filter(function(m){return m.isNew;}),ns=document.getElementById('newSec');
    if(newItems.length){ns.classList.remove('hidden');renderRow('nRow',newItems.slice(0,20));}else ns.classList.add('hidden');
    document.getElementById('guestBanner').style.display='none';
  }else{document.getElementById('newSec').classList.add('hidden');document.getElementById('guestBanner').style.display='block';}

  var grid=mv.slice();
  if(S.user){var s2=getUserSeed(S.user.gmail)+7777;var gN=grid.filter(function(m){return m.isNew;});var gO=seededShuffle(grid.filter(function(m){return !m.isNew;}),s2);grid=gN.concat(gO);}
  renderGrid('mGrid','emptySt','emptyMsg',grid);
}

function renderHero(i){
  var m=H.heroMovies[i];if(!m)return;
  document.getElementById('hCover').src=m.cover||'';
  document.getElementById('hTitle').textContent=m.name;
  document.getElementById('hDesc').textContent=m.description||'';
  document.getElementById('hBadge').textContent=m.isNew?'🆕 New':'★ Featured';
  document.getElementById('hMeta').innerHTML='<span class="hrat">⭐ '+(m.rating||'?')+'</span><span class="dot">•</span><span>'+h(m.year)+'</span><span class="dot">•</span><span>'+cap(m.category)+'</span>';
  document.querySelectorAll('.hdot').forEach(function(d,j){d.classList.toggle('active',j===i);});
}
function buildHeroDots(){var c=document.getElementById('hDots');c.innerHTML='';H.heroMovies.forEach(function(_,i){var d=document.createElement('span');d.className='hdot'+(i===0?' active':'');d.onclick=function(){H.heroIdx=i;renderHero(i);};c.appendChild(d);});}
function startHeroTimer(){clearInterval(H.heroTimer);H.heroTimer=setInterval(function(){H.heroIdx=(H.heroIdx+1)%H.heroMovies.length;renderHero(H.heroIdx);},6000);}
function heroPlay(){var m=H.heroMovies[H.heroIdx];if(m)goToWatch(m.id);}
function heroInfo(){var m=H.heroMovies[H.heroIdx];if(m)goToWatch(m.id);}
function heroToggleList(){
  if(!S.user){showLoginReq();return;}
  var m=H.heroMovies[H.heroIdx];if(!m)return;
  api('addToPlaylist',{gmail:S.user.gmail,movieId:m.id},function(r){
    if(r.ok)toast('Added to My List ✓','tok');else toast(r.msg,'terr');
  });
}

function renderRow(id,movies,mode){
  var c=document.getElementById(id);if(!c)return;c.innerHTML='';
  if(!movies.length){c.innerHTML='<p style="color:var(--t2);font-size:.79rem;padding:8px 14px">Nothing here yet.</p>';return;}
  movies.forEach(function(m){c.appendChild(mkCard(m,mode));});
}
function renderGrid(gridId,emptyId,emptyMsgId,movies){
  var g=document.getElementById(gridId),e=document.getElementById(emptyId);
  g.innerHTML='';
  if(!movies.length){e.classList.remove('hidden');document.getElementById(emptyMsgId).textContent=S.user?'No content found.':'Sign in to see more.';return;}
  e.classList.add('hidden');movies.forEach(function(m){g.appendChild(mkCard(m,'grid'));});
}

function setCat(cat,btn){
  H.activeCat=cat;document.querySelectorAll('.cp').forEach(function(b){b.classList.remove('active');});if(btn)btn.classList.add('active');
  H.activeType=cat==='series'?'series':cat==='song'?'song':cat==='news'?'news':'all';
  loadMovies(cat,H.activeType);
}
function showNew(){
  if(!S.user){showLoginReq();return;}
  goToTab('home');
  var nw=H.movies.filter(function(m){return m.isNew;});
  renderGrid('mGrid','emptySt','emptyMsg',nw);
  document.getElementById('gTitle').textContent='✨ New Releases ('+nw.length+')';
  window.scrollTo({top:0,behavior:'smooth'});
}
function goHome(){goToTab('home');H.activeCat='all';H.activeType='all';loadMovies();window.scrollTo({top:0,behavior:'smooth'});}

/* ── bottom tab bar ── */
function goToTab(tab){
  ['home','trending','downloads','mylist'].forEach(function(t){
    var sec=document.getElementById('tab-'+t),btn=document.getElementById('tb-'+t);
    if(sec)sec.classList.toggle('hidden',t!==tab);
    if(btn)btn.classList.toggle('act',t===tab);
  });
  document.getElementById('mainFooter').classList.toggle('hidden',tab!=='home');
  sessionStorage.setItem('km_lasttab',tab);
  if(tab==='downloads')renderDownloads();
  if(tab==='mylist')renderMyList();
  window.scrollTo({top:0,behavior:'smooth'});
}
function onAuthChanged(){ /* refresh whichever tab is showing so login-gated tabs update */
  var t=sessionStorage.getItem('km_lasttab')||'home';
  loadMovies();
  if(t==='downloads')renderDownloads();
  if(t==='mylist')renderMyList();
}

/* ── Downloads tab: shows what's been downloaded from the Watch page (tracked locally on this device) ── */
function renderDownloads(){
  var list=[];try{list=JSON.parse(localStorage.getItem('km_downloads')||'[]');}catch(e){}
  var wrap=document.getElementById('dlList'),empty=document.getElementById('dlEmpty');
  wrap.innerHTML='';
  if(!list.length){empty.classList.remove('hidden');return;}
  empty.classList.add('hidden');
  var g=document.createElement('div');g.className='gw';
  list.slice().reverse().forEach(function(item){
    g.appendChild(mkCard({id:item.id,name:item.name,cover:item.cover,category:item.category,rating:item.rating,year:item.year},'grid'));
  });
  wrap.appendChild(g);
}

/* ── My List tab: real playlist, backed by the API ── */
function renderMyList(){
  var grid=document.getElementById('mylistGrid'),empty=document.getElementById('mylistEmpty');
  if(!S.user){grid.innerHTML='';empty.classList.remove('hidden');document.getElementById('mylistEmptyMsg').textContent='Sign in to build your list.';return;}
  api('getPlaylist',{gmail:S.user.gmail},function(r){
    if(!r.ok){toast(r.msg,'terr');return;}
    var movies=r.movies||[];
    grid.innerHTML='';
    if(!movies.length){empty.classList.remove('hidden');document.getElementById('mylistEmptyMsg').textContent='Your list is empty — add movies from the Watch page.';return;}
    empty.classList.add('hidden');
    movies.forEach(function(m){grid.appendChild(mkCard(m,'grid'));});
  });
}
