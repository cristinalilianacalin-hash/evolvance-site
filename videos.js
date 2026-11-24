// Videos: render from videos.json (same schema as criscalin.com/videos.json),
// with a hard-coded fallback. Click-to-load facade: no request to YouTube until play is pressed.
// Markup: <ul class="shorts" data-videos data-src="videos.json" data-max="8" data-kind="shorts">
// data-kind="long" reads the optional "long" array instead (same {id, title} items).
(function () {
  var FALLBACK = [
    {id: "1nL8qBBYz5o", title: "The most impressive candidate is often the riskiest hire"},
    {id: "nvuOUR2dVsc", title: "It's 2 a.m. and you're replaying that meeting"},
    {id: "ekINMQW9bBo", title: "Bad day or bad pattern? The 3P test"},
    {id: "28CbKL2Wze0", title: "For years I repeated patterns at work I never questioned"},
    {id: "x6a2Gt5MdP4", title: "Someone is rewriting your reputation in meetings you're not in"},
    {id: "WK46BZ5yXKE", title: "In global teams, \"yes\" can mean \"no\""},
    {id: "HFOwQGXHL4E", title: "Your brain has a bouncer (and he's ruining your meetings)"},
    {id: "PtCjaA4wqUM", title: "Your micromanager isn't controlling. They're scared."}
  ];
  var lists = document.querySelectorAll("[data-videos]");
  if (!lists.length) return;

  function valid(v) { return v && typeof v.id === "string" && /^[\w-]{6,20}$/.test(v.id); }

  function render(list, videos, fallback) {
    var max = parseInt(list.getAttribute("data-max"), 10) || 8;
    videos = (videos || []).filter(valid).slice(0, max);
    if (!videos.length) {
      if (!fallback) return;           // keep the static markup as it is
      videos = fallback.slice(0, max);
    }
    list.textContent = "";
    list.hidden = false;
    var note = list.getAttribute("data-empty-note");
    if (note && document.getElementById(note)) document.getElementById(note).hidden = true;
    videos.forEach(function (v) {
      var title = (v.title || "Video by Cris Calin").trim();
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "short-play";
      btn.setAttribute("aria-label", "Play video: " + title);
      var thumb = document.createElement("span");
      thumb.className = "short-thumb";
      var img = document.createElement("img");
      img.src = "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg";
      img.alt = "";
      img.loading = "lazy";
      img.width = 480; img.height = 360;
      thumb.appendChild(img);
      var t = document.createElement("span");
      t.className = "short-title";
      t.textContent = title;
      btn.appendChild(thumb);
      btn.appendChild(t);
      btn.addEventListener("click", function () {
        var f = document.createElement("iframe");
        f.className = "short-frame";
        f.src = "https://www.youtube-nocookie.com/embed/" + v.id + "?autoplay=1&playsinline=1&rel=0";
        f.title = title;
        f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        f.allowFullscreen = true;
        var cap = document.createElement("span");
        cap.className = "short-title";
        cap.textContent = title;
        li.textContent = "";
        li.appendChild(f);
        li.appendChild(cap);
        f.focus();
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  Array.prototype.forEach.call(lists, function (list) {
    var src = list.getAttribute("data-src") || "videos.json";
    var kind = list.getAttribute("data-kind") || "shorts";
    var fb = kind === "shorts" ? FALLBACK : null;
    fetch(src, {cache: "no-cache"})
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { render(list, d && d[kind], fb); })
      .catch(function () { render(list, null, fb); });
  });
})();
