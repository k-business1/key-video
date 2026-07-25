/* ============================================================
   KEYTUBE — Admin Help Dashboard logic
   ============================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbxbYUKZYwYRssm80AnP8kDj-8_ymsaFczKmecbchEntyhhr5-zqAIDYov-Nt7Ko0pDOMA/exec";

function api(action, data){
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(Object.assign({}, data||{}, {action:action}))
  }).then(r => r.json());
}

/* ── Access gate ── */
function showDashboard(){
  document.getElementById('gate').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  fetchSupportRequests();
  loadAnnouncementAdmin();
}
function showGate(){
  document.getElementById('gate').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  if(sessionStorage.getItem('km_a')){
    showDashboard();
  } else {
    showGate();
  }

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', fetchSupportRequests);
});

function doGateLogin(){
  const pw = document.getElementById('gatePw').value;
  const err = document.getElementById('gateErr');
  const btn = document.getElementById('gateBtn');
  if(!pw){ err.textContent = 'Enter the admin password'; return; }
  err.textContent = '';
  btn.textContent = 'Checking…';
  btn.disabled = true;

  api('adminLogin', {password: pw}).then(r => {
    btn.textContent = '→ Enter';
    btn.disabled = false;
    if(r.ok){
      sessionStorage.setItem('km_a', r.token);
      showDashboard();
    } else {
      err.textContent = r.msg || 'Wrong password';
      document.getElementById('gatePw').value = '';
      document.getElementById('gatePw').focus();
    }
  }).catch(e => {
    btn.textContent = '→ Enter';
    btn.disabled = false;
    err.textContent = 'Connection error';
    console.error(e);
  });
}

function adminLogout(){
  sessionStorage.removeItem('km_a');
  showGate();
}

/* ── Help-page announcement ── */
function loadAnnouncementAdmin(){
  const input = document.getElementById('announcementInput');
  if(!input) return;
  api('getAnnouncement', {}).then(r => {
    if(r && r.ok){
      input.value = r.text || '';
    }
  }).catch(err => console.error('Could not load announcement:', err));
}

function saveAnnouncement(){
  const input = document.getElementById('announcementInput');
  const btn = document.getElementById('saveAnnouncementBtn');
  const alertBox = document.getElementById('announcementAlert');

  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Birabikwa...';
  alertBox.style.display = 'none';

  api('setAnnouncement', {token: sessionStorage.getItem('km_a')||'', text: input.value.trim()}).then(r => {
    btn.disabled = false;
    btn.innerHTML = originalHtml;

    if(r && r.ok){
      alertBox.className = 'alert alert-success';
      alertBox.innerText = 'Itangazo ryabitswe! Ririmo kugaragara kuri Help Center.';
      alertBox.style.display = 'block';
    } else {
      if((r && r.msg || '').toLowerCase().indexOf('unauthorized') !== -1){
        sessionStorage.removeItem('km_a');
        showGate();
        return;
      }
      alertBox.className = 'alert alert-error';
      alertBox.innerText = (r && r.msg) || 'Ntibyakunze kubika itangazo.';
      alertBox.style.display = 'block';
    }
  }).catch(err => {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    alertBox.className = 'alert alert-error';
    alertBox.innerText = 'Connection error — could not reach the server.';
    alertBox.style.display = 'block';
    console.error(err);
  });
}

/* ── Support requests ── */
function fetchSupportRequests(){
  const loadingSpinner = document.getElementById('loadingSpinner');
  const requestsList = document.getElementById('requestsList');
  const refreshBtn = document.getElementById('refreshBtn');
  const alertBox = document.getElementById('adminAlert');

  loadingSpinner.style.display = 'block';
  requestsList.innerHTML = '';
  refreshBtn.disabled = true;
  alertBox.style.display = 'none';

  api('getSupportRequests', {token: sessionStorage.getItem('km_a')||''}).then(r => {
    loadingSpinner.style.display = 'none';
    refreshBtn.disabled = false;

    if(!r.ok){
      // token was rejected (wrong/expired) — send back to the gate rather than
      // showing fake data, so nobody mistakes an auth failure for "no requests"
      if((r.msg||'').toLowerCase().indexOf('unauthorized') !== -1){
        sessionStorage.removeItem('km_a');
        showGate();
        return;
      }
      alertBox.className = 'alert alert-error';
      alertBox.innerText = r.msg || 'Could not load support requests.';
      alertBox.style.display = 'block';
      return;
    }
    renderRequests(r.requests || []);
  }).catch(err => {
    loadingSpinner.style.display = 'none';
    refreshBtn.disabled = false;
    alertBox.className = 'alert alert-error';
    alertBox.innerText = 'Connection error — could not reach the server.';
    alertBox.style.display = 'block';
    console.error(err);
  });
}

function renderRequests(items){
  const requestsList = document.getElementById('requestsList');
  const totalRequestsCount = document.getElementById('totalRequestsCount');
  const pendingCount = document.getElementById('pendingCount');

  requestsList.innerHTML = '';
  totalRequestsCount.innerText = items.length;
  pendingCount.innerText = items.filter(i => i.status !== 'resolved').length;

  if(!items.length){
    requestsList.innerHTML = '<p class="empty-state">Nta busabe bw\'abakoresha buhari kugeza ubu.</p>';
    return;
  }

  items.forEach(item => {
    const resolved = item.status === 'resolved';
    const card = document.createElement('div');
    card.className = 'request-item' + (resolved ? ' resolved' : '');

    const mailToUrl = `mailto:${item.email}?subject=${encodeURIComponent('Re: '+item.subject)}&body=${encodeURIComponent('Muraho '+item.name+',\n\n')}`;

    card.innerHTML = `
      <div class="request-item-header">
        <span class="user-name">${escapeHtml(item.name)}</span>
        <span class="status-pill ${resolved ? 'status-resolved':'status-open'}">${resolved ? 'Resolved' : 'Open'}</span>
      </div>
      <div class="request-subject">${escapeHtml(item.subject)}</div>
      <div class="request-message">${escapeHtml(item.message)}</div>
      <div class="request-footer">
        <span><i class="fa-regular fa-envelope"></i> ${escapeHtml(item.email)}</span>
        <div class="request-actions">
          <a href="${mailToUrl}" class="btn-reply" target="_blank"><i class="fa-solid fa-reply"></i> Subiza</a>
          <button class="btn-resolve" ${resolved ? 'disabled' : ''} onclick="resolveRequest('${item.id}', this)">
            <i class="fa-solid fa-check"></i> ${resolved ? 'Resolved' : 'Mark Resolved'}
          </button>
        </div>
      </div>
    `;
    requestsList.appendChild(card);
  });
}

function resolveRequest(id, btn){
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  api('updateSupportStatus', {token: sessionStorage.getItem('km_a')||'', id:id, status:'resolved'}).then(r => {
    if(r.ok){
      fetchSupportRequests();
    } else {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Mark Resolved';
      alert(r.msg || 'Could not update status.');
    }
  }).catch(err => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Mark Resolved';
    console.error(err);
  });
}

function escapeHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
