/* Troubleshooting: diagnosis wizard, filter chips, search, deep links. */
(function () {
  "use strict";
  var A = window.ADH, $ = A.$, $$ = A.$$;

  var TREE = {
    start: { q: "What is happening on your site?", o: [
      ["AdSense cannot find my code, or verification fails", "ver1"],
      ["The code is there but no ads appear", "no1"],
      ["AdSense reports a problem with ads.txt", "txt1"],
      ["Console says: all ins elements already have ads", "dup"],
      ["It works on my computer but not after I deploy", "dep"],
      ["Certificate warning, redirect loop or site will not open", "dns"],
      ["I changed the code but the live site still shows the old version", "cache"]] },
    ver1: { q: "Open your live page, choose View Source (not Inspect) and search for adsbygoogle.js. Do you find it?", o: [["Yes, it is there", "ver2"], ["No, I cannot find it", "ver_no"]] },
    ver2: { q: "Is it inside the head, exactly once, with your real publisher ID (not XXXX)?", o: [["Yes, all three", "ver3"], ["No or not sure", "ver_fix"]] },
    ver3: { q: "Did you enter the exact same address in AdSense (www or non-www, https)?", o: [["Yes, the same", "ver4"], ["Not sure or different", "ver_host"]] },
    ver4: { leaf: true, a: "<strong>Check what stops the crawler.</strong> Password protection, a firewall rule or <code>robots.txt</code> blocking <code>Mediapartners-Google</code> will stop verification. Purge your CDN cache, wait, and try again.", l: [["robots.txt checker", "tools.html#tool-robots"], ["Verification issues", "#verification"]] },
    ver_no: { leaf: true, a: "<strong>The code is not in the HTML your server sends.</strong> You may have edited the wrong file, not deployed, or added it only with client-side JavaScript. Add it to the shared head template, deploy and check View Source again.", l: [["Where the code goes", "code.html"], ["Code not working", "#code-not-working"]] },
    ver_fix: { leaf: true, a: "<strong>Fix placement first.</strong> Move the script into the shared <code>&lt;head&gt;</code>, remove duplicates and replace placeholders with your real ID. Paste your page source into the HTML checker to confirm.", l: [["HTML checker", "tools.html#tool-html"], ["Code placement problems", "#placement"]] },
    ver_host: { leaf: true, a: "<strong>Address mismatch.</strong> Add the exact address visitors reach, and redirect the other version (www or non-www) to it permanently.", l: [["Verification issues", "#verification"], ["HTTPS and DNS", "#https-dns"]] },
    no1: { q: "Does AdSense show your site as ready, with no alerts?", o: [["Yes, ready", "no2"], ["No, or still reviewing", "no_wait"], ["I do not know", "no_wait"]] },
    no2: { q: "Did you enable Auto ads, or place ad unit code (ins + push) in your pages?", o: [["Auto ads only", "no3"], ["Ad units", "no4"], ["Neither yet", "no_none"]] },
    no3: { leaf: true, a: "<strong>Auto ads need the head script on the page and Auto ads switched on for this site.</strong> Reload fully, test in a private window with ad blockers off, and allow time. Short pages may not get ads.", l: [["Auto ads issues", "#auto-ads"], ["Ads not appearing", "#ads-not-appearing"]] },
    no4: { leaf: true, a: "<strong>Check each unit.</strong> Real <code>data-ad-slot</code>, one <code>push</code> per unit, visible container with width, no <code>display:none</code> ancestors. The checker counts units and pushes for you.", l: [["HTML checker", "tools.html#tool-html"], ["Ads not appearing", "#ads-not-appearing"]] },
    no_none: { leaf: true, a: "<strong>The head script alone shows nothing.</strong> Create an ad unit in AdSense and paste its markup where the ad should appear, or enable Auto ads.", l: [["Ad unit builder", "tools.html#tool-unit"], ["Setup step: configure ads", "setup.html#configure-ads"]] },
    no_wait: { leaf: true, a: "<strong>Account or site status comes first.</strong> Read every alert in your AdSense account. New sites and new units can take time before ads start. Do not click your own ads to test.", l: [["Ads not appearing", "#ads-not-appearing"], ["Testing safely", "learn.html#policy"]] },
    txt1: { leaf: true, a: "<strong>Open <code>https://yourdomain.com/ads.txt</code> in a browser.</strong> It must show plain text with your <code>google.com, pub-..., DIRECT, f08c47fec0942fa0</code> line. Fix soft 404s, wrong ID and www/non-www mismatches, then wait for AdSense to re-crawl.", l: [["ads.txt validator", "tools.html#tool-adstxt"], ["ads.txt problems", "#ads-txt"]] },
    dup: { leaf: true, a: "<strong><code>push</code> ran more times than there are empty ad units.</strong> In React or Next.js, guard the call with a ref (the Code Lab component does this). Do not call push on re-render.", l: [["React ad component", "code.html#react"], ["Framework issues", "#frameworks"]] },
    dep: { leaf: true, a: "<strong>Production differs from local.</strong> Check environment variables on the host, that the latest commit was built, and that old caches are purged. Static hosts need ads.txt in the published folder.", l: [["Deployment problems", "#deployment"], ["Go live guide", "setup.html#go-live"]] },
    dns: { leaf: true, a: "<strong>Fix the connection layer first.</strong> Check DNS records for both the root domain and www, wait for the certificate, use Cloudflare SSL mode Full (strict) when your host has a valid certificate, and remove http:// resources.", l: [["HTTPS and DNS", "#https-dns"], ["Go live guide", "setup.html#go-live"]] },
    cache: { leaf: true, a: "<strong>You are looking at a cached copy.</strong> Purge the CDN, hard-refresh or use a private window, and keep HTML and ads.txt cache times short.", l: [["CDN and cache", "#cache"]] }
  };
  var box = $("#wizard"), history = [];
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function render(id) {
    var n = TREE[id]; if (!n || !box) return;
    var h = '<p class="crumb">Diagnosis wizard' + (history.length ? " &middot; step " + (history.length + 1) : "") + "</p>";
    if (n.leaf) {
      h += '<div class="answer"><p><strong>Most likely fix</strong></p><p>' + n.a + "</p><p>" + n.l.map(function (l) { return '<a class="chip" href="' + l[1] + '">' + esc(l[0]) + "</a>"; }).join(" ") + "</p></div>";
    } else {
      h += '<p class="q" id="wiz-q">' + esc(n.q) + '</p><div class="opts" role="group" aria-labelledby="wiz-q">' + n.o.map(function (o, i) { return '<button type="button" class="chip" data-next="' + o[1] + '">' + esc(o[0]) + "</button>"; }).join("") + "</div>";
    }
    h += '<p class="tool-actions">' + (history.length ? '<button type="button" class="btn btn-sm btn-ghost" data-back="1">\u2190 Back</button>' : "") + (id !== "start" ? '<button type="button" class="btn btn-sm btn-ghost" data-restart="1">Start over</button>' : "") + "</p>";
    box.innerHTML = h;
    var f = $("button", box); if (f && history.length) f.focus();
  }
  if (box) {
    box.addEventListener("click", function (e) {
      var nx = e.target.getAttribute("data-next");
      if (nx) { history.push(box.__cur); box.__cur = nx; render(nx); }
      else if (e.target.getAttribute("data-back")) { box.__cur = history.pop() || "start"; render(box.__cur); }
      else if (e.target.getAttribute("data-restart")) { history = []; box.__cur = "start"; render("start"); }
    });
    box.__cur = "start"; render("start");
  }

  /* ---- filter + search + deep links ---- */
  var input = $("#fix-search"), items = $$(".acc"), cat = "", none = $("#fix-none");
  function apply() {
    var q = (input ? input.value : "").trim().toLowerCase(), n = 0;
    items.forEach(function (d) {
      var ok = (!q || d.textContent.toLowerCase().indexOf(q) !== -1) && (!cat || d.getAttribute("data-cat") === cat);
      d.hidden = !ok; if (ok) n++;
      if (q && ok && n <= 3) d.open = true;
    });
    if (none) none.hidden = n !== 0;
  }
  if (input) input.addEventListener("input", apply);
  $$("[data-cat-chip]").forEach(function (c) {
    c.addEventListener("click", function () {
      var on = c.getAttribute("aria-pressed") === "true";
      $$("[data-cat-chip]").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      cat = on ? "" : c.getAttribute("data-cat-chip"); if (!on) c.setAttribute("aria-pressed", "true"); apply();
    });
  });
  function openHash() {
    var h = location.hash.replace("#", ""), el = h && document.getElementById(h);
    if (el && el.tagName === "DETAILS") { el.hidden = false; el.open = true; setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 30); }
  }
  openHash(); window.addEventListener("hashchange", openHash);
  var all = $("#fix-expand"); if (all) all.addEventListener("click", function () { var open = all.getAttribute("aria-pressed") !== "true"; items.forEach(function (d) { d.open = open; }); all.setAttribute("aria-pressed", open ? "true" : "false"); all.textContent = open ? "Collapse all" : "Expand all"; });
})();
