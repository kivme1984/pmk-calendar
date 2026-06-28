const VERSION='63';
const CACHE=`pmk-calendar-v${VERSION}`;
const JS=[
  './app.js?v=63','./manager-planner-core.js','./manager-planner-hooks.js',
  './address-autocomplete.js?v=41','./address-mobile-v46.js','./stability-route.js?v=34',
  './stability-cache.js?v=34','./stability-copy.js?v=34','./stability-draft.js?v=34',
  './google-freeform-import.js?v=36','./runtime-stability-v37.js',
  './calendar-full-sync-v57.js?v=57','./returning-client-search.js?v=57',
  './smart-paste-v38.js','./smart-paste-lifecycle-v38.js','./smart-parser-v45.js',
  './smart-parser-v45-runtime-fix.js','./smart-parser-v47.js','./smart-parser-v47-name-fix.js',
  './smart-parser-v47-assignments.js','./hotfix-parser-v48.js','./parser-real-case-v49.js?v=49',
  './empty-rug-dimensions-v42.js','./unified-rug-services-v43.js?v=68','./pricing-v48.js?v=68',
  './pricing-settings-v67.js?v=70','./manager-ui-v50-preview.js?v=68',
  './manager-ui-v50-refinements.js?v=68','./manager-ui-v51.js?v=70',
  './manager-ui-v51-tools-stable.js?v=68','./manager-ui-v51-draft.js?v=68',
  './android-autofill-off-v53.js?v=55','./preview-description-v53.js?v=54',
  './edit-save-hotfix-v54.js?v=55','./address-placeholders-off-v56.js?v=56',
  './client-info-sticky-v57.js?v=61','./workshop-measurement-v58.js?v=58',
  './settings-version-header-v59.js?v=63','./navigation-layer-swipe-fix-v60.js?v=60',
  './planning-refresh-remove-v62.js?v=62'
];
const CSS=[
  './styles.css?v=63','./manager-planner.css?v=32','./address-autocomplete.css?v=39',
  './mobile-rug-layout.css?v=36','./manager-form-v40.css','./unified-rug-services-v43.css?v=46',
  './manager-ui-v50-preview.css?v=68','./manager-ui-v50-refinements.css?v=68',
  './manager-ui-v51.css?v=68','./v51-tools-stable.css?v=68','./pricing-settings-v67.css?v=69',
  './preview-readability-v56.css?v=56','./client-info-sticky-v57.css?v=61',
  './workshop-measurement-v58.css?v=58','./settings-version-header-v59.css?v=59',
  './navigation-layer-swipe-fix-v60.css?v=60'
];
const ASSETS=[
  './','./index.html','./reset.html','./recovery.html','./v51-preview.html','./address-test.html','./worker-update.html',
  './manifest.webmanifest','./version.json',
  './icons/icon-192.png','./icons/icon-512.png',...JS,...CSS
];

async function fetchFresh(url){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`Не удалось загрузить ${url}: ${response.status}`);
  return response;
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const results=await Promise.allSettled(ASSETS.map(async asset=>{
    const response=await fetchFresh(asset);
    await cache.put(asset,response.clone());
  }));
  const failed=results.filter(item=>item.status==='rejected');
  if(failed.length)console.warn(`PMK v${VERSION}: часть необязательных файлов пока не закеширована`,failed.length);
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

async function text(url){
  return (await fetchFresh(url)).text();
}

async function optionalText(url,index){
  try{
    return await text(url);
  }catch(error){
    if(index===0)throw error;
    console.warn(`PMK v${VERSION}: пропущен необязательный модуль ${url}`,error);
    return `\n;console.warn(${JSON.stringify(`PMK: модуль ${url} временно не загружен`)});`;
  }
}

async function store(request,response){
  try{
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }catch(error){
    console.warn('PMK: не удалось обновить кэш ответа',error);
  }
  return response;
}

async function fallback(request,url){
  const direct=await caches.match(request);
  if(direct)return direct;
  const cached=await caches.match(url);
  if(cached)return cached;
  return fetch(url,{cache:'no-store'});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.location.origin))return;
  const url=new URL(event.request.url);

  if(url.pathname.endsWith('/app.js')){
    event.respondWith((async()=>{
      try{
        const body=(await Promise.all(JS.map(optionalText))).join('\n\n');
        return store(event.request,new Response(body,{headers:{
          'Content-Type':'application/javascript; charset=utf-8',
          'Cache-Control':'no-store','X-PMK-Version':VERSION
        }}));
      }catch(error){
        console.error('PMK v63 bundle error',error);
        return fallback(event.request,'./app.js?v=63');
      }
    })());
    return;
  }

  if(url.pathname.endsWith('/styles.css')){
    event.respondWith((async()=>{
      try{
        const parts=await Promise.all(CSS.map(async (asset,index)=>{
          try{return await text(asset);}catch(error){
            if(index===0)throw error;
            console.warn(`PMK v${VERSION}: пропущен необязательный стиль ${asset}`,error);
            return '';
          }
        }));
        return store(event.request,new Response(parts.join('\n\n'),{headers:{
          'Content-Type':'text/css; charset=utf-8',
          'Cache-Control':'no-store','X-PMK-Version':VERSION
        }}));
      }catch(error){
        console.error('PMK v63 styles error',error);
        return fallback(event.request,'./styles.css?v=63');
      }
    })());
    return;
  }

  const networkFirst=event.request.mode==='navigate'||/\.(?:html|js|css|json|webmanifest)$/.test(url.pathname);
  if(networkFirst){
    event.respondWith(fetch(event.request,{cache:'no-store'})
      .then(response=>store(event.request,response))
      .catch(()=>fallback(event.request,url.pathname.endsWith('/')?'./':'./index.html')));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>store(event.request,response))));
});