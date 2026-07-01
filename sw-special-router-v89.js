self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate')return;
  const pathname=new URL(event.request.url).pathname;
  const special=pathname.endsWith('/reset.html')||pathname.endsWith('/recovery.html')||pathname.endsWith('/safe.html');
  if(!special)return;
  event.stopImmediatePropagation();
  event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));
});
