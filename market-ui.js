/* Price Hunter v0.4.2 — in-page automatic search + one-screen live results. No forced tab.
   Data source: user-configured free Google Programmable Search Standard Element. */
(function(){
'use strict';
const M=window.PriceHunterMarketSearch;
const $=id=>document.getElementById(id);
const CXKEY='price-hunter-market-cx';
const parseCX=window.PriceHunterCX?.parseCX||((v)=>String(v||'').trim());
// A site owner's published search engine must take priority over visitors' old local settings.
const configCX=parseCX(window.PRICE_HUNTER_MARKET_CX);
function savedCX(){try{return parseCX(localStorage.getItem(CXKEY));}catch{return '';}}
let cx=configCX||savedCX();
let enginePromise=null, currentProduct=null, runId=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function status(message,warning=false){const el=$('marketSearchStatus');el.textContent=message;el.className='info'+(warning?' warning':'');window.PriceHunterInstantDashboard?.status(message,warning);}
function cfgValid(s){return Boolean(window.PriceHunterCX?.validCX(s));}
function showSources(results){const counts=new Map(M.markets.map(x=>[x.name,0]));for(const r of results)counts.set(r.market,(counts.get(r.market)||0)+1);
 const host=$('marketSourceSummary');host.replaceChildren();for(const [market,count] of counts){const pill=document.createElement('span');pill.className='pill';pill.textContent=`${market} ${count}건`;host.append(pill);}}
function resultCard(r){const card=document.createElement('article');card.className='market-result';
 const match=r.modelStatus==='matched'?'ok':r.modelStatus==='mismatch'?'no':'warn';
 card.innerHTML=`<div class="item-top"><span class="pill">${esc(r.market)}</span><span class="pill ${match}">${esc(r.modelLabel)}</span></div>
  <div class="item-title">${esc(r.title)}</div>
  <div class="item-price">${r.price!==null?MONEY(r.price):'가격 미확인'}</div>
  <div class="market-status">${esc(r.priceLabel)} · 검색 색인 · 거래완료 미확인</div>
  <p>${esc(r.snippet)}</p><div class="actions"><a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">원문 열기 ↗</a><button class="btn main" type="button">시세 검증 목록에 입력</button></div>`;
 card.querySelector('button').addEventListener('click',()=>{
  if(r.modelStatus==='mismatch'){alert('모델 코드가 다를 수 있어 검증 대상으로 등록할 수 없습니다.');return;}
  $('recordTitle').value=r.title.slice(0,140);
  $('recordPrice').value=r.price||'';
  $('recordUrl').value=r.url;
  const sel=$('recordMarket');if([...sel.options].some(o=>o.value===r.market))sel.value=r.market;
  document.querySelector('[data-tab="records"]').click();
  alert('가격·모델·거래 상태를 원문에서 확인한 뒤 직접 등록하세요. 검색 결과만으로 거래 완료를 확정하지 않습니다.');
 });return card;}
function MONEY(n){return Number(n).toLocaleString('ko-KR')+'원';}
function resultsReady(name,query,promos,results){
 if(!currentProduct || name!=='priceHunterMarket')return;
 if(String(query||'').trim()!==M.queryFor(currentProduct))return; // ignore old product callbacks
 const normalized=M.normalizeResults(results,currentProduct),host=$('marketSearchResults');host.replaceChildren();showSources(normalized);
 for(const r of normalized){host.appendChild(resultCard(r));}
 window.PriceHunterInstantDashboard?.updateResults(normalized);
 if(!normalized.length){const box=document.createElement('div');box.className='empty';box.textContent='검색 결과에서 해당 중고 마켓의 공개 게시물을 찾지 못했습니다. 매물이 없다는 뜻은 아닙니다. 아래 Google 원본 결과를 함께 확인하세요.';host.appendChild(box);}
 status(`Google 공개 검색 결과 ${normalized.length}건 분류 완료 · 검색 색인 시점의 정보이므로 가격·매물 상태 검증 필요`,false);
 // undefined return: Google Standard Search Element still renders its native results and advertisements.
}
function engine(){
 if(enginePromise)return enginePromise;
 enginePromise=new Promise((resolve,reject)=>{
  if(!cfgValid(cx)){reject(new Error('무료 Google 검색 엔진 CX를 먼저 연결하세요.'));return;}
  let finished=false;
  const ok=()=>{if(finished)return;finished=true;resolve();};
  const fail=()=>{if(finished)return;finished=true;reject(new Error('Google 검색 위젯 로드 실패. 연결 또는 차단 설정을 확인하세요.'));};
  window.__gcse={parsetags:'explicit',initializationCallback:()=>{
   try{window.google.search.cse.element.render({div:'googleResultsHost',tag:'searchresults-only',gname:'priceHunterMarket'});ok();}catch(e){fail();}
  },searchCallbacks:{web:{ready:resultsReady}}};
  const script=document.createElement('script');script.async=true;script.src='https://cse.google.com/cse.js?cx='+encodeURIComponent(cx);
  script.addEventListener('error',fail,{once:true});document.head.appendChild(script);
  // slow connections should show a clear failure instead of an infinite progress state.
  setTimeout(fail,20000);
 }).catch(e=>{enginePromise=null;throw e;});
 return enginePromise;
}
async function run(product){
 const raw=product?.name?product:{name:$('productName')?.value||'',model:$('modelCode')?.value||''};
 if(!raw.name?.trim()){status('상품명 또는 모델명부터 확인해 주세요.',true);return;}
 currentProduct={name:String(raw.name),model:String(raw.model||'')};
 $('searchProductName').textContent=currentProduct.name;
 $('allMarketSearchFallback').href=M.collectiveLink(currentProduct);
 const query=M.queryFor(currentProduct);
 $('marketSearchResults').innerHTML='<div class="empty">통합 검색 준비 중… 중고 플랫폼을 따로 선택하지 않아도 됩니다.</div>';
 $('marketSourceSummary').replaceChildren();
 window.PriceHunterInstantDashboard?.updateResults([]);
 if(!cx){
  // Never auto-open Google. Static GitHub Pages cannot read cross-origin market pages.
  status('실시간 통합 검색 미연결 · 공개 Google 검색 엔진(CX) 최초 설정 필요. 저장된 검증 시세는 위 결과에서 자동 분석됩니다.',true);
  $('marketSearchResults').innerHTML='<div class="empty">검색 엔진이 연결되지 않아 실제 중고 매물을 표시할 수 없습니다. 원하시면 위의 Google 원본 링크를 직접 열어 확인할 수 있습니다. 확인 전에는 임의의 중고 시세·수익을 생성하지 않습니다.</div>';
  return;
 }
 const task=++runId;
 status(`검색 중: ${query} · Google 공개 매물 색인을 현재 화면에서 조회합니다…`);
 try{await engine();if(task!==runId)return;
  const el=window.google?.search?.cse?.element?.getElement('priceHunterMarket');if(!el?.execute)throw Error('검색 위젯이 초기화되지 않았습니다.');
  el.execute(query);
 }catch(err){if(task!==runId)return;status('자동 검색 실패: '+err.message+' · 전체 검색 링크를 이용할 수 있습니다.',true);
  $('marketSearchResults').innerHTML='<div class="empty">검색 공급자에 연결하지 못했습니다. 확인되지 않은 중고 가격을 표시하지 않습니다.</div>';
 }
}
$('runMarketSearch').addEventListener('click',()=>run());
$('marketEngineId').value=cx;
$('saveMarketEngine').addEventListener('click',()=>{
 const input=parseCX($('marketEngineId').value);if(!cfgValid(input)){status('Google 검색 엔진 ID(CX) 또는 Google 제공 임베드 코드를 넣어 주세요. 비밀번호나 API 키는 입력하지 마세요.',true);return;}
 try{localStorage.setItem(CXKEY,input);}catch{status('이 브라우저는 검색 엔진 설정 저장이 제한됩니다. 현재 세션에서만 연결됩니다.',true);}
 if(cx&&cx!==input){alert('검색 엔진 ID가 변경되었습니다. 새 검색 엔진을 적용하기 위해 페이지를 다시 불러옵니다.');location.reload();return;}
 cx=input;status('무료 검색 엔진 ID를 저장했습니다. 통합 검색 버튼을 눌러주세요.');
 $('marketEngineSettings').open=false;
});
if(cx){status('앱 내 공개 검색 준비 완료. 상품 인식 후 결과 화면에서 자동으로 조회합니다.');}
else{status('Google 무료 검색엔진 CX가 미설정입니다. 외부 구글 탭을 자동으로 열지 않으며 저장된 검증 시세만 분석합니다.',true);}
window.PriceHunterAutoMarket={run};
})();
