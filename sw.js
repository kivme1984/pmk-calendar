// PMK Calendar v82.20.1 - editable route calendar settings service worker
const VERSION='82.20.1';
const BUILD='route-calendar-settings-v82-20-1';
const CACHE=`pmk-calendar-v${VERSION}-${BUILD}`;
const BUNDLE_JS=`./__pmk-app-v82-20-1-${BUILD}.js`;
const BUNDLE_CSS=`./__pmk-styles-v82-20-1-${BUILD}.css`;

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
./event-card-status-polish-v82-20-2.js
./header-search-v82-20-8.js
./smart-paste-compact-v82-20-13.js
./v50-preview-compact-fix-v82-20-16.js
./v50-editor-nav-bottom-v82-20-21.js
./form-title-cancel-row-v82-20-22.js
./address-search-clean-v82-20-23.js
./form-placeholders-address-strict-v82-20-25.js
./turbo-interactions-v82-20-27.js
./route-calendar-settings-v82-20-1.js
./today-final-release-v82-20-30.js
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
./route-calendar-settings-v82-20-1.css
`.trim().split(/\s+/);

const OPTIONAL=['./reset.html','./recovery.html','./safe.html','./manifest.webmanifest','./version.json','./pmk-google-auth-config.json','./pmk-release.json','./icons/icon-192.png','./icons/icon-512.png'];

function isSpecialNavigate(request){
  if(request.method!=='GET'||request.mode!=='navigate')return false;
  const pathname=new URL(request.url).pathname;
  return pathname.endsWith('/reset.html')||pathname.endsWith('/recovery.html')||pathname.endsWith('/safe.html')||pathname.endsWith('/day-card-compact-test-v1.html')||/\/preview-[^/]+\.html$/.test(pathname)||/\/test-[^/]+\.html$/.test(pathname);
}
function fetchWithTimeout(url,timeout=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  return fetch(url,{cache:'no-store',signal:controller.signal}).finally(()=>clearTimeout(timer));
}
async function textAsset(url){
  try{
    const response=await fetchWithTimeout(`${url}${url.includes('?')?'&':'?'}build=${encodeURIComponent(VERSION+'-'+BUILD)}`);
    if(!response.ok) return `\n/* PMK skipped missing asset ${url}: ${response.status} */\n`;
    return await response.text();
  }catch(error){ return `\n/* PMK skipped unavailable asset ${url}: ${error?.message||error} */\n`; }
}
async function put(cache,key,response){ try{ await cache.put(new Request(key,{cache:'reload'}),response); }catch{} }
function joinSettled(results,urls){ return results.map((result,index)=>result.status==='fulfilled'?result.value:`\n/* PMK skipped rejected asset ${urls[index]} */\n`).join('\n\n'); }

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{
    const index=await fetchWithTimeout(`./index.html?install=${encodeURIComponent(VERSION+'-'+BUILD)}`,9000);
    if(index.ok){ await put(cache,'./index.html',index.clone()); await put(cache,'./',index.clone()); }
  }catch{}
  const [jsResults,cssResults]=await Promise.all([Promise.allSettled(JS.map(textAsset)),Promise.allSettled(CSS.map(textAsset))]);
  await put(cache,BUNDLE_JS,new Response(joinSettled(jsResults,JS),{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION,'X-PMK-Build':BUILD}}));
  await put(cache,BUNDLE_CSS,new Response(joinSettled(cssResults,CSS),{headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION,'X-PMK-Build':BUILD}}));
  await Promise.allSettled(OPTIONAL.map(async url=>{try{const response=await fetchWithTimeout(`${url}?install=${encodeURIComponent(VERSION+'-'+BUILD)}`,5000); if(response.ok) await put(cache,url,response);}catch{}}));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE&&key!=='pmk-calendar-data-v68').map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
async function cached(key){ return (await caches.open(CACHE)).match(key); }
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.location.origin))return;
  if(isSpecialNavigate(event.request))return event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));
  const url=new URL(event.request.url);
  if(url.pathname.endsWith('/app.js'))return event.respondWith(cached(BUNDLE_JS).then(value=>value||fetch(event.request)));
  if(url.pathname.endsWith('/styles.css'))return event.respondWith(cached(BUNDLE_CSS).then(value=>value||fetch(event.request)));
  if(url.pathname.endsWith('/pmk-google-auth-config.json'))return event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>cached('./pmk-google-auth-config.json')));
  if(event.request.mode==='navigate')return event.respondWith(cached('./index.html').then(value=>value||fetch(event.request)));
  event.respondWith(caches.match(event.request).then(value=>value||fetch(event.request)));
});
