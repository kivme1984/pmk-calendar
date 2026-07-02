import { chromium } from 'playwright';

const browser = await chromium.launch({ headless:true });
const page = await browser.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{ if(!sessionStorage.getItem('pmk-ci')){localStorage.clear();sessionStorage.setItem('pmk-ci','1');} });

const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:30000});
const nav=async view=>{
  if(!await page.evaluate(()=>document.querySelector('#sidebar')?.classList.contains('open'))) await page.click('#menuToggle');
  await page.evaluate(v=>document.querySelector(`.nav-item[data-view="${v}"]`)?.click(),view);
  await wait(v=>state.currentView===v&&document.querySelector(`#${['week','month'].includes(v)?'view-week':`view-${v==='day'?'today':v}`}`)?.classList.contains('active'),view);
};
const fullForm=async()=>{if(!await page.locator('#customerName').isVisible()){await page.click('#v50Summary [data-v50-action="full"]');await page.waitForSelector('#customerName',{state:'visible'});}};

try{
  await page.goto('http://127.0.0.1:8000/test-v82-19.html?ci=1',{waitUntil:'domcontentloaded',timeout:120000});
  await wait(()=>window.PMK_FINAL_LAYOUT_LOCK_V82_12&&window.PMK_PERIOD_DIRECT_V82_19&&window.PMK_WEEK_TOUCH_SCROLL_V82_20&&window.PMK_STABLE_VERSION_LABEL_V82_19&&window.PMK_SEARCH_NORMALIZATION_V82_19);
  const identity=await page.evaluate(()=>({title:document.title,label:document.querySelector('#pmkVersionIndicator')?.textContent||'',badge:!!document.querySelector('#pmkStableBuildBadgeV8219'),counter:!!document.querySelector('#threeDaysCount')}));
  if(!identity.title.includes('82.19.1')||!identity.label.includes('82.19.1')||!identity.badge||!identity.counter)throw Error(`identity ${JSON.stringify(identity)}`);

  const day=await page.inputValue('#jumpDate');
  await page.click('#nextDayBtn'); await wait(k=>document.querySelector('#jumpDate').value===addDaysToKey(k,1),day);
  await page.click('#prevDayBtn'); await wait(k=>document.querySelector('#jumpDate').value===k,day);

  await nav('week'); await wait(()=>document.querySelectorAll('#weekEvents.pmk-week-v82-19 .day-column').length===7);
  const anchor=await page.evaluate(()=>state.periodAnchorKey);
  await page.click('#nextPeriodBtn'); await wait(k=>state.periodAnchorKey===addDaysToKey(k,7),anchor);
  await page.click('#prevPeriodBtn'); await wait(k=>state.periodAnchorKey===k,anchor);
  const scroll=await page.evaluate(async()=>{const b=document.querySelector('#weekEvents');b.scrollLeft=Math.min(360,b.scrollWidth-b.clientWidth-20);const before=b.scrollLeft;renderAll();await new Promise(r=>setTimeout(r,1900));return{before,after:b.scrollLeft};});
  if(scroll.before<150||scroll.after<scroll.before-80)throw Error(`scroll ${JSON.stringify(scroll)}`);
  const gesture=await page.evaluate(async()=>{document.body.style.minHeight='2600px';const b=document.querySelector('#weekEvents'),fire=(t,n,x,y)=>{const e=new Event(n,{bubbles:true,cancelable:true}),p={clientX:x,clientY:y};Object.defineProperty(e,'touches',{value:n==='touchend'?[]:[p]});Object.defineProperty(e,'changedTouches',{value:[p]});t.dispatchEvent(e);};let t=b.querySelector('.day-column');scrollTo(0,0);fire(t,'touchstart',210,700);fire(t,'touchmove',208,500);fire(t,'touchmove',207,290);fire(t,'touchend',207,290);await new Promise(r=>setTimeout(r,90));const vertical=scrollY;t=b.querySelector('.day-column');b.scrollLeft=0;fire(t,'touchstart',350,410);fire(t,'touchmove',210,408);fire(t,'touchmove',80,407);fire(t,'touchend',80,407);await new Promise(r=>setTimeout(r,90));return{vertical,horizontal:b.scrollLeft};});
  if(gesture.vertical<200||gesture.horizontal<120)throw Error(`gesture ${JSON.stringify(gesture)}`);

  await nav('month'); await wait(()=>{const b=document.querySelector('#weekEvents.pmk-month-v82-19'),n=b?.querySelectorAll('.day-column').length||0;return n>=28&&b.querySelectorAll('.pmk-month-count-v82-19').length===n;});
  const monday=await page.evaluate(()=>{let k=businessTodayKey();while(new Date(`${k}T12:00:00Z`).getUTCDay()!==1)k=addDaysToKey(k,1);return k;});

  await nav('form'); await fullForm();
  for(const [s,v] of [['#customerName','Тест Навигации'],['#phone','+7 999 111-22-33'],['#street','Тестовая улица'],['#houseNumber','19'],['#visitDate',monday],['#startTime','14:00'],['#estimatedPrice','2200'],['#contractNumber','82191']])await page.fill(s,v);
  await page.selectOption('#district',{label:'Автозаводский'}); await page.dispatchEvent('#startTime','change'); await page.click('#submitBtn');
  await wait(()=>state.localEvents.some(e=>eventMeta(e).customerName==='Тест Навигации'));
  const id=await page.evaluate(()=>state.localEvents.find(e=>eventMeta(e).customerName==='Тест Навигации').id);

  await nav('search'); await page.fill('#globalSearch','9991112233'); await wait(()=>document.querySelectorAll('#searchResults [data-event-card]').length===1);
  await page.evaluate(id=>openEvent(id),id); await wait(()=>state.currentView==='form'); await fullForm();
  await page.fill('#estimatedPrice','2600'); await page.fill('#managerComment','Проверено автотестом'); await page.click('#submitBtn');
  await wait(id=>{const d=eventMeta(state.localEvents.find(e=>e.id===id));return d.estimatedPrice===2600&&d.managerComment==='Проверено автотестом';},id);

  for(const status of ['picked-up','pending-delivery','completed']){await page.evaluate(({id,status})=>updateEventStatus(id,status),{id,status});await wait(({id,status})=>eventMeta(state.localEvents.find(e=>e.id===id)).requestStatus===status,{id,status});await page.waitForTimeout(1200);}
  await nav('completed'); await wait(id=>!!document.querySelector(`[data-history-event="${id}"]`),id);
  await page.evaluate(({id,old})=>{const e=state.localEvents.find(x=>x.id===id),d={...eventMeta(e),eventId:id,requestStatus:'completed',completedAt:old};Object.assign(e,toGoogleEvent(d),{updated:old});persistLocalEvents();renderAll();},{id,old:new Date(Date.now()-8*86400000).toISOString()});
  await nav('archive'); await wait(id=>!!document.querySelector(`[data-history-event="${id}"]`),id);

  await nav('reminder'); await page.fill('#reminderDate',monday);await page.fill('#reminderTime','12:00');await page.fill('#reminderText','Проверить резервную версию');await page.click('#reminderForm button[type="submit"]');await page.waitForSelector('#pmkReminderConfirmDialog[open]');await page.click('#pmkReminderConfirmSave');await wait(()=>state.localEvents.some(e=>String(e.id).startsWith('local-reminder-')));

  await nav('settings'); await page.click('#pricingSettingsCard > summary');await page.fill('#pricingSetting-minimum','1950');await page.fill('#durationSetting','45');await page.click('#saveSettingsBtn');
  await wait(()=>state.settings.minimumOrder===1950&&state.settings.pricing?.minimum===1950&&state.settings.duration===45);
  await page.reload({waitUntil:'domcontentloaded',timeout:120000});
  await wait(id=>window.PMK_STABLE_VERSION_LABEL_V82_19&&state.settings.minimumOrder===1950&&state.settings.pricing?.minimum===1950&&state.settings.duration===45&&state.localEvents.some(e=>e.id===id)&&state.localEvents.some(e=>String(e.id).startsWith('local-reminder-')),id);

  page.once('dialog',d=>d.accept());await page.evaluate(id=>deleteEvent(id),id);await wait(id=>!state.localEvents.some(e=>e.id===id),id);
  if(errors.length)throw Error(errors.join(' | '));
  console.log(JSON.stringify({identity,scroll,gesture,id}));
}finally{await browser.close();}
