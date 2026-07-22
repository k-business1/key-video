/* ============================================================
   KEYTUBE — Upload page logic
   Requires a logged-in user account (not an admin password gate).
   ============================================================ */
const CLOUD_NAME = "dxm2dqdfi";
const UPLOAD_PRESET = "Keytube";
const FOLDER = "Keytube";

/* ── require login: bounce straight back to the home page otherwise ── */
(function requireLogin(){
  try{
    const u = sessionStorage.getItem("km_u");
    if(!u){ window.location.href = "../index.html"; return; }
    const user = JSON.parse(u);
    if(!user || !user.gmail){ window.location.href = "../index.html"; return; }
    S.user = user;
    const av = document.getElementById("avEl");
    if(av) av.textContent = (user.name || user.gmail || "U")[0].toUpperCase();
  }catch(e){
    window.location.href = "../index.html";
  }
})();

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

/* ════════ SAVE TO BACKEND ════════
   NOTE for Rena: this now authenticates as the logged-in USER (gmail),
   not an admin token — addMovie previously checked an admin password on
   the Apps Script side. Make sure the backend's addMovie action accepts
   requests from a logged-in user's gmail, or this save step will be
   rejected by the script even though the Cloudinary upload succeeds. */
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
    btn.textContent = "Uploading cover...";
    const cover = await uploadRetry(coverFile, "image", "coverBar", "coverPct");
    document.getElementById("coverURL").textContent = cover.secure_url;

    btn.textContent = "Uploading video...";
    const video = await uploadRetry(videoFile, "video", "videoBar", "videoPct");
    document.getElementById("videoURL").textContent = video.secure_url;

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
    btn.textContent = "⬆ Upload & Save";
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
