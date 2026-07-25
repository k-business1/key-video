/* ============================================================
   KEYTUBE — Help Center page logic
   ============================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbxbYUKZYwYRssm80AnP8kDj-8_ymsaFczKmecbchEntyhhr5-zqAIDYov-Nt7Ko0pDOMA/exec";

function api(action, data) {
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(Object.assign({}, data || {}, { action: action }))
  }).then(r => r.json());
}

document.addEventListener('DOMContentLoaded', function () {

  // ── Admin announcement banner ──
  // Pulls whatever the admin last typed in the dashboard and shows it here.
  // Stays hidden if there's no announcement (or the request fails).
  loadAnnouncement();

  // ── Topic search filter ──
  const searchInput = document.getElementById('searchInput');
  const topicCards = document.querySelectorAll('.topic-card');
  if (searchInput) {
    searchInput.addEventListener('keyup', function () {
      const filter = searchInput.value.toLowerCase();
      topicCards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        const desc = card.querySelector('p').innerText.toLowerCase();
        card.style.display = (title.includes(filter) || desc.includes(filter)) ? 'flex' : 'none';
      });
    });
  }

  // ── Support form submission ──
  const supportForm = document.getElementById('supportForm');
  const submitBtn = document.getElementById('submitBtn');
  const alertBox = document.getElementById('statusAlert');

  if (supportForm) {
    supportForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value.trim();

      if (!name || !email || !subject || !message) {
        showError('Please fill in every field.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Biri koherezwa...';
      alertBox.style.display = 'none';

      api('addSupportRequest', {
        name: name,
        email: email,
        subject: subject,
        message: message,
        page: 'Help Center'
      }).then(data => {
        if (data && data.ok) {
          showSuccess();
        } else {
          showError(data && data.msg ? data.msg : 'The server could not save your message.');
        }
      }).catch(err => {
        console.error(err);
        showError('Connection error — please check your internet and try again.');
      });

      function showSuccess() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Ohereza Ubutumwa';
        alertBox.className = 'alert alert-success';
        alertBox.innerText = 'Ubutumwa bwawe bwoherejwe neza! Murakoze.';
        alertBox.style.display = 'block';
        supportForm.reset();
      }

      function showError(msg) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Ohereza Ubutumwa';
        alertBox.className = 'alert alert-error';
        alertBox.innerText = 'Harimo ikosa: ' + msg;
        alertBox.style.display = 'block';
      }
    });
  }
});

function loadAnnouncement() {
  const box = document.getElementById('announcementBox');
  const textEl = document.getElementById('announcementText');
  if (!box || !textEl) return;

  api('getAnnouncement', {}).then(r => {
    if (r && r.ok && r.text && r.text.trim()) {
      textEl.innerText = r.text.trim();
      box.style.display = 'flex';
    } else {
      box.style.display = 'none';
    }
  }).catch(err => {
    // Fail silently — the announcement banner is not critical to the page
    console.error('Could not load announcement:', err);
    box.style.display = 'none';
  });
}
