/* In-browser tools. Everything runs on your device; pasted text is never sent anywhere. */
(function () {
  "use strict";
  var A = window.ADH, $ = A.$, $$ = A.$$;
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function item(status, label, detail) { return { s: status, l: label, d: detail }; }
  function paint(el, list, summary) {
    var label = { pass: "Pass", warn: "Warning", fail: "Fix", info: "Info" };
    var pass = list.filter(function (x) { return x.s === "pass"; }).length, graded = list.filter(function (x) { return x.s !== "info"; }).length;
    el.innerHTML = (summary !== false && graded ? '<div class="score"><span class="status ' + (pass === graded ? "pass" : list.some(function (x) { return x.s === "fail"; }) ? "fail" : "warn") + '">' + pass + " of " + graded + " checks passed</span></div>" : "") +
      '<ul class="results">' + list.map(function (x) { return '<li><span class="status ' + x.s + '">' + label[x.s] + '</span><span class="r-label">' + esc(x.l) + '</span><span class="r-detail">' + esc(x.d) + "</span></li>"; }).join("") + "</ul>";
    el.hidden = false;
  }

  /* ---------- 1. HTML checker ---------- */
  var SAMPLE_BAD = '<!DOCTYPE html>\n<html>\n<head>\n  <title>My blog</title>\n</head>\n<body>\n  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"></script>\n  <h1>Hello</h1>\n  <ins class="adsbygoogle" style="display:none"\n       data-ad-client="ca-pub-1234567890123456"></ins>\n  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>\n  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>\n</body>\n</html>';
  function analyseHtml(src) {
    var out = [], doc = new DOMParser().parseFromString(src, "text/html");
    var scripts = $$("script[src*='adsbygoogle.js']", doc), ins = $$("ins.adsbygoogle", doc), inline = $$("script:not([src])", doc);
    var metaAcc = $("meta[name='google-adsense-account']", doc);
    if (!/<html|<head|<body|<script|<ins/i.test(src)) return [item("fail", "Nothing to check", "Paste the HTML of your page (View Source, then select all and copy).")];
    if (!scripts.length) {
      out.push(item("fail", "AdSense script found", /adsbygoogle\.js/.test(src) ? "The script text appears in your paste but not as a real tag. It may be inside an HTML comment." : "No adsbygoogle.js script tag. Add the snippet from your AdSense account to the page head."));
    } else {
      out.push(item("pass", "AdSense script found", scripts.length + " script tag" + (scripts.length > 1 ? "s" : "") + "."));
      out.push(scripts.length === 1 ? item("pass", "Script appears once", "One copy per page is correct.") : item("warn", "Script appears " + scripts.length + " times", "Keep a single copy in the head and remove duplicates."));
      var s0 = scripts[0], inHead = !!s0.closest("head");
      out.push(inHead ? item("pass", "Script is inside <head>", "This is where AdSense expects the code.") : item("fail", "Script is not inside <head>", "It is in the body. Move it between <head> and </head>."));
      var m = /[?&]client=([^&"'\s]+)/.exec(s0.getAttribute("src") || ""), client = m ? m[1] : "";
      if (!client) out.push(item("fail", "Publisher ID in script", "The script URL has no client= value."));
      else if (/X{6,}/i.test(client)) out.push(item("fail", "Publisher ID in script", "This is still the placeholder (" + client + "). Use your own ID."));
      else if (!/^ca-pub-\d{16}$/.test(client)) out.push(item("fail", "Publisher ID format", client + " does not look right. It should be ca-pub- followed by 16 digits."));
      else out.push(item("pass", "Publisher ID format", client + " is correctly formatted."));
      out.push(s0.hasAttribute("async") ? item("pass", "async attribute", "The script loads without blocking the page.") : item("warn", "async attribute missing", "Add async so the script does not block rendering."));
      out.push(s0.getAttribute("crossorigin") === "anonymous" ? item("pass", 'crossorigin="anonymous"', "Present, as in the standard snippet.") : item("info", "crossorigin attribute", 'The standard snippet includes crossorigin="anonymous". Copy it from AdSense to be safe.'));
      ins.forEach(function (n, i) {
        var dc = n.getAttribute("data-ad-client"), ds = n.getAttribute("data-ad-slot"), lab = "Ad unit " + (i + 1);
        if (!dc) out.push(item("fail", lab + ": data-ad-client", "Missing."));
        else if (client && dc !== client) out.push(item("fail", lab + ": data-ad-client differs", "Unit uses " + dc + " but the script uses " + client + "."));
        else if (/X{6,}/i.test(dc)) out.push(item("fail", lab + ": data-ad-client", "Still a placeholder."));
        if (!ds) out.push(item("warn", lab + ": data-ad-slot missing", "Create an ad unit in AdSense and use its slot ID."));
        else if (/^1234567890$/.test(ds) || /X{4,}/i.test(ds)) out.push(item("fail", lab + ": data-ad-slot", "This is the placeholder slot. Use your real slot ID."));
        else out.push(item("pass", lab + ": slot", "data-ad-slot=" + ds));
        if (/display\s*:\s*none/i.test(n.getAttribute("style") || "")) out.push(item("fail", lab + " is hidden", "display:none stops the ad from rendering. Use display:block."));
      });
      var pushes = 0; inline.forEach(function (sc) { var mm = (sc.textContent || "").match(/adsbygoogle[^;]*\.push\s*\(/g); if (mm) pushes += mm.length; });
      if (ins.length) out.push(pushes === ins.length ? item("pass", "push calls match ad units", ins.length + " unit" + (ins.length > 1 ? "s" : "") + ", " + pushes + " push call" + (pushes > 1 ? "s" : "") + ".") :
        pushes > ins.length ? item("fail", "Too many push calls", ins.length + " unit(s) but " + pushes + " push calls. This causes the error: all ins elements already have ads.") :
        item("warn", "Fewer push calls than units", ins.length + " units but " + pushes + " push call(s). Units without a push will stay empty (unless a script pushes them later)."));
      else out.push(item("info", "No ad units in this HTML", "That is fine for Auto ads. For manual ads, add an ins.adsbygoogle element and a push call."));
    }
    if (metaAcc) out.push(/^ca-pub-\d{16}$/.test(metaAcc.getAttribute("content") || "") ? item("pass", "google-adsense-account meta tag", metaAcc.getAttribute("content")) : item("warn", "google-adsense-account meta tag", "Present but not in the expected ca-pub- format."));
    var ids = (src.match(/ca-pub-\d{16}/g) || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (ids.length > 1) out.push(item("warn", "More than one publisher ID", "Found " + ids.join(", ") + ". A page normally uses a single ID."));
    out.push(item("info", "Limit of this check", "It reads the HTML you paste. Scripts that your app adds later with JavaScript are not visible here."));
    return out;
  }
  var htmlIn = $("#html-in"), htmlOut = $("#html-out");
  if (htmlIn) {
    $("#html-run").addEventListener("click", function () { paint(htmlOut, analyseHtml(htmlIn.value)); });
    $("#html-sample").addEventListener("click", function () { htmlIn.value = SAMPLE_BAD; paint(htmlOut, analyseHtml(SAMPLE_BAD)); });
    $("#html-clear").addEventListener("click", function () { htmlIn.value = ""; htmlOut.hidden = true; });
  }

  /* ---------- 2. ads.txt builder + validator ---------- */
  var LINE = /^google\.com\s*,\s*(pub-\d{10,20})\s*,\s*(DIRECT|RESELLER)\s*(?:,\s*([0-9a-f]{16}))?\s*(?:#.*)?$/i;
  function normPub(v) { var m = /^(?:ca-)?(?:pub-)?(\d{16})$/.exec((v || "").replace(/\s+/g, "").toLowerCase()); return m ? m[1] : null; }
  function analyseAdsTxt(text) {
    var out = [], lines = text.replace(/\r/g, "").split("\n"), google = 0, ids = {}, seen = {}, bad = 0, entries = 0;
    if (!text.trim()) return [item("fail", "Nothing to check", "Paste the contents of your ads.txt file.")];
    if (/^\s*<(!doctype|html)/i.test(text)) return [item("fail", "This is HTML, not ads.txt", "Your server is returning a web page. ads.txt must be plain text served at /ads.txt.")];
    lines.forEach(function (raw, n) {
      var line = raw.replace(/#.*/, "").trim();
      if (!line) return;
      if (/^(contact|subdomain|inventorypartnerdomain|ownerdomain|managerdomain)\s*=/i.test(line)) { out.push(item("info", "Line " + (n + 1) + ": variable", line)); return; }
      entries++;
      var parts = line.split(",").map(function (p) { return p.trim(); });
      if (parts.length < 3 || parts.length > 4) { bad++; out.push(item("fail", "Line " + (n + 1) + ": format", "Expected: domain, publisher ID, DIRECT or RESELLER[, certification ID].")); return; }
      if (seen[line.toLowerCase()]) out.push(item("warn", "Line " + (n + 1) + ": duplicate", "Same line appears twice."));
      seen[line.toLowerCase()] = 1;
      if (/^google\.com$/i.test(parts[0])) {
        var m = LINE.exec(line);
        if (!m) { bad++; out.push(item("fail", "Line " + (n + 1) + ": Google entry", /ca-pub/i.test(line) ? "Use pub- (not ca-pub-) in ads.txt." : "Expected: google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0")); return; }
        google++; ids[m[1].toLowerCase()] = 1;
        if (/X{6,}/i.test(line)) out.push(item("fail", "Line " + (n + 1) + ": placeholder ID", "Replace with your real publisher ID."));
        if (m[2].toUpperCase() !== "DIRECT") out.push(item("warn", "Line " + (n + 1) + ": " + m[2].toUpperCase(), "Publishers normally use DIRECT for their own AdSense account."));
        if ((m[3] || "").toLowerCase() !== "f08c47fec0942fa0") out.push(item("warn", "Line " + (n + 1) + ": certification ID", "Google lines normally end with f08c47fec0942fa0."));
      } else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(parts[0])) { bad++; out.push(item("fail", "Line " + (n + 1) + ": domain", parts[0] + " is not a valid domain.")); }
    });
    var idList = Object.keys(ids);
    out.unshift(google ? item("pass", "Google AdSense entry", google + " entr" + (google > 1 ? "ies" : "y") + " for " + idList.join(", ") + ".") : item("fail", "Google AdSense entry", "No google.com line found."));
    if (!bad && google) out.push(item("pass", "Format", entries + " record" + (entries > 1 ? "s" : "") + ", no formatting errors."));
    out.push(item("info", "Where it must live", "Serve this at the root: https://yourdomain.com/ads.txt as plain text with status 200."));
    return out;
  }
  var txtIn = $("#txt-in");
  if (txtIn) {
    var pubIn = $("#pub-in"), pubMsg = $("#pub-msg"), lineBox = $("#line-box");
    var build = function () {
      var d = normPub(pubIn.value);
      if (!pubIn.value.trim()) { pubMsg.className = "field-msg"; pubMsg.textContent = "Enter your publisher ID."; return; }
      if (!d) {
        pubMsg.className = "field-msg bad";
        pubMsg.textContent = /^\d{8,12}$/.test(pubIn.value.trim()) ? "That looks like an ad slot ID. The publisher ID has 16 digits." : "Use 16 digits, for example pub-1234567890123456.";
        return;
      }
      pubMsg.className = "field-msg ok"; pubMsg.textContent = "\u2713 Valid. Same ID in two forms below.";
      A.setCode(lineBox, "google.com, pub-" + d + ", DIRECT, f08c47fec0942fa0");
      A.setCode($("#id-box"), "<!-- in <head> -->\n<meta name=\"google-adsense-account\" content=\"ca-pub-" + d + "\">\n<script async src=\"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-" + d + "\"\n        crossorigin=\"anonymous\"></script>");
    };
    pubIn.addEventListener("input", build);
    var pr = A.getProfile(); if (pr.client) { pubIn.value = pr.client; build(); }
    $("#txt-run").addEventListener("click", function () { paint($("#txt-out"), analyseAdsTxt(txtIn.value), false); });
    $("#txt-sample").addEventListener("click", function () { txtIn.value = "google.com, ca-pub-1234567890123456, DIRECT\ngoogle.com, pub-1234567890123456, RESELLER, f08c47fec0942fa0\n# comment\nbadline"; paint($("#txt-out"), analyseAdsTxt(txtIn.value), false); });
  }

  /* ---------- 3. robots.txt checker ---------- */
  var robIn = $("#rob-in");
  if (robIn) {
    $("#rob-run").addEventListener("click", function () {
      var groups = [], agents = [], rules = [], sm = [], out = [];
      robIn.value.replace(/\r/g, "").split("\n").forEach(function (raw) {
        var line = raw.replace(/#.*/, "").trim(), i = line.indexOf(":"); if (i < 0) return;
        var k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
        if (k === "user-agent") { if (rules.length) { groups.push({ a: agents, r: rules }); agents = []; rules = []; } agents.push(v.toLowerCase()); }
        else if (k === "allow" || k === "disallow") rules.push([k, v]); else if (k === "sitemap") sm.push(v);
      });
      if (agents.length) groups.push({ a: agents, r: rules });
      if (!robIn.value.trim()) return paint($("#rob-out"), [item("info", "No robots.txt", "A missing robots.txt is allowed: crawlers treat everything as open.")], false);
      var blocked = [];
      groups.forEach(function (g) {
        var hits = g.r.some(function (x) { return x[0] === "disallow" && x[1] === "/"; }) && !g.r.some(function (x) { return x[0] === "allow" && x[1] === "/"; });
        if (hits && g.a.some(function (a) { return a === "*" || a === "mediapartners-google"; })) blocked.push(g.a.indexOf("mediapartners-google") !== -1 ? "Mediapartners-Google" : "all crawlers (*)");
      });
      out.push(blocked.length ? item("fail", "Whole site blocked", "Disallow: / applies to " + blocked.join(", ") + ". The AdSense crawler is Mediapartners-Google. Remove the rule or add a separate group that allows it.") : item("pass", "AdSense crawler not blocked", "No rule blocks the whole site for Mediapartners-Google or *."));
      var priv = groups.some(function (g) { return g.r.some(function (x) { return x[0] === "disallow" && /^\/(wp-admin|admin)/i.test(x[1]); }); });
      if (priv) out.push(item("info", "Admin paths disallowed", "Blocking /admin or /wp-admin is normal."));
      out.push(sm.length ? item("pass", "Sitemap listed", sm[0]) : item("info", "No Sitemap line", "Optional, but helps crawlers find your pages."));
      paint($("#rob-out"), out, false);
    });
    $("#rob-sample").addEventListener("click", function () { robIn.value = "User-agent: *\nDisallow: /\n"; $("#rob-run").click(); });
  }

  /* ---------- 4. ad unit builder ---------- */
  var unitBox = $("#unit-box");
  if (unitBox) {
    var fmt = $("#unit-format"), uc = $("#unit-client"), us = $("#unit-slot"), reserve = $("#unit-reserve"), umsg = $("#unit-msg"), cssBox = $("#unit-css");
    var prof = A.getProfile(); if (prof.client) uc.value = prof.client; if (prof.slot) us.value = prof.slot;
    var gen = function () {
      var c = normPub(uc.value), s = us.value.trim(), f = fmt.value, ph = !c;
      var client = c ? "ca-pub-" + c : "ca-pub-XXXXXXXXXXXXXXXX", slot = /^\d{8,12}$/.test(s) ? s : "1234567890", code = "";
      umsg.className = "field-msg"; umsg.textContent = ph && uc.value ? "Publisher ID must be 16 digits." : (!/^\d{8,12}$/.test(s) && s ? "Slot IDs are numbers (about 10 digits)." : "");
      if (umsg.textContent) umsg.className = "field-msg bad";
      var push = "<script>\n  (adsbygoogle = window.adsbygoogle || []).push({});\n</script>";
      if (f === "auto") code = "<!-- Auto ads need only the head script. Turn on Auto ads for this site in AdSense. -->\n<script async src=\"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + client + "\"\n        crossorigin=\"anonymous\"></script>";
      else if (f === "responsive") code = "<ins class=\"adsbygoogle\"\n     style=\"display:block\"\n     data-ad-client=\"" + client + "\"\n     data-ad-slot=\"" + slot + "\"\n     data-ad-format=\"auto\"\n     data-full-width-responsive=\"true\"></ins>\n" + push;
      else if (f === "article") code = "<ins class=\"adsbygoogle\"\n     style=\"display:block; text-align:center;\"\n     data-ad-layout=\"in-article\"\n     data-ad-format=\"fluid\"\n     data-ad-client=\"" + client + "\"\n     data-ad-slot=\"" + slot + "\"></ins>\n" + push;
      else code = "<ins class=\"adsbygoogle\"\n     style=\"display:inline-block;width:300px;height:250px\"\n     data-ad-client=\"" + client + "\"\n     data-ad-slot=\"" + slot + "\"></ins>\n" + push;
      if (reserve.checked && f !== "auto") code = "<div class=\"ad-slot\">\n" + code.replace(/^/gm, "  ") + "\n</div>";
      A.setCode(unitBox, code);
      cssBox.parentNode.hidden = !(reserve.checked && f !== "auto");
      A.setCode(cssBox, "/* Reserve space so the page does not jump when an ad loads */\n.ad-slot {\n  min-height: " + (f === "fixed" ? "250" : "280") + "px;\n  text-align: center;\n}");
    };
    [fmt, uc, us, reserve].forEach(function (e) { e.addEventListener("input", gen); e.addEventListener("change", gen); });
    gen();
  }
})();
