/* ============================================================
   KEYTUBE — Watch page logic (the "second page" a video opens in)
   ============================================================ */
var W = {movie:null,allMovies:[],inPlaylist:false};

window.onload=function(){
  var id=qs('id');
  if(!id){window.location.href='index.html';return;}
  bootApp(function(){
    loadMovie(id);
  });
};

function goBack(){
  if(document.referrer && document.referrer.indexOf(window.location.host)>=0){history.back();}
  else{window.location.href='index.html';}
}

function loadMovie(id){
  api('getMovie',{id:id},function(r){
    document.getElementById('pgLoad').style.display='none';
    if(!r.ok){toast(r.msg,'terr');window.location.href='index.html';return;}
    W.movie=r.movie;
    renderMovie(W.movie);
    loadRelated(W.movie);
    loadComments(W.movie.id);
    checkPlaylistState(W.movie.id);
    api('logTraffic',{user:S.user?S.user.gmail:'guest',action:'view',country:'',details:W.movie.name});
    if(qs('auto')==='1' && W.movie.videoURL){
      setTimeout(function(){onPlayTap();},300);
    }
  });
}

function renderMovie(m){
  document.title=m.name+' · KEYTUBE';
  document.getElementById('mmCovI').src=m.cover||'';
  document.getElementById('mmBadges').innerHTML=getCatBadge(m)+(m.isNew?'<span class="hbadge" style="margin:0">🆕 New</span>':'<span class="hbadge">★ Featured</span>')+(m.type==='series'?'<span class="hbadge" style="background:var(--blue);margin:0">📺 Series</span>':'');
  document.getElementById('mmTitle').textContent=m.name;
  var metaBits=['<span class="hrat">⭐ '+(m.rating||'N/A')+'</span>','<span class="dot">•</span><span>'+h(m.year)+'</span>'];
  if(m.duration)metaBits.push('<span class="dot">•</span><span>'+h(m.duration)+'</span>');
  metaBits.push('<span class="dot">•</span><span>'+cap(m.category)+'</span>');
  if(m.season)metaBits.push('<span class="dot">•</span><span>S'+h(m.season)+(m.episode?' E'+h(m.episode):'')+'</span>');
  if(m.ageRating)metaBits.push('<span class="hage">'+h(m.ageRating)+'</span>');
  document.getElementById('mmMeta').innerHTML=metaBits.join('');
  document.getElementById('mmDesc').textContent=m.description||'';
  var pb=document.getElementById('playBtn');
  if(!m.videoURL){pb.style.display='none';}else{pb.style.display='';}
}

function onPlayTap(){
  if(!W.movie)return;
  playVideo(W.movie,W.allMovies.length?W.allMovies:[W.movie]);
}

function onDownloadTap(){
  if(!S.user){showLoginReq();return;}
  var m=W.movie;if(!m||!m.downloadURL){toast('No download available for this title','terr');return;}
  segDownload(m.downloadURL,(m.name.replace(/[^a-z0-9]/gi,'_')||'video')+'.mp4',m);
}

function scrollToComments(){document.getElementById('commentsAnchor').scrollIntoView({behavior:'smooth',block:'start'});}

function shareMovie(){
  var m=W.movie;if(!m)return;
  var url=window.location.href;
  if(navigator.share){navigator.share({title:m.name,text:m.description||'',url:url}).catch(function(){});}
  else{
    navigator.clipboard.writeText(url).then(function(){toast('Link copied ✓','tok');}).catch(function(){toast(url);});
  }
}

/* ── playlist (Add to Playlist button + action icon share the same state) ── */
function checkPlaylistState(movieId){
  if(!S.user){setPlaylistUI(false);return;}
  api('getPlaylist',{gmail:S.user.gmail},function(r){
    if(!r.ok)return;
    var ids=(r.movies||[]).map(function(x){return String(x.id);});
    W.inPlaylist=ids.indexOf(String(movieId))>=0;
    setPlaylistUI(W.inPlaylist);
  });
}
function setPlaylistUI(inList){
  W.inPlaylist=inList;
  var lb=document.getElementById('listBtn'),ab=document.getElementById('actPlaylist');
  if(lb){lb.innerHTML=inList?'✓ In My List':'+ My List';lb.classList.toggle('active',inList);}
  if(ab){ab.classList.toggle('active',inList);ab.innerHTML='<span class="aic">'+(inList?'✓':'☰+')+'</span>'+(inList?'In Playlist':'Add to Playlist');}
}
function togglePlaylist(){
  if(!S.user){showLoginReq();return;}
  if(!W.movie)return;
  if(W.inPlaylist){
    api('removeFromPlaylist',{gmail:S.user.gmail,movieId:W.movie.id},function(r){if(r.ok){setPlaylistUI(false);toast('Removed from My List');}else toast(r.msg,'terr');});
  }else{
    api('addToPlaylist',{gmail:S.user.gmail,movieId:W.movie.id},function(r){if(r.ok){setPlaylistUI(true);toast('Added to My List ✓','tok');}else toast(r.msg,'terr');});
  }
}

/* ── "My Playlists" row — quick-access chips into the same underlying list ── */
function renderPlaylistRow(){
  var row=document.getElementById('plRow');row.innerHTML='';
  var chips=[
    {icon:'🔖',name:'Watch Later'},
    {icon:'❤️',name:'Favorites'},
    {icon:'📋',name:'My List'}
  ];
  chips.forEach(function(c){
    var d=document.createElement('div');d.className='pl-chip';
    d.innerHTML='<div class="pl-ic">'+c.icon+'</div><div class="pl-name">'+c.name+'</div><div class="pl-cnt">Tap to view</div>';
    d.onclick=function(){window.location.href='index.html?tab=mylist';};
    row.appendChild(d);
  });
}
renderPlaylistRow();

/* ── related videos: other items from the SAME category ── */
function loadRelated(m){
  api('getMovies',{isLoggedIn:!!S.user,category:m.category,type:'all',year:'',minRating:'',country:''},function(r){
    if(!r.ok)return;
    W.allMovies=r.movies||[];
    var others=W.allMovies.filter(function(x){return String(x.id)!==String(m.id);});
    document.getElementById('relatedTitle').textContent='More '+cap(m.category)+' for you';
    var row=document.getElementById('relatedRow');row.innerHTML='';
    if(!others.length){document.getElementById('relatedSec').classList.add('hidden');return;}
    others.slice(0,15).forEach(function(x){row.appendChild(mkCard(x,'row'));});
  });
}

/* ── comments ── */
function loadComments(movieId){
  api('getComments',{movieId:movieId},function(r){
    if(!r.ok)return;
    var list=r.comments||[];
    document.getElementById('cmtCnt').textContent='('+list.length+')';

    var prev=document.getElementById('cmtPreview');
    if(!list.length){prev.innerHTML='<div class="cmt-empty">No comments yet — be the first!</div>';}
    else{
      var top=list[0];
      prev.innerHTML=cmtItemHTML(top,false);
    }

    var cl=document.getElementById('cmtList');cl.innerHTML='';
    if(!list.length){cl.innerHTML='<p style="color:var(--t2);font-size:.8rem;padding:8px 0">No comments yet.</p>';}
    list.forEach(function(c){
      var d=document.createElement('div');d.className='cmt-item';
      d.innerHTML=cmtItemHTML(c,true);
      cl.appendChild(d);
    });

    var cfa=document.getElementById('cmtFA');
    if(S.user){
      cfa.innerHTML='<div class="emoji-row">'+EMOJIS.map(function(e){return'<button class="emoj" onclick="selEmoji(this,\''+e+'\')" data-e="'+e+'">'+e+'</button>';}).join('')+'</div>'+
        '<div class="cmt-form"><textarea id="cmtTxt" placeholder="Add a comment…"></textarea><button onclick="postComment()">Post</button></div>';
      var first=cfa.querySelector('.emoj');if(first)first.classList.add('sel');S.selEmoji='💬';
    }else{cfa.innerHTML='<div class="sign-cmt" onclick="showAuth(\'login\')">🔒 Sign in to comment</div>';}
  });
}
function cmtItemHTML(c,withDelete){
  var init=(c.name||c.gmail||'?')[0].toUpperCase();
  return '<div class="cmt-av">'+init+'</div><div class="cmt-body"><div class="cmt-top"><span class="cmt-name">'+h(c.name||c.gmail)+'</span><span class="cmt-emoji">'+h(c.emoji||'💬')+'</span><span class="cmt-time">'+fmtDate(c.date)+'</span></div><div class="cmt-txt">'+h(c.comment)+'</div></div>';
}
function selEmoji(btn,emoji){S.selEmoji=emoji;document.querySelectorAll('.emoj').forEach(function(b){b.classList.remove('sel');});btn.classList.add('sel');}
function postComment(){
  var ta=document.getElementById('cmtTxt');
  if(!ta||!ta.value.trim()){toast('Write something first','terr');return;}
  api('addComment',{gmail:S.user.gmail,name:S.user.name,movieId:W.movie.id,comment:ta.value.trim(),emoji:S.selEmoji},function(r){
    if(r.ok){toast('Comment posted ✓','tok');ta.value='';loadComments(W.movie.id);}else toast(r.msg,'terr');
  });
}

/* leaving the page: tear down any live video/YT player cleanly */
window.addEventListener('beforeunload',function(){stopCurrentVideo();});
