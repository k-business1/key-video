/* ═══════════════════════════════════════════════════════════════
   KEYTUBE SEARCH ENGINE  —  search.js
   Live search of movies/series/songs/news by name (from Google Sheet
   via the existing backend API), with SILENT auto-correction:
   if the user types something not in the Sheet, the search box text
   is quietly rewritten to the closest real title and results appear —
   no "Did you mean" popup, just an automatic fix.
═══════════════════════════════════════════════════════════════ */

(function(){

  /* ════════ CONFIG — edit these if needed ════════ */
  var KM_API = "https://script.google.com/macros/s/AKfycbxVdY-_WNOhxAEVqAMi2E1Q6R0KVBWnhq7EQGwNj21BWpbIOfi7phMt3y85qEhs9tXQ/exec";
  var KM_RESULT_LINK = "player.html?id="; // clicking a/* ═══════════════════════════════════════════════════════════════
   KEYTUBE SEARCH ENGINE  —  search.js
   Live search of movies/series/songs/news by name (from Google Sheet
   via the existing backend API), with SILENT auto-correction:
   if the user types a name with a typo and no exact/substring match
   exists in the Sheet, the search box text is quietly rewritten to
   the closest real title and results appear — no popup, no visible
   "did you mean", the box just gets fixed automatically.
═══════════════════════════════════════════════════════════════ */

(function(){

  /* ════════ CONFIG — edit these if needed ════════ */
  var KM_API = "https://script.google.com/macros/s/AKfycbxVdY-_WNOhxAEVqAMi2E1Q6R0KVBWnhq7EQGwNj21BWpbIOfi7phMt3y85qEhs9tXQ/exec";
  var KM_RESULT_LINK = "player.html?id="; // clicking a result goes to this + movie.id
  var KM_MAX_RESULTS = 8;                 // how many suggestions to show
  var KM_QUICK_DELAY = 200;               // ms — normal live-filter delay while typing
  var KM_IDLE_DELAY   = 650;              // ms — pause length before silent auto-correct kicks in
  var KM_FUZZY_THRESHOLD = 0.55;          // 0–1 — how close a typo must be to auto-correct (lower = more forgiving)
  var KM_MIN_QUERY_LEN = 3;               // don't try to auto-correct very short input

  /* ════════ INTERNAL STATE ════════ */
  var allMovies = [];
  var loaded = false;
  var loading = false;

  /* ════════ FETCH & CACHE MOVIES FROM SHEET ════════ */
  function loadMovies(cb){
    if(loaded){ cb && cb(); return; }
    if(loading){ setTimeout(function(){ loadMovies(cb); }, 200); return; }
    loading = true;

    fetch(KM_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getMovies", isLoggedIn: true, category: "all", type: "all" })
    })
    .then(function(r){ return r.json(); })
    .then(function(res){
      allMovies = (res && res.ok && res.movies) ? res.movies : [];
      loaded = true;
      loading = false;
      cb && cb();
    })
    .catch(function(err){
      console.error("KM Search: failed to load movies", err);
      loading = false;
      cb && cb();
    });
  }

  /* ════════ EXACT / SUBSTRING SEARCH ════════ */
  function scoreMatch(text, query){
    if(!text) return -1;
    text = String(text).toLowerCase();
    query = query.toLowerCase();
    var idx = text.indexOf(query);
    if(idx === -1) return -1;
    if(idx === 0) return 100;
    if(text.charAt(idx - 1) === " ") return 70;
    return 40;
  }

  function searchMovies(query){
    query = (query || "").trim();
    if(!query) return [];

    var results = [];
    for(var i = 0; i < allMovies.length; i++){
      var m = allMovies[i];
      var nameScore = scoreMatch(m.name, query);
      var score = nameScore;
      if(score === -1){
        var catScore = scoreMatch(m.category, query);
        var countryScore = scoreMatch(m.country, query);
        score = Math.max(catScore, countryScore) > -1 ? 10 : -1;
      }
      if(score > -1) results.push({ movie: m, score: score });
    }

    results.sort(function(a, b){ return b.score - a.score; });
    return results.slice(0, KM_MAX_RESULTS).map(function(r){ return r.movie; });
  }

  /* ════════ FUZZY MATCH ENGINE (silent auto-correct) ════════ */
  function levenshtein(a, b){
    a = a.toLowerCase(); b = b.toLowerCase();
    var m = a.length, n = b.length;
    if(m === 0) return n;
    if(n === 0) return m;
    var prev = new Array(n + 1);
    var curr = new Array(n + 1);
    for(var j = 0; j <= n; j++) prev[j] = j;
    for(var i = 1; i <= m; i++){
      curr[0] = i;
      for(var k = 1; k <= n; k++){
        var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
        curr[k] = Math.min(prev[k] + 1, curr[k - 1] + 1, prev[k - 1] + cost);
      }
      var tmp = prev; prev = curr; curr = tmp;
    }
    return prev[n];
  }

  function similarity(a, b){
    var maxLen = Math.max(a.length, b.length);
    if(maxLen === 0) return 1;
    return 1 - (levenshtein(a, b) / maxLen);
  }

  function findClosestMovies(query, limit){
    query = (query || "").trim().toLowerCase();
    if(!query || !allMovies.length) return [];

    var scored = [];
    for(var i = 0; i < allMovies.length; i++){
      var name = allMovies[i].name || "";
      var nameLower = name.toLowerCase();

      var fullScore = similarity(query, nameLower);

      var words = nameLower.split(/\s+/);
      var wordScore = 0;
      for(var w = 0; w < words.length; w++){
        var s = similarity(query, words[w]);
        if(s > wordScore) wordScore = s;
      }

      var score = Math.max(fullScore, wordScore);
      if(score >= KM_FUZZY_THRESHOLD){
        scored.push({ movie: allMovies[i], score: score });
      }
    }

    scored.sort(function(a, b){ return b.score - a.score; });
    return scored.slice(0, limit || KM_MAX_RESULTS).map(function(r){ return r.movie; });
  }

  /* ════════ UI HELPERS ════════ */
  function escapeHtml(s){
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function renderResults(container, results, query){
    if(!results.length){
      container.innerHTML = query
        ? '<div class="km-search-empty">No results for "' + escapeHtml(query) + '"</div>'
        : "";
      container.style.display = query ? "block" : "none";
      return;
    }

    container.innerHTML = results.map(function(m){
      return '' +
        '<div class="km-search-item" data-id="' + escapeHtml(m.id) + '">' +
          '<img class="km-search-thumb" src="' + escapeHtml(m.cover) + '" onerror="this.style.display=\'none\'">' +
          '<div class="km-search-info">' +
            '<div class="km-search-name">' + escapeHtml(m.name) + '</div>' +
            '<div class="km-search-meta">' + escapeHtml(m.category || "") + (m.year ? " • " + escapeHtml(m.year) : "") + '</div>' +
          '</div>' +
        '</div>';
    }).join("");

    container.style.display = "block";

    var items = container.querySelectorAll(".km-search-item");
    for(var i = 0; i < items.length; i++){
      items[i].addEventListener("click", function(){
        var id = this.getAttribute("data-id");
        window.location.href = KM_RESULT_LINK + encodeURIComponent(id);
      });
    }
  }

  function injectStyles(){
    if(document.getElementById("km-search-style")) return;
    var css =
      ".km-search-wrap{position:relative}" +
      ".km-search-results{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e5e5e5;" +
        "border-radius:8px;margin-top:6px;max-height:360px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.12);" +
        "z-index:1000;display:none;}" +
      ".km-search-item{display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;transition:.15s}" +
      ".km-search-item:hover{background:#f6f6f6}" +
      ".km-search-thumb{width:34px;height:48px;object-fit:cover;border-radius:4px;background:#eee;flex-shrink:0}" +
      ".km-search-name{font-size:.85rem;font-weight:600;color:#111}" +
      ".km-search-meta{font-size:.72rem;color:#777;margin-top:2px}" +
      ".km-search-empty{padding:14px;font-size:.8rem;color:#888;text-align:center}";
    var style = document.createElement("style");
    style.id = "km-search-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ════════ WIRE UP INPUT + RESULTS CONTAINER ════════
     Two timers per keystroke:
     - quickTimer (fast): normal live filtering while the user types
     - idleTimer (slower): fires only once the user pauses; if there
       are STILL no matches at that point, silently rewrites the input
       to the closest real title from the Sheet and re-searches. */
  function wire(inputEl, resultsEl){
    injectStyles();
    if(!resultsEl.classList.contains("km-search-results")) resultsEl.classList.add("km-search-results");
    if(inputEl.parentElement && !inputEl.parentElement.classList.contains("km-search-wrap")){
      inputEl.parentElement.classList.add("km-search-wrap");
    }

    var quickTimer = null;
    var idleTimer = null;
    var skipNextIdle = false; // guards against re-correcting text we just auto-corrected

    inputEl.addEventListener("input", function(){
      clearTimeout(quickTimer);
      clearTimeout(idleTimer);

      if(skipNextIdle){ skipNextIdle = false; return; }

      quickTimer = setTimeout(function(){
        loadMovies(function(){
          var results = searchMovies(inputEl.value);
          renderResults(resultsEl, results, inputEl.value.trim());
        });
      }, KM_QUICK_DELAY);

      idleTimer = setTimeout(function(){
        loadMovies(function(){
          try{
            if(!inputEl || typeof inputEl.value !== "string") return;

            var currentQuery = inputEl.value.trim();
            if(currentQuery.length < KM_MIN_QUERY_LEN) return;

            var exactResults = searchMovies(currentQuery);
            if(exactResults.length) return; // real matches already found, nothing to fix

            var fuzzyResults = findClosestMovies(currentQuery, KM_MAX_RESULTS);
            if(!fuzzyResults.length) return;

            var bestMatch = fuzzyResults[0];
            if(!bestMatch || !bestMatch.name) return;

            skipNextIdle = true; // prevent the programmatic value change below from re-triggering this flow
            inputEl.value = bestMatch.name; // silently correct what the user typed

            var correctedResults = searchMovies(bestMatch.name);
            renderResults(resultsEl, correctedResults, bestMatch.name);
          }catch(err){
            console.error("KM Search: auto-correct failed", err);
          }
        });
      }, KM_IDLE_DELAY);
    });

    document.addEventListener("click", function(e){
      if(e.target !== inputEl && !resultsEl.contains(e.target)){
        resultsEl.style.display = "none";
      }
    });

    inputEl.addEventListener("focus", function(){
      if(inputEl.value.trim()) resultsEl.style.display = "block";
    });
  }

  /* ════════ AUTO-INIT ON PAGE LOAD ════════
     Looks for elements with id="searchInput" and id="searchResults".
     If your page uses different IDs, call KMSearch.init(inputId, resultsId) manually. */
  function autoInit(){
    var input = document.getElementById("searchInput");
    var results = document.getElementById("searchResults");
    if(input && results){
      wire(input, results);
      loadMovies();
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  /* ════════ PUBLIC API ════════ */
  window.KMSearch = {
    init: function(inputId, resultsId){
      var input = document.getElementById(inputId);
      var results = document.getElementById(resultsId);
      if(!input || !results){
        console.error("KMSearch.init: could not find #" + inputId + " or #" + resultsId);
        return;
      }
      wire(input, results);
      loadMovies();
    },
    search: searchMovies,
    reload: function(){ loaded = false; loadMovies(); }
  };

})(); result goes to this + movie.id
  var KM_MAX_RESULTS = 8;                 // how many suggestions to show
  var KM_QUICK_DELAY = 200;               // ms — normal live-filter delay while typing
  var KM_IDLE_DELAY   = 650;              // ms — pause length before silent auto-correct kicks in
  var KM_FUZZY_THRESHOLD = 0.55;          // 0–1 — how close a typo must be to auto-correct (lower = more forgiving)
  var KM_MIN_QUERY_LEN = 3;               // don't try to auto-correct very short input

  /* ════════ INTERNAL STATE ════════ */
  var allMovies = [];
  var loaded = false;
  var loading = false;

  /* ════════ FETCH & CACHE MOVIES FROM SHEET ════════ */
  function loadMovies(cb){
    if(loaded){ cb && cb(); return; }
    if(loading){ setTimeout(function(){ loadMovies(cb); }, 200); return; }
    loading = true;

    fetch(KM_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getMovies", isLoggedIn: true, category: "all", type: "all" })
    })
    .then(function(r){ return r.json(); })
    .then(function(res){
      allMovies = (res && res.ok && res.movies) ? res.movies : [];
      loaded = true;
      loading = false;
      cb && cb();
    })
    .catch(function(err){
      console.error("KM Search: failed to load movies", err);
      loading = false;
      cb && cb();
    });
  }

  /* ════════ EXACT / SUBSTRING SEARCH ════════ */
  function scoreMatch(text, query){
    if(!text) return -1;
    text = String(text).toLowerCase();
    query = query.toLowerCase();
    var idx = text.indexOf(query);
    if(idx === -1) return -1;
    if(idx === 0) return 100;
    if(text.charAt(idx - 1) === " ") return 70;
    return 40;
  }

  function searchMovies(query){
    query = (query || "").trim();
    if(!query) return [];

    var results = [];
    for(var i = 0; i < allMovies.length; i++){
      var m = allMovies[i];
      var nameScore = scoreMatch(m.name, query);
      var score = nameScore;
      if(score === -1){
        var catScore = scoreMatch(m.category, query);
        var countryScore = scoreMatch(m.country, query);
        score = Math.max(catScore, countryScore) > -1 ? 10 : -1;
      }
      if(score > -1) results.push({ movie: m, score: score });
    }

    results.sort(function(a, b){ return b.score - a.score; });
    return results.slice(0, KM_MAX_RESULTS).map(function(r){ return r.movie; });
  }

  /* ════════ FUZZY MATCH ENGINE (silent auto-correct) ════════ */
  function levenshtein(a, b){
    a = a.toLowerCase(); b = b.toLowerCase();
    var m = a.length, n = b.length;
    if(m === 0) return n;
    if(n === 0) return m;
    var prev = new Array(n + 1);
    var curr = new Array(n + 1);
    for(var j = 0; j <= n; j++) prev[j] = j;
    for(var i = 1; i <= m; i++){
      curr[0] = i;
      for(var k = 1; k <= n; k++){
        var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
        curr[k] = Math.min(prev[k] + 1, curr[k - 1] + 1, prev[k - 1] + cost);
      }
      var tmp = prev; prev = curr; curr = tmp;
    }
    return prev[n];
  }

  function similarity(a, b){
    var maxLen = Math.max(a.length, b.length);
    if(maxLen === 0) return 1;
    return 1 - (levenshtein(a, b) / maxLen);
  }

  function findClosestMovie(query){
    query = (query || "").trim().toLowerCase();
    if(!query || !allMovies.length) return null;

    var best = null, bestScore = 0;

    for(var i = 0; i < allMovies.length; i++){
      var name = allMovies[i].name || "";
      var nameLower = name.toLowerCase();

      var fullScore = similarity(query, nameLower);

      var words = nameLower.split(/\s+/);
      var wordScore = 0;
      for(var w = 0; w < words.length; w++){
        var s = similarity(query, words[w]);
        if(s > wordScore) wordScore = s;
      }

      var score = Math.max(fullScore, wordScore);
      if(score > bestScore){
        bestScore = score;
        best = allMovies[i];
      }
    }

    if(bestScore >= KM_FUZZY_THRESHOLD) return { movie: best, score: bestScore };
    return null;
  }

  /* ════════ UI HELPERS ════════ */
  function escapeHtml(s){
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function renderResults(container, results, query){
    if(!results.length){
      container.innerHTML = query
        ? '<div class="km-search-empty">No results for "' + escapeHtml(query) + '"</div>'
        : "";
      container.style.display = query ? "block" : "none";
      return;
    }

    container.innerHTML = results.map(function(m){
      return '' +
        '<div class="km-search-item" data-id="' + escapeHtml(m.id) + '">' +
          '<img class="km-search-thumb" src="' + escapeHtml(m.cover) + '" onerror="this.style.display=\'none\'">' +
          '<div class="km-search-info">' +
            '<div class="km-search-name">' + escapeHtml(m.name) + '</div>' +
            '<div class="km-search-meta">' + escapeHtml(m.category || "") + (m.year ? " • " + escapeHtml(m.year) : "") + '</div>' +
          '</div>' +
        '</div>';
    }).join("");

    container.style.display = "block";

    var items = container.querySelectorAll(".km-search-item");
    for(var i = 0; i < items.length; i++){
      items[i].addEventListener("click", function(){
        var id = this.getAttribute("data-id");
        window.location.href = KM_RESULT_LINK + encodeURIComponent(id);
      });
    }
  }

  function injectStyles(){
    if(document.getElementById("km-search-style")) return;
    var css =
      ".km-search-wrap{position:relative}" +
      ".km-search-results{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e5e5e5;" +
        "border-radius:8px;margin-top:6px;max-height:360px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.12);" +
        "z-index:1000;display:none;}" +
      ".km-search-item{display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;transition:.15s}" +
      ".km-search-item:hover{background:#f6f6f6}" +
      ".km-search-thumb{width:34px;height:48px;object-fit:cover;border-radius:4px;background:#eee;flex-shrink:0}" +
      ".km-search-name{font-size:.85rem;font-weight:600;color:#111}" +
      ".km-search-meta{font-size:.72rem;color:#777;margin-top:2px}" +
      ".km-search-empty{padding:14px;font-size:.8rem;color:#888;text-align:center}";
    var style = document.createElement("style");
    style.id = "km-search-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ════════ WIRE UP INPUT + RESULTS CONTAINER ════════
     Two timers per keystroke:
     - quickTimer (fast): normal live filtering while the user types
     - idleTimer (slower): fires only once the user pauses; if there
       are STILL no matches at that point, silently rewrites the input
       to the closest real title from the Sheet and re-searches. */
  function wire(inputEl, resultsEl){
    injectStyles();
    if(!resultsEl.classList.contains("km-search-results")) resultsEl.classList.add("km-search-results");
    if(inputEl.parentElement && !inputEl.parentElement.classList.contains("km-search-wrap")){
      inputEl.parentElement.classList.add("km-search-wrap");
    }

    var quickTimer = null;
    var idleTimer = null;
    var skipNextIdle = false; // guards against re-correcting text we just auto-corrected

    inputEl.addEventListener("input", function(){
      clearTimeout(quickTimer);
      clearTimeout(idleTimer);

      if(skipNextIdle){ skipNextIdle = false; return; }

      quickTimer = setTimeout(function(){
        loadMovies(function(){
          var results = searchMovies(inputEl.value);
          renderResults(resultsEl, results, inputEl.value.trim());
        });
      }, KM_QUICK_DELAY);

      idleTimer = setTimeout(function(){
        loadMovies(function(){
          var currentQuery = inputEl.value.trim();
          if(currentQuery.length < KM_MIN_QUERY_LEN) return;

          var results = searchMovies(currentQuery);
          if(results.length) return; // real matches already found, nothing to fix

          var suggestion = findClosestMovie(currentQuery);
          if(suggestion){
            skipNextIdle = true; // prevent the programmatic value change below from re-triggering this whole flow
            inputEl.value = suggestion.movie.name; // silent auto-correction — no visible "did you mean"
            var correctedResults = searchMovies(suggestion.movie.name);
            renderResults(resultsEl, correctedResults, suggestion.movie.name);
          }
        });
      }, KM_IDLE_DELAY);
    });

    document.addEventListener("click", function(e){
      if(e.target !== inputEl && !resultsEl.contains(e.target)){
        resultsEl.style.display = "none";
      }
    });

    inputEl.addEventListener("focus", function(){
      if(inputEl.value.trim()) resultsEl.style.display = "block";
    });
  }

  /* ════════ AUTO-INIT ON PAGE LOAD ════════
     Looks for elements with id="searchInput" and id="searchResults".
     If your page uses different IDs, call KMSearch.init(inputId, resultsId) manually. */
  function autoInit(){
    var input = document.getElementById("searchInput");
    var results = document.getElementById("searchResults");
    if(input && results){
      wire(input, results);
      loadMovies();
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  /* ════════ PUBLIC API ════════ */
  window.KMSearch = {
    init: function(inputId, resultsId){
      var input = document.getElementById(inputId);
      var results = document.getElementById(resultsId);
      if(!input || !results){
        console.error("KMSearch.init: could not find #" + inputId + " or #" + resultsId);
        return;
      }
      wire(input, results);
      loadMovies();
    },
    search: searchMovies,
    reload: function(){ loaded = false; loadMovies(); }
  };

})();
