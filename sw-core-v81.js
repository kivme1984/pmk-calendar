const VERSION='81';
const CACHE=`pmk-calendar-v${VERSION}`;
const BUNDLE_JS='./__pmk-app-v81.js';
const BUNDLE_CSS='./__pmk-styles-v81.css';

const JS=[
  './app.js?source=81','./manager-planner-core.js','./manager-planner-hooks.js',
  './address-autocomplete.js?v=41','./address-mobile-v46.js','./stability-route.js?v=34',
  './stability-cache.js?v=34','./stability-copy.js?v=34','./stability-draft.js?v=34',
  './google-freeform-import.js?v=36','./runtime-stability-v37.js',
  './fast-calendar-sync-v68.js?v=68','./returning-client-search.js?v=57','./client-search-fast-v68.js?v=68',
  './smart-paste-v38.js','./smart-paste-lifecycle-v38.js','./smart-parser-v45.js','./voice-parser-fast-v68.js?v=68',
  './empty-rug-dimensions-v42.js','./unified-rug-services-v43.js?v=68','./pricing-v48.js?v=68',
  './pricing-settings-v67.js?v=70','./manager-ui-v50-preview.js?v=68',
  './manager-ui-v50-refinements.js?v=68','./manager-ui-v51.js?v=70',
  './manager-ui-v51-tools-stable.js?v=68',
  './android-autofill-off-v53.js?v=55','./preview-description-v53.js?v=54',
  './edit-save-hotfix-v54.js?v=55','./address-placeholders-off-v56.js?v=56',
  './workshop-measurement-v58.js?v=58','./settings-version-header-v59.js?v=81',
  './navigation-layer-swipe-fix-v60.js?v=60','./planning-refresh-remove-v62.js?v=62',
  './header-sync-status-v65.js?v=65','./reminder-save-confirm-v66.js?v=66',
  './manager-workspace-fast-v68.js?v=68','./yandex-calendar-sync-v69.js?v=69',
  './provider-status-manager-v70.js?v=70','./unlimited-overlaps-v69.js?v=71',
  './provider-crud-any-calendar-v72.js?v=72','./yandex-primary-refresh-v72.js?v=72',
  './compact-floating-note-v73.js?v=74','./status-ledger-v80.js?v=81',
  './in-work-workflow-v73.js?v=73','./status-pipeline-v81.js?v=81',
  './completed-workflow-v80.js?v=81','./version-guard-v81.js?v=81'
];

const CSS=[
  './styles.css?source=81','./manager-planner.css?v=32','./address-autocomplete.css?v=39',
  './mobile-rug-layout.css?v=36','./manager-form-v40.css','./unified-rug-services-v43.css?v=46',
  './manager-ui-v50-preview.css?v=68','./manager-ui-v50-refinements.css?v=68',
  './manager-ui-v51.css?v=68','./v51-tools-stable.css?v=68','./pricing-settings-v67.css?v=69',
  './preview-readability-v56.css?v=56','./workshop-measurement-v58.css?v=58',
  './settings-version-header-v59.css?v=59','./navigation-layer-swipe-fix-v60.css?v=60',
  './header-sync-status-v65.css?v=65','./reminder-save-confirm-v66.css?v=66',
  './client-search-workflow-v66.css?v=67','./manager-workspace-v66.css?v=67',
  './performance-fixes-v68.css?v=68','./provider-status-manager-v70.css?v=70',
  './compact-floating-note-v73.css?v=74','./in-work-workflow-v73.css?v=73',
  './light-interface-v74.css?v=74','./contract-required-v75.css?v=75',
  './instant-status-feedback-v77.css?v=81','./completed-workflow-v80.css?v=81'
];

const REQUIRED_JS=new Set([
  './fast-calendar-sync-v68.js?v=68','./client-search-fast-v68.js?v=68',
  './voice-parser-fast-v68.js?v=68','./manager-workspace-fast-v68.js?v=68',
  './yandex-calendar-sync-v69.js?v=69','./provider-status-manager-v70.js?v=70',
  './unlimited-overlaps-v69.js?v=71','./provider-crud-any-calendar-v72.js?v=72',
  './yandex-primary-refresh-v72.js?v=72','./compact-floating-note-v73.js?v=74',
  './status-ledger-v80.js?v=81','./in-work-workflow-v73.js?v=73',
  './status-pipeline-v81.js?v=81','./completed-workflow-v80.js?v=81','./version-guard-v81.js?v=81'
]);
const REQUIRED_CSS=new Set([
  './client-search-workflow-v66.css?v=67','./manager-workspace-v66.css?v=67',
  './performance-fixes-v68.css?v=68','./provider-status-manager-v70.css?v=70',
  './compact-floating-note-v73.css?v=74','./in-work-workflow-v73.css?v=73',
  './light-interface-v74.css?v=74','./contract-required-v75.css?v=75',
  './instant-status-feedback-v77.css?v=81','./completed-workflow-v80.css?v=81'
]);

const OPTIONAL_ASSETS=[
  './reset.html','./recovery.html','./safe.html','./v51-preview.html','./address-test.html','./worker-update.html',
  './manifest.webmanifest','./version.json','./icons/icon-192.png','./icons/icon-512.png'
];

function fetchWithTimeout(url,timeout=9000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  return fetch(url,{cache:'no-store',signal:controller.signal}).finally(()=>clearTimeout(timer));
}

async function textAsset(url,required=false){
  try{
    const response=await fetchWithTimeout(url);
    if(!response.ok)throw new Error(`${response.status}`);
    const text=await response.text();
    if(required&&url.includes('version-guard-v81.js')&&!text.includes("const VERSION = '81'"))throw new Error('Неверный контрольный файл версии');
    return text;
  }catch(error){
    if(required)throw new Error(`Не удалось загрузить обязательный файл ${url}: ${error.message}`);
    console.warn(`PMK v${VERSION}: пропущен дополнительный файл ${url}`,error);
    return '';
  }
}

async function cacheResponse(cache,key,response){await cache.put(new Request(key,{cache:'reload'}),response);}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const indexResponse=await fetchWithTimeout(`./index.html?install=${VERSION}`);
  if(!indexResponse.ok)throw new Error(`index.html: ${indexResponse.status}`);
  const indexCopy=indexResponse.clone();
  await cacheResponse(cache,'./index.html',indexResponse);
  await cacheResponse(cache,'./',indexCopy);
  const jsParts=[];
  for(const [index,url] of JS.entries()) jsParts.push(await textAsset(url,index===0||REQUIRED_JS.has(url)));
  const cssParts=[];
  for(const [index,url] of CSS.entries()) cssParts.push(await textAsset(url,index===0||REQUIRED_CSS.has(url)));
  await cacheResponse(cache,BUNDLE_JS,new Response(jsParts.join('\n\n'),{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION}}));
  await cacheResponse(cache,BUNDLE_CSS,new Response(cssParts.join('\n\n'),{headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION}}));
  await Promise.allSettled(OPTIONAL_ASSETS.map(async url=>{
    const response=await fetchWithTimeout(`${url}${url.includes('?')?'&':'?'}install=${VERSION}`,5000);
    if(response.ok)await cacheResponse(cache,url,response);
  }));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE&&key!=='pmk-calendar-data-v68').map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

async function cached(key){return (await caches.open(CACHE)).match(key);}
async function networkAndStore(request,key=request){
  const response=await fetchWithTimeout(request.url||request,6000);
  if(response.ok){const cache=await caches.open(CACHE);await cache.put(key,response.clone());}
  return response;
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.location.origin))return;
  const url=new URL(event.request.url);
  if(url.pathname.endsWith('/app.js')){event.respondWith(cached(BUNDLE_JS).then(response=>response||fetch(event.request)));return;}
  if(url.pathname.endsWith('/styles.css')){event.respondWith(cached(BUNDLE_CSS).then(response=>response||fetch(event.request)));return;}
  const specialPage=/\/(?:reset|recovery|safe)\.html$/.test(url.pathname);
  if(event.request.mode==='navigate'&&specialPage){event.respondWith(networkAndStore(event.request,url.pathname.split('/').pop()).catch(()=>cached(url.pathname.split('/').pop())));return;}
  if(event.request.mode==='navigate'){event.respondWith(cached('./index.html').then(response=>response||fetch(event.request)));return;}
  event.respondWith(caches.match(event.request).then(response=>response||fetch(event.request).then(async networkResponse=>{
    if(networkResponse.ok){const cache=await caches.open(CACHE);cache.put(event.request,networkResponse.clone()).catch(()=>{});}
    return networkResponse;
  })));
});