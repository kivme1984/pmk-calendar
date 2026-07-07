const VERSION='82.20.0';
const BUILD='cardfix2-real-status-gap';
const CACHE=`pmk-calendar-v${VERSION}-${BUILD}`;
const BUNDLE_JS=`./__pmk-app-v82-20-0-${BUILD}.js`;
const BUNDLE_CSS=`./__pmk-styles-v82-20-0-${BUILD}.css`;

const JS=`
./app.js
./manager-planner-core.js
./manager-planner-hooks.js
./address-autocomplete.js
./address-mobile-v46.js
./stability-route.js
./stability-cache.js
./stability-copy.js
./stability-draft.js
./google-freeform-import.js
./runtime-stability-v37.js
./fast-calendar-sync-v68.js
./returning-client-search.js
./client-search-fast-v68.js
./smart-paste-v38.js
./smart-paste-lifecycle-v38.js
./smart-parser-v45.js
./voice-parser-fast-v68.js
./empty-rug-dimensions-v42.js
./unified-rug-services-v43.js
./pricing-v48.js
./pricing-settings-v67.js
./manager-ui-v50-preview.js
./manager-ui-v50-refinements.js
./manager-ui-v51.js
./manager-ui-v51-tools-stable.js
./android-autofill-off-v53.js
./preview-description-v53.js
./edit-save-hotfix-v54.js
./address-placeholders-off-v56.js
./workshop-measurement-v58.js
./settings-version-header-v59.js
./navigation-layer-swipe-fix-v60.js
./planning-refresh-remove-v62.js
./header-sync-status-v65.js
./reminder-save-confirm-v66.js
./manager-workspace-fast-v68.js
./yandex-calendar-sync-v69.js
./provider-status-manager-v70.js
./unlimited-overlaps-v69.js
./provider-crud-any-calendar-v72.js
./yandex-primary-refresh-v72.js
./compact-floating-note-v73.js
./status-ledger-v80.js
./in-work-workflow-v73.js
./status-pipeline-v81.js
./archive-policy-v82.js
./completed-archive-workflow-v82.js
./floating-note-mobile-v82-1.js
./status-left-column-v82-2.js
./workflow-fast-v82-7.js
./workflow-transition-fast-v82-7.js
./final-ui-v82-10.js
./period-direct-v82-19.js
./final-hotfix-v82-11.js
./final-layout-lock-v82-19-stable.js
./week-touch-scroll-v82-19-stable.js
./stable-version-label-v82-19.js
./menu-performance-v82-19.js
./quick-actions-icons-v82-19.js
./edge-menu-swipe-v82-19.js
./event-cloud-indicators-v82-19.js
./version-guard-v82.js
./smart-parser-feature-gate.js
./workflow-ui-cleanup-v82-19-2.js
./persistent-google-auth-v82-20.js
./event-card-approved-v82-20-1.js
`.trim().split(/\s+/);

const CSS=`
./styles.css
./manager-planner.css
./address-autocomplete.css
./mobile-rug-layout.css
./manager-form-v40.css
./unified-rug-services-v43.css
./manager-ui-v50-preview.css
./manager-ui-v50-refinements.css
./manager-ui-v51.css
./v51-tools-stable.css
./pricing-settings-v67.css
./preview-readability-v56.css
./workshop-measurement-v58.css
./settings-version-header-v59.css
./navigation-layer-swipe-fix-v60.css
./header-sync-status-v65.css
./reminder-save-confirm-v66.css
./client-search-workflow-v66.css
./manager-workspace-v66.css
./performance-fixes-v68.css
./provider-status-manager-v70.css
./compact-floating-note-v73.css
./in-work-workflow-v73.css
./light-interface-v74.css
./contract-required-v75.css
./instant-status-feedback-v77.css
./completed-archive-workflow-v82.css
./floating-note-mobile-v82-1.css
./status-left-column-v82-2.css
./workflow-fast-v82-7.css
./workflow-transition-fast-v82-7.css
./final-ui-v82-10.css
./final-hotfix-v82-11.css
./final-layout-lock-v82-12.css
./period-direct-v82-19.css
./week-touch-scroll-v82-19-stable.css
./stable-version-label-v82-19.css
./menu-performance-v82-19.css
./quick-actions-icons-v82-19.css
./event-cloud-indicators-v82-19.css
./workflow-ui-cleanup-v82-19-2.css
./persistent-google-auth-v82-20.css
./event-card-approved-v82-20-1.css
`.trim().split(/\s+/);

const OPTIONAL=['./reset.html','./recovery.html','./safe.html','./manifest.webmanifest','./version.json','./pmk-google-auth-config.json','./icons/icon-192.png','./icons/icon-512.png'];

function fetchWithTimeout(url,timeout=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  return fetch(url,{cache:'no-store',signal:controller.signal}).finally(()=>clearTimeout(timer));
}

async function textAsset(url){
  const response=await fetchWithTimeout(`${url}${url.includes('?')?'&':'?'}build=${encodeURIComponent(VERSION+'-'+BUILD)}`);
  if(!response.ok)throw new Error(`${url}: ${response.status}`);
  const text=await response.text();
  if(url.includes('version-guard-v82.js')&&(!text.includes("const VERSION = '82'")||!text.includes("const RELEASE = '82.20.0'")))throw new Error('Неверный контрольный файл v82.20.0');
  if(url.includes('event-cloud-indicators-v82-19.js')&&!text.includes('PMK_EVENT_CLOUD_INDICATORS_V82_19'))throw new Error('Не получены облачные индикаторы v82.20.0');
  if(url.includes('workflow-ui-cleanup-v82-19-2.js')&&!text.includes('PMK_WORKFLOW_UI_CLEANUP_V82_19_2'))throw new Error('Не получено исправление интерфейса v82.20.0');
  if(url.includes('persistent-google-auth-v82-20.js')&&!text.includes('PMK_PERSISTENT_GOOGLE_AUTH_V82_20'))throw new Error('Не получен модуль постоянного входа Google v82.20.0');
  if(url.includes('status-left-column-v82-2.js')&&!text.includes('gap:2px!important;row-gap:2px'))throw new Error('Не получен настоящий gap 2px для статусов');
  if(url.includes('event-card-approved-v82-20-1.js')&&!text.includes('pmkEventCardFinalCompactV82201'))throw new Error('Не получен финальный слой кнопок карточки');
  if(url.includes('event-card-approved-v82-20-1.css')&&!text.includes('event-card fixes on v82.20.0 base'))throw new Error('Не получены стили карточки v82.20.0');
  return text;
}

async function put(cache,key,response){
  await cache.put(new Request(key,{cache:'reload'}),response);
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const index=await fetchWithTimeout(`./index.html?install=${encodeURIComponent(VERSION+'-'+BUILD)}`);
  if(!index.ok)throw new Error(`index.html: ${index.status}`);
  await put(cache,'./index.html',index.clone());
  await put(cache,'./',index.clone());
  const [js,css]=await Promise.all([
    Promise.all(JS.map(textAsset)),
    Promise.all(CSS.map(textAsset)),
  ]);
  await put(cache,BUNDLE_JS,new Response(js.join('\n\n'),{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION,'X-PMK-Build':BUILD}}));
  await put(cache,BUNDLE_CSS,new Response(css.join('\n\n'),{headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION,'X-PMK-Build':BUILD}}));
  await Promise.allSettled(OPTIONAL.map(async url=>{
    const response=await fetchWithTimeout(`${url}?install=${encodeURIComponent(VERSION+'-'+BUILD)}`,5000);
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
  if(url.pathname.endsWith('/pmk-google-auth-config.json'))return event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>cached('./pmk-google-auth-config.json')));
  if(event.request.mode==='navigate')return event.respondWith(cached('./index.html').then(value=>value||fetch(event.request)));
  event.respondWith(caches.match(event.request).then(value=>value||fetch(event.request)));
});
