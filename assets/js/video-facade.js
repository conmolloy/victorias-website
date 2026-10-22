// Click-to-load video embeds (see tools/video_facades.py): the Vimeo/YouTube
// player and its scripts only load when someone clicks play.
document.addEventListener("click", function (e) {
  var link = e.target.closest && e.target.closest("a.video-facade");
  if (!link) return;
  e.preventDefault();
  var iframe = document.createElement("iframe");
  iframe.src = link.getAttribute("data-embed");
  iframe.width = "100%";
  iframe.height = link.getAttribute("data-height");
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allow", link.getAttribute("data-allow"));
  iframe.setAttribute("allowfullscreen", "");
  iframe.title = link.querySelector("img").alt;
  link.parentNode.replaceChild(iframe, link);
});
