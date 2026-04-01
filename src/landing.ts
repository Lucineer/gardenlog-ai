/**
 * Landing HTML — served by the worker at GET /
 *
 * For the full interactive UI, see public/app.html.
 * This is the minimal landing page served directly.
 */
export const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>gardenlog.ai — a vessel for gardeners</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--forest:#2D5016;--sage:#8FBC8F;--cream:#FFF8F0;--bark:#5C4033;--moss:#4A7C59;--leaf:#6B8E23}
  body{font-family:Georgia,'Times New Roman',serif;background:var(--cream);color:var(--bark);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .hero{text-align:center;padding:60px 20px;max-width:700px}
  .logo{font-size:48px;margin-bottom:8px}
  h1{font-size:42px;color:var(--forest);margin-bottom:12px;font-weight:400;letter-spacing:-1px}
  .tagline{font-size:18px;color:var(--moss);margin-bottom:36px;font-style:italic;line-height:1.6}
  .cta{display:inline-block;padding:14px 40px;background:var(--forest);color:var(--cream);text-decoration:none;border-radius:8px;font-size:16px;letter-spacing:.5px;transition:background .2s}
  .cta:hover{background:var(--moss)}
  .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;max-width:800px;margin:48px auto;padding:0 20px;text-align:center}
  .feature{padding:24px;border-radius:12px;background:#fff;border:1px solid #e8e0d4}
  .feature h3{color:var(--forest);margin:8px 0;font-size:16px}
  .feature p{font-size:13px;color:#8B7355;line-height:1.5}
  .icon{font-size:28px}
  footer{margin-top:auto;padding:20px;text-align:center;font-size:12px;color:#aaa8a0}
</style>
</head>
<body>
<div class="hero">
  <div class="logo">&#127793;</div>
  <h1>gardenlog.ai</h1>
  <p class="tagline">The cocapn remembers every plant, every harvest, every season.<br>It learns your microclimate.</p>
  <a class="cta" href="/app.html">Open Your Garden &#8594;</a>
</div>
<div class="features">
  <div class="feature"><div class="icon">&#127793;</div><h3>Plant Tracker</h3><p>Track every plant with profiles, growth stages, and care schedules.</p></div>
  <div class="feature"><div class="icon">&#128198;</div><h3>Planting Calendar</h3><p>Zone-aware calendar tells you what to plant and when.</p></div>
  <div class="feature"><div class="icon">&#127806;</div><h3>Companion Planting</h3><p>Know which plants grow well together — and which don't.</p></div>
  <div class="feature"><div class="icon">&#127813;</div><h3>Harvest Log</h3><p>Record yields, rate quality, and track what works season to season.</p></div>
  <div class="feature"><div class="icon">&#128172;</div><h3>Garden Chat</h3><p>Ask "why are my tomato leaves yellow?" and get real answers.</p></div>
  <div class="feature"><div class="icon">&#127758;</div><h3>Weather Wisdom</h3><p>Season-specific recommendations for your zone.</p></div>
</div>
<footer>gardenlog.ai v0.1.0 &mdash; a cocapn vessel</footer>
</body>
</html>`;
