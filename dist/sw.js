const CACHE='tie-breaker-v13';
const assets=['./','./index.html','./style.css','./game.js','./match.js','./joystick.js','./animation.js','./venue.js','./three.module.js','./three.core.js','./manifest.webmanifest','./icon-192.png','./icon-512.png',...['venue-hard.jpg','venue-clay.jpg','venue-grass.jpg','venue-indoor.jpg','player.png','cpu.png','player_backhand.png','player_hold_left.png','player_toss_left.png','player_serve_left.png','player_forehand.png','player_lob.png','player_serve.png','cpu_backhand.png','cpu_hold_left.png','cpu_forehand.png','cpu_lob.png','cpu_serve.png','player_run_left.png','player_run_right.png','cpu_run_left.png','cpu_run_right.png','player_run_forward.png','player_run_backward.png','cpu_run_forward.png','cpu_run_backward.png','player_hold.png','player_toss.png','cpu_hold.png','cpu_toss.png'].map(n=>'./assets/'+n)];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(assets)))});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&(key.startsWith('tie-breaker-')||key.startsWith('baseline-'))).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try {const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
  catch(error){const cached=await cache.match(event.request,{ignoreSearch:true});if(cached)return cached;throw error;}
 })());
});
