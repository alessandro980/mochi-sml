const C='mochi-sml-v10';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./style.css','./app.js','./mochi.js','./promemoria.js','./team.js','./sync.js','./firebase-bundle.js','./schedules.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png']))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>l.length?l[0].focus():clients.openWindow('./')))});
