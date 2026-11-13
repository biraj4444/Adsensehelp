/* Offline reading: pages are fetched network-first and cached; static assets cache-first. */
var CACHE = "adh-v2";
var CORE = ["index.html", "learn.html", "setup.html", "code.html", "tools.html", "fix.html", "about.html", "contact.html", "assets/css/site.css", "assets/js/app.js", "assets/js/code.js", "assets/js/tools.js", "assets/js/fix.js", "assets/js/tasks.js", "assets/js/media-config.js", "assets/js/theme-init.js", "assets/img/logo.svg"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  var html = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1;
  var js = /\.(js|css)$/.test(url.pathname);
  if (html || js) {
    e.respondWith(fetch(req).then(function (r) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return r; }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match("index.html"); }); }));
  } else {
    e.respondWith(caches.match(req).then(function (m) { return m || fetch(req).then(function (r) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return r; }); }));
  }
});
