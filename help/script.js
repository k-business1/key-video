/* ============================================================
   KEYTUBE — Help Center page logic
   ============================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbxbYUKZYwYRssm80AnP8kDj-8_ymsaFczKmecbchEntyhhr5-zqAIDYov-Nt7Ko0pDOMA/exec";

document.addEventListener('DOMContentLoaded', function () {

  // show the user's initial in the avatar if they're logged in (site-wide login, same as index.html)
  try{
    const u = JSON.parse(localStorage.getItem('km_u') || 'null');
    if(u && u.name){ document.getElementById('userAvatar').textContent = u.name[0].toUpperCase(); }
  }catch(e){}

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

      if(!name || !email || !subject || !message){
        showError('Please fill in every field.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Biri koherezwa...';
      alertBox.style.display = 'none';

      // IMPORTANT: the Apps Script doPost reads e.postData.contents as JSON
      // (JSON.parse(e.postData.contents)) — so this must be sent as a JSON
      // body with Content-Type: text/plain, exactly like the rest of the
      // KEYTUBE app talks to this same backend. Sending form-urlencoded
      // data here (as before) meant every single submission silently failed
      // to parse on the server, even though the page claimed "success".
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'addSupportRequest',
          name: name,
          email: email,
          subject: subject,
          message: message,
          page: 'Help Center'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.ok) {
          showSuccess();
        } else {
          showError(data && data.msg ? data.msg : 'The server could not save your message.');
        }
      })
      .catch(err => {
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
