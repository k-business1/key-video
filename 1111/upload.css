:root{
  --w:#fff;--bg:#f9f9f9;--bg2:#f2f2f2;--brd:#e5e5e5;--txt:#0f0f0f;--t2:#606060;--t3:#aaa;
  --red:#ff0000;--r2:#cc0000;--blue:#065fd4;--green:#2ba640;--r:10px;--r2px:6px;
}
*{margin:0;padding:0;box-sizing:border-box;font-family:'Roboto',sans-serif;}
body{background:var(--bg);color:var(--txt);min-height:100vh;}

/* ===== TOP BAR (matches admin panel) ===== */
header{
  height:60px;background:var(--w);display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;box-shadow:0 2px 10px rgba(0,0,0,.06);position:sticky;top:0;z-index:999;
}
.logo{display:flex;align-items:center;gap:8px;}
.logo-kb{width:34px;height:28px;background:var(--red);border-radius:5px;display:grid;place-items:center;overflow:hidden;flex-shrink:0;}
.logo-kb img{width:100%;height:100%;object-fit:cover;}
.logo-kb span{font-family:'Bebas Neue';font-size:17px;color:#fff;}
.logo-title{font-family:'Bebas Neue';font-size:20px;letter-spacing:1px;color:var(--red);}
.hdr-user{font-size:.78rem;color:var(--t2);display:flex;align-items:center;gap:10px;}
.hdr-back{font-size:.78rem;color:var(--blue);cursor:pointer;text-decoration:none;}

/* ===== GATE SCREEN ===== */
#gate{position:fixed;inset:0;background:var(--bg);display:none;align-items:center;justify-content:center;padding:20px;z-index:2000;}
.gate-card{background:var(--w);border:1px solid var(--brd);border-radius:14px;padding:34px 28px;max-width:380px;width:100%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08);}
.gate-card h2{font-size:1rem;margin-bottom:8px;}
.gate-card p{font-size:.82rem;color:var(--t2);margin-bottom:20px;line-height:1.5;}
.gate-btn{padding:11px 22px;border-radius:var(--r2px);background:var(--red);color:#fff;font-weight:700;font-size:.85rem;border:none;cursor:pointer;}
.gate-btn:hover{background:var(--r2);}

/* ===== CONTAINER ===== */
.container{max-width:1100px;margin:auto;padding:24px 18px;}
.card{background:var(--w);border:1px solid var(--brd);border-radius:var(--r);padding:24px;box-shadow:0 3px 14px rgba(0,0,0,.05);margin-bottom:22px;}
.card-title{font-size:1.05rem;font-weight:700;margin-bottom:18px;color:var(--red);display:flex;align-items:center;gap:8px;}

.grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
.input{margin-bottom:16px;}
.input label{display:block;font-size:.72rem;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px;}
.input input,.input textarea,.input select{
  width:100%;padding:11px 12px;border:1.5px solid var(--brd);border-radius:var(--r2px);
  font-size:.88rem;color:var(--txt);outline:none;background:var(--bg);transition:.15s;
}
.input input:focus,.input textarea:focus,.input select:focus{border-color:var(--red);background:var(--w);}
.input textarea{resize:none;height:110px;}
.checks{display:flex;gap:22px;margin-top:6px;flex-wrap:wrap;}
.checks label{display:flex;align-items:center;gap:7px;font-size:.82rem;cursor:pointer;}

/* ===== UPLOAD BOXES ===== */
.uploadBox{
  border:2px dashed var(--red);border-radius:var(--r);padding:30px 16px;text-align:center;
  cursor:pointer;transition:.2s;background:#fff8f8;
}
.uploadBox:hover{background:#ffeaea;}
.uploadBox .ic{font-size:30px;margin-bottom:6px;}
.uploadBox p{font-size:.82rem;color:var(--t2);}
.uploadBox .fname{font-size:.78rem;color:var(--red);font-weight:700;margin-top:6px;word-break:break-all;}

.progress{width:100%;height:9px;background:var(--bg2);border-radius:20px;overflow:hidden;margin-top:12px;display:none;}
.bar{height:100%;width:0%;background:var(--red);transition:.2s;}
.pct{font-size:.72rem;color:var(--t2);margin-top:4px;text-align:right;display:none;}

.preview{margin-top:14px;display:flex;gap:14px;flex-wrap:wrap;}
.preview img{width:140px;border-radius:8px;display:none;border:1px solid var(--brd);}
.preview video{width:240px;border-radius:8px;display:none;border:1px solid var(--brd);}

button.main-btn{
  width:100%;padding:14px;border:none;background:var(--red);color:#fff;border-radius:var(--r2px);
  font-size:.92rem;cursor:pointer;font-weight:700;transition:.2s;margin-top:6px;
}
button.main-btn:hover{background:var(--r2);}
button.main-btn:disabled{background:#e2a3a3;cursor:not-allowed;}

.urlBox{margin-top:16px;background:var(--bg);padding:14px;border-radius:var(--r2px);border:1px solid var(--brd);font-size:.78rem;}
.urlBox b{font-size:.7rem;text-transform:uppercase;color:var(--t2);letter-spacing:.3px;}
.urlBox div{word-break:break-all;color:var(--blue);margin-bottom:8px;}

#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(12px);background:var(--txt);color:#fff;
  border-radius:var(--r2px);padding:10px 20px;font-size:.82rem;font-weight:500;opacity:0;transition:.22s;z-index:9999;pointer-events:none;}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
#toast.tok{background:#2e7d32;}
#toast.terr{background:#d32f2f;}

@media(max-width:800px){.grid{grid-template-columns:1fr;}.preview img,.preview video{width:100%;}}
