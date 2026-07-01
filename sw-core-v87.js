const VERSION='87';
const CACHE=`pmk-calendar-v${VERSION}`;
const BUNDLE_JS='./__pmk-app-v87.js';
const BUNDLE_CSS='./__pmk-styles-v87.css';

const JS=`
./app.js?source=87
./manager-planner-core.js
./manager-planner-hooks.js
./address-autocomplete.js?v=41
./address-mobile-v46.js
./stability-route.js?v=34
./stability-cache.js?v=34
./stability-copy.js?v=34
./stability-draft.js?v=34
./google-freeform-import.js?v=36
./runtime-stability-v37.js
./fast-calendar-sync-v68.js?v=68
./returning-client-search.js?v=57
./client-search-fast-v68.js?v=68
./smart-paste-v38.js
./smart-paste-lifecycle-v38.js
./smart-parser-v45.js
./voice-parser-fast-v68.js?v=68
./empty-rug-dimensions-v42.js
./unified-rug-services-v43.js?v=68
./pricing-v48.js?v=68
./pricing-settings-v67.js?v=70
./manager-ui-v50-preview.js?v=68
./manager-ui-v50-refinements.js?v=68
./manager-ui-v51.js?v=70
./manager-ui-v51-tools-stable.js?v=68
./android-autofill-off-v53.js?v=55
./preview-description-v53.js?v=54
./edit-save-hotfix-v54.js?v=55
./address-placeholders-off-v56.js?v=56
./workshop-measurement-v58.js?v=58
./settings-version-header-v59.js?v=87
./navigation-layer-swipe-fix-v60.js?v=60
./planning-refresh-remove-v62.js?v=62
./header-sync-status-v65.js?v=65
./reminder-save-confirm-v66.js?v=66
./manager-workspace-fast-v68.js?v=68
./yandex-calendar-sync-v69.js?v=69
./provider-status-manager-v70.js?v=70
./unlimited-overlaps-v69.js?v=71
./provider-crud-any-calendar-v72.js?v=72
./yandex-primary-refresh-v72.js?v=72
./compact-floating-note-v73.js?v=87
./status-ledger-v80.js?v=87
./in-work-workflow-v73.js?v=73
./status-pipeline-v81.js?v=87
./archive-policy-v82.js?v=87
./completed-archive-workflow-v82.js?v=87
./period-model-v83.js?v=87
./mobile-period-workday-v83.js?v=87
./period-class-fix-v83.js?v=87
./period-header-provider-v85.js?v=87
./mobile-workflow-fixes-v86.js?v=87
./workday-period-note-v86.js?v=87
./version-guard-v87.js?v=87
`.trim().split(/\s+/);

const CSS=`
./styles.css?source=87
./manager-planner.css?v=32
./address-autocomplete.css?v=39
./mobile-rug-layout.css?v=36
./manager-form-v40.css
./unified-rug-services-v43.css?v=46
./manager-ui-v50-preview.css?v=68
./manager-ui-v50-refinements.css?v=68
./manager-ui-v51.css?v=68
./v51-tools-stable.css?v=68
./pricing-settings-v67.css?v=69
./preview-readability-v56.css?v=56
./workshop-measurement-v58.css?v=58
./settings-version-header-v59.css?v=59
./navigation-layer-swipe-fix-v60.css?v=60
./header-sync-status-v65.css?v=65
./reminder-save-confirm-v66.css?v=66
./client-search-workflow-v66.css?v=67
./manager-workspace-v66.css?v=67
./performance-fixes-v68.css?v=68
./provider-status-manager-v70.css?v=70
./compact-floating-note-v73.css?v=87
./in-work-workflow-v73.css?v=73
./light-interface-v74.css?v=74
./contract-required-v75.css?v=75
./instant-status-feedback-v77.css?v=87
./completed-archive-workflow-v82.css?v=87
./mobile-period-workday-v83.css?v=87
./period-class-fix-v83.css?v=87
./period-header-provider-v85.css?v=87
./mobile-workflow-fixes-v86.css?v=87
./workday-period-note-v86.css?v=87
`.trim().split(/\s+/);

const OPTIONAL=['./reset.html','./recovery.html','./safe.html','./manifest.webmanifest','./version.json','./icons/icon-192.png','./icons/icon-512.png'];

function fetchWithTimeout(url,timeout=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  return fetch(url,{cache:'no-store',signal:controller.signal}).finally(()=>clearTimeout(timer));
}

async function textAsset(url){
  const response=await fetchWithTimeout(url);
  if(!response.ok)throw new Error(`${url}: ${response.status}`);
  const text=await response.text();
  if(url.includes('version-guard-v87.js')&&!text.includes("const VERSION = '87'"))throw new Error('Неверный контрольный файл v87');
  return text;
}

async function put(cache,key,response){
  await cache.put(new Request(key,{cache:'reload'}),response);
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const index=await fetchWithTimeout(`./index.html?install=${VERSION}`);
  if(!index.ok)throw new Error(`index.html: ${index.status}`);
  await put(cache,'./index.html',index.clone());
  await put(cache,'./',index.clone());
  const [js,css]=await Promise.all([
    Promise.all(JS.map(textAsset)),
    Promise.all(CSS.map(textAsset)),
  ]);
  await put(cache,BUNDLE_JS,new Response(js.join('\n\n'),{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION}}));
  await put(cache,BUNDLE_CSS,new Response(css.join('\n\n'),{headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION}}));
  await Promise.allSettled(OPTIONAL.map(async url=>{
    const response=await fetchWithTimeout(`${url}?install=${VERSION}`,5000);
    if(response.ok)await put(cache,url,response);
  }));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE&&key!=='pmk-calendar-data-v68').map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

async function cached(key){return (await caches.open(CACHE)).match(key);}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.location.origin))return;
  const url=new URL(event.request.url);
  if(url.pathname.endsWith('/app.js'))return event.respondWith(cached(BUNDLE_JS).then(value=>value||fetch(event.request)));
  if(url.pathname.endsWith('/styles.css'))return event.respondWith(cached(BUNDLE_CSS).then(value=>value||fetch(event.request)));
  if(event.request.mode==='navigate')return event.respondWith(cached('./index.html').then(value=>value||fetch(event.request)));
  event.respondWith(caches.match(event.request).then(value=>value||fetch(event.request)));
});