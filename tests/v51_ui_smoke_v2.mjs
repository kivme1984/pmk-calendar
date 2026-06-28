import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
let stage='open';
const shot=name=>page.screenshot({path:`artifacts/${name}.png`,fullPage:true});

try{
  await page.goto('http://127.0.0.1:4173/v51-preview.html?test='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#v50Summary',{timeout:20000});
  await page.waitForFunction(()=>document.documentElement.dataset.v51Verified==='1',null,{timeout:15000});
  await shot('v51-01-summary');

  stage='tools';
  const tools=page.locator('#v51Tools');
  assert.equal(await tools.count(),1);
  assert.equal(await tools.evaluate(node=>node.tagName),'SECTION');
  assert.equal(await tools.locator('.v51-tool').count(),4);
  assert.deepEqual(await tools.locator('.v51-tool strong').allTextContents(),['Постоянный клиент','Поиск адреса','Окна маршрута','Автостоимость']);
  await tools.locator('.v51-tools-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#v51Tools')?.classList.contains('is-open'));
  const toolBoxes=await tools.locator('.v51-tool').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return{x:Math.round(b.x),y:Math.round(b.y),right:Math.round(b.right),h:Math.round(b.height)}}));
  assert.equal(new Set(toolBoxes.map(box=>box.x)).size,2);
  assert.equal(new Set(toolBoxes.map(box=>box.y)).size,2);
  assert.ok(toolBoxes.every(box=>box.x>=0&&box.right<=390&&box.h>=60));
  await shot('v51-02-tools');

  stage='tool-actions';
  for(const action of ['client','address','slots','price']){
    if(!await tools.evaluate(node=>node.classList.contains('is-open')))await tools.locator('.v51-tools-toggle').click();
    await tools.locator(`[data-v51-action="${action}"]`).click();
    await page.waitForSelector('.v50-editor-open');
    assert.equal(await page.locator('.v50-editor-open').count(),1);
    await page.locator('.v50-editor-open .v50-editor-done').click();
    await page.waitForFunction(()=>!document.body.classList.contains('v50-modal-active'));
  }

  stage='services';
  await page.locator('[data-v50-open="rugs"]').first().click();
  await page.waitForSelector('.v50-editor-open .rug-card',{timeout:15000});
  const services=page.locator('.v50-editor-open .rug-card').first().locator('.v51-service');
  await page.waitForFunction(()=>document.querySelectorAll('.v50-editor-open .rug-card .v51-service').length===6,null,{timeout:10000});
  assert.equal(await services.count(),6);
  assert.deepEqual(await services.locator('span').allTextContents(),['Пятна','Запах мочи','Кондиционер','Шерсть / волосы','Озон','Расчёсывание ворса']);
  const boxes=await services.evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return{x:Math.round(b.x),y:Math.round(b.y),right:Math.round(b.right),h:Math.round(b.height)}}));
  assert.equal(new Set(boxes.map(box=>box.x)).size,2);
  assert.equal(new Set(boxes.map(box=>box.y)).size,3);
  assert.ok(boxes.every(box=>box.x>=0&&box.right<=390&&box.h>=50));
  for(let i=0;i<6;i++){const s=services.nth(i);await s.click();assert.equal(await s.locator('input').isChecked(),true);await s.click();assert.equal(await s.locator('input').isChecked(),false);}
  await shot('v51-03-rugs');
  await page.locator('.v50-editor-open .v50-editor-done').click();

  stage='editors';
  for(const type of ['client','date','rugs','cost','preview']){await page.locator(`[data-v50-open="${type}"]`).first().click();await page.waitForSelector('.v50-editor-open');assert.equal(await page.locator('.v50-editor-open').count(),1);await page.locator('.v50-editor-open .v50-editor-done').click();await page.waitForFunction(()=>!document.body.classList.contains('v50-modal-active'));}

  stage='draft';
  await page.evaluate(()=>localStorage.setItem('pmk-form-autodraft-v1',JSON.stringify({savedAt:Date.now(),data:{customerName:'Тестовый клиент',phone:'+79000000000',rugs:[]}})));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#v50DraftNotice',{timeout:15000});
  assert.equal(await page.locator('#v50DraftNotice [data-v50-draft="view"]').count(),1);
  assert.equal(await page.locator('#v50DraftNotice [data-v50-draft="delete"]').count(),1);
  await shot('v51-04-draft');

  stage='overflow';
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);
  console.log('V51_UI_CHECK_OK');
}catch(error){console.error('V51_UI_CHECK_FAILED_STAGE='+stage);console.error(error.stack||error);try{await shot(`v51-failure-${stage}`)}catch{}throw error;}finally{await browser.close();}
