/* Price Hunter 0.3.0 — no paid APIs, no cross-site scraping. */
(function(){
'use strict';
const C=window.PriceHunterCore,S=window.PriceHunterScreenshot;const $=id=>document.getElementById(id);
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
function applyProduct(){const p=draftProduct();if(p.name.length<3){alert('상품명은 최소 3자 이상 입력하세요.');return false;}if(p.purchase<1000||!Number.isInteger(p.purchase)||p.purchase>200000000){alert('매장 구매가는 1,000원 이상 2억 원 이하로 입력하세요.');return false;}if(p.model && !C.normalize(p.name).replace(/ /g,'').includes(C.normalize(p.model).replace(/ /g,''))){if(!confirm('상품명에 모델 코드가 포함되어 있지 않습니다. 정확한 모델이 맞나요?'))return false;}state.product=p;save();render();$('calcBuy').value=p.purchase;tab('scan');window.PriceHunterInstantDashboard?.scan(p);window.PriceHunterAutoMarket?.run(p);document.getElementById('oneScreenDashboard')?.scrollIntoView({behavior:'smooth',block:'start'});return true;}
$('confirmProduct').addEventListener('click',applyProduct);
$('clearProduct').addEventListener('click',()=>{if(confirm('현재 인식 중인 상품을 초기화할까요? 보관한 시세 이력은 유지됩니다.')){['productName','modelCode','barcode','purchasePrice','ocrText'].forEach(id=>$(id).value='');lastScan=null;$('scanPriceBreakdown').textContent='사진을 선택하면 가격 후보가 표시됩니다.';$('scanConfidence').textContent='이미지 선택 전';renderQuick();window.PriceHunterInstantDashboard?.updateResults([]);window.PriceHunterInstantDashboard?.render();}});
function renderLinks(){const name=productName();$('searchProductName').textContent=name||'미선택';
 const link=$('allMarketSearchFallback');if(name&&window.PriceHunterMarketSearch)link.href=window.PriceHunterMarketSearch.collectiveLink(state.product);
}
$('goAddRecord').addEventListener('click',()=>{if(productName()&&!$('recordTitle').value)$('recordTitle').value=productName();tab('records');});
$('parsePaste').addEventListener('click',()=>{const raw=$('pasteText').value.trim();if(!raw){setStatus('parseStatus','복사한 검색 문장을 먼저 입력하세요.','error');return;}const price=C.parsePastedPrice(raw);if(!price){setStatus('parseStatus','가격 후보를 찾지 못했습니다. 수동 입력하세요.','error');return;}const title=raw.split('\n').map(x=>x.trim()).find(x=>x.length>3&&!/^\d/.test(x))||productName();$('recordPrice').value=price;$('recordTitle').value=title.replace(/\d{1,3}(?:,\d{3})+\s*원/g,'').trim().slice(0,140);setStatus('parseStatus',`가격 후보 ${C.won(price)} 추출됨. 직접 확인 후 시세 검증 단계에서 등록하세요.`,'ok');});
function selectedFile(){return currentPastedFile||$('scanFile').files?.[0]||$('cameraFile').files?.[0]||null;}
let currentPastedFile=null, currentPreviewUrl=null, ocrRunning=false, lastScan=null, scanToken=0;
function isImageFile(file){return Boolean(file&&(file.type?.startsWith('image/')||/\.(?:png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i.test(file.name||'')));}
function previewFile(file){if(currentPreviewUrl)URL.revokeObjectURL(currentPreviewUrl);currentPreviewUrl=null;
 if(isImageFile(file)){currentPreviewUrl=URL.createObjectURL(file);$('scanPreview').src=currentPreviewUrl;$('scanPreview').style.display='block';}
 else{$('scanPreview').removeAttribute('src');$('scanPreview').style.display='none';}}
function receiveFile(file,source='이미지'){
 if(!isImageFile(file)){setStatus('ocrStatus','PNG·JPG·WebP 등 이미지 파일을 선택하세요.','error');return;}
 if(file.size>22*1024*1024){setStatus('ocrStatus','이미지가 22MB를 넘습니다. 크기를 줄여 다시 시도하세요.','error');return;}
 currentPastedFile=file;previewFile(file);lastScan=null;$('ocrText').value='';$('productName').value='';$('modelCode').value='';$('purchasePrice').value='';renderQuick();window.PriceHunterInstantDashboard?.updateResults([]);window.PriceHunterInstantDashboard?.render();
 const token=++scanToken;setStatus('ocrStatus',`${source} 입력됨. 상품명과 가격을 자동 분석합니다…`);
 ocrImage(file,token);
}
// Reset before opening the chooser so the same screenshot can be selected again.
$('scanFile').addEventListener('click',()=>{$('scanFile').value='';});
$('cameraFile').addEventListener('click',()=>{$('cameraFile').value='';});
$('scanFile').addEventListener('change',()=>{const file=$('scanFile').files?.[0];if(file)receiveFile(file,'갤러리·파일에서 선택한 이미지');});
$('cameraFile').addEventListener('change',()=>{const file=$('cameraFile').files?.[0];if(file)receiveFile(file,'카메라로 촬영한 이미지');});
const drop=$('dropTarget');
['dragenter','dragover'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('dragging');}));
['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('dragging');}));
drop.addEventListener('drop',ev=>{const file=[...ev.dataTransfer.files].find(isImageFile);if(file)receiveFile(file,'드롭한 이미지');});
document.addEventListener('paste',ev=>{const active=document.activeElement;if(active&&['INPUT','TEXTAREA'].includes(active.tagName))return;
 const file=[...(ev.clipboardData?.files||[])].find(isImageFile);if(file){ev.preventDefault();tab('scan');receiveFile(file,'클립보드 이미지');}});
let tesseractLoading=null;
async function scriptLoader(){if(window.Tesseract)return;
 if(tesseractLoading)return tesseractLoading;
 tesseractLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.async=true;script.crossOrigin='anonymous';script.onload=()=>window.Tesseract?resolve():reject(new Error('OCR 모듈 로딩에 실패했습니다.'));script.onerror=()=>reject(new Error('무료 OCR 다운로드 실패. 연결을 확인하세요.'));document.head.append(script);});
 try{await tesseractLoading;}catch(e){tesseractLoading=null;throw e;}}
async function imageInputForOCR(file){let width,height,draw,dispose=()=>{};
 try{const bitmap=await createImageBitmap(file);width=bitmap.width;height=bitmap.height;draw=(ctx,w,h)=>ctx.drawImage(bitmap,0,0,w,h);dispose=()=>bitmap.close?.();}
 catch{const url=URL.createObjectURL(file);const img=new Image();try{await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('지원하지 않는 이미지 형식입니다. PNG/JPG로 변환하세요.'));img.src=url;});width=img.naturalWidth;height=img.naturalHeight;draw=(ctx,w,h)=>ctx.drawImage(img,0,0,w,h);}finally{URL.revokeObjectURL(url);}}
 if(!width||!height)throw new Error('이미지 해상도를 확인할 수 없습니다.');
 const longest=Math.max(width,height),scale=Math.min(3.5,Math.max(1,1850/longest)),bounded=Math.min(scale,3000/longest);
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*bounded));canvas.height=Math.max(1,Math.round(height*bounded));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('캔버스 초기화 실패');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';draw(ctx,canvas.width,canvas.height);dispose();return canvas;
}
// Enhanced contrast exposes small light-gray original prices without a paid AI call.
function enhanceOCR(source){
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
 const img=ctx.getImageData(0,0,canvas.width,canvas.height),data=img.data;
 // Use light/dark background sample to invert white-on-dark screenshot text.
 const sample=[[0,0],[canvas.width-1,0],[0,canvas.height-1],[canvas.width-1,canvas.height-1]];
 let sum=0;for(const [x,y] of sample){const i=(y*canvas.width+x)*4;sum+=(data[i]+data[i+1]+data[i+2])/3;}
 const invert=sum/4<105;
 for(let i=0;i<data.length;i+=4){let gray=data[i]*.299+data[i+1]*.587+data[i+2]*.114;
  if(invert)gray=255-gray;
  const v=Math.max(0,Math.min(255,(gray-143)*1.65+143));
  data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 ctx.putImageData(img,0,0);return canvas;
}
function cropTopOCR(source){
 const height=Math.max(1,Math.floor(source.height*.78));const canvas=document.createElement('canvas');
 canvas.width=source.width;canvas.height=height;
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(source,0,0,source.width,height,0,0,canvas.width,canvas.height);return canvas;
}
// Dedicated upper-right scan for ecommerce desktop screenshots. Huge product photos
// often drown out comparatively tiny main selling price in full-page OCR.
function focusPriceOCR(source){
 // Portrait product pages typically place the main price below the hero photo;
 // desktop layouts put it in the right-side purchase information column.
 const portrait=source.height>source.width*1.12;
 const sx=portrait?0:Math.floor(source.width*.40),sy=Math.floor(source.height*(portrait?.22:.09));
 const sw=source.width-sx,sh=Math.max(1,Math.floor(source.height*(portrait?.76:.72)));
 const mul=Math.min(2.6,2700/Math.max(sw,sh));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sw*mul));canvas.height=Math.max(1,Math.round(sh*mul));
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('가격 영역 이미지 생성 실패');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,sx,sy,sw,Math.min(sh,source.height-sy),0,0,canvas.width,canvas.height);
 return canvas;
}
let lastOcrDebug=[];
async function ocrImage(file,token){if(ocrRunning){setStatus('ocrStatus','현재 사진 분석 후 새 사진을 다시 분석합니다.');return;}
 if(!file)return;ocrRunning=true;$('ocrBtn').disabled=true;let worker;
 try{
  setStatus('ocrStatus','무료 한글·영문 OCR 준비 중… 최초 실행 시 모델을 내려받습니다.');await scriptLoader();
  worker=await window.Tesseract.createWorker(['kor','eng'],1,{logger:m=>{if(m.status==='recognizing text'&&token===scanToken)setStatus('ocrStatus',`이미지 문자 인식 ${Math.round((m.progress||0)*100)}%`);}});
  const image=await imageInputForOCR(file),texts=[];
  const recognize=async (canvas,label,psm)=>{
   if(token!==scanToken)return;
   setStatus('ocrStatus',`${label} 분석 중…`);
   if(psm)await worker.setParameters({tessedit_pageseg_mode:psm});
   const response=await worker.recognize(canvas);const text=(response.data?.text||'').trim();
   if(text)texts.push(text);
  };
  // Tesseract uses a layout-aware sequence: full scene, then isolated text zones.
  // On wide shop cards, running contrast on the entire product photograph is
  // usually worse than the native-pixel price band (e.g. 1,190,000원).
  await recognize(image,'1차 전체 화면', '3');
  let merged=S.combine(texts);
  const plan=window.PriceHunterOCRRegions?.regions(image.width,image.height)||[];
  const sufficient=()=>Boolean(merged.name&&window.PriceHunterOCRRegions?.isGoodCandidate(merged)&&(merged.model||merged.name.length>=8));
  for(const [index,area] of plan.entries()){
   // Always check one price zone: a crossed-out original price may look like a unique price.
   if(token!==scanToken||(index>0&&sufficient()))break;
   const regionCanvas=window.PriceHunterOCRRegions.crop(image,area);
   await recognize(regionCanvas,`추가 정밀 인식 · ${area.name}`,String(area.psm));
   merged=S.combine(texts);
  }
  if(token===scanToken&&!sufficient()){
   await recognize(enhanceOCR(image),'마지막 고대비 검사','11');
   merged=S.combine(texts);
  }
  if(token!==scanToken)return;
  lastOcrDebug=texts;
  const primary=texts.map(t=>({t,r:S.analyze(t)})).sort((a,b)=>(b.r._titleScore+b.r._priceScore)-(a.r._titleScore+a.r._priceScore))[0];
  $('ocrText').value=primary?.t||'';
  if(!texts.length){setStatus('ocrStatus','텍스트를 감지하지 못했습니다. 원본 사진의 글자 크기를 확인하세요.','error');return;}
  applyScanResult(merged);
  const verified=(window.PriceHunterOCRRegions?.isGoodCandidate(merged))?'구매가 자동 입력':'금액 재확인 필요';
  setStatus('ocrStatus',`인식 완료 · ${merged.name?'상품명 후보 추출':'상품명 미확인'} · ${verified} · ${texts.length}회 OCR 분석`,merged.price?'ok':'error');
 }catch(e){if(token===scanToken)setStatus('ocrStatus',`자동 OCR 실패: ${e.message}. 원문 또는 상품명을 직접 수정할 수 있습니다.`,'error');console.error(e);
 }finally{if(worker)try{await worker.terminate();}catch{}ocrRunning=false;$('ocrBtn').disabled=false;
  if(token!==scanToken&&selectedFile()){const nextToken=scanToken;setTimeout(()=>ocrImage(selectedFile(),nextToken),0);}}
}
$('ocrBtn').addEventListener('click',()=>{const file=selectedFile();if(!file){setStatus('ocrStatus','이미지를 한 장 선택해 주세요.','error');return;}ocrImage(file,++scanToken);});
function parseOCR(){const input=$('ocrText').value;if(!input.trim()){setStatus('ocrStatus','인식 원문이나 사진을 먼저 입력하세요.','error');return;}
 applyScanResult(S.analyze(input));}
function applyScanResult(result){lastScan=result;
 const chosen=window.PriceHunterMerchantGuard?(result?.autoFillPrice?{price:result.autoFillPrice,reason:'국내 쇼핑몰 가격 근거 검증 완료'}:{price:null,reason:'가격 근거 충돌 또는 미확인'}):(window.PriceHunterCheckoutGuard?.autoPurchase(result)||{price:null,reason:'가격 확인 필요'});
 $('productName').value=result.name||'';$('modelCode').value=result.model||'';$('purchasePrice').value=chosen.price?String(chosen.price):'';
 const confidenceLabel={high:'상품명·가격 후보 추출',medium:'일부 확인 필요',low:'확인 필요'}[result.confidence];
 $('scanConfidence').className='info '+(chosen.price?'':'warning');
 $('scanConfidence').textContent=chosen.price?`구매가 자동 입력 완료 · ${C.won(chosen.price)} · ${chosen.reason}`:`${confidenceLabel||'확인 필요'} · ${result.name?'상품명 후보 표시됨':'상품명 미확인'} · ${result.price?'표시 판매가 '+C.won(result.price)+' (확인 필요)':'가격 미확인'}`;
 const rows=[];if(result.merchant&&result.merchant!=='미확인')rows.push(`<div><span>인식된 쇼핑몰</span><strong>${esc(result.merchant)}</strong></div>`);if(result.originalPrice)rows.push(`<div><span>할인 전 표시가</span><del>${C.won(result.originalPrice)}</del></div>`);
 if(result.price)rows.push(`<div><span>표시 판매가 ${chosen.price?'(구매가 자동 입력)':'(검증 필요)'}</span><strong class="good">${C.won(result.price)}</strong></div>`);
 for(const x of [...new Set(result.conditionalPrices)])rows.push(`<div><span>로그인·쿠폰 등 조건부</span><span>${C.won(x)} (미적용)</span></div>`);
 const excludes=[...new Map((result.prices||[]).filter(x=>x.type==='excluded').map(x=>[x.value,x])).values()].slice(0,5);
 for(const x of excludes)rows.push(`<div><span>적립·포인트·할인액 등 (제외)</span><del>${C.won(x.value)}</del></div>`);
 if(result.priceConfidence!=='high'&&!result.price)rows.push('<div><span>⚠️ 기본 판매가 미확인 · 적립/조건부 금액은 구매가에 자동 적용하지 않습니다.</span></div>');
 // Candidates are not payment prices until a human checks against the screenshot.
 const rejected=new Set((result.prices||[]).filter(x=>x.type==='conditional'||x.type==='excluded'||x.type==='original').map(x=>x.value));
 const pending=[...new Set((result.prices||[]).filter(x=>x.type==='main'&&!rejected.has(x.value)).map(x=>x.value))].filter(v=>v!==result.price).slice(0,4);
 for(const v of pending)rows.push(`<div><span>기본 판매가 후보 · 직접 확인</span><button type="button" class="btn price-accept" data-price="${v}">${C.won(v)} 확인 후 적용</button></div>`);
 $('scanPriceBreakdown').innerHTML=rows.join('')||'<span>상품 가격을 확인하지 못했습니다.</span>';
 $('scanPriceBreakdown').querySelectorAll('.price-accept').forEach(button=>button.addEventListener('click',()=>{
  const candidate=Number(button.dataset.price);if(!Number.isSafeInteger(candidate))return;
  if(!confirm(`이미지 속 일반 판매가가 ${C.won(candidate)}인지 확인하셨나요? 조건부 혜택가·포인트를 기본 구매가로 사용하면 안 됩니다.`))return;
  $('purchasePrice').value=String(candidate);renderQuick();setStatus('ocrStatus',`가격 확인 후 구매가 ${C.won(candidate)} 입력 완료`,'ok');
 }));
 $('ocrCandidates').textContent=result.warnings.join(' ')||'상품명·가격이 자동 추출되었습니다. 실물 SKU와 최종 결제 금액을 확인하세요.';
 renderQuick();renderQuickLinks();
 window.PriceHunterInstantDashboard?.scan(draftProduct());window.PriceHunterCafe?.prefill();
}
$('applyOcr').addEventListener('click',parseOCR);
$('barcodeBtn').addEventListener('click',async()=>{const file=selectedFile();if(!file){setStatus('ocrStatus','바코드를 검색할 이미지를 선택하세요.','error');return;}
 if(!('BarcodeDetector' in window)){setStatus('ocrStatus','기본 바코드 기능이 없는 브라우저입니다. 코드 숫자를 직접 입력할 수 있습니다.','error');return;}
 try{const formats=await BarcodeDetector.getSupportedFormats();const selected=formats.filter(f=>['ean_13','ean_8','upc_a','upc_e','code_128'].includes(f));if(!selected.length)throw new Error('지원 바코드 형식이 없습니다.');const detector=new BarcodeDetector({formats:selected});const codes=await detector.detect(file);
 if(codes.length){$('barcode').value=codes[0].rawValue;setStatus('ocrStatus',`바코드 ${codes[0].rawValue} 인식. SKU와 연결 여부는 별도로 확인하세요.`,'ok');}else setStatus('ocrStatus','이 이미지에서는 바코드를 찾지 못했습니다.','error');
 }catch(e){setStatus('ocrStatus',`바코드 검색 실패: ${e.message}`,'error');}});
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
function quickProduct(){const name=$('productName').value.trim(),price=Number($('purchasePrice').value);
 return {name,price:Number.isFinite(price)&&price>0?price:null,model:$('modelCode').value.trim()};}
function quickPool(){const prod=quickProduct();if(!prod.name||!state.product.name||C.normalize(state.product.name)!==C.normalize(prod.name))return [];
 const months=Number($('quickMonths').value);
 return C.filterListings(state.listings,{months,target:prod.name}).filter(r=>r.verified!==false&&['active','confirmed_sold'].includes(r.state)&&C.matchProduct(prod.name,r.title,prod.model?{model:prod.model}:{}).status==='matched');}
function cleanQuickOutliers(items){if(!$('quickOutliers').checked||items.length<5)return items;
 const m=C.stats(items).median,mad=C.stats(items.map(x=>({price:Math.abs(x.price-m)}))).median;
 if(mad===null)return items;return items.filter(r=>mad===0?r.price===m:Math.abs(r.price-m)<=3*1.4826*mad);}
function renderQuickLinks(){const name=quickProduct().name;const host=$('quickLinks');host.replaceChildren();if(!name)return;
 const button=document.createElement('button');button.type='button';button.className='btn main';button.textContent='🔎 모든 중고시장 통합 검색 →';button.addEventListener('click',()=>{$('confirmProduct').click();});host.appendChild(button);
}
function renderQuick(){const prod=quickProduct(),el=$('quickResult');renderQuickLinks();window.PriceHunterInstantDashboard?.render();
 if(!prod.name||!prod.price){el.innerHTML='<div class="info warning">제품명과 구매 가격을 사진에서 확인하거나 입력해 주세요. 중고시세가 없을 때 수익을 추정하지 않습니다.</div>';return;}
 const before=quickPool(),sold=cleanQuickOutliers(before.filter(r=>r.state==='confirmed_sold')),asking=cleanQuickOutliers(before.filter(r=>r.state==='active'));
 const items=sold.length>=3?sold:asking;const kind=sold.length>=3?'실거래 직접 확인':'중고 판매중 호가';const sample=items.length;
 if(sample<3){el.innerHTML=`<div class="quick-banner"><div><strong>🔎 ${esc(prod.name)}</strong><div class="sub">사진에서 인식한 표시 판매가</div></div><div><div class="money">${C.won(prod.price)}</div><small>시세 근거 부족 · 매수 판단 보류</small></div></div><div class="mini-note">검증한 같은 모델의 중고 시세가 ${sample}건입니다. 최소 3건이 있어야 예상 판매가를 제시합니다. 아직 자동으로 외부 매물을 수집하지 않습니다. 하단 실시간 검색에서 매물을 확인하고 등록하세요.</div>`;return;}
 const st=C.stats(items),mode=$('quickMode').value;
 const sale=Math.round(({low:st.quartile25,median:st.median,mean:st.mean,high:st.quartile75})[mode]??st.median);
 const fee=Number($('quickFee').value),shipping=Number($('quickShipping').value);
 const calc=C.calculate({purchase:prod.price,sale,platformFee:fee,shipping});if(calc.error){el.textContent=calc.error;return;}
 const sign=calc.profit>=0?'+':'',roi=calc.roi===null?'—':`${calc.roi>=0?'+':''}${calc.roi.toFixed(1)}%`;
 const status=sold.length>=3?'직접 확인한 거래가 기반 예상':'호가 기반 가상 수익 (판매 보장 불가)';
 const newPrices=C.filterListings(state.listings,{months:Number($('quickMonths').value),target:prod.name}).filter(r=>r.state==='new'&&r.verified!==false&&C.matchProduct(prod.name,r.title).status==='matched');
 const newPrice=C.stats(newPrices).min;
 const maxima=Math.max(prod.price,sale,newPrice||0,1),bar=(v,col)=>`<div class="bar-track"><i style="width:${Math.max(1,v/maxima*100)}%;background:${col}"></i></div>`;
 el.innerHTML=`<div class="quick-banner"><div><strong>${calc.profit>=0?'💰 예상 이익 (미실현)':'⚠️ 손실 가능성'} · ${esc(status)}</strong><div class="sub">${esc(kind)} ${sample}건 · 기간 ${$('quickMonths').selectedOptions[0].textContent}</div></div><div><div class="money ${calc.profit<0?'loss':''}">${sign}${C.won(calc.profit)}</div><div class="sub">ROI ${roi}</div></div></div>
 <div class="quick-kpis"><div class="metric"><small>🛒 촬영/입력 구매가</small><b>${C.won(prod.price)}</b></div><div class="metric"><small>♻️ 중고 예상 판매가</small><b class="good">${C.won(sale)}</b></div><div class="metric"><small>🏷️ 신품 최저가(등록분)</small><b>${newPrice===null?'미확인':C.won(newPrice)}</b></div></div>
 <div class="price-bars"><div class="price-row"><span>매장/사진 구매가</span>${bar(prod.price,'#5983eb')}<strong>${C.won(prod.price)}</strong></div><div class="price-row"><span>중고 예상가</span>${bar(sale,'#53b899')}<strong>${C.won(sale)}</strong></div>${newPrice!==null?`<div class="price-row"><span>기록된 신품 최저가</span>${bar(newPrice,'#edb041')}<strong>${C.won(newPrice)}</strong></div>`:''}</div>
 <div class="quick-foot">예상 판매가 ${C.won(sale)} − 구매가 ${C.won(prod.price)} − 플랫폼 수수료 ${C.won(calc.feeAmount)} − 배송·교통비 ${C.won(shipping)} = <strong>${sign}${C.won(calc.profit)}</strong></div>
 <div class="mini-note">⚠️ ${esc(status)}. 중고 시세의 최소·최대 ${C.won(st.min)} ~ ${C.won(st.max)} / 표본 ${sample}건. 수수료·배송비는 입력 가정이며 반품·불량·가격 협상·세금은 포함하지 않습니다. 판매 전 반드시 원문과 상태를 확인하세요.</div>`;
}
['productName','modelCode','purchasePrice'].forEach(id=>$(id).addEventListener('input',renderQuick));
['quickMonths','quickMode','quickFee','quickShipping','quickOutliers'].forEach(id=>$(id).addEventListener('change',renderQuick));
$('quickToRecords').addEventListener('click',()=>{if(quickProduct().name&&!$('recordTitle').value)$('recordTitle').value=quickProduct().name;tab('records');});
$('quickSave').addEventListener('click',()=>{const prod=quickProduct();if(!prod.name||!prod.price){alert('인식된 제품명과 구매가를 확인하세요.');return;}
 const pool=quickPool(),sold=cleanQuickOutliers(pool.filter(x=>x.state==='confirmed_sold')),ask=cleanQuickOutliers(pool.filter(x=>x.state==='active')),selected=sold.length>=3?sold:ask;
 if(selected.length<3){alert('검증 가능한 동일 모델 시세가 3건 미만입니다. 검색 후 기록하거나 수익 계산기에서 가정 값을 입력하세요.');return;}
 const s=C.stats(selected),val=({low:s.quartile25,median:s.median,mean:s.mean,high:s.quartile75})[$('quickMode').value],result=C.calculate({purchase:prod.price,sale:val,platformFee:Number($('quickFee').value),shipping:Number($('quickShipping').value)});
 if(result.error){alert(result.error);return;}
 state.product={name:prod.name,model:prod.model,barcode:$('barcode').value.trim(),purchase:prod.price};
 state.analyses.unshift({id:Date.now()+'_'+Math.random().toString(36).slice(2),date:new Date().toISOString(),name:prod.name,purchase:prod.price,sale:Math.round(val),profit:result.profit,roi:result.roi,askingCount:ask.length,soldCount:sold.length,askingMedian:ask.length?C.stats(ask).median:null,soldMedian:sold.length?C.stats(sold).median:null,verified:sold.length>=3});
 save();renderHistory();tab('history');});
window.PriceHunterDashboardData=()=>({product:draftProduct(),listings:state.listings});
function fillFields(){const p=state.product; $('productName').value=p.name;$('modelCode').value=p.model;$('barcode').value=p.barcode;$('purchasePrice').value=p.purchase||'';$('calcBuy').value=p.purchase||'';}
function render(){renderLinks();renderRecords();renderCalc();renderHistory();renderQuick();}
restore();fillFields();render();
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('오프라인 캐시 등록 실패',e));
})();
