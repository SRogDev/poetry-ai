import type { LoviData, LoviSlot } from "./slots";

/**
 * "Frasco de razones" — the hand-crafted sample Lovi.
 * Tap the jar to pull a reason slip. Reads window.LOVI_DATA keys:
 * `names`, `memories[]` (the reasons), `message` (closing line).
 * Fully self-contained: inline CSS/JS, no external assets, <15KB.
 */
export const SAMPLE_LOVI_CODE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Frasco de razones</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:linear-gradient(160deg,#fff1f2,#fce7f3 55%,#fbcfe8);color:#3f1d2e;display:flex;align-items:center;justify-content:center;min-height:100dvh;padding:20px;overflow:hidden}
.card{width:100%;max-width:380px;text-align:center}
h1{font-size:30px;letter-spacing:-.5px;color:#9d174d}
.sub{margin-top:6px;color:#a16207;font-size:15px}
.jar{position:relative;width:190px;height:250px;margin:26px auto 8px;cursor:pointer}
.jar .lid{position:absolute;top:0;left:15px;right:15px;height:34px;background:linear-gradient(#f9a8d4,#ec4899);border-radius:10px;box-shadow:0 3px 0 #be185d}
.jar .neck{position:absolute;top:30px;left:35px;right:35px;height:22px;background:#fbcfe8;border:3px solid #ec4899;border-bottom:none;border-radius:6px 6px 0 0}
.jar .glass{position:absolute;top:48px;left:10px;right:10px;bottom:0;background:rgba(255,255,255,.55);border:3px solid #ec4899;border-radius:18px 18px 34px 34px;overflow:hidden}
.slip{position:absolute;left:22px;right:22px;height:16px;background:#fff7ed;border:1px solid #f59e0b;border-radius:4px;transform:rotate(var(--r,0deg))}
.btn{display:inline-block;margin-top:18px;background:linear-gradient(90deg,#DC2626,#EC4899);color:#fff;border:none;border-radius:999px;padding:15px 34px;font-size:17px;font-weight:700;cursor:pointer;box-shadow:0 6px 16px rgba(220,38,38,.35);transition:transform .15s ease,opacity .2s;min-height:52px}
.btn:active{transform:scale(.96)}
.btn.ghost{background:#fff;color:#be185d;border:2px solid #ec4899;box-shadow:none}
.reason{background:#fff;border-radius:18px;padding:26px 22px;margin:22px auto 0;max-width:340px;box-shadow:0 10px 30px rgba(157,23,77,.15);border-top:5px solid #ec4899;animation:pop .35s ease}
.reason p{font-size:19px;line-height:1.5;color:#4a1d33}
.reason .n{margin-top:10px;font-size:12px;color:#a16207;letter-spacing:2px;text-transform:uppercase}
@keyframes pop{from{transform:translateY(14px) scale(.95);opacity:0}to{transform:none;opacity:1}}
.counter{margin-top:14px;font-size:13px;color:#9d174d;font-weight:600}
.hidden{display:none!important}
.fade{animation:pop .3s ease}
.note{margin-top:16px;font-size:13px;color:#a16207}
</style>
</head>
<body>
<div class="card">
  <div id="cover">
    <h1>Frasco de razones</h1>
    <p class="sub" id="coverNames"></p>
    <div class="jar" id="jarCover" role="button" tabindex="0" aria-label="Abrir el frasco">
      <div class="lid"></div><div class="neck"></div>
      <div class="glass" id="glassCover"></div>
    </div>
    <button class="btn" id="openBtn">Abrir el frasco</button>
  </div>
  <div id="play" class="hidden">
    <h1>Razones por las que te amo</h1>
    <div class="jar" id="jarPlay" role="button" tabindex="0" aria-label="Sacar una razón">
      <div class="lid"></div><div class="neck"></div>
      <div class="glass" id="glassPlay"></div>
    </div>
    <p class="note">Toca el frasco para sacar una razón</p>
    <div id="reasonBox" class="hidden">
      <div class="reason"><p id="reasonText"></p><div class="n" id="reasonNum"></div></div>
      <div class="counter" id="counter"></div>
    </div>
    <div id="doneBox" class="hidden">
      <div class="reason"><p id="doneText"></p><div class="n">fin</div></div>
      <button class="btn ghost" id="againBtn">Volver a empezar</button>
    </div>
    <div id="moreBox"><button class="btn ghost" id="moreBtn">Sacar otra razón</button></div>
  </div>
</div>
<script>
(function(){
  var D = window.LOVI_DATA || {};
  var names = D.names;
  var title = typeof names === "string" ? names
    : (names && names.to ? "Para " + names.to : "Para ti");
  var from = (names && typeof names === "object" && names.from) ? names.from : null;
  document.getElementById("coverNames").textContent = title + (from ? " · de " + from : "");

  var reasons = Array.isArray(D.memories) && D.memories.length ? D.memories.slice()
    : (Array.isArray(D.poem_lines) && D.poem_lines.length ? D.poem_lines.slice()
    : (D.message ? [String(D.message)]
    : ["Tu risa me arregla el día.", "Contigo todo es más bonito.", "Eres mi persona favorita."]));
  var closing = D.message ? String(D.message) : "…y podría seguir, pero el frasco se quedó pequeño.";

  var order = reasons.map(function(_, i){ return i; });
  for (var i = order.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = order[i]; order[i] = order[j]; order[j] = t;
  }
  var idx = 0;

  function slips(el, n) {
    el.innerHTML = "";
    for (var k = 0; k < n; k++) {
      var s = document.createElement("div");
      s.className = "slip";
      s.style.bottom = (14 + k * 20) + "px";
      s.style.setProperty("--r", ((k * 37) % 21 - 10) + "deg");
      el.appendChild(s);
    }
  }
  slips(document.getElementById("glassCover"), Math.min(reasons.length, 8));
  slips(document.getElementById("glassPlay"), Math.min(reasons.length, 8));

  var cover = document.getElementById("cover");
  var play = document.getElementById("play");
  function open(){ cover.classList.add("hidden"); play.classList.remove("hidden"); }
  document.getElementById("openBtn").addEventListener("click", open);
  document.getElementById("jarCover").addEventListener("click", open);

  var reasonBox = document.getElementById("reasonBox");
  var doneBox = document.getElementById("doneBox");
  var moreBox = document.getElementById("moreBox");
  function draw() {
    if (idx >= order.length) {
      reasonBox.classList.add("hidden"); moreBox.classList.add("hidden");
      document.getElementById("doneText").textContent = closing;
      doneBox.classList.remove("hidden"); doneBox.classList.add("fade");
      return;
    }
    var r = reasons[order[idx]];
    document.getElementById("reasonText").textContent = String(r);
    document.getElementById("reasonNum").textContent = "razón " + (idx + 1);
    document.getElementById("counter").textContent = (idx + 1) + " de " + order.length;
    reasonBox.classList.remove("hidden");
    var box = reasonBox.querySelector(".reason");
    box.classList.remove("reason"); void box.offsetWidth; box.classList.add("reason");
    slips(document.getElementById("glassPlay"), Math.max(0, Math.min(order.length - idx - 1, 8)));
    idx++;
  }
  document.getElementById("jarPlay").addEventListener("click", draw);
  document.getElementById("moreBtn").addEventListener("click", draw);
  document.getElementById("againBtn").addEventListener("click", function(){
    idx = 0; doneBox.classList.add("hidden"); reasonBox.classList.add("hidden"); moreBox.classList.remove("hidden");
    slips(document.getElementById("glassPlay"), Math.min(reasons.length, 8));
  });
})();
</script>
</body>
</html>`;

export const SAMPLE_LOVI_NAME = "Frasco de razones";
export const SAMPLE_LOVI_DESCRIPTION =
  "Un frasco virtual lleno de razones por las que amas a esa persona. Toca el frasco y saca papelitos, uno por uno.";

export const SAMPLE_LOVI_SLOTS: LoviSlot[] = [
  { key: "names", type: "names", label: "Nombres", required: true },
  { key: "memories", type: "memories[]", label: "Razones", required: true },
  { key: "message", type: "text", label: "Mensaje final", required: false },
];

/** Sample dedication data used for previews (studio + gallery). */
export const SAMPLE_PREVIEW_DATA: LoviData = {
  names: { from: "Juan", to: "María" },
  memories: [
    "Tu risa me arregla hasta el peor día.",
    "Cómo me miras cuando crees que no me doy cuenta.",
    "Tus mensajes de buenos días.",
    "Que siempre sabes qué decir.",
  ],
  message: "…y podría seguir, pero el frasco se quedó pequeño. Te amo.",
};
