const CACHE='price-hunter-v040';
const OWN=['./','./index.html','./core.js','./screenshot.js','./priceguard.js','./market-config.js','./marketsearch.js','./app.js','./market-ui.js','./manifest.webmanifest','./assets/icon.svg'];
self.addEventListener('install',evt=>evt.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(OWN)).then(()=>self.skipWaiting())));
self.addEventListener('activate',evt=>evt.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',evt=>{const req=evt.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;evt.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return res;}).catch(()=>caches.match(req)));});
