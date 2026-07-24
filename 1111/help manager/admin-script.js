document.addEventListener('DOMContentLoaded', function () {

  const refreshBtn = document.getElementById('refreshBtn');
  const requestsList = document.getElementById('requestsList');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const totalRequestsCount = document.getElementById('totalRequestsCount');
  const pendingCount = document.getElementById('pendingCount');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      fetchSupportRequests();
    });
  }

  function fetchSupportRequests() {
    loadingSpinner.style.display = 'block';
    requestsList.innerHTML = '';
    refreshBtn.disabled = true;

    const scriptURL = window.location.href;

    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(function (data) {
          renderRequests(data);
        })
        .withFailureHandler(function () {
          renderRequests(getDemoRequests());
        })
        .getSupportRequests();
    } else {
      fetch(scriptURL + '?action=getSupportRequests')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            renderRequests(data);
          } else {
            renderRequests(getDemoRequests());
          }
        })
        .catch(() => {
          // Fallback to Demo Data
          renderRequests(getDemoRequests());
        });
    }
  }

  function renderRequests(items) {
    loadingSpinner.style.display = 'none';
    refreshBtn.disabled = false;
    requestsList.innerHTML = '';

    if (!items || items.length === 0) {
      requestsList.innerHTML = '<p class="empty-state">Nta busabe bw\'abakoresha buhari kugeza ubu.</p>';
      totalRequestsCount.innerText = '0';
      pendingCount.innerText = '0';
      return;
    }

    totalRequestsCount.innerText = items.length;
    pendingCount.innerText = items.length; // Count total open issues

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'request-item';
      
      const mailToUrl = `mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}&body=Muraho ${encodeURIComponent(item.name)},\n\n`;

      card.innerHTML = `
        <div class="request-item-header">
          <span class="user-name">${item.name}</span>
          <span class="request-subject">${item.subject}</span>
        </div>
        <div class="request-message">${item.message}</div>
        <div class="request-footer">
          <span><i class="fa-regular fa-envelope"></i> ${item.email}</span>
          <a href="${mailToUrl}" class="btn-reply" target="_blank">
            <i class="fa-solid fa-reply"></i> Subiza
          </a>
        </div>
      `;
      requestsList.appendChild(card);
    });
  }

  // Demo requests mock data
  function getDemoRequests() {
    return [
      {
        name: "Eric Mugisha",
        email: "eric.mugisha@gmail.com",
        subject: "Gusaba Filime Nshya",
        message: "Muraho, ndasaba ko mwatwongerera filime yitwa Fast & Furious 10 muri VIP section."
      },
      {
        name: "Aline Uwase",
        email: "aline.u@gmail.com",
        subject: "Problem kuri Video",
        message: "Video ya Episode 3 ntabwo irimo gukora icyo kimbaza n'ikibazo cy'umuvuduko wa server."
      }
    ];
  }

  // Initial Fetch on Load
  fetchSupportRequests();
});
