const VERSION='88';
const CACHE='pmk-calendar-v88';
const APP='./__pmk-app-v88.js';
const CSS='./__pmk-styles-v88.css';
const DATA_CACHE='pmk-calendar-data-v68';

async function fetchText(url){
  const response=await fetch(`${url}${url.includes('?')?'&':'?'}install=88`,{cache:'no-store'});
  if(!response.ok)throw new Error(`${url}: ${response.status}`);
  return response.text();
}

async function findBaseBundle(){
  const keys=(await caches.keys())
    .filter(key=>/^pmk-calendar-v\d+$/.test(key)&&key!==CACHE)
    .sort((a,b)=>Number(b.match(/\d+$/)[0])-Number(a.match(/\d+$/)[0]));
  for(const key of keys){
    const version=key.match(/\d+$/)[0];
    const cache=await caches.open(key);
    const [app,css,index]=await Promise.all([
      cache.match(`./__pmk-app-v${version}.js`),
      cache.match(`./__pmk-styles-v${version}.css`),
      cache.match('./index.html'),
    ]);
    if(app&&css&&index)return {app,css,index};
  }
  throw new Error('Не найден предыдущий проверенный пакет приложения. Сначала откройте текущую версию ПМК.');
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const base=await findBaseBundle();
  const [baseJs,baseCss,guard,columnCss]=await Promise.all([
    base.app.text(),base.css.text(),fetchText('./version-guard-v88.js'),fetchText('./status-column-v88.css'),
  ]);
  const cache=await caches.open(CACHE);
  await Promise.all([
    cache.put('./index.html',base.index.clone()),
    cache.put('./',base.index.clone()),
    cache.put(APP,new Response(`${baseJs}\n\n${guard}`,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION}})),
    cache.put(CSS,new Response(`${baseCss}\n\n${columnCss}`,{headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store','X-PMK-Version':VERSION}})),
  ]);
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE&&key!==DATA_CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

async function cached(key){return (await caches.open(CACHE)).match(key);}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.location.origin))return;
  const url=new URL(event.request.url);
  if(url.pathname.endsWith('/app.js'))return event.respondWith(cached(APP).then(value=>value||fetch(event.request)));
  if(url.pathname.endsWith('/styles.css'))return event.respondWith(cached(CSS).then(value=>value||fetch(event.request)));
  if(event.request.mode==='navigate')return event.respondWith(cached('./index.html').then(value=>value||fetch(event.request)));
  event.respondWith(caches.match(event.request).then(value=>value||fetch(event.request)));
});