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
