/* ════════════════════════════
   CONFIG
════════════════════════════ */
var API   = 'https://script.google.com/macros/s/AKfycbxbYUKZYwYRssm80AnP8kDj-8_ymsaFczKmecbchEntyhhr5-zqAIDYov-Nt7Ko0pDOMA/exec';
var TOKEN = '';

/* ════════════════════════════
   UTILS
════════════════════════════ */
function h(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cap(s){return s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';}
function fmtDate(d){var dt=new Date(d);return isNaN(dt)?d:dt.toLocaleDateString();}

function toast(msg,type){
  var t=document.getElementById('toast');
  t.textContent=msg;t.className='show'+(type?' '+type:'');
  clearTimeout(t._t);t._t=setTimeout(function(){t.className='';},3000);
}

var pW=0,pT;
function pStart(){pW=0;var e=document.getElementById('pbar');e.className='';e.style.width='0%';clearInterval(pT);pT=setInterval(function(){pW=Math.min(pW+Math.random()*8,88);e.style.width=pW+'%';},120);}
function pDone(){clearInterval(pT);var e=document.getElementById('pbar');e.style.width='100%';setTimeout(function(){e.className='done';setTimeout(function(){e.style.width='0%';e.className='';},500);},280);}

function api(action,data,cb){
  pStart();
  fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},
    body:JSON.stringify(Object.assign({},data||{},{action:action})),redirect:'follow'})
  .then(function(r){return r.json();})
  .then(function(res){pDone();if(cb)cb(res);})
  .catch(function(e){pDone();toast('Connection error','terr');console.error(e);});
}

/* ════════════════════════════
   INIT
════════════════════════════ */
window.onload = function(){
  var saved = sessionStorage.getItem('km_a');
  if(saved){TOKEN=saved;openPanel();}
};

/* ════════════════════════════
   LOGIN
════════════════════════════ */
function doAdminLogin(){
  var pw=document.getElementById('adPw').value;
  var er=document.getElementById('adErr');
  var btn=document.getElementById('loginBtn');
  if(!pw){er.textContent='Enter your password';return;}
  er.textContent='';
  btn.innerHTML='<span class="spin-sm"></span> Checking…';
  btn.disabled=true;
  api('adminLogin',{password:pw},function(r){
    btn.innerHTML='→ Enter Admin Panel';btn.disabled=false;
    if(r.ok){
      TOKEN=r.token;
      sessionStorage.setItem('km_a',TOKEN);
      openPanel();
      toast('Admin access granted ✓','tok');
    } else {
      er.textContent=r.msg||'Wrong password';
      document.getElementById('adPw').value='';
      document.getElementById('adPw').focus();
    }
  });
}

function openPanel(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('admPanel').classList.add('open');
  /* show token-holder email if available */
  try{var u=JSON.parse(sessionStorage.getItem('km_u')||'{}');if(u.gmail)document.getElementById('abarUser').textContent=u.name||u.gmail;}catch(e){}
  aTab('dash');
}

function doLogout(){
  if(!confirm('Log out of admin panel?'))return;
  TOKEN='';sessionStorage.removeItem('km_a');
  document.getElementById('admPanel').classList.remove('open');
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('adPw').value='';
  document.getElementById('adErr').textContent='';
  toast('Logged out');
}

/* ════════════════════════════
   TAB ROUTER
════════════════════════════ */
function aTab(tab){
  document.querySelectorAll('.atb').forEach(function(b){b.classList.remove('act');});
  var el=document.getElementById('tab-'+tab);if(el)el.classList.add('act');
  document.getElementById('aBody').innerHTML='<div class="spin"></div>';
  ({dash:aDash,movies:aMovies,users:aUsers,comments:aComments,
    notif:aNotif,pages:aPages,traffic:aTraffic,settings:aSettings})[tab]();
}

/* ════════════════════════════
   DASHBOARD
════════════════════════════ */
function aDash(){
  api('getStats',{token:TOKEN},function(r){
    if(!r.ok){aErr(r.msg);return;}
    var s=r.stats;
    api('getOnlineUsers',{token:TOKEN},function(lo){
      var lc=lo.ok?lo.count:0, lu=lo.ok?lo.users:[];
      document.getElementById('aBody').innerHTML=
        '<div class="stats-r">'+
        [['👥','Users',s.users],['🎬','Movies',s.movies],['💬','Comments',s.comments],
         ['📈','Visits',s.traffic],['⬇','Downloads',s.downloads||0],['📋','Playlists',s.playlist||0]]
        .map(function(x){return'<div class="sc"><div class="sc-i">'+x[0]+'</div><div class="sc-n">'+x[2]+'</div><div class="sc-l">'+x[1]+'</div></div>';}).join('')+
        '</div>'+
        '<div class="aform" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">'+
          '<span class="live-badge"><span class="live-dot"></span>'+lc+' online now</span>'+
          '<button class="a2btn" onclick="aDash()">🔄 Refresh</button>'+
          '<button class="a2btn a2btn-bl" onclick="window.location.href=\'index.html\'">← Back to Site</button>'+
        '</div>'+
        '<div class="aform"><h4 style="margin-bottom:10px">Quick Actions</h4><div class="fa-row">'+
          '<button class="a2btn a2btn-red" onclick="aTab(\'movies\')">+ Add Movie</button>'+
          '<button class="a2btn a2btn-bl" onclick="aTab(\'users\')">Manage Users</button>'+
          '<button class="a2btn a2btn-red" onclick="aTab(\'notif\')">Send Notification</button>'+
          '<button class="a2btn" onclick="aTab(\'settings\')">Settings</button>'+
        '</div></div>'+
        '<div class="aform"><h4 style="margin-bottom:10px">🟢 Live Users ('+lc+')</h4>'+
          (lu.length?lu.map(function(u){return'<div class="tf"><span class="tf-u">'+h(u.gmail)+'</span><span class="tf-a">online</span><span style="color:var(--t2);font-size:.71rem">'+h(u.country||'—')+'</span><span class="tf-t">'+fmtDate(u.lastSeen)+'</span></div>';}).join('')
          :'<p style="font-size:.8rem;color:var(--t2)">No users online right now.</p>')+
        '</div>';
    });
  });
}

/* ════════════════════════════
   MOVIES
════════════════════════════ */
var editId=null;
var ALL_CATS=['movies','highlight','drama','chinese','indian','cartoon','comedy','song','news'];
var ALL_TYPES=['movie','series','song','news'];

function aMovies(){
  api('getMovies',{isLoggedIn:true,category:'all',type:'all'},function(r){
    if(!r.ok){aErr(r.msg);return;}
    var movies=r.movies||[];
    var sorted=movies.slice().reverse();
    var rows=sorted.map(function(m){
      return'<tr>'+
        '<td><img src="'+h(m.cover)+'" style="width:32px;height:44px;object-fit:cover;border-radius:3px;background:var(--bg2)" onerror="this.style.display=\'none\'"></td>'+
        '<td><strong style="font-size:.8rem">'+h(m.name)+'</strong></td>'+
        '<td>'+cap(m.type)+'</td>'+
        '<td>'+cap(m.category)+'</td>'+
        '<td>'+h(m.year)+'</td>'+
        '<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.69rem;color:var(--blue)">'+h(m.videoURL||'—')+'</td>'+
        '<td>'+(m.isNew?'<span class="s-ok">New</span>':'Old')+'</td>'+
        '<td style="display:flex;gap:3px;padding:7px 11px">'+
          '<button class="a2btn a2btn-bl" onclick="aEdit(\''+m.id+'\')">Edit</button>'+
          '<button class="a2btn a2btn-red" onclick="aDel(\''+m.id+'\',\''+h(m.name)+'\')">Del</button>'+
        '</td></tr>';
    }).join('');
    document.getElementById('aBody').innerHTML=
      '<div class="aform" id="mfw">'+mFH(null)+'</div>'+
      '<div class="atw">'+
        '<div class="ath"><h3>🎬 All Content ('+movies.length+') — Newest First</h3></div>'+
        '<div style="overflow-x:auto">'+
          '<table class="dt"><thead><tr>'+
            '<th>Cover</th><th>Name</th><th>Type</th><th>Category</th><th>Year</th><th>Video URL</th><th>Status</th><th>Actions</th>'+
          '</tr></thead><tbody>'+rows+'</tbody></table>'+
        '</div>'+
      '</div>';
  });
}

function mFH(m){
  var lb=function(t){return'<label style="display:block;font-size:.68rem;color:var(--t2);margin-bottom:3px;font-weight:600;text-transform:uppercase;letter-spacing:.3px">'+t+'</label>';};
  return'<h3 style="margin-bottom:13px">'+(m?'✏️ Edit: '+h(m.name):'➕ Add New Movie / Song / News')+'</h3>'+
    '<div class="fgrid">'+
    '<div class="fg-row">'+lb('Name *')+'<input class="af" id="mfN" value="'+h(m?m.name:'')+'" placeholder="Title"></div>'+
    '<div class="fg-row">'+lb('Year')+'<input class="af" id="mfY" type="number" value="'+(m?h(m.year):new Date().getFullYear())+'"></div>'+
    '<div class="fg-row">'+lb('Type')+'<select class="af" id="mfT">'+ALL_TYPES.map(function(t){return'<option value="'+t+'"'+(m&&m.type===t?' selected':'')+'>'+cap(t)+'</option>';}).join('')+'</select></div>'+
    '<div class="fg-row">'+lb('Category')+'<select class="af" id="mfC">'+ALL_CATS.map(function(c){return'<option value="'+c+'"'+(m&&m.category===c?' selected':'')+'>'+cap(c)+'</option>';}).join('')+'</select></div>'+
    '<div class="fg-row full">'+lb('Cover Image URL')+'<input class="af" id="mfCov" value="'+h(m?m.cover:'')+'" placeholder="https://…/poster.jpg"></div>'+
    '<div class="fg-row full">'+lb('🎬 Video URL (YouTube / Drive / MP4 / Vimeo)')+'<input class="af" id="mfVid" value="'+h(m?m.videoURL:'')+'" placeholder="https://youtube.com/watch?v=…"></div>'+
    '<div class="fg-row full">'+lb('⬇ Download URL')+'<input class="af" id="mfDl" value="'+h(m?m.downloadURL:'')+'" placeholder="https://…/file.mp4"></div>'+
    '<div class="fg-row full">'+lb('Description')+'<textarea class="af" id="mfDesc" rows="3" placeholder="Synopsis…">'+h(m?m.description:'')+'</textarea></div>'+
    '<div class="fg-row">'+lb('Country')+'<input class="af" id="mfCo" value="'+h(m?m.country:'')+'" placeholder="USA"></div>'+
    '<div class="fg-row">'+lb('Rating (e.g. 8.2)')+'<input class="af" id="mfRat" value="'+h(m?m.rating:'')+'" placeholder="7.5"></div>'+
    '<div class="fg-row">'+lb('Season')+'<input class="af" id="mfSeas" value="'+h(m?m.season:'')+'" placeholder="1"></div>'+
    '<div class="fg-row">'+lb('Episode')+'<input class="af" id="mfEp" value="'+h(m?m.episode:'')+'" placeholder="1"></div>'+
    '<div class="fg-row full" style="display:flex;gap:20px;flex-wrap:wrap">'+
      '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;font-size:.79rem"><input type="checkbox" id="mfNew"'+(m&&m.isNew?' checked':'')+'>  New Release</label>'+
      '<label style="display:flex;gap:6px;align-items:center;cursor:pointer;font-size:.79rem"><input type="checkbox" id="mfFeat"'+(m&&m.featured?' checked':'')+'>  Hero Banner</label>'+
    '</div>'+
    '</div>'+
    '<div class="fa-row">'+
      '<button class="a2btn a2btn-red" onclick="aSave()">'+(m?'💾 Update Movie':'➕ Add Movie')+'</button>'+
      (m?'<button class="a2btn" onclick="aCancelEdit()">✕ Cancel</button>':'')+
    '</div>';
}

function aEdit(id){
  api('getMovie',{id:id},function(r){
    if(!r.ok){toast(r.msg,'terr');return;}
    editId=id;
    document.getElementById('mfw').innerHTML=mFH(r.movie);
    document.getElementById('mfw').scrollIntoView({behavior:'smooth'});
  });
}
function aCancelEdit(){editId=null;document.getElementById('mfw').innerHTML=mFH(null);}

function aSave(){
  var d={
    token:TOKEN,
    name:document.getElementById('mfN').value.trim(),
    year:document.getElementById('mfY').value,
    type:document.getElementById('mfT').value,
    category:document.getElementById('mfC').value,
    cover:document.getElementById('mfCov').value.trim(),
    videoURL:document.getElementById('mfVid').value.trim(),
    downloadURL:document.getElementById('mfDl').value.trim(),
    description:document.getElementById('mfDesc').value.trim(),
    country:document.getElementById('mfCo').value.trim(),
    rating:document.getElementById('mfRat').value.trim(),
    season:document.getElementById('mfSeas').value.trim(),
    episode:document.getElementById('mfEp').value.trim(),
    isNew:document.getElementById('mfNew').checked,
    featured:document.getElementById('mfFeat').checked
  };
  if(!d.name){toast('Name is required','terr');return;}
  if(editId)d.id=editId;
  api(editId?'updateMovie':'addMovie',d,function(r){
    if(r.ok){toast(r.msg,'tok');editId=null;aMovies();}
    else toast(r.msg,'terr');
  });
}

function aDel(id,name){
  if(!confirm('Delete "'+name+'"?'))return;
  api('deleteMovie',{token:TOKEN,id:id},function(r){
    if(r.ok){toast('Movie deleted','tok');aMovies();}
    else toast(r.msg,'terr');
  });
}

/* ════════════════════════════
   USERS
════════════════════════════ */
function aUsers(){
  api('getUsers',{token:TOKEN},function(r){
    if(!r.ok){aErr(r.msg);return;}
    var users=r.users||[];
    var rows=users.map(function(u){
      var st=u.status||'active';
      return'<tr>'+
        '<td><strong>'+h(u.name)+'</strong></td>'+
        '<td style="color:var(--blue)">'+h(u.gmail)+'</td>'+
        '<td>'+h(u.country||'—')+'</td>'+
        '<td style="text-align:center">'+u.commentCount+'</td>'+
        '<td><span class="'+(st==='active'?'s-ok':'s-bl')+'">'+cap(st)+'</span></td>'+
        '<td>'+fmtDate(u.created)+'</td>'+
        '<td style="display:flex;gap:3px;padding:7px 11px">'+
          (st==='active'?'<button class="a2btn a2btn-red" onclick="aSetSt(\''+u.id+'\',\'blocked\')">Block</button>':
                         '<button class="a2btn a2btn-gr" onclick="aSetSt(\''+u.id+'\',\'active\')">Unblock</button>')+
          '<button class="a2btn a2btn-red" onclick="aDelU(\''+u.id+'\',\''+h(u.name)+'\')">Delete</button>'+
        '</td></tr>';
    }).join('');
    document.getElementById('aBody').innerHTML=
      '<div class="atw">'+
        '<div class="ath"><h3>👥 Users ('+users.length+')</h3></div>'+
        '<div style="overflow-x:auto">'+
          '<table class="dt"><thead><tr>'+
            '<th>Name</th><th>Gmail</th><th>Country</th><th>Comments</th><th>Status</th><th>Joined</th><th>Actions</th>'+
          '</tr></thead><tbody>'+rows+'</tbody></table>'+
        '</div>'+
      '</div>';
  });
}
function aSetSt(id,st){
  api('setUserStatus',{token:TOKEN,id:id,status:st},function(r){
    if(r.ok){toast('Status updated','tok');aUsers();}else toast(r.msg,'terr');
  });
}
function aDelU(id,nm){
  if(!confirm('Permanently delete user "'+nm+'"?'))return;
  api('deleteUser',{token:TOKEN,id:id},function(r){
    if(r.ok){toast('User deleted','tok');aUsers();}else toast(r.msg,'terr');
  });
}

/* ════════════════════════════
   COMMENTS
════════════════════════════ */
function aComments(){
  api('getAllComments',{token:TOKEN},function(r){
    if(!r.ok){aErr(r.msg);return;}
    var list=r.comments||[];
    var rows=list.map(function(c){
      return'<tr>'+
        '<td>'+h(c.name||c.gmail)+'</td>'+
        '<td style="font-size:.7rem;color:var(--t2)">'+h(c.movieId)+'</td>'+
        '<td>'+h(c.emoji||'💬')+' '+h((c.comment||'').substring(0,60))+'</td>'+
        '<td style="font-size:.7rem">'+fmtDate(c.date)+'</td>'+
        '<td><button class="a2btn a2btn-red" onclick="aDelCmt(\''+c.id+'\')">Delete</button></td>'+
        '</tr>';
    }).join('');
    document.getElementById('aBody').innerHTML=
      '<div class="atw">'+
        '<div class="ath"><h3>💬 All Comments ('+list.length+')</h3></div>'+
        '<div style="overflow-x:auto">'+
          '<table class="dt"><thead><tr>'+
            '<th>User</th><th>Movie ID</th><th>Comment</th><th>Date</th><th></th>'+
          '</tr></thead><tbody>'+rows+'</tbody></table>'+
        '</div>'+
      '</div>';
  });
}
function aDelCmt(id){
  if(!confirm('Delete this comment?'))return;
  api('deleteComment',{token:TOKEN,id:id},function(r){
    if(r.ok){toast('Deleted','tok');aComments();}else toast(r.msg,'terr');
  });
}

/* ════════════════════════════
   NOTIFICATIONS
════════════════════════════ */
function aNotif(){
  api('getNotifications',{gmail:''},function(r){
    var list=(r.notifications||[]);
    var rows=list.map(function(n){
      return'<tr>'+
        '<td><strong>'+h(n.title)+'</strong></td>'+
        '<td>'+h((n.message||'').substring(0,55))+'…</td>'+
        '<td>'+cap(n.type)+'</td>'+
        '<td style="font-size:.7rem">'+fmtDate(n.date)+'</td>'+
        '<td><button class="a2btn a2btn-red" onclick="aDelNotif(\''+n.id+'\')">Delete</button></td>'+
        '</tr>';
    }).join('');
    document.getElementById('aBody').innerHTML=
      '<div class="aform" style="margin-bottom:16px">'+
        '<h4>📤 Send Notification to All Users</h4>'+
        '<div class="fg-row"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">Title</label><input class="af" id="ntT" placeholder="e.g. New movies added!"></div>'+
        '<div class="fg-row" style="margin-top:9px"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">Message</label><textarea class="af" id="ntM" rows="3" placeholder="Your message to all users…"></textarea></div>'+
        '<div class="fg-row" style="margin-top:9px"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">Type</label>'+
          '<select class="af" id="ntTy" style="max-width:220px">'+
            '<option value="info">ℹ️ Info</option>'+
            '<option value="new">✨ New Content</option>'+
            '<option value="download">📱 App Download</option>'+
          '</select>'+
        '</div>'+
        '<div class="fa-row"><button class="a2btn a2btn-red" onclick="aSendNotif()">📤 Send to All Users</button></div>'+
      '</div>'+
      '<div class="atw">'+
        '<div class="ath"><h3>Sent Notifications ('+list.length+')</h3></div>'+
        '<div style="overflow-x:auto">'+
          '<table class="dt"><thead><tr><th>Title</th><th>Message</th><th>Type</th><th>Date</th><th></th></tr></thead>'+
          '<tbody>'+rows+'</tbody></table>'+
        '</div>'+
      '</div>';
  });
}
function aSendNotif(){
  var t=document.getElementById('ntT').value.trim();
  var m=document.getElementById('ntM').value.trim();
  var ty=document.getElementById('ntTy').value;
  if(!t||!m){toast('Fill title and message','terr');return;}
  api('addNotification',{token:TOKEN,title:t,message:m,type:ty},function(r){
    if(r.ok){toast('Notification sent to all users! 🔔','tok');aNotif();}
    else toast(r.msg,'terr');
  });
}
function aDelNotif(id){
  if(!confirm('Delete notification?'))return;
  api('deleteNotification',{token:TOKEN,id:id},function(r){
    if(r.ok){toast('Deleted','tok');aNotif();}else toast(r.msg,'terr');
  });
}

/* ════════════════════════════
   PAGES
════════════════════════════ */
function aPages(){
  api('getPages',{},function(r){
    var pages=r.pages||{};
    document.getElementById('aBody').innerHTML=
      '<div class="aform">'+
        '<h4 style="margin-bottom:16px">📄 Edit Site Pages</h4>'+
        ['contact','about','follow'].map(function(key){
          var pg=pages[key]||{title:cap(key)+' Us',content:''};
          return'<div style="margin-bottom:22px;padding-bottom:20px;border-bottom:1px solid var(--brd)">'+
            '<p style="font-size:.8rem;font-weight:700;margin-bottom:10px;color:var(--red)">📌 '+cap(key)+' Page</p>'+
            '<div class="fg-row"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">Title</label><input class="af" id="pt-'+key+'" value="'+h(pg.title)+'" style="margin-top:3px"></div>'+
            '<div class="fg-row" style="margin-top:9px"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">Content</label><textarea class="af" id="pc-'+key+'" rows="4" placeholder="Page text…" style="margin-top:3px">'+h(pg.content)+'</textarea></div>'+
            '<button class="a2btn a2btn-red" style="margin-top:9px" onclick="aSavePage(\''+key+'\')">💾 Save '+cap(key)+' Page</button>'+
          '</div>';
        }).join('')+
      '</div>';
  });
}
function aSavePage(key){
  api('savePage',{
    token:TOKEN,key:key,
    title:document.getElementById('pt-'+key).value.trim(),
    content:document.getElementById('pc-'+key).value.trim()
  },function(r){
    if(r.ok)toast(r.msg,'tok');else toast(r.msg,'terr');
  });
}

/* ════════════════════════════
   TRAFFIC
════════════════════════════ */
function aTraffic(){
  api('getTraffic',{token:TOKEN},function(r){
    if(!r.ok){aErr(r.msg);return;}
    var list=r.traffic||[];
    var items=list.map(function(t){
      return'<div class="tf">'+
        '<span class="tf-t">'+fmtDate(t.timestamp)+'</span>'+
        '<span class="tf-u">'+h(t.user)+'</span>'+
        '<span class="tf-a">'+h(t.action)+'</span>'+
        '<span style="color:var(--t2);font-size:.71rem">'+h(t.country||'—')+'</span>'+
        '<span style="color:var(--t3);font-size:.69rem">'+h(t.details||'')+'</span>'+
      '</div>';
    }).join('');
    document.getElementById('aBody').innerHTML=
      '<div class="atw">'+
        '<div class="ath"><h3>📈 Traffic Log ('+list.length+' entries)</h3></div>'+
        '<div style="padding:0 14px 14px">'+
          (items||'<p style="padding:16px;color:var(--t2)">No traffic data yet.</p>')+
        '</div>'+
      '</div>';
  });
}

/* ════════════════════════════
   SETTINGS
════════════════════════════ */
function aSettings(){
  api('getSettings',{},function(r){
    var s=r.settings||{};
    document.getElementById('aBody').innerHTML=
      '<div class="aform">'+
        '<h4 style="margin-bottom:16px">⚙️ Site Settings</h4>'+
        '<div class="fgrid">'+
          '<div class="fg-row"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">Site Name</label><input class="af" id="ss-n" value="'+h(s['site_name']||'KEYTUBE')+'" style="margin-top:3px"></div>'+
          '<div class="fg-row"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">New Admin Password (blank = keep)</label><input class="af" type="password" id="ss-p" placeholder="Leave blank to keep" style="margin-top:3px"></div>'+
          '<div class="fg-row full"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">Favicon URL</label><input class="af" id="ss-fav" value="'+h(s['favicon_url']||'')+'" placeholder="https://…/icon.png" style="margin-top:3px"></div>'+
          '<div class="fg-row full"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">Background Image URL</label><input class="af" id="ss-bg" value="'+h(s['background_url']||'')+'" placeholder="https://…/bg.jpg" style="margin-top:3px"></div>'+
          '<div class="fg-row full"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">📱 Mobile App Download URL</label><input class="af" id="ss-app" value="'+h(s['app_download_url']||'')+'" placeholder="https://…/keytube.apk" style="margin-top:3px"></div>'+
          '<div class="fg-row full"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">📢 Ads Top URL</label><input class="af" id="ss-at" value="'+h(s['ads_top']||'')+'" placeholder="https://advertiser.com" style="margin-top:3px"></div>'+
          '<div class="fg-row full"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">📢 Ads Middle URL</label><input class="af" id="ss-am" value="'+h(s['ads_middle']||'')+'" placeholder="https://advertiser.com" style="margin-top:3px"></div>'+
          '<div class="fg-row full"><label style="font-size:.68rem;color:var(--t2);font-weight:600;text-transform:uppercase">📢 Ads Bottom URL</label><input class="af" id="ss-ab" value="'+h(s['ads_bottom']||'')+'" placeholder="https://advertiser.com" style="margin-top:3px"></div>'+
        '</div>'+
        '<div class="fa-row" style="margin-top:13px">'+
          '<button class="a2btn a2btn-red" onclick="aSaveSettings()">💾 Save All Settings</button>'+
        '</div>'+
      '</div>';
  });
}
function aSaveSettings(){
  var sett={
    'site_name':document.getElementById('ss-n').value.trim(),
    'favicon_url':document.getElementById('ss-fav').value.trim(),
    'background_url':document.getElementById('ss-bg').value.trim(),
    'app_download_url':document.getElementById('ss-app').value.trim(),
    'ads_top':document.getElementById('ss-at').value.trim(),
    'ads_middle':document.getElementById('ss-am').value.trim(),
    'ads_bottom':document.getElementById('ss-ab').value.trim()
  };
  var np=document.getElementById('ss-p').value;
  if(np)sett['admin_password']=np;
  api('updateSettings',{token:TOKEN,settings:sett},function(r){
    if(r.ok)toast(r.msg||'Settings saved!','tok');
    else toast(r.msg||'Error saving','terr');
  });
}

/* ════════════════════════════
   HELPERS
════════════════════════════ */
function aErr(msg){
  document.getElementById('aBody').innerHTML='<div class="aerr-box">❌ '+h(msg)+'</div>';
}
