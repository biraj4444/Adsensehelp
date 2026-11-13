/* Contact: builds a mailto: link from the form. Nothing is sent by this site. */
(function () {
  "use strict";
  var A = window.ADH, box = document.getElementById("composer");
  if (!A || !box) return;
  var email = box.getAttribute("data-email"), $ = function (id) { return document.getElementById(id); };
  var open = $("m-open"), copyBtn = $("m-copy"), msg = $("m-msg"), count = $("m-count");
  function compose() {
    var name = $("m-name").value.trim(), topic = $("m-topic").value, page = $("m-page").value.trim(), text = msg.value.trim();
    var body = (name ? "Hi Kaustav,\n\n" : "Hi Kaustav,\n\n") + text + "\n\n" + (page ? "About: " + page + "\n" : "") + (name ? "Thanks,\n" + name : "");
    return { subject: "AdSense Helper: " + topic, body: body.trim() };
  }
  function update() {
    var c = compose(), ready = msg.value.trim().length >= 5;
    count.textContent = msg.value.length + " / 1500";
    open.setAttribute("aria-disabled", ready ? "false" : "true");
    open.href = ready ? "mailto:" + email + "?subject=" + encodeURIComponent(c.subject) + "&body=" + encodeURIComponent(c.body) : "mailto:" + email;
  }
  ["m-name", "m-topic", "m-page", "m-msg"].forEach(function (id) { $(id).addEventListener("input", update); $(id).addEventListener("change", update); });
  open.addEventListener("click", function (e) {
    if (open.getAttribute("aria-disabled") === "true") { e.preventDefault(); count.className = "field-msg bad"; count.textContent = "Write your message first (at least a few words)."; msg.focus(); }
  });
  copyBtn.addEventListener("click", function () {
    if (msg.value.trim().length < 5) { count.className = "field-msg bad"; count.textContent = "Write your message first (at least a few words)."; msg.focus(); return; }
    var c = compose();
    A.copyText("To: " + email + "\nSubject: " + c.subject + "\n\n" + c.body).then(function () { A.toast("Message copied"); }, function () { A.toast("Copy blocked by the browser"); });
  });
  var ce = $("copy-email");
  if (ce) ce.addEventListener("click", function () { A.copyText(email).then(function () { A.toast("Email address copied"); }, function () { A.toast("Copy blocked by the browser"); }); });
  update();
})();
