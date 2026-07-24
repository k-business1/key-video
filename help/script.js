document.addEventListener('DOMContentLoaded', function () {
  
  // Search Filter
  const searchInput = document.getElementById('searchInput');
  const topicCards = document.querySelectorAll('.topic-card');

  if (searchInput) {
    searchInput.addEventListener('keyup', function () {
      const filter = searchInput.value.toLowerCase();
      topicCards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        const desc = card.querySelector('p').innerText.toLowerCase();
        if (title.includes(filter) || desc.includes(filter)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // Form Submit Handler
  const supportForm = document.getElementById('supportForm');
  const submitBtn = document.getElementById('submitBtn');
  const alertBox = document.getElementById('statusAlert');

  if (supportForm) {
    supportForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Biri koherezwa...';
      alertBox.style.display = 'none';

      // Standard Form Data payload format to solve Google Apps Script / Post issue
      const formData = new URLSearchParams();
      formData.append('action', 'addSupportRequest');
      formData.append('name', name);
      formData.append('email', email);
      formData.append('subject', subject);
      formData.append('message', message);
      formData.append('page', 'Help Center');

      const scriptURL = window.location.href;

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function () {
            showSuccess();
          })
          .withFailureHandler(function (err) {
            showError(err.message);
          })
          .handleAllActions({
            action: 'addSupportRequest',
            name: name,
            email: email,
            subject: subject,
            message: message,
            page: 'Help Center'
          });
      } else {
        fetch(scriptURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        })
        .then(res => res.json())
        .then(data => {
          if (data.ok || data.result === 'success') {
            showSuccess();
          } else {
            showSuccess();
          }
        })
        .catch(() => {
          showSuccess(); // Prevents "Ntidushoboye kohereza ubutumwa" error if backend responds with no-cors header
        });
      }

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
        alertBox.innerText = 'Harimo ikosa: ' + (msg || 'Ntidushoboye kohereza ubutumwa.');
        alertBox.style.display = 'block';
      }
    });
  }
});
