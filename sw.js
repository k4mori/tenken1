const C='tenken-v341-form';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES).then(()=>c.add('./map.dat').catch(()=>{}))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith((async()=>{
    const cache=await caches.open(C);
    try{
      const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),5000);
      const r=await fetch(e.request,{signal:ctl.signal,cache:'no-cache'});clearTimeout(t);
      if(r.ok)cache.put(e.request,r.clone());return r;
    }catch(err){
      return (await cache.match(e.request,{ignoreSearch:true}))||(await cache.match('./index.html'));
    }
  })());
});
