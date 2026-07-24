/* ════════ CONFIG ════════ */
const API = "https://script.google.com/macros/s/AKfycbxbYUKZYwYRssm80AnP8kDj-8_ymsaFczKmecbchEntyhhr5-zqAIDYov-Nt7Ko0pDOMA/exec";
const CLOUD_NAME = "dajgyzx3c";
const UPLOAD_PRESET = "keytube";
const FOLDER = "keytube";

/* ════════ ACCESS GATE (requires admin token, since addMovie needs it) ════════ */
(function checkAccess(){
  const adminToken = sessionStorage.getItem("km_a");
  if(adminToken){
    document.getElementById("whoami").textContent = "Admin";
    try{
      const u = JSON.parse(sessionStorage.getItem("km_u") || "{}");
      if(u.gmail) document.getElementById("whoami").textContent = u.name || u.gmail;
    }catch(e){}
    return;
  }
  document.getElementById("gate").style.display = "flex";
})();

function doGateLogin(){
  const pw = document.getElementById("gatePw").value;
  const err = document.getElementById("gateErr");
  const btn = document.getElementById("gateBtn");
  if(!pw){ err.textContent = "Enter your password"; return; }
  err.textContent = "";
  btn.textContent = "Checking…";
  btn.disabled = true;

  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "adminLogin", password: pw })
  })
  .then(r => r.json())
  .then(r => {
    btn.textContent = "→ Enter";
    btn.disabled = false;
    if(r.ok){
      sessionStorage.setItem("km_a", r.token);
      document.getElementById("gate").style.display = "none";
      document.getElementById("whoami").textContent = "Admin";
      toast("Admin access granted ✓", "tok");
    } else {
      err.textContent = r.msg || "Wrong password";
      document.getElementById("gatePw").value = "";
      document.getElementById("gatePw").focus();
    }
  })
  .catch(e => {
    btn.textContent = "→ Enter";
    btn.disabled = false;
    err.textContent = "Connection error";
    console.error(e);
  });
}

/* ════════ TOAST ════════ */
function toast(msg, type){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show" + (type ? " " + type : "");
  clearTimeout(t._tt);
  t._tt = setTimeout(()=>{ t.className=""; }, 3200);
}

/* ════════ FILE PREVIEWS ════════ */
const coverInput = document.getElementById("cover");
const videoInput = document.getElementById("video");

coverInput.addEventListener("change", function(){
  const f = this.files[0];
  if(!f) return;
  document.getElementById("coverName").textContent = f.name;
  const img = document.getElementById("coverPreview");
  img.src = URL.createObjectURL(f);
  img.style.display = "block";
});

videoInput.addEventListener("change", function(){
  const f = this.files[0];
  if(!f) return;
  document.getElementById("videoName").textContent = f.name;
  const vid = document.getElementById("videoPreview");
  vid.src = URL.createObjectURL(f);
  vid.style.display = "block";
});

/* ════════ CLOUDINARY UPLOAD (with progress) ════════ */
function uploadToCloudinary(file, resourceType, barId, pctId){
  return new Promise((resolve, reject)=>{
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", FOLDER);

    const wrap = document.getElementById(barId + "Wrap") || document.getElementById(barId.replace("Bar","ProgWrap"));
    const barEl = document.getElementById(barId);
    const pctEl = document.getElementById(pctId);
    if(barEl.parentElement) barEl.parentElement.style.display = "block";
    if(pctEl) pctEl.style.display = "block";

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    xhr.upload.onprogress = function(e){
      if(e.lengthComputable){
        const percent = Math.round((e.loaded / e.total) * 100);
        barEl.style.width = percent + "%";
        if(pctEl) pctEl.textContent = percent + "%";
      }
    };

    xhr.onload = function(){
      if(xhr.status >= 200 && xhr.status < 300){
        try{
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        }catch(err){
          reject(new Error("Invalid response from Cloudinary"));
        }
      } else {
        reject(new Error("Cloudinary upload failed (status " + xhr.status + ")"));
      }
    };
    xhr.onerror = function(){ reject(new Error("Network error during upload")); };
    xhr.send(fd);
  });
}

async function uploadRetry(file, resourceType, barId, pctId, retries){
  retries = retries === undefined ? 2 : retries;
  let lastErr;
  for(let i = 0; i <= retries; i++){
    try{
      return await uploadToCloudinary(file, resourceType, barId, pctId);
    }catch(err){
      lastErr = err;
      if(i < retries) await new Promise(r => setTimeout(r, 800));
    }
  }
  throw lastErr;
}

/* ════════ SAVE TO BACKEND ════════ */
async function saveMovie(coverURL, videoURL){
  const movie = {
    action: "addMovie",
    token: sessionStorage.getItem("km_a") || "",
    name: document.getElementById("movieName").value.trim(),
    description: document.getElementById("description").value.trim(),
    category: document.getElementById("category").value.toLowerCase(),
    type: document.getElementById("type").value,
    country: document.getElementById("country").value.trim(),
    year: document.getElementById("year").value,
    rating: document.getElementById("rating").value,
    season: document.getElementById("season").value,
    episode: document.getElementById("episode").value,
    featured: document.getElementById("featured").checked,
    isNew: document.getElementById("newRelease").checked,
    cover: coverURL,
    videoURL: videoURL,
    downloadURL: videoURL
  };

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(movie)
  });
  return await res.json();
}

/* ════════ MAIN UPLOAD FLOW ════════ */
async function uploadEverything(){
  const name = document.getElementById("movieName").value.trim();
  if(!name){ toast("Enter a title first", "terr"); return; }

  const coverFile = coverInput.files[0];
  const videoFile = videoInput.files[0];
  if(!coverFile){ toast("Select a cover image", "terr"); return; }
  if(!videoFile){ toast("Select a video file", "terr"); return; }

  const btn = document.getElementById("uploadBtn");
  btn.disabled = true;
  btn.textContent = "Uploading...";

  try{
    // Upload cover
    btn.textContent = "Uploading cover...";
    const cover = await uploadRetry(coverFile, "image", "coverBar", "coverPct");
    document.getElementById("coverURL").textContent = cover.secure_url;

    // Upload video
    btn.textContent = "Uploading video...";
    const video = await uploadRetry(videoFile, "video", "videoBar", "videoPct");
    document.getElementById("videoURL").textContent = video.secure_url;

    // Save to backend
    btn.textContent = "Saving...";
    const save = await saveMovie(cover.secure_url, video.secure_url);

    if(save.ok){
      toast("✅ Uploaded and saved successfully", "tok");
      resetForm();
    } else {
      toast("❌ " + (save.msg || "Could not save movie"), "terr");
    }
  }catch(err){
    console.error(err);
    toast("❌ Upload failed: " + err.message, "terr");
  }finally{
    btn.disabled = false;
    btn.textContent = "⬆ UPLOAD & SAVE MOVIE";
  }
}

function resetForm(){
  ["movieName","description","country","rating"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("year").value = 2026;
  document.getElementById("season").value = 1;
  document.getElementById("episode").value = 1;
  document.getElementById("featured").checked = false;
  document.getElementById("newRelease").checked = false;
  coverInput.value = "";
  videoInput.value = "";
  document.getElementById("coverName").textContent = "";
  document.getElementById("videoName").textContent = "";
  document.getElementById("coverPreview").style.display = "none";
  document.getElementById("videoPreview").style.display = "none";
  document.getElementById("coverBar").style.width = "0%";
  document.getElementById("videoBar").style.width = "0%";
  document.getElementById("coverPct").textContent = "0%";
  document.getElementById("videoPct").textContent = "0%";
  document.getElementById("coverProgWrap").style.display = "none";
  document.getElementById("videoProgWrap").style.display = "none";
  document.getElementById("coverURL").textContent = "Waiting upload...";
  document.getElementById("videoURL").textContent = "Waiting upload...";
}
