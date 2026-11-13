/* AdSense Helper: core behaviour. No dependencies, no network calls except optional media and same-site page fetches for search. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  function store(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage blocked */ }
    return null;
  }
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastEl.__t); toastEl.__t = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }
  window.ADH = { $: $, $$: $$, store: store, toast: toast };

  /* ---------- mobile navigation ---------- */
  var navBtn = $(".nav-toggle"), nav = $("#site-nav");
  if (navBtn && nav) {
    navBtn.addEventListener("click", function () { var o = nav.classList.toggle("open"); navBtn.setAttribute("aria-expanded", o ? "true" : "false"); });
  }

  /* ---------- syntax highlighting ----------
     Rule-based tokenizer. Input is raw text, output is escaped HTML, so code can never execute. */
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function words(s) { var o = {}; s.split(/\s+/).forEach(function (w) { if (w) o[w] = 1; }); return o; }
  var KW = {
    js: words("const let var function return if else for while do switch case break continue new class extends import from export default async await try catch finally throw this typeof instanceof of in null undefined true false void delete require super static"),
    py: words("def class return if elif else for while import from as with try except finally raise None True False and or not in is lambda pass yield global del assert self"),
    php: words("function return if else elseif foreach for while echo class new use namespace public private protected static null true false array isset define include require const as extends endif endforeach"),
    sh: words("if then else fi for do done while in echo export cd git pip npm npx sudo cat cp mv mkdir pkg python python3 source curl node ls rm dig unzip gunicorn"),
    sql: words("SELECT INSERT INTO VALUES UPDATE SET DELETE FROM WHERE AND OR NOT NULL CREATE TABLE IF EXISTS PRIMARY KEY AUTOINCREMENT INTEGER TEXT REAL ORDER BY GROUP LIMIT JOIN LEFT RIGHT INNER ON AS UNIQUE INDEX DROP ALTER ADD COLUMN DEFAULT"),
    ejs: words("if else for")
  };
  var R = {
    cblock: /\/\*[\s\S]*?\*\//.source, cline: /\/\/[^\n]*/.source, hash: /#[^\n]*/.source, dash: /--[^\n]*/.source,
    dq: /"(?:\\.|[^"\\\n])*"/.source, sq: /'(?:\\.|[^'\\\n])*'/.source, bt: /`(?:\\[\s\S]|[^`\\])*`/.source,
    tq: /"""[\s\S]*?"""/.source, num: /\b\d[\d_]*(?:\.\d+)?\b/.source, ident: /[A-Za-z_$][\w$]*/.source
  };
  function run(code, rules, flags) {
    var re;
    try { re = new RegExp(rules.map(function (r) { return "(" + r[0] + ")"; }).join("|"), flags || "g"); }
    catch (e) { return esc(code); } /* very old engine: show plain text, never break the page */
    var out = "", last = 0, m, i, cls;
    while ((m = re.exec(code))) {
      if (m[0] === "") { re.lastIndex++; continue; }
      out += esc(code.slice(last, m.index)); last = re.lastIndex;
      for (i = 1; m[i] === undefined; i++) {}
      cls = rules[i - 1][1];
      if (typeof cls === "function") cls = cls(m[0], code, last);
      out += cls ? '<span class="' + cls + '">' + esc(m[0]) + "</span>" : esc(m[0]);
    }
    return out + esc(code.slice(last));
  }
  function identRule(kw, jsx) {
    return [R.ident, function (t, code, end) {
      if (jsx && /^=["{]/.test(code.substr(end, 2))) return "tok-a";
      if (kw[t] || kw[t.toUpperCase()] === 1 && kw === KW.sql) return "tok-k";
      if (code.charAt(end) === "(") return "tok-f";
      return "";
    }];
  }
  function lang_js(code, jsx) {
    var rules = [[R.cblock, "tok-c"], [R.cline, "tok-c"], [R.dq, "tok-s"], [R.sq, "tok-s"], [R.bt, "tok-s"]];
    if (jsx) rules.push([/<\/?[A-Za-z][\w.]*/.source, "tok-t"]);
    rules.push([R.num, "tok-n"], identRule(KW.js, jsx));
    return run(code, rules);
  }
  function lang_py(code) {
    return run(code, [[R.hash, "tok-c"], [R.tq, "tok-s"], [R.dq, "tok-s"], [R.sq, "tok-s"], [/@[\w.]+/.source, "tok-f"], [R.num, "tok-n"], identRule(KW.py)]);
  }
  function lang_php(code) {
    return run(code, [[R.cblock, "tok-c"], [R.cline, "tok-c"], [R.hash, "tok-c"], [R.dq, "tok-s"], [R.sq, "tok-s"],
      [/<\?php|<\?=|\?>/.source, "tok-k"], [/\$[A-Za-z_]\w*/.source, "tok-v"], [R.num, "tok-n"], identRule(KW.php)]);
  }
  function lang_sh(code) {
    return run(code, [[R.hash, "tok-c"], [R.dq, "tok-s"], [R.sq, "tok-s"], [/\$\{?[A-Za-z_]\w*\}?/.source, "tok-v"],
      [/(?:^|\s)--?[A-Za-z][\w-]*/.source, function (t) { return /^\s/.test(t) ? "tok-a" : "tok-a"; }],
      [R.num, "tok-n"], [/[A-Za-z_][\w.-]*/.source, function (t) { return KW.sh[t] ? "tok-k" : ""; }]], "gm");
  }
  function lang_env(code) {
    return run(code, [[R.hash, "tok-c"], [/^[A-Za-z_][A-Za-z0-9_]*(?==)/.source, "tok-a"], [R.dq, "tok-s"], [R.sq, "tok-s"],
      [/=[^\n#]*/.source, function (t) { return "tok-s"; }]], "gm");
  }
  function lang_json(code) {
    return run(code, [[R.dq, function (t, c, end) { return /^\s*:/.test(c.substr(end, 12)) ? "tok-a" : "tok-s"; }],
      [/-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/.source, "tok-n"], [/\b(?:true|false|null)\b/.source, "tok-k"]]);
  }
  function lang_sql(code) {
    return run(code, [[R.dash, "tok-c"], [R.cblock, "tok-c"], [R.sq, "tok-s"], [R.dq, "tok-s"], [R.num, "tok-n"], identRule(KW.sql)]);
  }
  function lang_css(code) {
    var depth = 0;
    return run(code, [[R.cblock, "tok-c"], [R.dq, "tok-s"], [R.sq, "tok-s"], [/@[\w-]+/.source, "tok-k"],
      [/[{}]/.source, function (t) { depth += t === "{" ? 1 : -1; if (depth < 0) depth = 0; return ""; }],
      [/#[\w-]+/.source, function (t) { return depth > 0 && /^#[0-9a-fA-F]{3,8}$/.test(t) ? "tok-n" : "tok-t"; }],
      [/\.[A-Za-z_-][\w-]*/.source, function () { return depth > 0 ? "" : "tok-t"; }],
      [/[A-Za-z_-][\w-]*/.source, function (t, c, end) {
        if (c.charAt(end) === "(") return "tok-f";
        return depth > 0 && /^\s*:/.test(c.substr(end, 4)) ? "tok-a" : "";
      }],
      [/\d*\.?\d+(?:px|rem|em|vh|vw|ms|s|deg|fr|%)?/.source, "tok-n"]]);
  }
  function attrs(s) {
    return run(s, [[/"[^"]*"|'[^']*'/.source, "tok-s"], [/[A-Za-z_:@.-][\w:@.-]*/.source, "tok-a"]]);
  }
  function lang_markup(code) {
    var re = /(<!--[\s\S]*?-->)|(<\/?)([A-Za-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?>)|(<\?[\s\S]*?\?>)|(<%[\s\S]*?%>)|(\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\})/g;
    var out = "", last = 0, m, tag, end;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index)); last = re.lastIndex;
      if (m[1]) out += '<span class="tok-c">' + esc(m[1]) + "</span>";
      else if (m[3]) {
        tag = m[3].toLowerCase();
        out += esc(m[2]) + '<span class="tok-t">' + esc(m[3]) + "</span>" + attrs(m[4]) + esc(m[5]);
        if ((tag === "script" || tag === "style") && m[2] === "<" && m[5] === ">") {
          end = code.toLowerCase().indexOf("</" + tag, re.lastIndex);
          if (end > re.lastIndex) { out += tag === "script" ? lang_js(code.slice(re.lastIndex, end)) : lang_css(code.slice(re.lastIndex, end)); re.lastIndex = end; last = end; }
        }
      } else out += '<span class="tok-v">' + esc(m[6] || m[7] || m[8]) + "</span>";
    }
    return out + esc(code.slice(last));
  }
  function highlight(code, lang) {
    switch (lang) {
      case "html": case "ejs": case "xml": return lang_markup(code);
      case "javascript": case "js": case "ts": return lang_js(code, false);
      case "jsx": case "tsx": return lang_js(code, true);
      case "python": case "py": return lang_py(code);
      case "php": return lang_php(code);
      case "bash": case "shell": case "sh": return lang_sh(code);
      case "env": return lang_env(code);
      case "json": return lang_json(code);
      case "sql": return lang_sql(code);
      case "css": return lang_css(code);
      default: return esc(code);
    }
  }

  /* ---------- personalisation: your publisher ID replaces the placeholder in every code box ---------- */
  function getProfile() { return store("adh-profile") || {}; }
  function personalise(text) {
    var p = getProfile();
    if (!p.client) return text;
    var digits = p.client.replace(/^ca-pub-/, "");
    text = text.replace(/(ca-)?pub-X{16}/g, function (m) { return (m.indexOf("ca-") === 0 ? "ca-pub-" : "pub-") + digits; });
    if (p.slot) text = text.replace(/\b1234567890\b/g, p.slot);
    return text;
  }
  function renderBox(box) {
    var el = $("code[class^='language-']", box);
    if (!el) return;
    if (el.__tpl === undefined) el.__tpl = el.textContent;
    var text = personalise(el.__tpl);
    el.__raw = text;
    el.innerHTML = el.__tpl.length < 40000 ? highlight(text, el.className.replace("language-", "")) : esc(text);
    var head = $(".codebox-head", box), chip = $(".you-chip", box);
    if (text !== el.__tpl) {
      if (!chip && head) { chip = document.createElement("span"); chip.className = "you-chip"; chip.textContent = "\u2713 Your ID applied"; head.insertBefore(chip, $(".copy-btn", head)); }
    } else if (chip) chip.remove();
    if (!box.__hl) {
      box.__hl = true;
      var hl = box.getAttribute("data-hl"), body = $(".codebody", box);
      if (hl && body) hl.split(",").forEach(function (part) {
        var p = part.split("-"), a = parseInt(p[0], 10), b = parseInt(p[1] || p[0], 10);
        if (!(a > 0) || !(b >= a)) return;
        var bar = document.createElement("div"); bar.className = "hl-bar"; bar.setAttribute("aria-hidden", "true");
        bar.style.top = "calc(16px + " + ((a - 1) * 1.65) + "em)"; bar.style.height = ((b - a + 1) * 1.65) + "em";
        body.insertBefore(bar, body.firstChild);
      });
    }
  }
  function renderAllBoxes() { $$(".codebox").forEach(renderBox); }
  renderAllBoxes();
  window.addEventListener("adh:profile", renderAllBoxes);
  window.ADH.getProfile = getProfile;
  window.ADH.renderBox = renderBox;
  window.ADH.setCode = function (box, text) { var c = $("code", box); if (c) { c.__tpl = text; renderBox(box); } };
  window.ADH.setProfile = function (p) { store("adh-profile", p); window.dispatchEvent(new Event("adh:profile")); };

  /* ---------- copy ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.className = "clip"; document.body.appendChild(ta);
      try { ta.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta); ok ? resolve() : reject(new Error("copy failed"));
    });
  }
  window.ADH.copyText = copyText;
  function setLabel(btn, icon, label, cls) {
    $(".copy-icon", btn).textContent = icon; $(".copy-label", btn).textContent = label;
    btn.classList.remove("copied", "failed"); if (cls) btn.classList.add(cls);
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".copy-btn");
    if (!btn) return;
    e.preventDefault();
    var box = btn.closest(".codebox"), code = box && $("code", box);
    if (!code) return;
    var text = code.__raw !== undefined ? code.__raw : code.textContent; /* exact code only: never line numbers or labels */
    var status = $(".copy-status", box);
    clearTimeout(btn.__t);
    copyText(text).then(function () {
      setLabel(btn, "\u2713", "Copied!", "copied"); if (status) status.textContent = "Code copied to clipboard";
      document.dispatchEvent(new CustomEvent("adh:copied", { detail: box }));
    }, function () {
      setLabel(btn, "!", "Press and hold to copy", "failed");
      var sel = window.getSelection(), r = document.createRange(); r.selectNodeContents(code); sel.removeAllRanges(); sel.addRange(r);
      if (status) status.textContent = "Copy was blocked. The code is selected; copy it manually.";
    });
    btn.__t = setTimeout(function () { setLabel(btn, "\u29C9", "Copy code"); if (status) status.textContent = ""; }, 1800);
  });

  /* ---------- reading mode ---------- */
  var defaults = { theme: "", font: "sans", width: "normal", size: 17, leading: 1.75 };
  var reader = Object.assign({}, defaults, store("adh-reader") || {});
  function applyReader() {
    var theme = reader.theme || (root.getAttribute("data-theme") || "light");
    root.setAttribute("data-theme", theme); root.setAttribute("data-font", reader.font); root.setAttribute("data-width", reader.width);
    root.style.setProperty("--rm-size", reader.size + "px"); root.style.setProperty("--rm-leading", String(reader.leading));
    store("adh-reader", reader);
    var meta = $("meta[name='theme-color']"); if (meta) meta.setAttribute("content", theme === "dark" ? "#0e1424" : theme === "sepia" ? "#f6efe0" : "#3b6cf6");
  }
  var overlay, rpanel;
  function buildReader() {
    overlay = document.createElement("div"); overlay.className = "overlay";
    rpanel = document.createElement("div"); rpanel.className = "panel reader-panel"; rpanel.setAttribute("role", "dialog"); rpanel.setAttribute("aria-modal", "true"); rpanel.setAttribute("aria-label", "Reading mode");
    rpanel.innerHTML =
      '<h2>Reading mode</h2><p class="tiny">Make long guides comfortable. Saved on this device.</p>' +
      '<div class="group"><div class="gl">Theme</div><div class="seg" data-k="theme"><button type="button" class="sw-light" data-v="light">Light</button><button type="button" class="sw-sepia" data-v="sepia">Sepia</button><button type="button" class="sw-dark" data-v="dark">Dark</button></div></div>' +
      '<div class="group"><div class="gl">Typeface</div><div class="seg" data-k="font"><button type="button" data-v="sans">Sans</button><button type="button" data-v="serif">Serif</button><button type="button" data-v="mono">Mono</button></div></div>' +
      '<div class="group"><div class="gl">Text size <span id="rs-size"></span></div><input type="range" min="14" max="26" step="1" id="rs-range" aria-label="Text size"></div>' +
      '<div class="group"><div class="gl">Line spacing <span id="rs-lead"></span></div><input type="range" min="1.4" max="2.2" step="0.05" id="rs-lead-range" aria-label="Line spacing"></div>' +
      '<div class="group"><div class="gl">Line length</div><div class="seg" data-k="width"><button type="button" data-v="narrow">Narrow</button><button type="button" data-v="normal">Normal</button><button type="button" data-v="wide">Wide</button></div></div>' +
      '<div class="group"><div class="gl">Distraction-free</div><div class="seg" data-k="focus"><button type="button" data-v="off">Off</button><button type="button" data-v="on">Focus mode</button></div></div>' +
      '<div class="reader-sample">The quick brown fox jumps over the lazy dog. Good reading settings make setup steps easier to follow.</div>' +
      '<div class="tool-actions"><button class="btn btn-sm" type="button" id="rs-done">Done</button><button class="btn btn-sm btn-ghost" type="button" id="rs-reset">Reset</button></div>';
    document.body.appendChild(overlay); document.body.appendChild(rpanel);
    var sync = function () {
      $$(".seg", rpanel).forEach(function (seg) {
        var k = seg.getAttribute("data-k"), cur = k === "focus" ? (root.getAttribute("data-focus") || "off") : (reader[k] || root.getAttribute("data-theme"));
        $$("button", seg).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-v") === cur ? "true" : "false"); });
      });
      $("#rs-range", rpanel).value = reader.size; $("#rs-size", rpanel).textContent = reader.size + "px";
      $("#rs-lead-range", rpanel).value = reader.leading; $("#rs-lead", rpanel).textContent = String(reader.leading);
    };
    rpanel.addEventListener("click", function (e) {
      var b = e.target.closest(".seg button"); if (!b) return;
      var k = b.parentNode.getAttribute("data-k"), v = b.getAttribute("data-v");
      if (k === "focus") { v === "on" ? root.setAttribute("data-focus", "on") : root.removeAttribute("data-focus"); } else { reader[k] = v; applyReader(); }
      sync();
    });
    $("#rs-range", rpanel).addEventListener("input", function (e) { reader.size = +e.target.value; applyReader(); sync(); });
    $("#rs-lead-range", rpanel).addEventListener("input", function (e) { reader.leading = +e.target.value; applyReader(); sync(); });
    $("#rs-reset", rpanel).addEventListener("click", function () { reader = Object.assign({}, defaults); root.removeAttribute("data-focus"); store("adh-reader", {}); try { localStorage.removeItem("adh-reader"); } catch (e) { /* ignore */ } root.removeAttribute("data-theme"); root.removeAttribute("data-font"); root.removeAttribute("data-width"); root.style.removeProperty("--rm-size"); root.style.removeProperty("--rm-leading"); root.setAttribute("data-theme", window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); reader.theme = ""; reader.size = 17; reader.leading = 1.75; sync(); });
    $("#rs-done", rpanel).addEventListener("click", closeReader);
    overlay.addEventListener("click", closeReader);
    rpanel.__sync = sync;
  }
  var lastFocus;
  function openReader() { if (!rpanel) buildReader(); rpanel.__sync(); lastFocus = document.activeElement; overlay.classList.add("open"); rpanel.classList.add("open"); var f = $("button", rpanel); if (f) f.focus(); }
  function closeReader() { if (!rpanel) return; overlay.classList.remove("open"); rpanel.classList.remove("open"); if (lastFocus) lastFocus.focus(); }
  var rb = $("#open-reader"); if (rb) rb.addEventListener("click", openReader);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeReader(); closeSearch(); } });
  applyReader();

  /* ---------- reading progress bar, table of contents, reading time ---------- */
  var bar = $("#read-bar");
  function onScroll() {
    var h = root.scrollHeight - root.clientHeight;
    if (bar) bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, Math.max(0, root.scrollTop / h)) : 0) + ")";
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var tocBox = $("#toc"), prose = $(".doc .prose");
  function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "section"; }
  if (prose) {
    var words = (prose.textContent || "").trim().split(/\s+/).length;
    $$("[data-readtime]").forEach(function (el) { el.textContent = Math.max(1, Math.round(words / 200)) + " min read"; });
    if (tocBox) {
      var heads = $$("h2, .step-card header h3", prose), used = {}, items = "";
      heads.forEach(function (h) {
        if (!h.id) { var s = slug(h.textContent), n = s, i = 2; while (used[n] || document.getElementById(n)) n = s + "-" + i++; h.id = n; }
        used[h.id] = 1; items += '<li><a href="#' + h.id + '">' + h.textContent.replace(/</g, "&lt;") + "</a></li>";
      });
      tocBox.innerHTML = '<details open><summary>On this page</summary><ol>' + items + '</ol></details>' +
        '<div class="toc-tools"><button class="btn btn-sm btn-ghost listen-btn" type="button" aria-pressed="false" id="listen">\u25B6 Listen</button></div>';
      var links = $$("a", tocBox);
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) { links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id); }); } });
        }, { rootMargin: "-90px 0px -65% 0px" });
        heads.forEach(function (h) { io.observe(h); });
      }
      if (window.matchMedia && matchMedia("(max-width:1039px)").matches) { var d = $("details", tocBox); if (d) d.removeAttribute("open"); }
      var lb = $("#listen", tocBox);
      if (!("speechSynthesis" in window)) lb.hidden = true;
      else lb.addEventListener("click", function () {
        var synth = window.speechSynthesis;
        if (synth.speaking) { synth.cancel(); lb.setAttribute("aria-pressed", "false"); lb.textContent = "\u25B6 Listen"; return; }
        var parts = [];
        $$("h2,h3,p,li", prose).forEach(function (n) { if (!n.closest(".codebox,.step-card header,.media-slot,.checklist")) parts.push(n.textContent.replace(/\s+/g, " ").trim()); });
        var queue = parts.join(". ").match(/[^.!?]+[.!?]*/g) || [];
        queue.forEach(function (s, i) {
          var u = new SpeechSynthesisUtterance(s.trim()); u.lang = "en";
          if (i === queue.length - 1) u.onend = function () { lb.setAttribute("aria-pressed", "false"); lb.textContent = "\u25B6 Listen"; };
          synth.speak(u);
        });
        lb.setAttribute("aria-pressed", "true"); lb.textContent = "\u25A0 Stop";
      });
      window.addEventListener("pagehide", function () { if ("speechSynthesis" in window) speechSynthesis.cancel(); });
    }
  }

  /* ---------- checklist progress (this device only) ---------- */
  var TASKS = window.ADH_TASKS || {}, allIds = [];
  Object.keys(TASKS).forEach(function (p) { allIds = allIds.concat(TASKS[p]); });
  var done = store("adh-tasks") || {};
  function pct(ids) { if (!ids.length) return 0; var n = 0; ids.forEach(function (i) { if (done[i]) n++; }); return n / ids.length; }
  function paintProgress() {
    var p = pct(allIds), fg = $("#ring-fg"), tx = $("#ring-text");
    if (fg) fg.style.strokeDashoffset = String(94.25 * (1 - p));
    if (tx) tx.textContent = Math.round(p * 100) + "%";
    var chip = $("#progress-chip"); if (chip) chip.setAttribute("aria-label", "Overall progress " + Math.round(p * 100) + " percent");
    $$("[data-meter]").forEach(function (m) {
      var ids = TASKS[m.getAttribute("data-meter")] || [], v = pct(ids), pr = $("progress", m), sp = $("span", m);
      if (pr) pr.value = v; if (sp) sp.textContent = Math.round(v * 100) + "% ready";
    });
    return p;
  }
  $$("input[data-task]").forEach(function (cb) {
    cb.checked = !!done[cb.getAttribute("data-task")];
    cb.addEventListener("change", function () {
      done[cb.getAttribute("data-task")] = cb.checked; store("adh-tasks", done);
      var before = store("adh-celebrated"), p = paintProgress();
      if (p === 1 && !before) { store("adh-celebrated", true); confetti(); toast("Everything checked. Nice work!"); }
      if (p < 1 && before) store("adh-celebrated", false);
      window.dispatchEvent(new Event("adh:tasks"));
    });
  });
  paintProgress();
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var c = document.createElement("canvas"); c.setAttribute("aria-hidden", "true");
    c.width = innerWidth; c.height = innerHeight; c.style.position = "fixed"; c.style.inset = "0"; c.style.zIndex = "400"; c.style.pointerEvents = "none";
    document.body.appendChild(c);
    var g = c.getContext("2d"), cols = ["#3b6cf6", "#ef4d4d", "#f6b81a", "#21a366", "#8a5cf6", "#f7822b"], ps = [], i;
    for (i = 0; i < 110; i++) ps.push({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .4, r: 4 + Math.random() * 6, v: 2 + Math.random() * 4, s: Math.random() * 2 - 1, c: cols[i % cols.length], a: Math.random() * 6 });
    var t0 = performance.now();
    (function frame(t) {
      g.clearRect(0, 0, c.width, c.height);
      ps.forEach(function (p) { p.y += p.v; p.x += p.s * 2; p.a += .1; g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  /* ---------- search (reads the other pages of this site; works on any static host) ---------- */
  var sIndex = null, sPanel, sOverlay, sResults, sInput, sSel = -1;
  function pageList() { return $$("#site-nav a").map(function (a) { return { href: a.getAttribute("href"), label: a.textContent }; }); }
  function indexDoc(doc, page, out) {
    var main = $("main", doc); if (!main) return;
    var cur = { title: page.label, anchor: "", text: "" };
    var flush = function () { if (cur.text.trim() || cur.title) out.push({ page: page.label, href: page.href + (cur.anchor ? "#" + cur.anchor : ""), title: cur.title, text: cur.text.replace(/\s+/g, " ").trim() }); };
    $$("h1,h2,h3,p,li,summary,.acc-body", main).forEach(function (n) {
      if (n.closest(".codebox,.media-slot,.toc,.tool textarea")) return;
      if (/^H[123]$/.test(n.tagName) || n.tagName === "SUMMARY") { flush(); cur = { title: n.textContent.trim(), anchor: n.id || (n.closest("details") || {}).id || "", text: "" }; }
      else cur.text += " " + n.textContent;
    });
    flush();
  }
  function buildIndex() {
    if (sIndex) return Promise.resolve(sIndex);
    var out = [], here = location.pathname.split("/").pop() || "index.html", pages = pageList();
    return Promise.all(pages.map(function (pg) {
      if (pg.href === here || (here === "" && pg.href === "index.html")) { indexDoc(document, pg, out); return null; }
      return fetch(pg.href).then(function (r) { return r.ok ? r.text() : ""; }).then(function (t) {
        if (t) indexDoc(new DOMParser().parseFromString(t, "text/html"), pg, out);
      }).catch(function () { /* offline or file:// */ });
    })).then(function () { sIndex = out; return out; });
  }
  function buildSearch() {
    sOverlay = document.createElement("div"); sOverlay.className = "overlay";
    sPanel = document.createElement("div"); sPanel.className = "panel search-panel"; sPanel.setAttribute("role", "dialog"); sPanel.setAttribute("aria-modal", "true"); sPanel.setAttribute("aria-label", "Search");
    sPanel.innerHTML = '<input type="search" placeholder="Search the guide: ads.txt, React, wrong ID..." aria-label="Search the guide" autocomplete="off"><ul class="search-results" role="listbox"></ul><div class="search-hint">\u2191\u2193 to move, Enter to open, Esc to close</div>';
    document.body.appendChild(sOverlay); document.body.appendChild(sPanel);
    sInput = $("input", sPanel); sResults = $(".search-results", sPanel);
    sOverlay.addEventListener("click", closeSearch);
    sInput.addEventListener("input", runSearch);
    sInput.addEventListener("keydown", function (e) {
      var links = $$("a", sResults);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sSel = (sSel + (e.key === "ArrowDown" ? 1 : -1) + links.length) % (links.length || 1); links.forEach(function (a, i) { a.classList.toggle("sel", i === sSel); }); if (links[sSel]) links[sSel].scrollIntoView({ block: "nearest" }); }
      else if (e.key === "Enter" && links.length) { e.preventDefault(); (links[Math.max(sSel, 0)]).click(); }
    });
  }
  function runSearch() {
    var q = sInput.value.trim().toLowerCase(), terms = q.split(/\s+/).filter(Boolean);
    sSel = -1;
    if (!terms.length) { sResults.innerHTML = '<li class="search-hint">Type to search all six pages.</li>'; return; }
    buildIndex().then(function (idx) {
      var hits = [];
      idx.forEach(function (e) {
        var t = e.title.toLowerCase(), x = e.text.toLowerCase(), ok = terms.every(function (w) { return t.indexOf(w) !== -1 || x.indexOf(w) !== -1; });
        if (!ok) return;
        var score = 0; terms.forEach(function (w) { if (t.indexOf(w) !== -1) score += 10; score += Math.min(5, x.split(w).length - 1); });
        hits.push({ e: e, s: score });
      });
      hits.sort(function (a, b) { return b.s - a.s; });
      sResults.innerHTML = hits.length ? "" : '<li class="search-hint">No matches. Try fewer words.</li>';
      hits.slice(0, 10).forEach(function (h) {
        var li = document.createElement("li"), a = document.createElement("a"), i = h.e.text.toLowerCase().indexOf(terms[0]);
        a.href = h.e.href; a.setAttribute("role", "option");
        var p = document.createElement("span"); p.className = "sr-p"; p.textContent = h.e.page;
        var t = document.createElement("span"); t.className = "sr-t"; t.textContent = h.e.title;
        var s = document.createElement("span"); s.className = "sr-s"; s.textContent = h.e.text.slice(Math.max(0, i - 40), Math.max(0, i - 40) + 140) + (h.e.text.length > 140 ? "\u2026" : "");
        a.appendChild(p); a.appendChild(t); a.appendChild(s); li.appendChild(a); sResults.appendChild(li);
      });
    });
  }
  function openSearch() { if (!sPanel) buildSearch(); lastFocus = document.activeElement; sOverlay.classList.add("open"); sPanel.classList.add("open"); sInput.value = ""; runSearch(); sInput.focus(); }
  function closeSearch() { if (!sPanel || !sPanel.classList.contains("open")) return; sOverlay.classList.remove("open"); sPanel.classList.remove("open"); if (lastFocus) lastFocus.focus(); }
  var sb = $("#open-search"); if (sb) sb.addEventListener("click", openSearch);
  document.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "") || (e.target && e.target.isContentEditable);
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); openSearch(); }
  });

  /* ---------- example media boxes ---------- */
  var cfg = window.ADH_MEDIA || {}, localMedia = store("adh-media") || {}, owner = !!store("adh-owner");
  if (/[?&]owner=1/.test(location.search)) { owner = true; store("adh-owner", true); }
  function mediaFor(id) { return localMedia[id] !== undefined ? localMedia[id] : cfg[id]; }
  function parseMedia(url) {
    var m;
    if (!/^(https:\/\/|blob:)/i.test(url)) return null;
    if ((m = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(url))) return { type: "youtube", id: m[1] };
    if ((m = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(url))) return { type: "vimeo", id: m[1] };
    if (/^blob:/i.test(url)) return { type: "blob" };
    if (/\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url)) return { type: "video" };
    return { type: "image" };
  }
  function paintMedia(slot) {
    var id = slot.getAttribute("data-media"), item = mediaFor(id) || {}, url = item.url || "", frame = $(".media-frame", slot), empty = $(".media-empty", frame);
    $$("img,video,iframe,.yt-facade,.media-err", frame).forEach(function (n) { n.remove(); });
    slot.classList.remove("has-media");
    var cap = $("figcaption", slot); if (cap) cap.textContent = item.caption || slot.getAttribute("data-title");
    var info = url ? parseMedia(url) : null;
    if (!info) { if (empty) empty.hidden = false; slot.hidden = !owner; }
    else {
      slot.hidden = false; slot.classList.add("has-media"); if (empty) empty.hidden = true;
      var alt = item.alt || slot.getAttribute("data-title");
      if (info.type === "youtube") {
        var f = document.createElement("button"); f.type = "button"; f.className = "yt-facade"; f.setAttribute("aria-label", "Play video: " + alt);
        f.style.backgroundImage = "url(https://i.ytimg.com/vi/" + info.id + "/hqdefault.jpg)"; f.innerHTML = "<span aria-hidden='true'>\u25B6</span>";
        f.addEventListener("click", function () { var i = document.createElement("iframe"); i.src = "https://www.youtube-nocookie.com/embed/" + info.id + "?autoplay=1&rel=0"; i.title = alt; i.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; i.allowFullscreen = true; i.referrerPolicy = "strict-origin-when-cross-origin"; f.replaceWith(i); });
        frame.appendChild(f);
      } else if (info.type === "vimeo") {
        var v = document.createElement("iframe"); v.src = "https://player.vimeo.com/video/" + info.id; v.title = alt; v.loading = "lazy"; v.allowFullscreen = true; frame.appendChild(v);
      } else if (info.type === "video" || (info.type === "blob" && /^video\//.test(item.mime || ""))) {
        var vd = document.createElement("video"); vd.src = url; vd.controls = true; vd.preload = "metadata"; vd.playsInline = true; vd.setAttribute("aria-label", alt); frame.appendChild(vd);
      } else {
        var im = document.createElement("img"); im.src = url; im.alt = alt; im.loading = "lazy"; im.decoding = "async";
        im.addEventListener("error", function () { im.remove(); var er = document.createElement("div"); er.className = "media-empty media-err"; er.innerHTML = "<span class='media-empty-title'>Could not load this URL</span><span class='media-empty-hint'>Check that it is a public image or video link.</span>"; frame.appendChild(er); });
        frame.appendChild(im);
      }
    }
    var body = slot.closest(".step-body"); if (body) body.classList.toggle("has-media", !slot.hidden);
  }
  function openMediaEditor(slot) {
    $$(".media-pop").forEach(function (p) { p.remove(); });
    var id = slot.getAttribute("data-media"), item = mediaFor(id) || {}, pop = document.createElement("div");
    pop.className = "media-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Set example media");
    pop.innerHTML = '<h4>Example for <code></code></h4><label for="mp-url">Image or video URL (https)</label><input id="mp-url" type="url" placeholder="https://..." value="">' +
      '<label for="mp-alt">Description (alt text)</label><input id="mp-alt" type="text" maxlength="160" value="">' +
      '<label for="mp-file">Or choose a file (this browser only)</label><input id="mp-file" type="file" accept="image/*,video/*">' +
      '<p class="err" role="alert"></p><div class="row"><button class="btn btn-sm" type="button" data-a="save">Save</button><button class="btn btn-sm btn-ghost" type="button" data-a="clear">Remove</button><button class="btn btn-sm btn-ghost" type="button" data-a="close">Close</button></div>' +
      '<p class="tiny">Saved in this browser. Use "Copy config" in the owner bar to make it permanent for everyone.</p>';
    $("code", pop).textContent = id; $("#mp-url", pop).value = /^blob:/.test(item.url || "") ? "" : (item.url || ""); $("#mp-alt", pop).value = item.alt || "";
    slot.appendChild(pop); $("#mp-url", pop).focus();
    var err = $(".err", pop), pending = null;
    $("#mp-file", pop).addEventListener("change", function (e) { var f = e.target.files[0]; if (f) { pending = { url: URL.createObjectURL(f), mime: f.type }; $("#mp-url", pop).value = ""; } });
    pop.addEventListener("click", function (e) {
      var a = e.target.getAttribute && e.target.getAttribute("data-a"); if (!a) return;
      if (a === "close") { pop.remove(); return; }
      if (a === "clear") { localMedia[id] = { url: "" }; store("adh-media", localMedia); paintMedia(slot); pop.remove(); return; }
      var url = pending ? pending.url : $("#mp-url", pop).value.trim();
      if (!url || !parseMedia(url)) { err.textContent = "Enter a full https:// link to an image or video."; return; }
      localMedia[id] = { url: url, alt: $("#mp-alt", pop).value.trim(), mime: pending ? pending.mime : undefined };
      if (!pending) store("adh-media", localMedia); else store("adh-media", Object.keys(localMedia).reduce(function (o, k) { if (!/^blob:/.test(localMedia[k].url || "")) o[k] = localMedia[k]; return o; }, {}));
      paintMedia(slot); pop.remove(); toast(pending ? "Preview only: a local file cannot be shared. Host it and paste its URL." : "Saved. Press Copy config to make it permanent.");
    });
    pop.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); pop.remove(); } });
  }
  function exportConfig() {
    var merged = {}, ids = {};
    $$("[data-media]").forEach(function (s) { ids[s.getAttribute("data-media")] = 1; });
    Object.keys(cfg).forEach(function (k) { merged[k] = cfg[k]; });
    Object.keys(localMedia).forEach(function (k) { if (!/^blob:/.test((localMedia[k] || {}).url || "")) merged[k] = localMedia[k]; });
    Object.keys(merged).forEach(function (k) { if (!merged[k] || !merged[k].url) delete merged[k]; else { var o = { url: merged[k].url }; if (merged[k].alt) o.alt = merged[k].alt; if (merged[k].caption) o.caption = merged[k].caption; merged[k] = o; } });
    var text = "/* Example images and videos. Edit here or use Owner mode > Copy config. */\nwindow.ADH_MEDIA = " + JSON.stringify(merged, null, 2) + ";\n";
    copyText(text).then(function () { toast("Config copied. Paste it over assets/js/media-config.js"); }, function () { toast("Copy blocked by the browser"); });
  }
  function setOwner(on) {
    owner = on; store("adh-owner", on); root.classList.toggle("owner", on);
    var barEl = $(".owner-bar"); if (barEl) barEl.remove();
    $$(".media-edit").forEach(function (b) { b.remove(); });
    if (on) {
      $$(".media-slot").forEach(function (s) {
        var b = document.createElement("button"); b.type = "button"; b.className = "media-edit"; b.setAttribute("aria-label", "Set example media for " + s.getAttribute("data-media")); b.innerHTML = "&#9998;";
        b.addEventListener("click", function () { openMediaEditor(s); }); $(".media-frame", s).appendChild(b);
        var tag = $(".media-id", s) || document.createElement("code"); tag.className = "media-id tiny"; tag.textContent = " id: " + s.getAttribute("data-media"); $("figcaption", s).appendChild(tag);
      });
      var o = document.createElement("div"); o.className = "owner-bar"; o.setAttribute("role", "region"); o.setAttribute("aria-label", "Owner mode");
      o.innerHTML = '<span>Owner mode: pencil on any box to add an image or video URL</span><button class="btn btn-sm" type="button" data-a="export">Copy config</button><button class="btn btn-sm btn-ghost" type="button" data-a="exit">Exit</button>';
      o.addEventListener("click", function (e) { var a = e.target.getAttribute("data-a"); if (a === "export") exportConfig(); if (a === "exit") setOwner(false); });
      document.body.appendChild(o);
    } else $$(".media-id").forEach(function (t) { t.remove(); });
    $$(".media-slot").forEach(paintMedia);
  }
  setOwner(owner);
  var ol = $("#owner-link"); if (ol) ol.addEventListener("click", function (e) { e.preventDefault(); setOwner(!owner); });

  /* ---------- offline support ---------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* ignore */ });
  }
})();
