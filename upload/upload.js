/* ============================================================
   KEYTUBE — Upload page logic
   Requires a logged-in user account (not an admin password gate).
   ============================================================ */
const CLOUD_NAME = "dxm2dqdfi";
const UPLOAD_PRESET = "Keytube";
const FOLDER = "Keytube";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // hard 100MB cap on video files

/* ── require login: bounce straight back to the home page otherwise ── */
(function requireLogin(){
  try{
    const u = sessionStorage.getItem("km_u");
    if(!u){ window.location.href = "index.html"; return; }
    const user = JSON.parse(u);
    if(!user || !user.gmail){ window.location.href = "index.html"; return; }
    S.user = user;
    const av = document.getElementById("avEl");
    if(av) av.textContent = (user.name || user.gmail || "U")[0].toUpperCase();
  }catch(e){
    window.location.href = "index.html";
    return;
  }
  // login check passed — dismiss the splash screen so the form becomes visible
  const pl = document.getElementById("pgLoad");
  if(pl) pl.style.display = "none";
})();

function fmtBytes(n){
  if(n >= 1024*1024) return (n/(1024*1024)).toFixed(1) + " MB";
  if(n >= 1024) return (n/1024).toFixed(0) + " KB";
  return n + " B";
}

/* ── "does this file already exist in storage?" cache ──
   Fingerprints a file by name+size+lastModified and remembers the
   Cloudinary secure_url it produced last time. If the exact same file
   is picked again (e.g. after a failed save, or a retried upload),
   we skip re-uploading it entirely and reuse the existing URL — so a
   backend save error never forces the person to re-upload their video. */
function fileFingerprint(file){
  return file.name + "|" + file.size + "|" + (file.lastModified||0);
}
function getCachedUpload(file){
  try{
    const cache = JSON.parse(localStorage.getItem("km_upload_cache") || "{}");
    return cache[fileFingerprint(file)] || null;
  }catch(e){ return null; }
}
function setCachedUpload(file, secureUrl){
  try{
    const cache = JSON.parse(localStorage.getItem("km_upload_cache") || "{}");
    cache[fileFingerprint(file)] = secureUrl;
    localStorage.setItem("km_upload_cache", JSON.stringify(cache));
  }catch(e){}
}

/* ════════ FILE PREVIEWS + SIZE VALIDATION ════════ */
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
  const errEl = document.getElementById("videoSizeErr");
  if(!f){ errEl.textContent = ""; return; }

  if(f.size > MAX_VIDEO_BYTES){
    errEl.textContent = "❌ This file is " + fmtBytes(f.size) + " — the limit is 100MB. Please choose a smaller file.";
    toast("Video exceeds the 100MB limit", "terr");
    this.value = "";
    document.getElementById("videoName").textContent = "";
    const vid = document.getElementById("videoPreview");
    vid.removeAttribute("src");
    vid.style.display = "none";
    return;
  }

  errEl.textContent = "";
  document.getElementById("videoName").textContent = f.name + "  (" + fmtBytes(f.size) + ")";
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

/* Uploads a file, but skips the network call entirely if this exact file
   was already uploaded before (same name+size+lastModified) — the cached
   secure_url is reused instantly and the progress bar jumps to 100%. */
async function uploadOrReuse(file, resourceType, barId, pctId){
  const cached = getCachedUpload(file);
  if(cached){
    const barEl = document.getElementById(barId), pctEl = document.getElementById(pctId);
    if(barEl){ if(barEl.parentElement) barEl.parentElement.style.display = "block"; barEl.style.width = "100%"; }
    if(pctEl){ pctEl.style.display = "block"; pctEl.textContent = "100% (already uploaded)"; }
    return { secure_url: cached };
  }
  const result = await uploadRetry(file, resourceType, barId, pctId);
  setCachedUpload(file, result.secure_url);
  return result;
}

/* ════════ SAVE TO BACKEND ════════
   NOTE for Rena: this authenticates as the logged-in USER (gmail), not an
   admin token — addMovie previously checked an admin password on the Apps
   Script side. Make sure the backend's addMovie action accepts requests
   from a logged-in user's gmail, or this save step will keep failing even
   though the Cloudinary upload itself succeeded. */
async function saveMovie(coverURL, videoURL){
  const movie = {
    action: "addMovie",
    gmail: S.user ? S.user.gmail : "",
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

/* Keeps the last successfully-uploaded URLs around so that if only the
   backend "save" step fails, the person can hit Retry Save without ever
   having to re-select or re-upload their cover/video again. */
let lastCoverURL = null, lastVideoURL = null;

function showSaveError(msg){
  const errEl = document.getElementById("saveErr");
  errEl.textContent = "❌ " + msg;
  if(lastCoverURL && lastVideoURL){
    document.getElementById("retryBtn").classList.remove("hidden");
  }
}
function clearSaveError(){
  document.getElementById("saveErr").textContent = "";
  document.getElementById("retryBtn").classList.add("hidden");
}

/* ════════ MAIN UPLOAD FLOW ════════ */
async function uploadEverything(){
  clearSaveError();
  const name = document.getElementById("movieName").value.trim();
  if(!name){ toast("Enter a title first", "terr"); return; }

  const coverFile = coverInput.files[0];
  const videoFile = videoInput.files[0];
  if(!coverFile){ toast("Select a cover image", "terr"); return; }
  if(!videoFile){ toast("Select a video file", "terr"); return; }

  if(videoFile.size > MAX_VIDEO_BYTES){
    document.getElementById("videoSizeErr").textContent = "❌ This file is " + fmtBytes(videoFile.size) + " — the limit is 100MB. Please choose a smaller file.";
    toast("Video exceeds the 100MB limit", "terr");
    return;
  }

  const btn = document.getElementById("uploadBtn");
  btn.disabled = true;
  btn.textContent = "Uploading...";

  try{
    btn.textContent = "Uploading cover...";
    const cover = await uploadOrReuse(coverFile, "image", "coverBar", "coverPct");
    document.getElementById("coverURL").textContent = cover.secure_url;
    lastCoverURL = cover.secure_url;

    btn.textContent = "Uploading video...";
    const video = await uploadOrReuse(videoFile, "video", "videoBar", "videoPct");
    document.getElementById("videoURL").textContent = video.secure_url;
    lastVideoURL = video.secure_url;

    btn.textContent = "Saving...";
    const save = await saveMovie(cover.secure_url, video.secure_url);

    if(save.ok){
      toast("✅ Uploaded and saved successfully", "tok");
      lastCoverURL = null; lastVideoURL = null;
      resetForm();
    } else {
      // Files are already safely uploaded to storage — only the save step
      // failed, so we never ask the person to re-upload anything.
      showSaveError((save.msg || "Could not save movie") + " — your files are already uploaded, just tap Retry Save.");
    }
  }catch(err){
    console.error(err);
    toast("❌ Upload failed: " + err.message, "terr");
  }finally{
    btn.disabled = false;
    btn.textContent = "⬆ Upload & Save";
  }
}

/* Retries ONLY the backend save, reusing the already-uploaded file URLs —
   no re-upload of cover/video needed. */
async function retrySaveOnly(){
  if(!lastCoverURL || !lastVideoURL){ toast("Nothing to retry — upload files first", "terr"); return; }
  const btn = document.getElementById("retryBtn");
  btn.disabled = true; btn.textContent = "Retrying save...";
  try{
    const save = await saveMovie(lastCoverURL, lastVideoURL);
    if(save.ok){
      toast("✅ Saved successfully", "tok");
      lastCoverURL = null; lastVideoURL = null;
      clearSaveError();
      resetForm();
    } else {
      showSaveError((save.msg || "Could not save movie") + " — your files are already uploaded, just tap Retry Save.");
    }
  }catch(err){
    console.error(err);
    toast("❌ Save failed: " + err.message, "terr");
  }finally{
    btn.disabled = false; btn.textContent = "↻ Retry Save (files already uploaded)";
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
  document.getElementById("videoSizeErr").textContent = "";
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
  clearSaveError();
}
