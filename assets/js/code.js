/* Code Lab: framework tabs, file tabs, learning flow, personalise panel. */
(function () {
  "use strict";
  var A = window.ADH, $ = A.$, $$ = A.$$, lab = $("[data-lab]");
  if (!lab) return;

  /* ---- learning flow ---- */
  var steps = $$(".flow li", lab);
  function setStep(n) {
    steps.forEach(function (li) {
      var s = +li.getAttribute("data-step");
      li.classList.toggle("done", s < n); li.classList.toggle("current", s === n);
      if (s === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
  }
  setStep(1);
  $$("[data-fw-panel]", lab).forEach(function (p, i) {
    p.hidden = i !== 0;
    $$(".ex-panel", p).forEach(function (x, n) { x.hidden = n !== 0; });
  });

  /* ---- tabs ---- */
  function showFw(slug, quiet) {
    var found = false;
    $$("[data-fw-panel]", lab).forEach(function (p) { var on = p.getAttribute("data-fw-panel") === slug; p.hidden = !on; if (on) found = true; });
    if (!found) return false;
    $$("[data-tabs='fw'] .tab", lab).forEach(function (t) { var on = t.getAttribute("data-slug") === slug; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
    var panel = $("[data-fw-panel='" + slug + "']", lab);
    if (!quiet) setStep($$(".file-tab", panel).length > 1 ? 2 : 3);
    return true;
  }
  function showEx(id, quiet) {
    var tab = document.getElementById("tab-" + id), panel = document.getElementById(id);
    if (!tab || !panel) return false;
    var fw = panel.closest("[data-fw-panel]");
    if (fw && fw.hidden) showFw(fw.getAttribute("data-fw-panel"), true);
    $$(".file-tab", tab.parentNode).forEach(function (t) { var on = t === tab; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
    $$(".ex-panel", fw).forEach(function (p) { p.hidden = p !== panel; });
    if (!quiet) setStep(3);
    return true;
  }
  lab.addEventListener("click", function (e) {
    var fwTab = e.target.closest("[data-tabs='fw'] .tab");
    if (fwTab) {
      e.preventDefault();
      var slug = fwTab.getAttribute("data-slug"); showFw(slug);
      try { history.replaceState(null, "", "#" + slug); } catch (err) { /* ignore */ }
      return;
    }
    var ft = e.target.closest(".file-tab"); if (ft) showEx(ft.getAttribute("data-ex"));
  });
  lab.addEventListener("keydown", function (e) {
    var tab = e.target.closest && e.target.closest("[role='tab']");
    if (!tab || ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) === -1) return;
    var list = $$("[role='tab']", tab.parentNode), i = list.indexOf(tab);
    i = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length;
    e.preventDefault(); list[i].focus(); list[i].click();
  });
  var verified = false;
  document.addEventListener("adh:copied", function () { if (!verified) setStep(5); });
  lab.addEventListener("change", function (e) {
    if (!e.target.matches("[data-verified]")) return;
    verified = e.target.checked; setStep(verified ? 7 : 5);
  });
  function fromHash() {
    var h = location.hash.replace("#", "");
    if (!h) return;
    if (/^ex-/.test(h)) { if (showEx(h, true)) { setStep(3); var p = document.getElementById(h); if (p) p.scrollIntoView({ block: "start" }); } }
    else if (showFw(h, true)) { setStep(2); }
  }
  fromHash();
  window.addEventListener("hashchange", fromHash);

  /* ---- personalise ---- */
  var form = $("#pz-form"), cIn = $("#pz-client"), sIn = $("#pz-slot"), msg = $("#pz-msg"), clearBtn = $("#pz-clear");
  function normClient(v) {
    v = (v || "").replace(/\s+/g, "").toLowerCase();
    var m = /^(?:ca-)?(?:pub-)?(\d{16})$/.exec(v);
    return m ? "ca-pub-" + m[1] : null;
  }
  function paint() {
    var p = A.getProfile();
    if (p.client) { cIn.value = p.client; sIn.value = p.slot || ""; msg.className = "field-msg ok"; msg.textContent = "\u2713 Applied to every code box on this site (stored only in this browser)."; }
    else { msg.className = "field-msg"; msg.textContent = "Not set: examples show placeholders like ca-pub-XXXXXXXXXXXXXXXX."; }
  }
  if (form) {
    paint();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = normClient(cIn.value), slot = sIn.value.trim();
      if (!c) { msg.className = "field-msg bad"; msg.textContent = "Publisher ID must be 16 digits, like ca-pub-1234567890123456 (find it in your AdSense account)."; cIn.focus(); return; }
      if (slot && !/^\d{8,12}$/.test(slot)) { msg.className = "field-msg bad"; msg.textContent = "Ad slot IDs are numbers (usually 10 digits). Leave it empty if you do not have one yet."; sIn.focus(); return; }
      A.setProfile({ client: c, slot: slot }); paint(); A.toast("Your ID is now in every code box");
    });
    clearBtn.addEventListener("click", function () { A.setProfile({}); cIn.value = ""; sIn.value = ""; paint(); });
  }
})();
