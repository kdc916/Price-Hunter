/* Price Hunter v0.3.2 — conservative won-price evidence filter.
 * OCR text is untrusted. Rewards/points/discount savings must never be used as buy price.
 * No external API / dependency; wraps the v0.3.0 title extraction without altering saved data.
 */
(function(root,factory){
 const S=root.PriceHunterScreenshot||(typeof require==='function'?require('./screenshot.js'):null);
 const api=factory(S);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.PriceHunterPriceGuard=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(S){
'use strict';
if(!S||typeof S.analyze!=='function')throw new Error('Screenshot parser must load before PriceGuard');
const tidy=s=>String(s||'').normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g,'').trim();
const reward=/적립|포인트|마일리지|리워드|캐시백|캐쉬백|페이백|적립금|쇼핑머니|쇼핑포인트|멤버십\s*포인트|\bpoints?\b/i;
const discountSaving=/할인\s*(?:금액|액|혜택|쿠폰)|즉시\s*할인\s*금액|추가\s*할인\s*금액|쿠폰\s*(?:할인|혜택|금액)|절약\s*(?:금액|액)|세이브\s*금액/i;
const ancillary=/배송비|택배비|배송\s*요금|수수료|할부|월\s*납부|월\s*이용료|무이자|이자|보험료|보상금|보상\s*판매|사은품\s*가액/i;
const conditional=/로그인\s*시?|회원\s*(?:가|가격|특가)|멤버\s*(?:십|쉽)?\s*(?:가|특가|가격)|쿠폰\s*(?:적용가|가|사용가)|카드\s*할인\s*적용가|체감가|조건부\s*가격|혜택가|최대\s*혜택가/i;
const original=/정가|정상가|할인\s*전|소비자\s*가격|권장\s*가격|출고가|기존\s*가격|취소선|이전\s*판매가/i;
const sale=/(?:^|\s)(?:판매가|할인가|행사가|특가|매장가|결제\s*(?:예정\s*)?금액|판매\s*가격|현재가|최종\s*결제\s*금액|할인\s*적용가|최종가|구매가|30일\s*내\s*최저가)(?:\s|:|$)/i;
const priceToken=/(₩\s*)?(\d{1,3}(?:[,，.]\d{3}){1,3}|\d{4,9}|\d{1,3})\s*(만원|천원|원)?/g;
function tokens(line){
 const s=tidy(line),out=[];let m;
 priceToken.lastIndex=0;
 while((m=priceToken.exec(s))){
  const prefix=m[1]||'',unit=m[3]||'';
  // Require a currency marker: a comma alone does not make a price.
  if(!prefix&&!unit)continue;
  const numeric=Number(m[2].replace(/[,，.]/g,''));
  const value=Math.round(numeric*(unit==='만원'?10000:unit==='천원'?1000:1));
  if(!Number.isSafeInteger(value)||value<1000||value>200000000)continue;
  const before=s.slice(Math.max(0,m.index-2),m.index);
  const after=s.slice(priceToken.lastIndex,priceToken.lastIndex+8);
  if(/\d/.test(before.slice(-1))||/^\d/.test(after))continue;
  if(/^\s*(?:[Pp]|점|%|개|명|GB|TB|개월|회|할부)/i.test(after))continue;
  out.push({value,raw:m[0],start:m.index,end:priceToken.lastIndex,unit:unit||prefix.trim()});
 }
 return out;
}
function contextKind(text){
 const t=tidy(text);
 if(reward.test(t)||ancillary.test(t)||discountSaving.test(t))return 'excluded';
 if(conditional.test(t))return 'conditional';
 if(original.test(t))return 'original';
 return '';
}
function classifyLine(line,row,prev,prev2){
 const hits=tokens(line),items=[];
 for(let i=0;i<hits.length;i++){
  const h=hits[i],left=line.slice(i?hits[i-1].end:0,h.start),right=line.slice(h.end,i+1<hits.length?hits[i+1].start:line.length);
  // Bind a qualifier to the nearest amount. It may appear on either side: "포인트 68,181원" or "68,181원 적립".
  const leftTail=left.slice(-40),rightHead=right.slice(0,28);
  const plainDiscount=/(?:^|\s)할인\s*[:：]?\s*$/.test(leftTail);
  const ownLeft=/((?:최대|오늘|네이버페이|맴버십|멤버십)\s*)?(?:적립(?:금)?|포인트|마일리지|리워드|캐시백|캐쉬백|페이백|할부|배송비|택배비|수수료|할인\s*(?:금액|액|혜택)|쿠폰\s*(?:할인|금액))\s*(?:최대|약|금액|:|：|\-|은|이)?\s*$/i.test(leftTail);
  const ownRight=(i+1===hits.length)&&/^\s*(?:[Pp](?![a-z])|점\b|적립(?:금)?|포인트|마일리지|리워드|캐시백|할부|배송비|택배비|할인\s*금액)/i.test(rightHead);
  const leftKind=contextKind(leftTail),rightKind=contextKind(rightHead);
  let type='',score=35,reason='일반 금액 후보';
  if(plainDiscount||ownLeft||ownRight||(hits.length===1&&(leftKind==='excluded'||rightKind==='excluded'))){type='excluded';reason='적립·포인트·할인액·부대비용';}
  else if(conditional.test(leftTail)||conditional.test(rightHead)){type='conditional';reason='쿠폰·로그인 등 조건부 혜택가';}
  else if(original.test(leftTail)||original.test(rightHead)){type='original';reason='할인 전 가격';}
  // Other lines can qualify the amount only when the current line has no price-label text.
  if(!type&&hits.length===1){
   const label=!/\d/.test(prev)?prev.trim():'';
   const pKind=contextKind(label);
   if(pKind){type=pKind;reason=pKind==='excluded'?'이전 행의 적립·부대비용 표기':pKind==='original'?'이전 행의 정상가 표기':'이전 행의 조건부 혜택 표기';}
   else if(!label&&prev2&&!/\d/.test(prev2)&&contextKind(prev2)){type=contextKind(prev2);reason='앞선 행의 금액 종류 표기';}
  }
  // Explicit '할인액 200,000원' is savings, but '11% 3,109,090원' is an actual price candidate.
  if(!type&&discountSaving.test(leftTail)){type='excluded';reason='할인으로 절약하는 금액';}
  if(!type){type='main';
   if(sale.test(leftTail)||sale.test(line.slice(0,h.start)))score+=85;
   if(/(?:^|\s)\d{1,2}\s*%/.test(leftTail))score+=75;
   if(h.unit==='원'||h.unit==='₩')score+=30;
   if(/[,，.]/.test(h.raw))score+=12;
   if(line.trim()===h.raw.trim())score+=8;
   if(h.value<10000)score-=15;
   if(/^(?:쿠폰|할인|혜택)\s*[:：]?\s*$/.test(leftTail.trim()))score-=25;
  }else score=type==='excluded'?-300:-75;
  items.push({...h,type,score,row,context:line,reason});
 }
 return items;
}
function collectPrices(lines){
 const out=[];
 for(let i=0;i<lines.length;i++){
  const found=classifyLine(lines[i],i,lines[i-1]||'',lines[i-2]||'');
  const following=tidy(lines[i+1]||'');
  // OCR often wraps "적립" onto the next line after the points amount.
  if(found.length===1&&found[0].type==='main'&&/^(?:포인트|적립(?:금)?|마일리지|캐시백|페이백|리워드)(?:\s*예정)?$/.test(following)&&!sale.test(lines[i])&&!/\d{1,2}\s*%/.test(lines[i])){
   found[0].type='excluded';found[0].score=-300;found[0].reason='다음 행의 적립 포인트 표기';
  }
  out.push(...found);
 }
 // Larger listed price immediately above the explicit discounted selling price = original price.
 for(const a of out){if(a.type!=='main')continue;
  const after=out.find(b=>b.type==='main'&&b.row>a.row&&b.row<=a.row+4&&b.value<a.value&&(/(?:^|\s)\d{1,2}\s*%/.test(b.context)||sale.test(b.context)));
  if(after){a.type='original';a.score=-70;a.reason='아래 할인 판매가와 비교한 할인 전 가격';}
 }
 return out;
}
const oldAnalyze=S.analyze;
function analyze(text){
 const base=oldAnalyze(text),lines=S.safeLines(text),prices=collectPrices(lines);
 const mains=prices.filter(p=>p.type==='main').sort((a,b)=>b.score-a.score||a.row-b.row);
 const top=mains[0]||null,second=mains.find(x=>top&&x.value!==top.value);
 // Two plausible prices with comparable evidence: require user verification, do not autofill.
 const conflicted=Boolean(top&&second&&second.score>=top.score-20);
 const price=conflicted?null:top?.value??null;
 const priceConfidence=!top?'none':conflicted?'low':top.score>=75?'high':'medium';
 const originals=prices.filter(x=>x.type==='original'&&(!top||x.value>=top.value)).sort((a,b)=>a.row-b.row);
 const warnings=[...base.warnings.filter(w=>!/가격|원화|혜택|쿠폰|포인트|할부금/.test(w))];
 if(!top)warnings.push('원화 단위가 확인되는 일반 판매가가 없습니다. 적립·포인트 등은 자동 구매가에 넣지 않습니다.');
 if(conflicted)warnings.push('서로 다른 실제 판매가 후보가 충돌합니다. 자동 가격 입력과 수익 계산을 보류합니다.');
 if(top&&priceConfidence!=='high')warnings.push('가격 문맥이 불충분합니다. 사진의 최종 판매가를 확인해 주세요.');
 if(prices.some(x=>x.type==='excluded'))warnings.push('적립금·포인트·배송비·할인액을 판매가에서 제외했습니다.');
 if(prices.some(x=>x.type==='conditional'))warnings.push('쿠폰·회원 조건부 가격은 일반 판매가에 사용하지 않았습니다.');
 const confidence=!price||!base.name?'low':priceConfidence==='high'&&base.titleConfidence==='high'?'high':'medium';
 return {...base,price,originalPrice:originals[0]?.value??null,conditionalPrices:[...new Set(prices.filter(x=>x.type==='conditional').map(x=>x.value))],prices:prices.map(x=>({...x,uncertain:false})),confidence,priceConfidence,warnings,_priceScore:top?.score??-300,reviewRequired:priceConfidence!=='high',priceCandidates:mains.map(x=>x.value)};
}
function combine(inputs){
 const results=(Array.isArray(inputs)?inputs:[inputs]).map(x=>typeof x==='string'?analyze(x):x).filter(Boolean);
 if(!results.length)return analyze('');
 const titles=results.filter(x=>x.name).sort((a,b)=>(b._titleScore??0)-(a._titleScore??0));
 const chosenTitle=titles[0]||results[0];
 const priced=results.filter(x=>x.price!==null&&x.price!==undefined).sort((a,b)=>(b._priceScore??0)-(a._priceScore??0));
 const best=priced[0]||results[0];
 const conflict=priced.some(x=>x.price!==best.price&&(x._priceScore??0)>=(best._priceScore??0)-20);
 const all=results.flatMap(x=>x.prices||[]);
 const originals=all.filter(x=>x.type==='original'&&(!best.price||x.value>=best.price)).sort((a,b)=>a.row-b.row);
 const warnings=[...new Set([...chosenTitle.warnings,...best.warnings])];
 if(conflict)warnings.push('OCR 단계별 판매가가 충돌하여 직접 확인이 필요합니다.');
 const price=conflict?null:best.price;
 const priceConfidence=conflict?'low':best.priceConfidence;
 return {...chosenTitle,name:chosenTitle.name,model:chosenTitle.model,price,originalPrice:originals[0]?.value??best.originalPrice??null,conditionalPrices:[...new Set(all.filter(x=>x.type==='conditional').map(x=>x.value))],prices:all,priceConfidence,confidence:!price||!chosenTitle.name?'low':priceConfidence==='high'&&chosenTitle.titleConfidence==='high'?'high':'medium',warnings,reviewRequired:priceConfidence!=='high',_priceScore:best._priceScore,priceCandidates:[...new Set(all.filter(x=>x.type==='main').map(x=>x.value))]};
}
S.analyze=analyze;S.combine=combine;
return {analyze,combine,tokens,collectPrices};
});