// ================================================================
// KEYTUBE — Google Apps Script Backend v6.0
// Sheet: 1oRUpWV_T7dN4KYSEwcNpounPmn1lFNu1oqz6xcnu0IY
// ================================================================
var SSID        = '1oRUpWV_T7dN4KYSEwcNpounPmn1lFNu1oqz6xcnu0IY';
var ADMIN_TOKEN = 'KEYTUBE_ADMIN_2024';

// ── Serve HTML ────────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('KEYTUBE')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width,initial-scale=1');
}

// ── Handle fetch() POST ───────────────────────────────────────
function doPost(e) {
  var result;
  try {
    var data = JSON.parse(e.postData.contents);
    result = serverAction(data);
  } catch(err) {
    result = {ok:false, msg:'Parse error: ' + err.message};
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet helpers ─────────────────────────────────────────────
function getSheet(name, headers) {
  var ss = SpreadsheetApp.openById(SSID);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) {
      sh.appendRow(headers);
      sh.getRange(1,1,1,headers.length)
        .setFontWeight('bold').setBackground('#f5c518').setFontColor('#000');
    }
  }
  return sh;
}

function getRows(name) {
  var sh = getSheet(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
}

function getSettingsMap() {
  var m = {};
  getRows('Settings').forEach(function(r) {
    if (r[0]) m[String(r[0])] = String(r[1]||'');
  });
  return m;
}

function isAdmin(t) { return t === ADMIN_TOKEN; }

// ── Init ──────────────────────────────────────────────────────
function initSheets() {
  // Core
  getSheet('Users',         ['ID','Gmail','Password','Name','Country','Created','Status','Avatar']);
  getSheet('Movies',        ['ID','Name','Type','Category','CoverURL','VideoURL','DownloadURL','Description','Year','Country','IsNew','Season','Episode','AddedDate','Featured','Language','Rating','UploaderGmail']);
  getSheet('Comments',      ['ID','Gmail','Name','MovieID','Comment','Emoji','Date','Status']);
  getSheet('Traffic',       ['Timestamp','User','Action','Country','Details']);
  getSheet('Playlist',      ['ID','Gmail','MovieID','AddedDate']);
  getSheet('Notifications', ['ID','Title','Message','Date','Type','ReadBy']);
  getSheet('Pages',         ['Key','Title','Content','UpdatedAt']);
  getSheet('Downloads',     ['ID','Gmail','MovieID','MovieName','Date','Status']);
  getSheet('Online',        ['Gmail','LastSeen','Country']);
  // New
  getSheet('Channels',      ['ID','Gmail','ChannelName','Handle','Avatar','Banner','Bio','SocialLinks','Created','MonetizationEnabled','TotalEarnings']);
  getSheet('Followers',     ['ID','FollowerGmail','ChannelGmail','Date']);
  getSheet('Likes',         ['ID','Gmail','MovieID','Date']);
  getSheet('Views',         ['ID','MovieID','Gmail','Date']);
  getSheet('Earnings',      ['ID','Gmail','Amount','Type','Date','Description','Status']);

  var ss = getSheet('Settings', ['Key','Value']);
  if (ss.getLastRow() < 2) {
    [['admin_password','admin123'],['site_name','KEYTUBE'],['favicon_url',''],
     ['background_url',''],['ads_top',''],['ads_middle',''],['ads_bottom',''],
     ['app_download_url',''],['monetize_threshold','1000']
    ].forEach(function(r) { ss.appendRow(r); });
  }

  var ps = getSheet('Pages');
  if (ps.getLastRow() < 2) {
    [['contact','Contact Us','Email: contact@keytube.com\nPhone: +250 000 000\nAddress: Kigali, Rwanda',new Date().toISOString()],
     ['about','About KEYTUBE','KEYTUBE is your #1 streaming platform for movies and series worldwide.',new Date().toISOString()],
     ['follow','Follow Us','Facebook: facebook.com/keytube\nTwitter: @keytube\nInstagram: @keytube',new Date().toISOString()]
    ].forEach(function(r) { ps.appendRow(r); });
  }
  return {ok:true, msg:'All sheets ready!'};
}

// ── Auth ──────────────────────────────────────────────────────
function login(d) {
  var rows = getRows('Users');
  for (var i=0;i<rows.length;i++) {
    var r = rows[i];
    if (String(r[1])===d.gmail && String(r[2])===d.password) {
      if (String(r[6])==='blocked') return {ok:false, msg:'Account blocked.'};
      pingOnline({gmail:d.gmail, country:String(r[4])});
      logTraffic({user:d.gmail, action:'login', country:String(r[4]), details:'login'});
      return {ok:true, user:{
        id:String(r[0]), gmail:String(r[1]), name:String(r[3]),
        country:String(r[4]), status:String(r[6]), avatar:String(r[7]||'')
      }};
    }
  }
  return {ok:false, msg:'Wrong email or password.'};
}

function register(d) {
  if (!d.gmail||!d.password||!d.name) return {ok:false, msg:'All fields required.'};
  if (d.gmail.toLowerCase().indexOf('@gmail.com')===-1) return {ok:false, msg:'Only Gmail allowed.'};
  if (String(d.password).length<6) return {ok:false, msg:'Password min 6 characters.'};
  var rows = getRows('Users');
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][1])===d.gmail) return {ok:false, msg:'Email already registered.'};
  }
  var id = 'U'+Date.now();
  getSheet('Users').appendRow([id,d.gmail,d.password,d.name,d.country||'',new Date().toISOString(),'active',d.avatar||'']);
  logTraffic({user:d.gmail, action:'register', country:d.country||'', details:'new user'});
  return {ok:true, user:{id:id,gmail:d.gmail,name:d.name,country:d.country||'',status:'active',avatar:d.avatar||''}};
}

function adminLogin(d) {
  var cfg = getSettingsMap();
  if (d.password===(cfg['admin_password']||'admin123')) {
    logTraffic({user:'admin', action:'admin_login', country:'', details:'admin'});
    return {ok:true, token:ADMIN_TOKEN};
  }
  return {ok:false, msg:'Wrong admin password.'};
}

function updateUserProfile(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  var sh = getSheet('Users');
  var data = sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][1])===d.gmail) {
      if (d.name)    sh.getRange(i+1,4).setValue(d.name);
      if (d.country) sh.getRange(i+1,5).setValue(d.country);
      if (d.avatar)  sh.getRange(i+1,8).setValue(d.avatar);
      if (d.password && d.newPassword) {
        if (String(data[i][2])!==d.password) return {ok:false, msg:'Current password wrong.'};
        sh.getRange(i+1,3).setValue(d.newPassword);
      }
      return {ok:true, msg:'Profile updated!',
        user:{id:String(data[i][0]),gmail:String(data[i][1]),
          name:d.name||String(data[i][3]),country:d.country||String(data[i][4]),
          status:String(data[i][6]),avatar:d.avatar||String(data[i][7]||'')}};
    }
  }
  return {ok:false, msg:'User not found.'};
}

// ── Movies ────────────────────────────────────────────────────
function rowToMovie(r) {
  return {
    id:String(r[0]||''), name:String(r[1]||''), type:String(r[2]||'movie'),
    category:String(r[3]||''), cover:String(r[4]||''), videoURL:String(r[5]||''),
    downloadURL:String(r[6]||''), description:String(r[7]||''), year:String(r[8]||''),
    country:String(r[9]||''), isNew:String(r[10]).toLowerCase()==='true',
    season:String(r[11]||''), episode:String(r[12]||''), added:String(r[13]||''),
    featured:String(r[14]).toLowerCase()==='true', language:String(r[15]||''),
    rating:String(r[16]||''), uploaderGmail:String(r[17]||'')
  };
}

function getMovies(d) {
  var list = getRows('Movies').filter(function(r){return !!r[0];}).map(rowToMovie);
  if (!d.isLoggedIn) list = list.filter(function(m){return !m.isNew;}).slice(0,10);
  if (d.category&&d.category!=='all') list=list.filter(function(m){return m.category.toLowerCase()===d.category.toLowerCase();});
  if (d.type&&d.type!=='all') list=list.filter(function(m){return m.type.toLowerCase()===d.type.toLowerCase();});
  if (d.year) list=list.filter(function(m){return String(m.year)===String(d.year);});
  if (d.country&&d.country!=='all') list=list.filter(function(m){return m.country.toLowerCase().indexOf(d.country.toLowerCase())!==-1;});
  if (d.minRating) list=list.filter(function(m){return parseFloat(m.rating||0)>=parseFloat(d.minRating);});
  if (d.uploaderGmail) list=list.filter(function(m){return m.uploaderGmail===d.uploaderGmail;});
  return {ok:true, movies:list};
}

function getMovie(d) {
  var rows = getRows('Movies');
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][0])===String(d.id)) return {ok:true, movie:rowToMovie(rows[i])};
  }
  return {ok:false, msg:'Movie not found.'};
}

function addMovie(d) {
  if (!isAdmin(d.token) && !d.gmail) return {ok:false, msg:'Unauthorized.'};
  if (!d.name) return {ok:false, msg:'Name required.'};
  var id = 'M'+Date.now();
  getSheet('Movies').appendRow([
    id,d.name,d.type||'movie',d.category||'movies',
    d.cover||'',d.videoURL||'',d.downloadURL||'',
    d.description||'',d.year||new Date().getFullYear(),
    d.country||'',d.isNew===true||d.isNew==='true',
    d.season||'',d.episode||'',new Date().toISOString(),
    d.featured===true||d.featured==='true',
    d.language||d.category||'',d.rating||'',
    d.gmail||''
  ]);
  return {ok:true, id:id, msg:'Movie added!'};
}

function updateMovie(d) {
  if (!isAdmin(d.token) && !d.gmail) return {ok:false, msg:'Unauthorized.'};
  var sh=getSheet('Movies'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===String(d.id)) {
      // If not admin, verify ownership
      if (!isAdmin(d.token) && String(data[i][17])!==d.gmail) return {ok:false, msg:'Not your video.'};
      var row=i+1;
      if(d.name!==undefined)        sh.getRange(row,2).setValue(d.name);
      if(d.type!==undefined)        sh.getRange(row,3).setValue(d.type);
      if(d.category!==undefined)    sh.getRange(row,4).setValue(d.category);
      if(d.cover!==undefined)       sh.getRange(row,5).setValue(d.cover);
      if(d.videoURL!==undefined)    sh.getRange(row,6).setValue(d.videoURL);
      if(d.downloadURL!==undefined) sh.getRange(row,7).setValue(d.downloadURL);
      if(d.description!==undefined) sh.getRange(row,8).setValue(d.description);
      if(d.year!==undefined)        sh.getRange(row,9).setValue(d.year);
      if(d.country!==undefined)     sh.getRange(row,10).setValue(d.country);
      if(d.isNew!==undefined)       sh.getRange(row,11).setValue(d.isNew===true||d.isNew==='true');
      if(d.season!==undefined)      sh.getRange(row,12).setValue(d.season);
      if(d.episode!==undefined)     sh.getRange(row,13).setValue(d.episode);
      if(d.featured!==undefined)    sh.getRange(row,15).setValue(d.featured===true||d.featured==='true');
      if(d.language!==undefined)    sh.getRange(row,16).setValue(d.language);
      if(d.rating!==undefined)      sh.getRange(row,17).setValue(d.rating);
      return {ok:true, msg:'Movie updated!'};
    }
  }
  return {ok:false, msg:'Not found.'};
}

function deleteMovie(d) {
  if (!isAdmin(d.token) && !d.gmail) return {ok:false, msg:'Unauthorized.'};
  var sh=getSheet('Movies'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===String(d.id)) {
      if (!isAdmin(d.token) && String(data[i][17])!==d.gmail) return {ok:false, msg:'Not your video.'};
      sh.deleteRow(i+1);
      return {ok:true, msg:'Deleted.'};
    }
  }
  return {ok:false, msg:'Not found.'};
}

function searchMovies(d) {
  var q=(d.query||'').toLowerCase().trim();
  var all=getRows('Movies').filter(function(r){return !!r[0];}).map(rowToMovie);
  if (!d.isLoggedIn) all=all.filter(function(m){return !m.isNew;});
  var exact=[],similar=[];
  all.forEach(function(m) {
    var n=m.name.toLowerCase(), desc=m.description.toLowerCase();
    if (n.indexOf(q)!==-1) exact.push(m);
    else if (desc.indexOf(q)!==-1||m.category.toLowerCase().indexOf(q)!==-1||
             m.country.toLowerCase().indexOf(q)!==-1||
             n.split(' ').some(function(w){return w.indexOf(q.split(' ')[0])===0;})) similar.push(m);
  });
  return {ok:true, exact:exact.slice(0,20), similar:similar.slice(0,12)};
}

// ── Channels ─────────────────────────────────────────────────
function rowToChannel(r) {
  return {
    id:String(r[0]||''), gmail:String(r[1]||''), name:String(r[2]||''),
    handle:String(r[3]||''), avatar:String(r[4]||''), banner:String(r[5]||''),
    bio:String(r[6]||''), socialLinks:String(r[7]||''), created:String(r[8]||''),
    monetizationEnabled:String(r[9]).toLowerCase()==='true', totalEarnings:parseFloat(r[10]||0)
  };
}

function getMyChannel(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  var rows=getRows('Channels');
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][1])===d.gmail) {
      var ch=rowToChannel(rows[i]);
      var followerCount=getRows('Followers').filter(function(r){return String(r[2])===d.gmail;}).length;
      ch.followerCount=followerCount;
      return {ok:true, channel:ch};
    }
  }
  return {ok:true, channel:null}; // No channel yet
}

function getChannel(d) {
  var rows=getRows('Channels');
  var target=d.gmail||d.handle;
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][1])===target || String(rows[i][3])===target) {
      var ch=rowToChannel(rows[i]);
      var followerCount=getRows('Followers').filter(function(r){return String(r[2])===ch.gmail;}).length;
      ch.followerCount=followerCount;
      return {ok:true, channel:ch};
    }
  }
  return {ok:false, msg:'Channel not found.'};
}

function createChannel(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  if (!d.name) return {ok:false, msg:'Channel name required.'};
  // Check if already has channel
  var rows=getRows('Channels');
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][1])===d.gmail) return {ok:false, msg:'You already have a channel.'};
  }
  // Check handle uniqueness
  if (d.handle) {
    for (var j=0;j<rows.length;j++) {
      if (String(rows[j][3])===d.handle) return {ok:false, msg:'Handle already taken.'};
    }
  }
  var id='CH'+Date.now();
  var handle=d.handle||('@'+(d.name||'').toLowerCase().replace(/[^a-z0-9]/g,''));
  getSheet('Channels').appendRow([
    id,d.gmail,d.name,handle,d.avatar||'',d.banner||'',d.bio||'',
    d.socialLinks||'',new Date().toISOString(),false,0
  ]);
  return {ok:true, id:id, msg:'Channel created!',
    channel:{id:id,gmail:d.gmail,name:d.name,handle:handle,avatar:d.avatar||'',
      banner:d.banner||'',bio:d.bio||'',socialLinks:d.socialLinks||'',
      created:new Date().toISOString(),monetizationEnabled:false,totalEarnings:0,followerCount:0}};
}

function updateChannel(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  var sh=getSheet('Channels'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][1])===d.gmail) {
      if (d.name)        sh.getRange(i+1,3).setValue(d.name);
      if (d.handle) {
        // Check uniqueness
        for (var j=1;j<data.length;j++) {
          if (j!==i && String(data[j][3])===d.handle) return {ok:false, msg:'Handle already taken.'};
        }
        sh.getRange(i+1,4).setValue(d.handle);
      }
      if (d.avatar!==undefined)      sh.getRange(i+1,5).setValue(d.avatar);
      if (d.banner!==undefined)      sh.getRange(i+1,6).setValue(d.banner);
      if (d.bio!==undefined)         sh.getRange(i+1,7).setValue(d.bio);
      if (d.socialLinks!==undefined) sh.getRange(i+1,8).setValue(d.socialLinks);
      return {ok:true, msg:'Channel updated!'};
    }
  }
  return {ok:false, msg:'Channel not found.'};
}

// ── Followers ─────────────────────────────────────────────────
function followChannel(d) {
  if (!d.gmail||!d.channelGmail) return {ok:false, msg:'Missing fields.'};
  if (d.gmail===d.channelGmail) return {ok:false, msg:'Cannot follow yourself.'};
  var rows=getRows('Followers');
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][1])===d.gmail && String(rows[i][2])===d.channelGmail) return {ok:false, msg:'Already following.'};
  }
  var id='F'+Date.now();
  getSheet('Followers').appendRow([id,d.gmail,d.channelGmail,new Date().toISOString()]);
  // Check monetization threshold
  var cfg=getSettingsMap();
  var threshold=parseInt(cfg['monetize_threshold']||'1000');
  var followerCount=getRows('Followers').filter(function(r){return String(r[2])===d.channelGmail;}).length;
  if (followerCount>=threshold) {
    // Auto-enable monetization for channel
    var sh=getSheet('Channels'), cdata=sh.getDataRange().getValues();
    for (var j=1;j<cdata.length;j++) {
      if (String(cdata[j][1])===d.channelGmail && String(cdata[j][9]).toLowerCase()!=='true') {
        sh.getRange(j+1,10).setValue(true);
      }
    }
  }
  return {ok:true, msg:'Following!', followerCount:followerCount};
}

function unfollowChannel(d) {
  if (!d.gmail||!d.channelGmail) return {ok:false, msg:'Missing fields.'};
  var sh=getSheet('Followers'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][1])===d.gmail && String(data[i][2])===d.channelGmail) {
      sh.deleteRow(i+1);
      var followerCount=getRows('Followers').filter(function(r){return String(r[2])===d.channelGmail;}).length;
      return {ok:true, msg:'Unfollowed.', followerCount:followerCount};
    }
  }
  return {ok:false, msg:'Not following.'};
}

function getFollowers(d) {
  var gmail=d.gmail||d.channelGmail;
  var rows=getRows('Followers').filter(function(r){return String(r[2])===gmail;});
  var list=rows.map(function(r){return {id:String(r[0]),gmail:String(r[1]),date:String(r[3])};});
  var isFollowing=false;
  if (d.viewerGmail) {
    isFollowing=rows.some(function(r){return String(r[1])===d.viewerGmail;});
  }
  return {ok:true, followers:list, count:list.length, isFollowing:isFollowing};
}

function getFollowing(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  var rows=getRows('Followers').filter(function(r){return String(r[1])===d.gmail;});
  var list=rows.map(function(r){return {channelGmail:String(r[2]),date:String(r[3])};});
  return {ok:true, following:list, count:list.length};
}

// ── Likes ─────────────────────────────────────────────────────
function likeMovie(d) {
  if (!d.gmail||!d.movieId) return {ok:false, msg:'Missing fields.'};
  var rows=getRows('Likes');
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][1])===d.gmail && String(rows[i][2])===String(d.movieId)) {
      return {ok:false, msg:'Already liked.'};
    }
  }
  var id='L'+Date.now();
  getSheet('Likes').appendRow([id,d.gmail,d.movieId,new Date().toISOString()]);
  var likeCount=getRows('Likes').filter(function(r){return String(r[2])===String(d.movieId);}).length;
  return {ok:true, id:id, likeCount:likeCount};
}

function unlikeMovie(d) {
  if (!d.gmail||!d.movieId) return {ok:false, msg:'Missing fields.'};
  var sh=getSheet('Likes'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][1])===d.gmail && String(data[i][2])===String(d.movieId)) {
      sh.deleteRow(i+1);
      var likeCount=getRows('Likes').filter(function(r){return String(r[2])===String(d.movieId);}).length;
      return {ok:true, likeCount:likeCount};
    }
  }
  return {ok:false, msg:'Not liked.'};
}

function getMovieLikes(d) {
  var likes=getRows('Likes').filter(function(r){return String(r[2])===String(d.movieId);});
  var isLiked=d.gmail?likes.some(function(r){return String(r[1])===d.gmail;}):false;
  return {ok:true, likeCount:likes.length, isLiked:isLiked};
}

function getUserLikes(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  var likedIds=getRows('Likes').filter(function(r){return String(r[1])===d.gmail;}).map(function(r){return String(r[2]);});
  var movies=getRows('Movies').filter(function(r){return !!r[0]&&likedIds.indexOf(String(r[0]))!==-1;}).map(rowToMovie);
  return {ok:true, movies:movies};
}

// ── Views ─────────────────────────────────────────────────────
function logView(d) {
  if (!d.movieId) return {ok:false};
  var id='V'+Date.now();
  getSheet('Views').appendRow([id,d.movieId,d.gmail||'guest',new Date().toISOString()]);
  return {ok:true};
}

function getMovieViews(d) {
  var count=getRows('Views').filter(function(r){return String(r[1])===String(d.movieId);}).length;
  return {ok:true, viewCount:count};
}

// ── Channel Analytics ─────────────────────────────────────────
function getChannelStats(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  var myMovies=getRows('Movies').filter(function(r){return String(r[17])===d.gmail;}).map(rowToMovie);
  var myIds=myMovies.map(function(m){return m.id;});
  var allViews=getRows('Views');
  var allLikes=getRows('Likes');
  var allComments=getRows('Comments');
  var allDownloads=getRows('Downloads');
  var totalViews=allViews.filter(function(r){return myIds.indexOf(String(r[1]))!==-1;}).length;
  var totalLikes=allLikes.filter(function(r){return myIds.indexOf(String(r[2]))!==-1;}).length;
  var totalComments=allComments.filter(function(r){return myIds.indexOf(String(r[3]))!==-1&&String(r[7])!=='deleted';}).length;
  var totalDownloads=allDownloads.filter(function(r){return myIds.indexOf(String(r[2]))!==-1;}).length;
  var followerCount=getRows('Followers').filter(function(r){return String(r[2])===d.gmail;}).length;
  // Per-video stats
  var videoStats=myMovies.map(function(m){
    return {
      id:m.id, name:m.name, cover:m.cover, category:m.category, year:m.year,
      views:allViews.filter(function(r){return String(r[1])===m.id;}).length,
      likes:allLikes.filter(function(r){return String(r[2])===m.id;}).length,
      comments:allComments.filter(function(r){return String(r[3])===m.id&&String(r[7])!=='deleted';}).length,
      downloads:allDownloads.filter(function(r){return String(r[2])===m.id;}).length
    };
  });
  // Last 30 days views
  var cutoff=new Date(Date.now()-30*24*60*60*1000);
  var recentViews=allViews.filter(function(r){
    return myIds.indexOf(String(r[1]))!==-1 && new Date(String(r[3]))>cutoff;
  }).length;
  // Trending (most views)
  var trending=videoStats.slice().sort(function(a,b){return b.views-a.views;}).slice(0,5);
  return {ok:true, stats:{
    totalVideos:myMovies.length,
    totalViews:totalViews,
    totalLikes:totalLikes,
    totalComments:totalComments,
    totalDownloads:totalDownloads,
    followerCount:followerCount,
    recentViews:recentViews,
    videoStats:videoStats,
    trending:trending
  }};
}

// ── Earnings ──────────────────────────────────────────────────
function getEarnings(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  var rows=getRows('Earnings').filter(function(r){return String(r[1])===d.gmail;});
  var list=rows.map(function(r){return {id:String(r[0]),amount:parseFloat(r[2]||0),type:String(r[3]),date:String(r[4]),description:String(r[5]),status:String(r[6])};});
  var total=list.reduce(function(s,e){return s+(e.status==='paid'?e.amount:0);},0);
  var pending=list.reduce(function(s,e){return s+(e.status==='pending'?e.amount:0);},0);
  return {ok:true, earnings:list, total:total, pending:pending};
}

// ── Playlist ──────────────────────────────────────────────────
function addToPlaylist(d) {
  if (!d.gmail) return {ok:false, msg:'Sign in required.'};
  var rows=getRows('Playlist');
  for (var i=0;i<rows.length;i++) {
    if (String(rows[i][1])===d.gmail && String(rows[i][2])===String(d.movieId)) return {ok:false, msg:'Already in playlist.'};
  }
  var id='PL'+Date.now();
  getSheet('Playlist').appendRow([id,d.gmail,d.movieId,new Date().toISOString()]);
  return {ok:true, id:id};
}

function removeFromPlaylist(d) {
  if (!d.gmail) return {ok:false, msg:'Sign in required.'};
  var sh=getSheet('Playlist'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][1])===d.gmail && String(data[i][2])===String(d.movieId)) {
      sh.deleteRow(i+1); return {ok:true};
    }
  }
  return {ok:false};
}

function getPlaylist(d) {
  if (!d.gmail) return {ok:false, msg:'Sign in required.'};
  var ids=getRows('Playlist').filter(function(r){return String(r[1])===d.gmail;}).map(function(r){return String(r[2]);});
  var movies=getRows('Movies').filter(function(r){return !!r[0]&&ids.indexOf(String(r[0]))!==-1;}).map(rowToMovie);
  return {ok:true, movies:movies};
}

// ── Comments ──────────────────────────────────────────────────
function addComment(d) {
  if (!d.gmail) return {ok:false, msg:'Sign in to comment.'};
  if (!d.comment||!String(d.comment).trim()) return {ok:false, msg:'Empty comment.'};
  var id='C'+Date.now();
  getSheet('Comments').appendRow([id,d.gmail,d.name||d.gmail,d.movieId,String(d.comment).trim(),d.emoji||'💬',new Date().toISOString(),'active']);
  return {ok:true, id:id};
}

function getComments(d) {
  var list=getRows('Comments')
    .filter(function(r){return String(r[3])===String(d.movieId)&&String(r[7])!=='deleted';})
    .map(function(r){return {id:String(r[0]),gmail:String(r[1]),name:String(r[2]),comment:String(r[4]),emoji:String(r[5]||'💬'),date:String(r[6])};});
  return {ok:true, comments:list};
}

function getMyVideoComments(d) {
  if (!d.gmail) return {ok:false, msg:'Not authenticated.'};
  var myIds=getRows('Movies').filter(function(r){return String(r[17])===d.gmail;}).map(function(r){return String(r[0]);});
  var list=getRows('Comments')
    .filter(function(r){return myIds.indexOf(String(r[3]))!==-1&&String(r[7])!=='deleted';})
    .map(function(r){return {id:String(r[0]),gmail:String(r[1]),name:String(r[2]),movieId:String(r[3]),comment:String(r[4]),emoji:String(r[5]||'💬'),date:String(r[6])};});
  return {ok:true, comments:list};
}

function deleteComment(d) {
  if (!isAdmin(d.token)&&!d.gmail) return {ok:false, msg:'Unauthorized.'};
  var sh=getSheet('Comments'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===String(d.id)) {
      if (!isAdmin(d.token) && String(data[i][1])!==d.gmail) return {ok:false, msg:'Not your comment.'};
      sh.getRange(i+1,8).setValue('deleted'); return {ok:true};
    }
  }
  return {ok:false};
}

function getAllComments(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var list=getRows('Comments').filter(function(r){return !!r[0]&&String(r[7])!=='deleted';})
    .map(function(r){return {id:String(r[0]),gmail:String(r[1]),name:String(r[2]),movieId:String(r[3]),comment:String(r[4]),emoji:String(r[5]||'💬'),date:String(r[6])};});
  return {ok:true, comments:list};
}

// ── Notifications ─────────────────────────────────────────────
function addNotification(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var id='N'+Date.now();
  getSheet('Notifications').appendRow([id,d.title||'',d.message||'',new Date().toISOString(),d.type||'info','']);
  return {ok:true, id:id, msg:'Notification sent!'};
}

function getNotifications(d) {
  var rows=getRows('Notifications');
  var list=rows.filter(function(r){return !!r[0];}).map(function(r){
    var readBy=String(r[5]||'').split(',').filter(Boolean);
    return {id:String(r[0]),title:String(r[1]),message:String(r[2]),date:String(r[3]),type:String(r[4]),isRead:d.gmail?readBy.indexOf(d.gmail)!==-1:false};
  });
  return {ok:true, notifications:list.reverse().slice(0,30)};
}

function markNotifRead(d) {
  if (!d.gmail||!d.notifId) return {ok:false};
  var sh=getSheet('Notifications'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===String(d.notifId)) {
      var readers=String(data[i][5]||'').split(',').filter(Boolean);
      if (readers.indexOf(d.gmail)===-1) { readers.push(d.gmail); sh.getRange(i+1,6).setValue(readers.join(',')); }
      return {ok:true};
    }
  }
  return {ok:false};
}

function deleteNotification(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var sh=getSheet('Notifications'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===String(d.id)) { sh.deleteRow(i+1); return {ok:true}; }
  }
  return {ok:false};
}

// ── Pages ─────────────────────────────────────────────────────
function getPages() {
  var m={};
  getRows('Pages').forEach(function(r){if(r[0])m[String(r[0])]={title:String(r[1]),content:String(r[2]),updated:String(r[3])};});
  return {ok:true, pages:m};
}

function savePage(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  if (!d.key) return {ok:false, msg:'Key required.'};
  var sh=getSheet('Pages'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===String(d.key)) {
      if (d.title!==undefined)   sh.getRange(i+1,2).setValue(d.title);
      if (d.content!==undefined) sh.getRange(i+1,3).setValue(d.content);
      sh.getRange(i+1,4).setValue(new Date().toISOString());
      return {ok:true, msg:'Page saved!'};
    }
  }
  sh.appendRow([d.key,d.title||'',d.content||'',new Date().toISOString()]);
  return {ok:true, msg:'Page created!'};
}

// ── Downloads ─────────────────────────────────────────────────
function logDownload(d) {
  var id='DL'+Date.now();
  getSheet('Downloads').appendRow([id,d.gmail||'guest',d.movieId||'',d.movieName||'',new Date().toISOString(),d.status||'completed']);
  return {ok:true, id:id};
}

// ── Online ────────────────────────────────────────────────────
function pingOnline(d) {
  var sh=getSheet('Online'), data=sh.getDataRange().getValues();
  var gmail=d.gmail||'guest';
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===gmail) {
      sh.getRange(i+1,2).setValue(new Date().toISOString());
      sh.getRange(i+1,3).setValue(d.country||'');
      return {ok:true};
    }
  }
  sh.appendRow([gmail,new Date().toISOString(),d.country||'']);
  return {ok:true};
}

function getOnlineUsers(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var cutoff=new Date(Date.now()-3*60*1000);
  var list=getRows('Online').filter(function(r){
    var last=new Date(String(r[1]));
    return !isNaN(last)&&last>cutoff&&r[0]!=='guest';
  }).map(function(r){return {gmail:String(r[0]),lastSeen:String(r[1]),country:String(r[2])};});
  return {ok:true, users:list, count:list.length};
}

// ── Settings ─────────────────────────────────────────────────
function getSettings() { return {ok:true, settings:getSettingsMap()}; }

function updateSettings(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var sh=getSheet('Settings'), data=sh.getDataRange().getValues();
  var map=d.settings||{};
  for (var key in map) {
    var found=false;
    for (var i=1;i<data.length;i++) {
      if (String(data[i][0])===key) { sh.getRange(i+1,2).setValue(map[key]); found=true; break; }
    }
    if (!found) sh.appendRow([key,map[key]]);
  }
  return {ok:true, msg:'Settings saved!'};
}

// ── Users (admin) ─────────────────────────────────────────────
function getUsers(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var uRows=getRows('Users'), cRows=getRows('Comments'), cMap={};
  cRows.forEach(function(r){var g=String(r[1]);if(g&&String(r[7])!=='deleted'){if(!cMap[g])cMap[g]=0;cMap[g]++;}});
  var users=uRows.filter(function(r){return !!r[0];}).map(function(r){
    return {id:String(r[0]),gmail:String(r[1]),name:String(r[3]),country:String(r[4]),created:String(r[5]),status:String(r[6]||'active'),avatar:String(r[7]||''),commentCount:cMap[String(r[1])]||0};
  });
  return {ok:true, users:users};
}

function setUserStatus(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var sh=getSheet('Users'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===String(d.id)) { sh.getRange(i+1,7).setValue(d.status); return {ok:true}; }
  }
  return {ok:false};
}

function deleteUser(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var sh=getSheet('Users'), data=sh.getDataRange().getValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][0])===String(d.id)) { sh.deleteRow(i+1); return {ok:true}; }
  }
  return {ok:false};
}

// ── Traffic ───────────────────────────────────────────────────
function logTraffic(d) {
  getSheet('Traffic').appendRow([new Date().toISOString(),d.user||'guest',d.action||'visit',d.country||'',d.details||'']);
  return {ok:true};
}

function getTraffic(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  var list=getRows('Traffic').map(function(r){return {timestamp:String(r[0]),user:String(r[1]),action:String(r[2]),country:String(r[3]),details:String(r[4])};});
  return {ok:true, traffic:list.reverse().slice(0,500)};
}

function getStats(d) {
  if (!isAdmin(d.token)) return {ok:false, msg:'Unauthorized.'};
  return {ok:true, stats:{
    users:    Math.max(0,getSheet('Users').getLastRow()-1),
    movies:   Math.max(0,getSheet('Movies').getLastRow()-1),
    comments: Math.max(0,getSheet('Comments').getLastRow()-1),
    traffic:  Math.max(0,getSheet('Traffic').getLastRow()-1),
    downloads:Math.max(0,getSheet('Downloads').getLastRow()-1),
    playlist: Math.max(0,getSheet('Playlist').getLastRow()-1),
    channels: Math.max(0,getSheet('Channels').getLastRow()-1),
    followers:Math.max(0,getSheet('Followers').getLastRow()-1)
  }};
}

// ── MAIN SWITCH ───────────────────────────────────────────────
function serverAction(d) {
  try {
    switch(d.action) {
      // ── Setup
      case 'init':                return initSheets();
      // ── Auth
      case 'login':               return login(d);
      case 'register':            return register(d);
      case 'adminLogin':          return adminLogin(d);
      case 'updateUserProfile':   return updateUserProfile(d);
      // ── Movies
      case 'getMovies':           return getMovies(d);
      case 'getMovie':            return getMovie(d);
      case 'addMovie':            return addMovie(d);
      case 'updateMovie':         return updateMovie(d);
      case 'deleteMovie':         return deleteMovie(d);
      case 'searchMovies':        return searchMovies(d);
      // ── Playlist
      case 'addToPlaylist':       return addToPlaylist(d);
      case 'removeFromPlaylist':  return removeFromPlaylist(d);
      case 'getPlaylist':         return getPlaylist(d);
      // ── Comments
      case 'addComment':          return addComment(d);
      case 'getComments':         return getComments(d);
      case 'deleteComment':       return deleteComment(d);
      case 'getAllComments':       return getAllComments(d);
      case 'getMyVideoComments':  return getMyVideoComments(d);
      // ── Notifications
      case 'addNotification':     return addNotification(d);
      case 'getNotifications':    return getNotifications(d);
      case 'markNotifRead':       return markNotifRead(d);
      case 'deleteNotification':  return deleteNotification(d);
      // ── Pages
      case 'getPages':            return getPages();
      case 'savePage':            return savePage(d);
      // ── Downloads
      case 'logDownload':         return logDownload(d);
      // ── Online
      case 'pingOnline':          return pingOnline(d);
      case 'getOnlineUsers':      return getOnlineUsers(d);
      // ── Settings
      case 'getSettings':         return getSettings();
      case 'updateSettings':      return updateSettings(d);
      // ── Users (admin)
      case 'getUsers':            return getUsers(d);
      case 'setUserStatus':       return setUserStatus(d);
      case 'deleteUser':          return deleteUser(d);
      // ── Traffic
      case 'logTraffic':          return logTraffic(d);
      case 'getTraffic':          return getTraffic(d);
      case 'getStats':            return getStats(d);
      // ── Channels
      case 'getMyChannel':        return getMyChannel(d);
      case 'getChannel':          return getChannel(d);
      case 'createChannel':       return createChannel(d);
      case 'updateChannel':       return updateChannel(d);
      // ── Followers
      case 'followChannel':       return followChannel(d);
      case 'unfollowChannel':     return unfollowChannel(d);
      case 'getFollowers':        return getFollowers(d);
      case 'getFollowing':        return getFollowing(d);
      // ── Likes
      case 'likeMovie':           return likeMovie(d);
      case 'unlikeMovie':         return unlikeMovie(d);
      case 'getMovieLikes':       return getMovieLikes(d);
      case 'getUserLikes':        return getUserLikes(d);
      // ── Views
      case 'logView':             return logView(d);
      case 'getMovieViews':       return getMovieViews(d);
      // ── Analytics
      case 'getChannelStats':     return getChannelStats(d);
      // ── Earnings
      case 'getEarnings':         return getEarnings(d);
      default: return {ok:false, msg:'Unknown action: ' + d.action};
    }
  } catch(err) {
    return {ok:false, msg:'Error: ' + err.message};
  }
}
