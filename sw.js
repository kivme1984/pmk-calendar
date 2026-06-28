const VERSION='60';
const CACHE=`pmk-calendar-v${VERSION}`;
const JS=[
  './app.js?v=60','./manager-planner-core.js','./manager-planner-hooks.js',
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
  './client-info-sticky-v57.js?v=57','./workshop-measurement-v58.js?v=58',
  './settings-version-header-v59.js?v=59','./navigation-layer-swipe-fix-v60.js?v=60'
];
const CSS=[
  './styles.css?v=60','./manager-planner.css?v=32','./address-autocomplete.css?v=39',
  './mobile-rug-layout.css?v=36','./manager-form-v40.css','./unified-rug-services-v43.css?v=46',
  './manager-ui-v50-preview.css?v=68','./manager-ui-v50-refinements.css?v=68',
  './manager-ui-v51.css?v=68','./v51-tools-stable.css?v=68','./pricing-settings-v67.css?v=69',
  './preview-readability-v56.css?v=56','./client-info-sticky-v57.css?v=57',
  './workshop-measurement-v58.css?v=58','./settings-version-header-v59.css?v=59',
  './navigation-layer-swipe-fix-v60.css?v=60'
];
const ASSETS=[
  './','./index.html','./reset.html','./v51-preview.html','./address-test.html','./worker-update.html',
  './manifest.webmanifest','./version.json',
  './icons/icon-192.png','./icons/icon-512.png',...JS,...CSS
];

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

async function text(url){
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`Не удалось загрузить ${url}`);
  return response.text();
}
async function store(request,response){
  const cache=await caches.open(CACHE);
  await cache.put(request,response.clone());
  return response;
}
async function fallback(request,url){
  return (await caches.match(request))||(await caches.match(url))||fetch(url,{cache:'no-store'});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.location.origin))return;
  const url=new URL(event.request.url);

  if(url.pathname.endsWith('/app.js')){
    event.respondWith((async()=>{
      try{
        const body=(await Promise.all(JS.map(text))).join('\n\n');
        return store(event.request,new Response(body,{headers:{
          'Content-Type':'application/javascript; charset=utf-8',
          'Cache-Control':'no-store','X-PMK-Version':VERSION
        }}));
      }catch(error){
        console.error('PMK v60 bundle error',error);
        return fallback(event.request,'./app.js?v=60');
      }
    })());
    return;
  }

  if(url.pathname.endsWith('/styles.css')){
    event.respondWith((async()=>{
      try{
        const body=(await Promise.all(CSS.map(text))).join('\n\n');
        return store(event.request,new Response(body,{headers:{
          'Content-Type':'text/css; charset=utf-8',
          'Cache-Control':'no-store','X-PMK-Version':VERSION
        }}));
      }catch(error){
        console.error('PMK v60 styles error',error);
        return fallback(event.request,'./styles.css?v=60');
      }
    })());
    return;
  }

  const networkFirst=event.request.mode==='navigate'||/\.(?:html|js|css|json|webmanifest)$/.test(url.pathname);
  if(networkFirst){
    event.respondWith(fetch(event.request,{cache:'no-store'})
      .then(response=>store(event.request,response))
      .catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>store(event.request,response))));
});