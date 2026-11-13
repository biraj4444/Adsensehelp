/* Shows the profile photo from profile-config.js, or keeps the initials badge. */
(function () {
  "use strict";
  var cfg = window.ADH_PROFILE || {}, url = (cfg.photo || "").trim();
  var box = document.querySelector("[data-profile]");
  if (!box || !url || !/^(https:\/\/|assets\/|\.\/assets\/)[^\s"'<>]+$/.test(url)) return;
  var img = new Image();
  img.alt = cfg.alt || "Profile photo";
  img.decoding = "async";
  img.addEventListener("load", function () {
    var old = box.querySelector("img, .profile-initials");
    box.classList.add("has-photo");
    if (old) old.remove();
    box.insertBefore(img, box.firstChild);
  });
  img.src = url; /* if the file is missing, nothing changes and the initials stay */
})();
