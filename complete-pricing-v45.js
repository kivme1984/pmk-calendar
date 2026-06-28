'use strict';
(() => {
  const P={np:300,ms:350,mw:450,w:400,h:450,d:800,c:350,o1:700,o2:1000,hair:150,stain:600,lift:150,dis:700,slime:500,oz:300,exp:1000,min:1800};
  const money=v=>formatMoney(Math.round(v));
  const areaText=v=>v.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
  function rate(r){
    const m=r.material||'',p=r.pile||'',w=Number(r.width||0);
    if(['Вискоза','Шёлк','Хлопок'].includes(m))return P.d;
    if(p==='Более 1 см')return P.h;
    if(m==='Шерсть')return P.w;
    if(m==='Безворсный'||(m==='Синтетика'&&p==='Без ворса'))return P.np;
    if(m==='Синтетика')return w>=3?P.mw:P.ms;
    return 0;
  }
  function labels(){
    const map={
      'Удаление пятен':'Удаление пятен · 600 ₽/ковёр',
      'Вычёсывание шерсти и волос':'Вычёсывание шерсти и волос · 150 ₽/м²',
      'Удаление запаха мочи':'Удаление запаха мочи · 700 ₽ до 6 м² / 1000 ₽ свыше 6 м²',
      'Дезинфекция':'Дезинфекция · 700 ₽/ковёр',
      'Удаление слайма / пластилина':'Удаление слайма / пластилина · 500 ₽/ковёр',
      'Подъём ворса':'Расчёсывание / подъём ворса · 150 ₽/м²',
      'Озонация':'Озонация · 300 ₽/ковёр',
      'Кондиционер':'Кондиционер · 350 ₽/ковёр',
      'Экспресс-стирка':'Экспресс-стирка · 1000 ₽/заказ'
    };
    for(const [value,text] of Object.entries(map))document.querySelectorAll(`.rug-services input[value="${value}"]`).forEach(i=>{if(i.nextElementSibling)i.nextElementSibling.textContent=text;});
  }
  function calc(){
    const toggle=qs('#autoPrice'),price=qs('#estimatedPrice'),box=qs('#autoPriceBreakdown');
    if(!toggle||!price||!box||!toggle.checked)return;
    const rugs=collectRugs(),lines=[],errors=[];let sum=0,express=false;
    for(let n=0;n<rugs.length;n++){
      const r=rugs[n],a=Number(r.length||0)*Number(r.width||0),q=rate(r),s=Array.isArray(r.services)?r.services:[];
      if(!a){errors.push(`Ковёр ${n+1}: укажите длину и ширину`);continue;}
      if(!q){errors.push(`Ковёр ${n+1}: укажите материал и ворс`);continue;}
      const base=Math.round(a*q);sum+=base;lines.push(`Ковёр ${n+1}: ${areaText(a)} м² × ${q} ₽ = ${money(base)}`);
      const fixed=(name,value,label)=>{if(s.includes(name)){sum+=value;lines.push(`${label}: ${money(value)}`);}};
      const perArea=(name,value,label)=>{if(s.includes(name)){const x=Math.round(a*value);sum+=x;lines.push(`${label}: ${areaText(a)} м² × ${value} ₽ = ${money(x)}`);}};
      fixed('Кондиционер',P.c,'Кондиционер');
      if(s.includes('Удаление запаха мочи')){const x=a<=6?P.o1:P.o2;sum+=x;lines.push(`Удаление запаха мочи: ${money(x)}`);}
      perArea('Вычёсывание шерсти и волос',P.hair,'Вычёсывание шерсти и волос');
      fixed('Удаление пятен',P.stain,'Удаление пятен');
      perArea('Подъём ворса',P.lift,'Расчёсывание / подъём ворса');
      fixed('Дезинфекция',P.dis,'Дезинфекция');
      fixed('Удаление слайма / пластилина',P.slime,'Удаление слайма / пластилина');
      fixed('Озонация',P.oz,'Озонация');
      if(s.includes('Экспресс-стирка')&&!express){sum+=P.exp;express=true;lines.push(`Экспресс-заказ: ${money(P.exp)}`);}
    }
    if(errors.length){price.value='';box.className='auto-price-breakdown warning';box.innerHTML=`<strong>Авторасчёт пока невозможен</strong><span>${errors.map(escapeHtml).join('<br>')}</span>`;return;}
    if(!sum)return;
    const regular=qs('#regularCustomer')?.checked,disc=regular?10:rugs.length>=3?10:rugs.length>=2?5:0,d=qs('#discount');
    if(d){d.value=String(disc);d.readOnly=true;d.classList.add('discount-locked');}
    const after=Math.round(sum*(100-disc)/100),total=Math.max(after,P.min);price.value=String(total);
    if(disc)lines.push(`Скидка ${disc}%: −${money(sum-after)}`);
    if(total>after)lines.push(`Минимальный заказ: ${money(P.min)}`);
    lines.push(`Итого: ${money(total)}`);box.className='auto-price-breakdown success';box.innerHTML=`<strong>Стоимость рассчитана автоматически</strong><span>${lines.map(escapeHtml).join('<br>')}</span>`;schedulePreviewUpdate();
  }
  const run=()=>setTimeout(()=>{labels();calc();},0),oldFill=fillForm;
  fillForm=function(data){oldFill(data);run();};
  document.addEventListener('DOMContentLoaded',()=>{labels();const f=qs('#requestForm');f?.addEventListener('input',run);f?.addEventListener('change',run);f?.addEventListener('click',run);run();});
})();
