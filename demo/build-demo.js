// Regenerates demo/index.html from snippets/install-banner-snippet.html
// so the preview always matches the real snippet.  Run: node demo/build-demo.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const snippet = fs.readFileSync(path.join(root, 'snippets/install-banner-snippet.html'), 'utf8')
  .replace("iconUrl:        '/assets/icons/icon-192.png'", "iconUrl:        '../assets/icons/icon-192.png'");

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preview — PTC install prompt</title>
<style>
  body { margin:0; font:400 16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
         background:#f6f8f7; color:#10221a; }
  header { background:#0d7a4f; color:#fff; padding:18px 20px; }
  header b { font-size:17px; }
  main { max-width:640px; margin:0 auto; padding:24px 20px 220px; }
  .card { background:#fff; border-radius:14px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,.08); margin-bottom:16px; }
  label { display:block; font-size:13px; font-weight:600; margin-bottom:6px; }
  input { width:100%; padding:12px; border:1px solid #d7e0dc; border-radius:10px; font:inherit; }
  .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eef2f0; font-size:14px; }
  .row:last-child { border:0; font-weight:700; }
  .tools button { border:0; border-radius:999px; padding:10px 16px; font:600 13px/1 inherit; cursor:pointer;
                  background:#10221a; color:#fff; margin:0 8px 8px 0; }
  .note { font-size:12.5px; color:#5b6b64; }
</style>
</head>
<body>
<header><b>Pak Tax Calculator</b><div style="font-size:12.5px;opacity:.85">Preview page — not the real site</div></header>
<main>
  <div class="card">
    <label for="sal">Monthly salary (PKR)</label>
    <input id="sal" type="number" value="250000" inputmode="numeric">
    <div style="height:14px"></div>
    <div class="row"><span>Annual salary</span><span id="a">3,000,000</span></div>
    <div class="row"><span>Annual tax (illustrative)</span><span id="t">265,000</span></div>
    <div class="row"><span>Monthly take-home</span><span id="n">227,917</span></div>
  </div>

  <div class="card tools">
    <p style="margin:0 0 12px;font-weight:700">Test the install prompt</p>
    <button onclick="ptcInstall.show()">Show banner now</button>
    <button data-ptc-install>Trigger install (menu-link style)</button>
    <button onclick="ptcInstall.reset();location.reload()">Reset saved state</button>
    <p class="note">On a real phone: Android Chrome shows the native install dialog once a
      manifest + service worker are live; iOS Safari shows the Add-to-Home-Screen steps.</p>
  </div>
</main>

<script>
  var f = new Intl.NumberFormat('en-PK');
  document.getElementById('sal').addEventListener('input', function () {
    var m = +this.value || 0, a = m * 12, tax = Math.max(0, (a - 600000) * 0.105);
    document.getElementById('a').textContent = f.format(a);
    document.getElementById('t').textContent = f.format(Math.round(tax));
    document.getElementById('n').textContent = f.format(Math.round((a - tax) / 12));
  });
</script>

${snippet}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), page);
console.log('demo/index.html written (' + page.length + ' bytes)');
