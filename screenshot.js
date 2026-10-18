/* Price Hunter Screenshot Intelligence v0.2.0 — deterministic/no paid AI API.
   Optical text is untrusted; candidate prices never imply completed transactions. */
(function(root,factory){const out=factory(root.PriceHunterCore||(typeof require==='function'?require('./core.js'):null));if(typeof module==='object'&&module.exports)module.exports=out;root.PriceHunterScreenshot=out;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const tidy=x=>String(x||'').normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g,'').replace(/[ \t]+/g,' ').trim();
const BENEFIT=/로그인|최대\s*혜택|혜택가|멤버십|멤버|쿠폰|카드\s*할인|카드사|적립|캐시백|포인트|청구\s*할인|체감가|조건부|구독\s*할인/i;
const BEFORE=/정가|정상가|할인\s*전|소비자\s*가격|권장\s*가격|기존\s*가격|원가|출고가|판매\s*전/i;
const SALE=/판매가|할인가|행사가|특가|즉시\s*할인|최종\s*가격|판매\s*가격|매장가|판매\s*금액|결제\s*금액|구매가/i;
const NON_TITLE=/무료\s*배송|배송|할인|쿠폰|구매|주문|장바구니|로그인|회원|혜택|적립|포인트|검색|인기|리뷰|상품\s*번호|신규|교환|반품|최저가|원산지|관심|상세정보|오늘\s*출발|도착|선물하기|할부|쇼핑|원\s*$/i;
function modelTokens(s){const tokens=String(s||'').match(/[A-Za-z0-9][A-Za-z0-9-]{2,24}/g)||[];return [...new Set(tokens.map(t=>t.replace(/-+$/,'')).filter(t=>/[a-z]/i.test(t)&&/\d/.test(t)&&t.replace(/-/g,'').length>=4&&!/^(?:\d{1,4}(?:cm|mm|kg|gb|tb|hz|mah|inch)|\d+k|\d+p|\d+fps|\d+mp)$/i.test(t)).map(t=>t.toUpperCase()))];}
function safeLines(input){const from=typeof input==='string'?input:String(input?.text||'');const lines=from.split(/\r?\n/).map(tidy).filter(Boolean);return lines.slice(0,300);}
function candidateTitle(lines, firstPriceIndex){
 const scored=lines.map((line,i)=>{
  if(i>firstPriceIndex+1)return null;
  const ids=modelTokens(line);const hasPrice=C.extractPrices(line).length>0;
  const mostlyMoney=/^[\d\s.,%원만천\-]+$/.test(line);
  if(!/[가-힣A-Za-z]/.test(line)||line.length<5||mostlyMoney||BENEFIT.test(line)||BEFORE.test(line)||SALE.test(line)||NON_TITLE.test(line)||hasPrice)return null;
  let points=(ids.length?45:0)+Math.min(line.length,65)*.48+(i<12?5:0);
  if(/\b(?:4K|UHD|OLED|QLED|NANO|LED|TV|Wi-?Fi|스탠드|블랙|화이트|세대|카메라|렌즈|폴라로이드)\b/i.test(line))points+=7;
  if(/[▶<>]/.test(line)||line.length<7)points-=15;
  if(i>firstPriceIndex)points-=35;
  return {line,i,points,ids};
 }).filter(Boolean).sort((a,b)=>b.points-a.points);
 const best=scored[0];if(!best)return {name:'',model:'',confidence:'low',alternatives:[]};
 let name=best.line, model=(best.ids.sort((a,b)=>b.length-a.length)[0]||'');
 // Product title often wraps to a line with color / size / stand configuration.
 for(const step of [-1,1]){const j=best.i+step;if(j<0||j>=lines.length||j>firstPriceIndex)continue;const neighbor=lines[j];if(neighbor.length<4||neighbor.length>70||C.extractPrices(neighbor).length||BENEFIT.test(neighbor)||BEFORE.test(neighbor)||SALE.test(neighbor)||NON_TITLE.test(neighbor))continue;
   const looksVariant=/스탠드|벽걸이|자급제|블랙|화이트|실버|그레이|검스|cm|inch|인치|세대|구성|바디|렌즈|GB|TB|형|색상|리퍼|미개봉|신품/i.test(neighbor);
   if(looksVariant && ((step===1&&j===best.i+1)||(step===-1&&j===best.i-1)))name=step===-1?neighbor+' '+name:name+' '+neighbor;
 }
 name=name.replace(/\s+/g,' ').slice(0,145);
 const ids=modelTokens(name).sort((a,b)=>b.length-a.length);if(ids.length)model=ids[0];
 return {name,model,confidence:model?'high':'medium',alternatives:scored.slice(0,5).map(x=>x.line)};
}
function collectPrices(lines){const all=[];for(let i=0;i<lines.length;i++){const line=lines[i],hits=C.extractPrices(line);
 // Tesseract sometimes mistakes the won glyph for a trailing 2 in small screenshots.
 // Only propose a low-confidence candidate when comma groups would otherwise be invalid.
 let uncertain=false;
 if(!hits.length && /\d{1,2}\s*%|판매가|할인가|특가/.test(line)){
   const damaged=line.match(/(\d{1,3}(?:,\d{3})+)[2zZ](?!\d)/);
   if(damaged){hits.push({value:Number(damaged[1].replace(/,/g,'')),raw:damaged[0],index:damaged.index});uncertain=true;}
 }
 if(!hits.length)continue;
 for(const hit of hits){const prev=lines[i-1]||'',next=lines[i+1]||'';let category='main',score=20;
 const near=line+' '+prev;
 if(BENEFIT.test(line)||(!/\d/.test(prev)&&BENEFIT.test(prev))){category='conditional';score=-100;}
 else if(BEFORE.test(line)||(!/\d/.test(prev)&&BEFORE.test(prev))){category='original';score=-50;}
 else if(SALE.test(line)){score+=68;}
 else if(/\b\d{1,2}\s*%|\bOFF\b/i.test(line)){score+=55;}
 else if(/\b\d{1,2}\s*%|\bOFF\b/i.test(prev)){score+=28;}
 if(/^(?:\s*\d{1,2}\s*%\s*)?[\d,]+\s*원?\s*$/.test(line))score+=25;
 if(/무료배송|포인트|쿠폰|추가\s*할인|카드/i.test(line))score-=30;
 if(!/[,%원만천]/.test(hit.raw))score-=15;
 if(hit.value<10000)score-=10;
 all.push({value:hit.value,raw:hit.raw,context:line,row:i,category,score,uncertain});
 }}
 // When a visible % discount is next to a lower price, preceding larger price is the crossed-out/original one.
 for(const a of all){if(a.category!=='main')continue;const next=all.find(b=>b.row>a.row&&b.row<=a.row+2&&b.category==='main'&&b.value<a.value&&(/\d{1,2}\s*%|할인가|세일|판매가/.test(b.context)));if(next){a.category='original';a.score=-40;}}
 return all;
}
function analyze(text){const lines=safeLines(text),prices=collectPrices(lines);const primary=prices.filter(p=>p.category==='main').sort((a,b)=>b.score-a.score||a.row-b.row);
 const best=primary[0]||null;const original=prices.filter(p=>p.category==='original'&&(!best||p.value>=best.value)).sort((a,b)=>a.row-b.row)[0]||null;
 const conditional=prices.filter(p=>p.category==='conditional');const first=prices.length?Math.min(...prices.map(p=>p.row)):lines.length;
 const title=candidateTitle(lines,first);
 let confidence=title.confidence;if(!best||!title.name||best.uncertain)confidence='low';else if(primary.length>1&&primary[0].score===primary[1].score&&primary[0].value!==primary[1].value)confidence='low';
 const warnings=[];if(best?.uncertain)warnings.push('OCR이 원화 표시를 숫자로 잘못 읽었을 가능성이 있습니다. 1원 단위까지 가격을 확인하세요.');if(!title.name)warnings.push('제품명이 인식되지 않았습니다. 촬영 각도 또는 원문을 확인하세요.');if(!best)warnings.push('일반 판매가를 찾지 못했습니다. 쿠폰·회원 혜택가만 보일 수 있습니다.');if(confidence==='low')warnings.push('인식 신뢰도가 낮아 직접 확인이 필요합니다.');
 if(conditional.length)warnings.push('로그인/회원/쿠폰 등 조건부 가격은 기본 구매가에서 제외했습니다.');
 return {name:title.name,model:title.model,price:best?.value??null,originalPrice:original?.value??null,conditionalPrices:conditional.map(x=>x.value),prices:prices.map(x=>({value:x.value,raw:x.raw,type:x.category,row:x.row,context:x.context,uncertain:x.uncertain})),confidence,warnings,titleAlternatives:title.alternatives,lines};
}
return {analyze,modelTokens,safeLines,collectPrices};
});


/* v0.3.0 Korean storefront OCR correction, price/points separation */
(function(S){
'use strict';
const old=S.analyze, clean=x=>String(x||'').normalize('NFKC').trim();
const excluded=/적립|포인트|마일리지|할부|개월|택배비|배송비|리뷰|평점|구매수/i;
const conditional=/로그인|쿠폰|멤버|혜택가|회원가|카드\s*할인|캐시백/i;
const original=/정가|정상가|할인\s*전|출고가|소비자가/i;
function fixTitle(t){let s=clean(t).replace(/[「」『』<>{}|]/g,' ').replace(/\s+/g,' ').trim();
if(/갤럭시/.test(s)&&/폴드/.test(s))s=s.replace(/갤럭시\s*[7Zz]\s*폴드\s*([1-9])/,'갤럭시 Z 폴드$1').replace(/폴드([1-9])5[6Gg]\b/,'폴드$1 5G').replace(/\b(128|256|512)\s*(?:68|6B|G8)\b/gi,'$1GB').replace(/자급제\s*(?:Fs|5|s|f)\s*$/i,'자급제');
return s;}
function money(line){const a=[],r=/(\d{1,3}(?:[,，.]\d{3}){1,3}|\d{4,9}|\d{1,3}(?=\s*(?:만원|천원)))\s*(만원|천원|원|₩|￦)?/g;let m;
while((m=r.exec(line))){const amount=Number(m[1].replace(/[,，.]/g,''))*(m[2]==='만원'?10000:m[2]==='천원'?1000:1);if(amount<1000||amount>2e8)continue;
if(!m[2]&&!/[,，.]/.test(m[1])&&!/(?:판매|가격|특가|할인|\d{1,2}\s*%)/.test(line))continue;
if(!m[2]&&/[가-힣a-z]/i.test(line)&&!/(?:판매|가격|특가|할인|\d{1,2}\s*%)/.test(line))continue;
if(/^[PpGg]/.test(line.slice(r.lastIndex,r.lastIndex+4)))continue;
a.push({value:amount,raw:m[0],uncertain:!m[2]});}return a;}
function analyze(text){const base=old(text),lines=String(text||'').split(/\r?\n/).map(clean).filter(Boolean);
let name=base.name,model=base.model;
const t=lines.filter(l=>/(?:삼성전자.*갤럭시|LG전자.*(?:NANO|TV)|폴라로이드|Sony.*A7|Canon.*EOS)/i.test(l)&&!excluded.test(l)).sort((a,b)=>b.length-a.length)[0];
if(t){name=fixTitle(t);const next=lines[lines.indexOf(t)+1]||'';if(/^(?:자급제|스탠드형|벽걸이형|\d+GB)/i.test(next)&&!excluded.test(next)&&!money(next).length)name=fixTitle(name+' '+next);}else if(name)name=fixTitle(name);
if(/^(?:FOLD|FLIP|GALAXY|IPHONE)\d+$/i.test(model)||/^\d+(?:GB|G8|TB|CM)$/i.test(model))model='';
const found=[];
for(let i=0;i<lines.length;i++)for(const hit of money(lines[i])){
const line=lines[i],prev=lines[i-1]||'',near=line+' '+(!/\d/.test(prev)?prev:'');let type='main',score=40;
if(excluded.test(near)){type='excluded';score=-300;}else if(conditional.test(near)){type='conditional';score=-100;}else if(original.test(near)){type='original';score=-80;}
else{if(/\b\d{1,2}\s*%/.test(line))score+=110;if(/할인|판매|특가/.test(line))score+=70;if(hit.raw.includes(','))score+=25;if(!hit.uncertain)score+=12;}
found.push({...hit,type,score,row:i,context:line});}
for(const a of found)if(a.type==='main'){const reduced=found.find(b=>b.type==='main'&&b.row>a.row&&b.row<=a.row+4&&b.value<a.value&&/\d{1,2}\s*%|할인|판매/.test(b.context));if(reduced){a.type='original';a.score=-50;}}
const main=found.filter(x=>x.type==='main').sort((a,b)=>b.score-a.score||a.row-b.row)[0];
const before=found.filter(x=>x.type==='original'&&(!main||x.value>=main.value)).sort((a,b)=>a.row-b.row)[0];
const benefit=found.filter(x=>x.type==='conditional');let price=main?.value??null;
if(price===null&&base.price&&!found.some(x=>x.type==='excluded'&&x.value===base.price))price=base.price;
const warnings=[...new Set(base.warnings||[])];
if(!model&&name)warnings.push('제조사 모델 코드(SKU)가 보이지 않아 상품명으로 검색합니다. 정확한 모델을 확인하세요.');
if(name&&t&&fixTitle(t)!==clean(t))warnings.push('OCR 오탈자를 보정한 상품명 후보입니다. 원본과 대조하세요.');
if(!price)warnings.push('표시 판매가를 확인할 수 없습니다. 포인트·쿠폰 등은 판매가에서 제외했습니다.');
const titleScore=name?(t?90:40):0,priceScore=main?.score??(price?15:-300);
const priceConfidence=!price?'none':main?.uncertain?'medium':'high';
return {...base,name,model,price,originalPrice:before?.value??base.originalPrice??null,conditionalPrices:[...new Set(benefit.map(x=>x.value))],prices:found,confidence:(!price||!name)?'low':priceConfidence==='high'?'high':'medium',titleConfidence:name?'high':'none',priceConfidence,warnings,_titleScore:titleScore,_priceScore:priceScore};}
const baseTokens=S.modelTokens; S.modelTokens=s=>baseTokens(s).filter(x=>!/^(?:FOLD|FLIP|GALAXY|IPHONE)\d+$/i.test(x));
S.analyze=analyze;
S.combine=function(inputs){const arr=(Array.isArray(inputs)?inputs:[inputs]).map(x=>typeof x==='string'?analyze(x):x).filter(Boolean);
if(!arr.length)return analyze('');const title=arr.filter(x=>x.name).sort((a,b)=>b._titleScore-a._titleScore)[0]||arr[0];const sale=arr.filter(x=>x.price).sort((a,b)=>b._priceScore-a._priceScore)[0]||arr[0];
const all=arr.flatMap(x=>x.prices||[]),before=all.filter(x=>x.type==='original'&&(!sale.price||x.value>=sale.price))[0];
const mismatch=arr.some(x=>x.price&&sale.price&&x.price!==sale.price&&x._priceScore>=sale._priceScore-12);
return {...title,price:sale.price,originalPrice:before?.value??sale.originalPrice,conditionalPrices:[...new Set(all.filter(x=>x.type==='conditional').map(x=>x.value))],prices:all,priceConfidence:mismatch?'low':sale.priceConfidence,confidence:!sale.price||mismatch?'low':title.confidence,warnings:[...new Set([...title.warnings,...sale.warnings,mismatch?'다중 OCR 가격 후보 불일치 - 확인 필요':''].filter(Boolean))]};};
})(globalThis.PriceHunterScreenshot);

