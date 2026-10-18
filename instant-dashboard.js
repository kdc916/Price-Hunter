/* Price Hunter v0.6.0: one-screen dashboard. Live indexed asking prices are not settled sales. */
(function(){
'use strict';
const Core=window.PriceHunterCore, E=window.PriceHunterInstantEngine;
const $=id=>document.getElementById(id);
const money=n=>n===null||n===undefined?'—':Core.won(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let scanned=false,searchStamp='',indexed=[];
function read(){return window.PriceHunterDashboardData?.()||{product:{},listings:[]};}
function render(){
 const {product,listings}=read();
 const res=E.evaluate({product,listings,months:Number($('quickMonths').value),mode:$('quickMode').value,
  platformFee:Number($('quickFee').value),shipping:Number($('quickShipping').value),removeOutliers:$('quickOutliers').checked});
 const hero=$('dashboardHero'),name=$('dashboardName');
 name.textContent=product.name||'상품 사진을 불러와 주세요';
 $('dashboardBuy').textContent=money(res.purchase);
 $('dashboardResale').textContent=money(res.resale);
 $('dashboardNew').textContent=money(res.newLowest);
 $('dashboardSamples').textContent=`실거래 확인 ${res.soldCount}건 · 판매중 호가 ${res.askingCount}건 · 신품 기록 ${res.newCount}건`;
 const enough=res.status==='calculated';
 const status=hero.querySelector('[data-decision]');
 if(!product.name){status.textContent='사진 인식 대기';}
 else if(!res.purchase){status.textContent='구매가 확인 필요';}
 else if(!enough){status.textContent='시장 시세 부족 · 판단 보류';}
 else status.textContent=res.profit<0?'손실 가능성':'예상 차익 (미실현)';
 $('dashboardProfit').textContent=enough?`${res.profit>0?'+':''}${money(res.profit)}`:'—';
 $('dashboardRoi').textContent=enough?`${res.roi>0?'+':''}${res.roi.toFixed(1)}%`:'산정 불가';
 hero.classList.toggle('loss',enough&&res.profit<0);
 $('dashboardEvidence').textContent=enough?(res.source==='sold'?'확인된 실거래 표본 기반 추정':'등록된 판매중 호가 기반 가정 · 실거래 아님'):'해당 모델의 검증된 중고 가격 3건 이상 필요';
 $('dashboardMath').textContent=enough?`예상 판매가 ${money(res.resale)} − 구매가 ${money(res.purchase)} − 수수료 ${money(res.feeAmount)} − 배송·교통비 ${money(res.shipping)} = ${res.profit>=0?'+':''}${money(res.profit)}`:
  '실제 동일 모델의 신뢰 가능한 시세가 부족해 예상 순이익을 표시하지 않습니다.';
 $('dashboardReady').textContent=res.purchase?'상품·구매가 추출 완료 · 시세 확인 중':'사진 인식 및 기본 판매가 확인 대기';
 renderIndexed();
}
function renderIndexed(){
 const box=$('dashboardIndexedListings'),count=$('dashboardIndexCount');box.replaceChildren();
 const filtered=indexed.filter(x=>x.modelStatus!=='mismatch');
 count.textContent=`검색 색인 ${filtered.length}건 · 가격 검증 전`;
 if(!filtered.length){const x=document.createElement('div');x.className='mini-note';x.textContent=indexed.length?'모델이 다른 매물을 제외했습니다.':'확인 가능한 외부 검색 결과가 없습니다.';box.append(x);return;}
 for(const x of filtered.slice(0,12)){
  const a=document.createElement('a');a.className='dashboard-listing';a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';
  const head=document.createElement('strong');head.textContent=x.title;
  const meta=document.createElement('span');meta.textContent=`${x.market} · ${x.price===null?'가격 미확인':money(x.price)} · ${x.modelLabel} · 색인 호가, 미검증`;
  a.append(head,meta);box.append(a);
 }
}
function status(message,problem=true){const el=$('dashboardSearchStatus');if(el){el.textContent=message;el.classList.toggle('warning',problem);}}
function updateResults(results){indexed=Array.isArray(results)?results:[];renderIndexed();}
function scan(product){scanned=true;indexed=[];render();
 const name=String(product?.name||'').trim();
 if(!name)return;
 const stamp=Core.normalize(name)+'|'+Core.normalize(product.model||'');
 if(stamp===searchStamp)return;
 searchStamp=stamp;
 status('인식 완료 · 공개 중고 매물 검색 준비 중…',false);
 window.PriceHunterAutoMarket?.run({name,model:product.model||''},{silent:true});
}
$('dashboardSetup').addEventListener('click',()=>{
 document.querySelector('[data-tab="search"]').click();
 $('marketEngineSettings').open=true;
 $('marketEngineSettings').scrollIntoView({behavior:'smooth',block:'center'});
});
$('dashboardSetup').hidden=Boolean(window.PRICE_HUNTER_MARKET_CX||(()=>{try{return localStorage.getItem('price-hunter-market-cx');}catch{return null}})());
$('dashboardRecheck').addEventListener('click',()=>{
 const {product}=read();if(!product.name){status('먼저 상품 사진을 인식해 주세요.');return;}
 searchStamp='';scan(product);
});
['quickMonths','quickMode','quickFee','quickShipping','quickOutliers','productName','modelCode','purchasePrice'].forEach(id=>$(id).addEventListener('change',render));
 window.PriceHunterInstantDashboard={render,scan,status,updateResults};
 render();
})();
