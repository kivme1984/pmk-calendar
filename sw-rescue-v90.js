const VERSION='90-rescue';
const CACHE='pmk-calendar-rescue-v90';
const DATA_CACHE='pmk-calendar-data-v68';
const CORE=['./index.html','./','./styles.css','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];

async function fetchFresh(url,timeout=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(`${url}${url.includes('?')?'&':'?'}rescue=90`,{cache:'no-store',signal:controller.signal});}
  finally{clearTimeout(timer);}
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const url of CORE){
    try{
      const response=await fetchFresh(url);
      if(response.ok)await cache.put(url,response.clone());
    }catch{}
  }
  const index=await cache.match('./index.html');
  const app=await cache.match('./app.js');
  const css=await cache.match('./styles.css');
  if(!index||!app||!css)throw new Error('Rescue core files are incomplete');
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE&&key!==DATA_CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

async function cached(path){return (await caches.open(CACHE)).match(path);}

async function navigationResponse(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){
      const cache=await caches.open(CACHE);
      await cache.put('./index.html',response.clone());
      await cache.put('./',response.clone());
    }
    return response;
  }catch{
    return (await cached('./index.html'))||(await cached('./'))||Response.error();
  }
}

async function assetResponse(request,path){
  const hit=await cached(path);
  const update=fetch(request,{cache:'no-store'}).then(async response=>{
    if(response.ok){
      const cache=await caches.open(CACHE);
      await cache.put(path,response.clone());
    }
    return response;
  }).catch(()=>null);
  return hit||await update||Response.error();
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.location.origin))return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate')return event.respondWith(navigationResponse(event.request));
  if(url.pathname.endsWith('/app.js'))return event.respondWith(assetResponse(event.request,'./app.js'));
  if(url.pathname.endsWith('/styles.css'))return event.respondWith(assetResponse(event.request,'./styles.css'));
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
