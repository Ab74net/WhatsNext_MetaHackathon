// Dependency-free Chrome DevTools browser test. Run against a fresh static build.
// No API server, paid calls, telemetry, or third-party browser service.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const out = path.resolve(repo, "scripts/out/demo-browser");
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const origin = "http://127.0.0.1:3062";
const candidates = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
const binary = candidates.find(p => fs.existsSync(p));
if (!binary) throw new Error("Install Chrome/Chromium locally, or set CHROME_PATH for this development test.");
let server, chrome, ws, sid, seq = 0, serverLog = "";
const pending = new Map(), network = [], exceptions = [], downloads = [], failures = [], checks = [];
let probingCsp = false;
try {
  server = spawn(process.execPath, [path.join(repo, "apps/web/scripts/serve-demo.mjs"), "3062"], { cwd: repo, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", d => { serverLog += d; });
  let ready = false;
  for (let i = 0; i < 80; i++) { try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {} await pause(150); }
  if (!ready) throw new Error("Static preview did not start: " + serverLog);
  chrome = spawn(binary, ["--headless=new", "--disable-gpu", "--no-first-run", "--disable-background-networking", "--disable-sync", "--remote-debugging-port=9252", "--user-data-dir=" + path.join(out, "profile-" + Date.now()), "about:blank"], { windowsHide: true, stdio: "ignore" });
  let version;
  for (let i = 0; i < 80; i++) { try { version = await (await fetch("http://127.0.0.1:9252/json/version")).json(); break; } catch {} await pause(150); }
  if (!version) throw new Error("Local Chrome did not start.");
  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer); if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result); }
    if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.text);
    if (m.method === "Network.requestWillBeSent") {
      const request = m.params.request;
      if (/^https?:/.test(request.url)) {
        if (probingCsp && request.url === "https://example.invalid/demo-csp-probe") return;
        network.push({ url: request.url, method: request.method });
        if (new URL(request.url).origin !== origin) failures.push("Off-origin request: " + request.url);
        if (/LOCAL_ONLY_/.test(request.url + (request.postData || ""))) failures.push("Free text entered a request");
        if (request.method !== "GET" && request.method !== "HEAD") failures.push("Unexpected write request: " + request.url);
      }
    }
    if (m.method === "Browser.downloadProgress" && m.params.state === "completed") downloads.push(m.params.guid);
  };
  const send = (method, params = {}, sessionId = sid) => new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(new Error("Timeout: " + method)); }, 20000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const evaluate = async expression => { const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result?.value; };
  const wait = async (expression, label, ms = 10000) => { const start = Date.now(); while (Date.now() - start < ms) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); } throw new Error("Not ready: " + label); };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" }, null);
  sid = (await send("Target.attachToTarget", { targetId, flatten: true }, null)).sessionId;
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: out, eventsEnabled: true }, null);
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__permissionCalls=[];window.__cspViolations=[];document.addEventListener('securitypolicyviolation',e=>window.__cspViolations.push({directive:e.effectiveDirective,blocked:e.blockedURI}));for(const key of ['mediaDevices','geolocation'])Object.defineProperty(navigator,key,{get(){window.__permissionCalls.push(key);throw Error('Forbidden permission API: '+key)}});try{localStorage.setItem('tour-seen-v1','1')}catch{}` });
  const navigate = async route => { await send("Page.navigate", { url: origin + route }); await wait("document.readyState==='complete' && !!document.querySelector('[aria-label=\"Concept demo notice\"]')", route); await pause(300); };
  const click = async selector => { await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)throw Error('Missing or disabled control: '+${JSON.stringify(selector)});el.click()})()`); await pause(100); };
  const clickText = async text => { await evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(el=>el.innerText.trim()===${JSON.stringify(text)});if(!el||el.disabled)throw Error('Missing or disabled button: '+${JSON.stringify(text)});el.click()})()`); await pause(100); };
  const type = async (selector, text) => { await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing input');const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(text)});el.dispatchEvent(new Event('input',{bubbles:true}))})()`); await pause(100); };
  const snapshot = async name => { const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); fs.writeFileSync(path.join(out, name + ".png"), Buffer.from(shot.data, "base64")); };
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "dark" }] });
  await navigate("/");
  assert.equal(await evaluate("document.documentElement.dataset.theme"), "light", "Light must be the default even under a dark OS theme");
  await click('[aria-label="Switch to dark mode"]'); assert.equal(await evaluate("document.documentElement.dataset.theme"), "dark");
  await click('[aria-label="Switch to light mode"]');
  await click('[data-tour-link]'); await wait("document.querySelector('[role=dialog]')", "guided tour dialog");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"), true);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await wait("!document.querySelector('[role=dialog]')", "tour escape");
  checks.push("home, persistent banner, light default and dark toggle");
  await navigate("/agent/");
  await wait("document.querySelectorAll('[data-sample-prompt]').length===10", "sample chips");
  for (const id of ["flood", "shelter", "claim", "aid", "documents", "water", "injury", "wildfire", "earthquake", "plan"]) {
    const before = await evaluate("document.querySelectorAll('[data-role=assistant]').length");
    await evaluate("document.querySelector('details').open=true"); await click(`[data-sample-prompt="${id}"]`);
    await wait(`document.querySelectorAll('[data-role=assistant]').length===${before + 1} && !document.body.innerText.includes('Preparing a sample plan…')`, "reply " + id);
    assert.ok(await evaluate("[...document.querySelectorAll('[data-role=assistant]')].at(-1).innerText.includes('Sample response')"));
    if (id === "injury") assert.equal(await evaluate("[...document.querySelectorAll('[data-role=assistant]')].at(-1).querySelectorAll('a[href=\"tel:911\"]').length"), 1);
    if (id === "shelter") { await click('[aria-label^="Show Riverside"]'); assert.ok(await evaluate("document.body.innerText.includes('Example data. Fictional place')")); }
  }
  await type('input[aria-label^="Message"]', "LOCAL_ONLY_penguin_request");
  await evaluate("document.querySelector('form[data-tour=agent-input]').requestSubmit()");
  await wait("[...document.querySelectorAll('[data-role=assistant]')].at(-1)?.innerText.includes('sample prompts only')", "local fallback");
  await snapshot("agent-desktop"); checks.push("all ten scripted prompts, cards, safety walkthrough, emergency stop, fictional map and free-text fallback");
  await navigate("/claims/");
  await click('[data-sample-set="living"]'); await clickText("Simulate scan");
  await wait("document.body.innerText.includes('Sample results are ready.')", "sample scan and merge");
  await clickText("Review items"); await wait("document.querySelectorAll('[data-item-id]').length===6", "six merged items");
  await click('[data-item-id="living-room-sofa"] [aria-label="Edit"]'); await type('[data-item-id="living-room-sofa"] [aria-label="Brand"]', "Example edited brand");
  await evaluate("[...document.querySelector('[data-item-id=\"living-room-sofa\"]').querySelectorAll('button')].find(b=>b.innerText==='Save').click()");
  await wait("document.querySelector('[data-item-id=\"living-room-sofa\"]').innerText.includes('Example edited brand')", "saved local edit");
  await click('[data-item-id="living-mirror-vase"] [aria-label="Remove"]');
  await wait("document.querySelectorAll('[data-item-id]').length===5", "remove sample item");
  await evaluate("[...document.querySelectorAll('[data-item-id] button')].filter(b=>b.innerText.trim()==='Confirm').forEach(b=>b.click())");
  await wait("document.querySelectorAll('[data-item-id] button[aria-pressed=true]').length===5", "confirm five sample items");
  await evaluate("[...document.querySelectorAll('[role=tab]')].find(b=>b.innerText.startsWith('Confirmed')).click()");
  assert.equal(await evaluate("document.querySelectorAll('[data-item-id]').length"), 5);
  await click('[data-item-id="living-room-coffee-table"] [aria-label="Split"]');
  await wait("document.querySelectorAll('[data-item-id]').length===6", "split duplicate");
  await clickText("Merge by hand");
  await click('[aria-label="Select coffee table for merge"]');
  await evaluate("[...document.querySelectorAll('[aria-label=\"Select coffee table for merge\"]')].at(-1).click()");
  await clickText("Merge 2"); await wait("document.querySelectorAll('[data-item-id]').length===5", "manual merge");
  await click('[data-tour="claims-step-remember"]');
  await wait("document.querySelector('[data-node-kind=suggestion]')", "static Memory Web");
  await evaluate("document.querySelector('[data-node-kind=room]').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}))");
  await wait("document.getElementById('memory-related-suggestions')", "related suggestion popover");
  await evaluate("document.querySelector('[data-node-kind=suggestion][aria-label=\"Did you own laptop?\"]').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}))");
  await evaluate("[...document.querySelectorAll('[data-memory-details] button')].find(b=>b.innerText.includes('Attach sample photo')).click()");
  await wait("document.body.innerText.includes('Confirm sample item')", "sample evidence"); await clickText("Confirm sample item");
  await click('[aria-label="Zoom in"]'); await click('[aria-label="Fit to view"]');
  await snapshot("memory-desktop"); checks.push("sample scan, local edit/remove/confirm/filter, split/manual merge, Memory Web and sample evidence");
  await click('[data-tour="claims-step-export"]'); await wait("document.body.innerText.includes('Your sample export is ready.')", "export step");
  const estimateButton = await evaluate("[...document.querySelectorAll('button')].find(b=>/^Estimate .*prices?$/.test(b.innerText.trim()))?.innerText");
  if (estimateButton) { await clickText(estimateButton); await wait("!document.body.innerText.includes('Loading sample estimate')", "sample values"); await pause(800); }
  for (const label of ['Download sample PDF report (.pdf)', 'Download sample Excel spreadsheet (.xlsx)', 'Download sample CSV (.csv)']) await click(`[aria-label="${label}"]`);
  await wait("!document.body.innerText.includes('Preparing sample…')", "browser downloads");
  const downloadStart = Date.now(); while (downloads.length < 3 && Date.now() - downloadStart < 10000) await pause(150);
  assert.equal(downloads.length, 3, "All three sample files must download");
  await snapshot("export-desktop");
  await navigate("/claims/"); await click('[data-tour="claims-step-review"]');
  await wait("document.querySelectorAll('[data-item-id]').length===6", "restored local claim"); checks.push("browser PDF/XLSX/CSV downloads and local reload persistence");
  await navigate("/aid/"); await click('[data-aid-sample]');
  await wait("document.querySelector('[data-aid-program]')", "local Aid dashboard");
  await evaluate("document.querySelector('[data-aid-program] button[aria-expanded]').click()"); await clickText("Help me prepare");
  await wait("document.body.innerText.includes('Sample answer draft')", "template checklist");
  await click('section.aid-preparation input[type="checkbox"]');
  await type('section.aid-preparation textarea', "LOCAL_ONLY_sample_template_edit");
  await snapshot("aid-desktop"); checks.push("Aid sample matcher, program notices, checklist and editable local draft");
  await navigate("/toolkit/"); await wait("document.body.innerText.includes('Before the call') || document.body.innerText.includes('What did you lose?')", "Toolkit");
  await navigate("/toolkit/#documents");
  await wait("document.body.innerText.includes('What did you lose?')", "document guide");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Birth certificate')?.click()");
  checks.push("static Toolkit and document replacement data");
  for (const width of [1440, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width === 390 });
    for (const route of ["/", "/agent/", "/claims/", "/aid/", "/toolkit/", "/our-story/", "/privacy/", "/about-demo/", "/missing-page/"]) {
      await navigate(route);
      const result = await evaluate("({overflow:document.documentElement.scrollWidth>innerWidth+1,files:document.querySelectorAll('input[type=file]').length,permissions:window.__permissionCalls,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),title:document.title})");
      assert.equal(result.overflow, false, `${route} at ${width} overflows`); assert.equal(result.files, 0); assert.deepEqual(result.permissions, []); assert.deepEqual(result.broken, []); assert.match(result.title, /concept demo/i);
      if (width === 390 && ["/", "/claims/", "/about-demo/"].includes(route)) await snapshot(route === "/" ? "home-mobile" : route.split("/")[1] + "-mobile");
    }
  }
  checks.push("18 desktop/mobile routes: no overflow, broken images, file inputs or permission API access");
  await navigate("/privacy/");
  probingCsp = true;
  const probe = await evaluate("fetch('https://example.invalid/demo-csp-probe').then(()=>false).catch(()=>true)");
  await pause(200); probingCsp = false;
  assert.equal(probe, true);
  assert.equal(await evaluate("window.__cspViolations.some(v=>v.directive==='connect-src'&&v.blocked==='https://example.invalid/demo-csp-probe')"), true, "CSP must block an external connection before it leaves the origin");
  checks.push("connect-src self blocks a deliberate external probe");
  await clickText("Reset demo"); await wait("location.pathname==='/'", "reset navigation");
  assert.equal(await evaluate("localStorage.getItem('concept-demo-claims-v1')"), null);
  assert.equal(await evaluate("sessionStorage.getItem('concept-demo-chat-v1')"), null);
  assert.equal(await evaluate("Object.keys(localStorage).filter(k=>k.startsWith('wn-device:')).length"), 0);
  checks.push("Reset demo clears saved browser state");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw Error('Storage blocked by test')}" });
  await navigate("/claims/"); await clickText("Simulate scan");
  await wait("document.body.innerText.includes('Sample results are ready.')", "scan with browser storage blocked");
  await clickText("Review items"); await wait("document.querySelectorAll('[data-item-id]').length===6", "in-memory claim fallback");
  await evaluate("[...document.querySelectorAll('[data-item-id] button')].find(b=>b.innerText.trim()==='Confirm').click()");
  await wait("document.querySelectorAll('[data-item-id] button[aria-pressed=true]').length===1", "in-memory confirmation");
  checks.push("guided tour keyboard focus/Escape and claim editing with storage blocked");
  assert.deepEqual(exceptions, [], "No uncaught browser exceptions"); assert.deepEqual(failures, [], "No external or data-bearing requests");
  const report = { checks, networkRequests: network.length, outsideRequests: network.filter(r => new URL(r.url).origin !== origin), uncaughtExceptions: exceptions, downloads: downloads.length, failures };
  fs.writeFileSync(path.join(out, "results.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await send("Browser.close", {}, null).catch(() => {});
} catch (e) {
  fs.writeFileSync(path.join(out, "failure.json"), JSON.stringify({ error: String(e), checks, exceptions, failures, network }, null, 2));
  throw e;
} finally {
  if (ws) ws.close(); if (chrome) chrome.kill(); if (server) server.kill();
}
