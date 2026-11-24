/* Evolvance hero: a quiet constellation of people. Decorative only (aria-hidden).
   Vanilla JS, no libraries. Drifts slowly; near the pointer, people lean toward you and
   their links brighten; hover or tap a dot to read a small human word.
   Paused off-screen and in hidden tabs. Reduced motion: static, labels on hover only. */
(function () {
  var cv = document.querySelector(".constellation");
  if (!cv || !cv.getContext) return;
  var box = cv.parentNode, ctx = cv.getContext("2d");
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var WORDS = ["listens", "learns", "doubts", "tries again", "asks for help", "says thank you",
    "disagrees kindly", "keeps a promise", "notices", "explains why", "changes their mind",
    "gives credit", "says I don't know", "waits a moment", "learns", "listens"];
  var COLS = ["#0e3b45", "#165563", "#2f7a52", "#7d8f8b", "#9fd3b4", "#3e5459", "#165563", "#7d8f8b", "#c98a1e"];
  var W = 0, H = 0, dpr = 1, nodes = [], edges = [], R = 150;
  var px = -1e4, py = -1e4, hover = -1, tap = -1, tapUntil = 0, t0 = 0, raf = 0, onScreen = true;

  function rnd(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function layout() {
    var r = box.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    var n = W < 560 ? 14 : 24, rand = rnd(7), pad = 28, min = Math.sqrt(W * H / n) * 0.46, tries = 0;
    nodes = [{ hx: W * (W < 560 ? 0.3 : 0.34), hy: H * 0.6, r: 7, c: "#2f7a52", you: true }];
    while (nodes.length < n && tries++ < 4000) {
      var x = pad + rand() * (W - 2 * pad), y = pad + rand() * (H - 2 * pad), ok = true;
      for (var i = 0; i < nodes.length; i++) if (Math.hypot(x - nodes[i].hx, y - nodes[i].hy) < min) { ok = false; break; }
      if (!ok) continue;
      nodes.push({ hx: x, hy: y, r: 3 + rand() * 4.6, c: COLS[Math.floor(rand() * COLS.length)],
        w: WORDS[(nodes.length - 1) % WORDS.length] });
    }
    nodes.forEach(function (d, i) {
      d.x = d.hx; d.y = d.hy; d.vx = d.vy = 0; d.s = 1;
      d.p1 = rand() * 6.28; d.p2 = rand() * 6.28; d.f1 = 0.00018 + rand() * 0.00016; d.f2 = 0.00015 + rand() * 0.00016;
    });
    var seen = {}; edges = [];
    nodes.forEach(function (a, i) {
      nodes.map(function (b, j) { return [j, Math.hypot(a.hx - b.hx, a.hy - b.hy)]; })
        .filter(function (e) { return e[0] !== i; }).sort(function (x, y) { return x[1] - y[1]; }).slice(0, 2)
        .forEach(function (e) { var k = Math.min(i, e[0]) + "-" + Math.max(i, e[0]); if (!seen[k]) { seen[k] = 1; edges.push([i, e[0]]); } });
    });
    R = Math.max(110, Math.min(170, W * 0.3));
  }

  function step(now) {
    var amp = still ? 0 : 6;
    nodes.forEach(function (d, i) {
      var tx = d.hx + Math.sin(now * d.f1 + d.p1) * amp, ty = d.hy + Math.cos(now * d.f2 + d.p2) * amp;
      var dx = px - d.hx, dy = py - d.hy, dist = Math.hypot(dx, dy);
      if (!still && dist < R && dist > 1) { var f = Math.pow(1 - dist / R, 2) * 26; tx += dx / dist * f; ty += dy / dist * f; }
      if (still) { d.x = tx; d.y = ty; } else {
        d.vx = (d.vx + (tx - d.x) * 0.045) * 0.84; d.vy = (d.vy + (ty - d.y) * 0.045) * 0.84; d.x += d.vx; d.y += d.vy;
      }
      var want = (i === hover || i === tap) && !d.you ? 1.55 : 1;
      d.s += (want - d.s) * (still ? 1 : 0.15);
    });
  }

  function pill(text, x, y, col) {
    ctx.font = "500 12.5px 'IBM Plex Mono', monospace";
    var w = ctx.measureText(text).width + 16, h = 24;
    x = Math.max(4, Math.min(W - w - 4, x - w / 2)); y = Math.max(4, y - h);
    ctx.fillStyle = "rgba(255,255,255,.96)"; ctx.strokeStyle = "#c9d4d0"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 12) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.textBaseline = "middle"; ctx.fillText(text, x + 8, y + h / 2 + 0.5);
  }

  function draw(now) {
    var fade = still ? 1 : Math.min(1, (now - t0) / 1400);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    edges.forEach(function (e) {
      var a = nodes[e[0]], b = nodes[e[1]], m = Math.hypot((a.x + b.x) / 2 - px, (a.y + b.y) / 2 - py);
      var k = Math.max(0, 1 - m / R);
      ctx.strokeStyle = k > 0 ? "rgba(47,122,82," + (0.2 + k * 0.55) * fade + ")" : "rgba(14,59,69," + 0.16 * fade + ")";
      ctx.lineWidth = 1 + k * 0.6;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    nodes.forEach(function (d) {
      ctx.globalAlpha = fade;
      if (d.you) {
        var ph = still ? 0.35 : ((now - t0) % 3200) / 3200;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r + ph * 16, 0, 6.29);
        ctx.fillStyle = "rgba(47,122,82," + (0.32 * (1 - ph)) + ")"; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * d.s, 0, 6.29); ctx.fillStyle = d.c; ctx.fill();
      ctx.globalAlpha = 1;
    });
    var y0 = nodes[0];
    if (y0) { ctx.font = "500 12.5px 'IBM Plex Mono', monospace"; ctx.fillStyle = "rgba(47,122,82," + fade + ")";
      ctx.textBaseline = "middle"; ctx.fillText("you are here", y0.x + 14, y0.y + 1); }
    var show = tap >= 0 && now < tapUntil ? tap : hover;
    if (show > 0 && nodes[show]) { var d = nodes[show]; pill(d.w, d.x, d.y - d.r * d.s - 8, "#14262b"); }
  }

  function frame(now) { raf = 0; step(now); draw(now); if (!still && onScreen && !document.hidden) raf = requestAnimationFrame(frame); }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function pick(x, y, slack) {
    var best = -1, bd = 1e9;
    nodes.forEach(function (d, i) { var q = Math.hypot(d.x - x, d.y - y); if (q < d.r * d.s + slack && q < bd) { bd = q; best = i; } });
    return best;
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var p = pos(e); px = p[0]; py = p[1]; hover = pick(px, py, 9);
    cv.style.cursor = hover > 0 ? "default" : ""; kick();
  });
  cv.addEventListener("pointerleave", function () { px = py = -1e4; hover = -1; kick(); });
  cv.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    var p = pos(e); tap = pick(p[0], p[1], 22); tapUntil = performance.now() + 2600;
    kick(); setTimeout(kick, 2700);
  });

  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) kick(); }).observe(box);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
  var rt; function resize() { clearTimeout(rt); rt = setTimeout(function () { layout(); kick(); }, 120); }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(box); else addEventListener("resize", resize);
  layout(); t0 = performance.now(); kick();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(kick);
})();
