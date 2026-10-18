/* Price Hunter 0.1.0 — no paid APIs, no cross-site scraping. */
(function(){
'use strict';
const C=window.PriceHunterCore;const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='price-hunter-0.1.0';
const blank=()=>({version:1,product:{name:'',model:'',barcode:'',purchase:0},listings:[],analyses:[]});
let state=blank();
function restore(){try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data&&data.version===1&&data.product&&Array.isArray(data.listings)&&Array.isArray(data.analyses)){
state={version:1,product:{name:String(data.product.name||'').slice(0,140),model:String(data.product.model||'').slice(0,60),barcode:String(data.product.barcode||'').slice(0,32),purchase:Math.max(0,Number(data.product.purchase)||0)},listings:data.listings.slice(0,2500),analyses:data.analyses.slice(0,500)};
}}catch(e){console.warn('저장 데이터 로딩 실패',e);}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){setStatus('historyStatus','저장 공간 부족 또는 브라우저 저장 차단. JSON으로 백업하세요.','error');return false;}}
function today(){const d=new Date(),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function setStatus(id,msg,level=''){const el=$(id);el.textContent=msg;el.style.color=level==='error'?'#ff98a1':level==='ok'?'#7ef0c9':'#b6d9f9';}
function tab(name){document.querySelectorAll('.tab').forEach(b=>{const yes=b.dataset.tab===name;b.classList.toggle('active',yes);b.setAttribute('aria-selected',yes?'true':'false');});document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
function productName(){return state.product.name;}
function draftProduct(){return {name:$('productName').value.trim(),model:$('modelCode').value.trim(),barcode:$('barcode').value.trim(),purchase:Number($('purchasePrice').value||0)};}
function applyProduct(){const p=draftProduct();if(p.name.length<3){alert('상품명은 최소 3자 이상 입력하세요.');return false;}if(p.purchase<1000||!Number.isInteger(p.purchase)||p.purchase>200000000){alert('매장 구매가는 1,000원 이상 2억 원 이하로 입력하세요.');return false;}if(p.model && !C.normalize(p.name).replace(/ /g,'').includes(C.normalize(p.model).replace(/ /g,''))){if(!confirm('상품명에 모델 코드가 포함되어 있지 않습니다. 정확한 모델이 맞나요?'))return false;}state.product=p;save();render();$('calcBuy').value=p.purchase;tab('search');return true;}
$('confirmProduct').addEventListener('click',applyProduct);
$('clearProduct').addEventListener('click',()=>{if(confirm('현재 입력 중인 상품 정보를 초기화할까요? 저장한 시세 기록은 유지됩니다.')){['productName','modelCode','barcode','purchasePrice','ocrText'].forEach(id=>$(id).value='');}});
function renderLinks(){const name=productName();$('searchProductName').textContent=name||'미선택';const targets=[
{title:'중고나라',sub:'구글 색인 매물',site:'web.joongna.com',icon:'↗'},
{title:'당근',sub:'구글 색인 매물',site:'daangn.com',icon:'↗'},
{title:'번개장터',sub:'구글 색인 매물',site:'bunjang.co.kr',icon:'↗'},
{title:'네이버 중고나라 카페',sub:'카페 공개 게시물',site:'cafe.naver.com/joonggonara',icon:'↗'},
{title:'네이버쇼핑',sub:'신품 비교용 검색',site:'shopping.naver.com',icon:'↗',isNew:true},
{title:'쿠팡',sub:'신품 참고가 검색',site:'coupang.com',icon:'↗',isNew:true},
{title:'구글 전체 검색',sub:'모든 인덱스 대상',site:'',icon:'↗'}
];$('searchLinks').replaceChildren();
for(const t of targets){if(!name||(!includeNew.checked&&t.isNew))continue;const a=document.createElement('a');a.className='source';a.href=C.googleSearch(name,t.site);a.target='_blank';a.rel='noopener noreferrer';const box=document.createElement('div');const title=document.createElement('div');title.textContent=t.title;const sub=document.createElement('small');sub.textContent=t.sub;box.append(title,sub);const x=document.createElement('span');x.textContent=t.icon;a.append(box,x);$('searchLinks').append(a);}
if(!name){$('searchLinks').innerHTML='<div class="empty" style="grid-column:1/-1">① 촬영·인식에서 상품을 확정하면 검색 링크가 표시됩니다.</div>';}}
const includeNew=$('includeNew');includeNew.addEventListener('change',renderLinks);
$('goAddRecord').addEventListener('click',()=>{if(productName()&&!$('recordTitle').value)$('recordTitle').value=productName();tab('records');});
$('parsePaste').addEventListener('click',()=>{const raw=$('pasteText').value.trim();if(!raw){setStatus('parseStatus','복사한 검색 문장을 먼저 입력하세요.','error');return;}const price=C.parsePastedPrice(raw);if(!price){setStatus('parseStatus','가격 후보를 찾지 못했습니다. 수동 입력하세요.','error');return;}const title=raw.split('\n').map(x=>x.trim()).find(x=>x.length>3&&!/^\d/.test(x))||productName();$('recordPrice').value=price;$('recordTitle').value=title.replace(/\d{1,3}(?:,\d{3})+\s*원/g,'').trim().slice(0,140);setStatus('parseStatus',`가격 후보 ${C.won(price)} 추출됨. 직접 확인 후 시세 검증 단계에서 등록하세요.`,'ok');});
function getFile(id){return $(id).files?.[0]||null;}
for(const [input,preview] of [['productFile','productPreview'],['labelFile','labelPreview']]){
$(input).addEventListener('change',()=>{const el=$(preview);if(el.dataset.url){URL.revokeObjectURL(el.dataset.url);delete el.dataset.url;}const file=getFile(input);if(file&&file.type.startsWith('image/')){const url=URL.createObjectURL(file);el.src=url;el.dataset.url=url;el.style.display='block';}else{el.removeAttribute('src');el.style.display='none';}});
}
async function scriptLoader(){if(window.Tesseract)return;return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.async=true;script.crossOrigin='anonymous';script.onload=()=>window.Tesseract?resolve():reject(new Error('OCR 라이브러리 로딩 실패'));script.onerror=()=>reject(new Error('무료 OCR 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.'));document.head.append(script);});}
async function imageInputForOCR(file){const bitmap=await createImageBitmap(file);const max=2000,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();return canvas.toDataURL('image/png');}
let ocrRunning=false;
$('ocrBtn').addEventListener('click',async()=>{
if(ocrRunning)return;const sources=[['제품',getFile('productFile')],['가격표',getFile('labelFile')]].filter(x=>x[1]);if(!sources.length){setStatus('ocrStatus','분석할 사진을 하나 이상 선택하세요.','error');return;}
ocrRunning=true;$('ocrBtn').disabled=true;let worker;
try{setStatus('ocrStatus','무료 한글·영문 OCR 모델을 준비하는 중입니다. 첫 실행 시 다운로드가 필요합니다.');await scriptLoader();
worker=await window.Tesseract.createWorker(['kor','eng'],1,{logger:m=>{if(m.status==='recognizing text')setStatus('ocrStatus',`OCR 분석 ${Math.round((m.progress||0)*100)}%`);}});
const texts=[];for(const [label,file] of sources){setStatus('ocrStatus',`${label} 이미지 분석 중…`);const input=await imageInputForOCR(file);const output=await worker.recognize(input);texts.push(`[${label}]\n${output.data.text}`);}
$('ocrText').value=texts.join('\n\n');parseOCR();setStatus('ocrStatus','OCR 완료. 추출된 상품명과 가격을 반드시 검증하세요.','ok');
}catch(e){setStatus('ocrStatus',`OCR 실패: ${e.message}. 사진을 변경하거나 상품명·가격을 직접 입력할 수 있습니다.`,'error');console.error(e);
}finally{if(worker)try{await worker.terminate();}catch{}ocrRunning=false;$('ocrBtn').disabled=false;}
});
function parseOCR(){const input=$('ocrText').value;if(!input.trim()){setStatus('ocrStatus','OCR 원문을 입력하거나 촬영 후 분석해 주세요.','error');return;}
const productPart=input.match(/\[제품\]([\s\S]*?)(?:\[가격표\]|$)/)?.[1]||input;
const pricePart=input.match(/\[가격표\]([\s\S]*)/)?.[1]||input;
const a=C.suggestProduct(productPart),p=C.suggestProduct(pricePart);
if(a.name && !$('productName').value.trim())$('productName').value=a.name;
const price=p.price||a.price;
if(price&&!$('purchasePrice').value)$('purchasePrice').value=price;
const lines=['상품명 후보: '+(a.candidates.join(' / ')||'없음'),'가격 후보: '+(p.allPrices.length?p.allPrices.map(x=>C.won(x.value)).join(', '):'없음')];$('ocrCandidates').textContent=lines.join(' | ');
setStatus('ocrStatus','후보를 입력했습니다. 상품명과 가격이 맞는지 확인하세요.','ok');}
$('applyOcr').addEventListener('click',parseOCR);
$('barcodeBtn').addEventListener('click',async()=>{const file=getFile('productFile')||getFile('labelFile');if(!file){setStatus('ocrStatus','바코드를 찾을 사진을 먼저 선택해 주세요.','error');return;}
if(!('BarcodeDetector' in window)){setStatus('ocrStatus','이 브라우저는 기본 바코드 인식을 지원하지 않습니다. 숫자를 직접 입력하세요.','error');return;}
try{const formats=await BarcodeDetector.getSupportedFormats();const detector=new BarcodeDetector({formats:formats.filter(f=>['ean_13','ean_8','upc_a','upc_e','code_128'].includes(f))});const data=await detector.detect(file);if(data.length){$('barcode').value=data[0].rawValue;setStatus('ocrStatus',`바코드 ${data[0].rawValue} 인식 완료. 상품명은 별도로 확인하세요.`,'ok');}else{setStatus('ocrStatus','바코드가 보이지 않습니다. 흔들림 없이 바코드 전체를 촬영하세요.','error');}}catch(e){setStatus('ocrStatus',`바코드 인식 실패: ${e.message}`,'error');}});
$('recordDate').value=today();
function resetRecord(){['recordTitle','recordPrice','recordUrl'].forEach(id=>$(id).value='');$('recordVerified').checked=false;$('recordCondition').checked=false;$('recordDate').value=today();}
$('resetRecord').addEventListener('click',resetRecord);
$('saveRecord').addEventListener('click',()=>{
const name=productName();if(!name){setStatus('recordStatus','상품을 먼저 확정해 주세요.','error');return;}
if(!$('recordVerified').checked||!$('recordCondition').checked){setStatus('recordStatus','정확한 동일 상품과 매물 원문 가격·상태를 확인한 후 두 항목을 체크하세요.','error');return;}
const item={id:(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),target:name,market:$('recordMarket').value,state:$('recordState').value,title:$('recordTitle').value.trim(),price:Number($('recordPrice').value),date:$('recordDate').value,url:$('recordUrl').value.trim(),createdAt:new Date().toISOString(),verified:true};
const err=C.validateListing(item,name);if(err){setStatus('recordStatus',err,'error');return;}
const mt=C.matchProduct(name,item.title,{model:state.product.model});
if(mt.status==='mismatch'){setStatus('recordStatus',mt.reason,'error');return;}
if(mt.status==='review'&&!confirm(`상품명 일치도를 추가로 확인하세요 (${mt.score}점). 동일한 상품·세대·구성이 확실한가요?`))return;
if(state.listings.some(x=>C.normalize(x.target)===C.normalize(name)&&C.listingKey(x)===C.listingKey(item))){setStatus('recordStatus','동일 링크 또는 동일 매물 기록이 이미 있습니다.','error');return;}
state.listings.unshift(item);save();resetRecord();render();setStatus('recordStatus','원문 확인 매물을 시세 기록에 추가했습니다.','ok');
});
function productRecords(){return state.listings.filter(x=>C.normalize(x.target)===C.normalize(productName()));}
const statusLabel={active:'판매중 호가',marked_sold:'판매완료 표시',confirmed_sold:'실거래 확인',new:'신품 판매가'};
function recordsWindow(){const items=productRecords(),months=Number($('filterMonths').value);return C.filterListings(items,{months, state:$('filterState').value,target:productName()});}
function renderRecords(){const records=recordsWindow();$('recordCount').textContent=records.length;$('recordsList').replaceChildren();if(!records.length){$('recordsList').innerHTML='<div class="empty">이 조건에 해당하는 시세 기록이 없습니다. 플랫폼 검색에서 매물 원문을 확인한 후 등록하세요.</div>';return;}
for(const r of records.slice(0,80)){const div=document.createElement('div');div.className='item';const mt=C.matchProduct(productName(),r.title,{model:state.product.model});const pill=mt.status==='matched'?'ok':'warn';div.innerHTML=`<div class="item-top"><span class="pill">${esc(r.market)}</span><span class="pill ${pill}">${esc(mt.status==='matched'?'모델 일치':'수동 검증')}</span></div><div class="item-title" style="margin-top:9px">${esc(r.title)}</div><div class="item-top" style="margin-top:4px"><div class="item-price">${C.won(r.price)}</div><span class="pill">${esc(statusLabel[r.state]||'기타')}</span></div><div class="item-bottom"><span>📅 ${esc(r.date)}</span>${C.validHttpUrl(r.url)?`<a href="${esc(C.validHttpUrl(r.url))}" target="_blank" rel="noopener noreferrer">원문 확인 ↗</a>`:''}<button class="btn ghost" style="padding:1px 9px;min-height:27px;font-size:11px" data-delete-id="${esc(r.id)}">삭제</button></div>`;$('recordsList').append(div);}}
$('recordsList').addEventListener('click',e=>{const id=e.target.closest('[data-delete-id]')?.dataset.deleteId;if(!id)return;if(confirm('이 매물 기록을 삭제할까요?')){state.listings=state.listings.filter(x=>x.id!==id);save();render();}});
for(const id of ['filterMonths','filterState'])$(id).addEventListener('change',render);
function pricingPool(){const months=Number($('filterMonths').value);return C.filterListings(productRecords(),{months,target:productName()});}
function marketNumbers(){const r=pricingPool();return {asking:C.stats(r.filter(x=>x.state==='active')),sold:C.stats(r.filter(x=>x.state==='confirmed_sold')),marked:C.stats(r.filter(x=>x.state==='marked_sold')),newPrices:C.stats(r.filter(x=>x.state==='new')),all:r};}
function drawChart(r){const svg=$('priceChart');const points=r.all.filter(x=>x.state==='active'||x.state==='confirmed_sold').slice().sort((a,b)=>a.date.localeCompare(b.date));if(points.length<2){svg.innerHTML='<div class="empty">추세 그래프를 표시하려면 서로 다른 날짜의 중고 가격 기록 2건 이상이 필요합니다.</div>';return;}const W=680,H=206,pad=40,min=Math.min(...points.map(x=>x.price)),max=Math.max(...points.map(x=>x.price)),range=Math.max(10000,max-min);const a=min-range*.1,b=max+range*.12;
const dates=points.map(x=>new Date(x.date+'T12:00:00').getTime()),start=Math.min(...dates),stop=Math.max(...dates);const x=t=>pad+(W-2*pad)*(stop===start?.5:(t-start)/(stop-start));const y=v=>H-pad-(H-pad*1.5)*(v-a)/(b-a);
const yGrid=[0,.5,1].map(q=>{const v=a+q*(b-a),yy=y(v);return `<line x1="${pad}" y1="${yy}" x2="${W-pad}" y2="${yy}" stroke="#33455e" stroke-dasharray="4 5"/><text x="4" y="${yy+4}" font-size="11" fill="#98acc5">${Math.round(v/10000)}만</text>`;}).join('');
const groups=[{state:'active',color:'#70aafc'},{state:'confirmed_sold',color:'#51d6aa'}].map(g=>{const pts=points.filter(pt=>pt.state===g.state);return `<polyline points="${pts.map(pt=>`${x(new Date(pt.date+'T12:00:00').getTime()).toFixed(1)},${y(pt.price).toFixed(1)}`).join(' ')}" stroke="${g.color}" stroke-width="2" fill="none"/>${pts.map(pt=>`<circle cx="${x(new Date(pt.date+'T12:00:00').getTime())}" cy="${y(pt.price)}" r="4" fill="${g.color}"/>`).join('')}`;}).join('');
svg.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="수집된 날짜별 중고 판매중 호가와 실거래가를 구분한 그래프" style="width:100%;height:auto">${yGrid}${groups}<text x="${pad}" y="${H-6}" font-size="11" fill="#a7c0da">${esc(points[0].date)}</text><text x="${W-pad}" y="${H-6}" text-anchor="end" font-size="11" fill="#a7c0da">${esc(points[points.length-1].date)}</text><text x="240" y="16" fill="#70aafc" font-size="12">● 판매중 호가</text><text x="360" y="16" fill="#51d6aa" font-size="12">● 실거래 확인</text></svg>`;}
function updateCalculation(){const ids=['calcBuy','calcSale','calcShipping','calcPackaging','calcFee','calcDiscount','calcOther','calcTax'];const p=ids.map(id=>$(id).value===''?NaN:Number($(id).value));const result=C.calculate({purchase:p[0],sale:p[1],shipping:p[2],packaging:p[3],platformFee:p[4],discount:p[5],other:p[6],tax:p[7]});if(result.error||p.some(x=>!Number.isFinite(x))){$('netProfit').textContent='입력 확인';$('netProfit').className='val bad';$('roi').textContent='—';$('breakeven').textContent='—';$('decisionText').textContent=result.error||'모든 금액 항목을 입력하세요.';return;}
$('netProfit').textContent=(result.profit>0?'+':'')+C.won(result.profit);$('netProfit').className='val '+(result.profit>=0?'good':'bad');$('roi').textContent=result.roi===null?'—':result.roi.toFixed(1)+'%';$('breakeven').textContent=result.breakeven===null?'—':C.won(Math.ceil(result.breakeven));
const s=marketNumbers(),count=s.sold.count;if(count>=3){$('decisionText').className='info';$('decisionText').textContent=`실거래 확인 ${count}건이 있습니다. 계산된 순이익은 예상 판매가·판매비용을 가정한 값이며 판매기간·미판매 위험은 별도입니다.`;}
else{$('decisionText').className='info warning';$('decisionText').textContent=`실거래 확인 ${count}건 — 표본 부족. 순이익은 입력한 가정에만 따른 값으로, 실제 판매수익을 보장하지 않습니다.`;}}
['calcBuy','calcSale','calcShipping','calcPackaging','calcFee','calcDiscount','calcOther','calcTax'].forEach(id=>$(id).addEventListener('input',updateCalculation));
$('useMidPrice').addEventListener('click',()=>{const mid=marketNumbers().asking.median;if(mid===null){alert('현재 기간에 판매중 호가 기록이 없습니다.');return;}$('calcSale').value=Math.round(mid);updateCalculation();});
function renderCalc(){const s=marketNumbers();$('midAsking').textContent=s.asking.median===null?'—':C.won(s.asking.median);$('midSold').textContent=s.sold.median===null?'—':C.won(s.sold.median);$('nSamples').textContent=`${s.all.length}건`;
const warning=$('qualityMsg');const parts=[];if(s.sold.count<3)parts.push('확인된 실거래가가 3건 미만입니다.');else parts.push(`직접 확인된 실거래 ${s.sold.count}건 · 중앙값 ${C.won(s.sold.median)}.`);if(s.asking.count)parts.push(`판매중 호가 ${s.asking.count}건(실제 거래가와 다를 수 있음).`);if(s.marked.count)parts.push(`판매완료 표시 ${s.marked.count}건은 실거래 금액으로 합산하지 않았습니다.`);if(s.asking.suspiciousCount||s.sold.suspiciousCount)parts.push('가격 이상치 후보가 있습니다. 개별 기록을 검토하세요.');
warning.textContent=parts.join(' ');warning.className=s.sold.count>=3?'info':'info warning';drawChart(s);updateCalculation();}
function buildAnalysis(){const s=marketNumbers();const ids=['calcBuy','calcSale','calcShipping','calcPackaging','calcFee','calcDiscount','calcOther','calcTax'];const vals=ids.map(id=>Number($(id).value));if(vals.some(v=>!Number.isFinite(v)||v<0))return null;const financial=C.calculate({purchase:vals[0],sale:vals[1],shipping:vals[2],packaging:vals[3],platformFee:vals[4],discount:vals[5],other:vals[6],tax:vals[7]});if(financial.error)return null;
return {id:Date.now()+'_'+Math.random().toString(36).slice(2),date:new Date().toISOString(),name:productName(),purchase:vals[0],sale:vals[1],profit:financial.profit,roi:financial.roi,askingCount:s.asking.count,soldCount:s.sold.count,askingMedian:s.asking.median,soldMedian:s.sold.median,verified:s.sold.count>=3};}
$('saveAnalysis').addEventListener('click',()=>{if(!productName()){alert('상품을 먼저 확정해 주세요.');return;}const a=buildAnalysis();if(!a){alert('계산기 입력값을 확인하세요.');return;}state.analyses.unshift(a);save();renderHistory();tab('history');});
function renderHistory(){$('analysisList').replaceChildren();if(!state.analyses.length){$('analysisList').innerHTML='<div class="empty">저장한 분석 기록이 없습니다.</div>';return;}for(const a of state.analyses.slice(0,100)){const div=document.createElement('div');div.className='item';div.innerHTML=`<div class="item-top"><strong class="item-title">${esc(a.name)}</strong><span class="pill ${a.verified?'ok':'warn'}">${a.verified?'실거래 표본 있음':'표본 부족'}</span></div><div class="item-bottom">${esc(new Date(a.date).toLocaleString('ko-KR'))} · 매장가 ${C.won(a.purchase)} · 예상 판매가 ${C.won(a.sale)}</div><div class="item-top"><span>가정 순이익</span><span class="item-price ${a.profit>=0?'good':'bad'}">${a.profit>0?'+':''}${C.won(a.profit)}</span></div>`;$('analysisList').append(div);}}
function downloadJSON(){const blob=new Blob([JSON.stringify({app:'Price Hunter',exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`PriceHunter_backup_${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
for(const id of ['exportBtn','historyExport'])$(id).addEventListener('click',downloadJSON);
$('importFile').addEventListener('change',async()=>{const file=$('importFile').files?.[0];if(!file)return;try{if(file.size>5*1024*1024)throw new Error('파일이 5MB를 초과합니다.');const payload=JSON.parse(await file.text());if(payload.app!=='Price Hunter'||payload.version!==1||!Array.isArray(payload.listings)||!Array.isArray(payload.analyses))throw new Error('Price Hunter 백업 파일이 아닙니다.');if(!confirm('현재 데이터 대신 백업 데이터를 복원하시겠습니까?'))return;
const fresh=blank();const prod=payload.product||{};fresh.product={name:String(prod.name||'').slice(0,140),model:String(prod.model||'').slice(0,60),barcode:String(prod.barcode||'').slice(0,32),purchase:Number(prod.purchase)||0};
fresh.listings=payload.listings.slice(0,2500).map(x=>({id:String(x.id||'').slice(0,100),target:String(x.target||'').slice(0,140),title:String(x.title||'').slice(0,140),market:String(x.market||'').slice(0,40),state:['active','marked_sold','confirmed_sold','new'].includes(x.state)?x.state:'active',price:Number(x.price),date:String(x.date||''),url:C.validHttpUrl(x.url),createdAt:String(x.createdAt||''),verified:true})).filter(x=>!C.validateListing(x,x.target));
fresh.analyses=payload.analyses.slice(0,500).filter(x=>x&&typeof x==='object').map(x=>({id:String(x.id||''),date:String(x.date||''),name:String(x.name||'').slice(0,140),purchase:Number(x.purchase)||0,sale:Number(x.sale)||0,profit:Number(x.profit)||0,roi:Number(x.roi)||0,askingCount:Number(x.askingCount)||0,soldCount:Number(x.soldCount)||0,askingMedian:x.askingMedian===null?null:Number(x.askingMedian),soldMedian:x.soldMedian===null?null:Number(x.soldMedian),verified:Boolean(x.verified)}));
state=fresh;save();fillFields();render();setStatus('historyStatus',`${fresh.listings.length}건 시세와 ${fresh.analyses.length}건 분석을 복원했습니다.`,'ok');}catch(e){setStatus('historyStatus',`가져오기 실패: ${e.message}`,'error');}finally{$('importFile').value='';}});
$('clearAll').addEventListener('click',()=>{if(confirm('모든 상품·시세·분석 기록을 삭제합니다. 되돌릴 수 없습니다. 진행할까요?')){state=blank();save();fillFields();render();setStatus('historyStatus','로컬 기록을 삭제했습니다.','ok');}});
function fillFields(){const p=state.product; $('productName').value=p.name;$('modelCode').value=p.model;$('barcode').value=p.barcode;$('purchasePrice').value=p.purchase||'';$('calcBuy').value=p.purchase||'';}
function render(){renderLinks();renderRecords();renderCalc();renderHistory();}
restore();fillFields();render();
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('오프라인 캐시 등록 실패',e));
})();
