/* Price Hunter v0.5.0 — Korean commerce price semantics (no paid API).
 * Never equate OCR-recognized currency with a verified payable price.
 * Profiles are descriptive/contextual; they do not scrape retail sites.
 */
(function(root,factory){
 const api=factory(root.PriceHunterScreenshot);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.PriceHunterMerchantGuard=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(S){
 'use strict';
 if(!S?.analyze||!S?.combine)throw Error('CheckoutGuard must load before MerchantGuard');
 const oldAnalyze=S.analyze,oldCombine=S.combine;
 const profiles=[
  {id:'naver',name:'네이버쇼핑',match:/네이버\s*(?:쇼핑|플러스스토어)|shopping\.naver\.com|N\s*쇼핑/i},
  {id:'danawa',name:'다나와',match:/다나와\s*(?:가격비교|최저가|상품비교)|danawa\.com|다나와\s*앱/i},
  {id:'shinsegaetv',name:'신세계TV쇼핑',match:/신세계\s*(?:TV|티비)\s*쇼핑|shinsegaetvshopping/i},
  {id:'ssg',name:'SSG.COM',match:/SSG\s*\.\s*COM|SSG닷컴|ssg\.com/i},
  {id:'11st',name:'11번가',match:/11번가|11st\.co\.kr/i},
  {id:'gmarket',name:'G마켓',match:/G\s*마켓|gmarket\.co\.kr|스마일배송/i},
  {id:'auction',name:'옥션',match:/(?:^|\s)옥션\s*(?:상품|쇼핑|할인가)|auction\.co\.kr/i},
  {id:'coupang',name:'쿠팡',match:/쿠팡|로켓배송|와우\s*(?:할인|회원)|coupang\.com/i},
  {id:'lotteon',name:'롯데ON',match:/롯데\s*ON|lotteon\.com|롯데온/i},
  {id:'cj',name:'CJ온스타일',match:/CJ\s*온스타일|CJ\s*ONSTYLE|cj온스타일/i},
  {id:'hmall',name:'현대Hmall',match:/현대\s*H\s*mall|hmall\.com/i},
  {id:'gs',name:'GS SHOP',match:/GS\s*SHOP|GS샵|gsshop\.com/i},
  {id:'emart',name:'이마트몰',match:/이마트몰|emart\.ssg\.com/i},
  {id:'himart',name:'롯데하이마트',match:/롯데\s*하이마트|e-himart\.co\.kr/i},
  {id:'kakao',name:'카카오쇼핑',match:/카카오\s*(?:쇼핑|톡딜|선물하기)/i},
  {id:'homeplus',name:'홈플러스',match:/홈플러스\s*(?:온라인|몰)|homeplus\.co\.kr/i},
  {id:'akmall',name:'AK몰',match:/AK\s*MALL|AK\s*몰/i},
  {id:'cafe24',name:'일반 쇼핑몰',match:/카페24\s*쇼핑몰|cafe24\.com/i}
 ];
 const clean=s=>String(s??'').normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g,'').trim();
 const condensed=s=>clean(s).replace(/\s+/g,' ');
 const amount=/(?<![\p{L}\p{N}])(?:(₩|￦)\s*)?(\d{1,3}(?:[,，]\d{3}){1,3}|\d{4,9}|\d{1,3})\s*(만원|천원|원)?(?![\p{L}\p{N}])/gu;
 const labels=/(적립\s*금?|적립|포인트|마일리지|캐시백|캐쉬백|페이백|쇼핑머니|리워드|쿠팡캐시|머니백|지급|할인\s*(?:금액|액|혜택)|절약|배송비|택배비|배송\s*요금|교통비|수수료|무이자\s*할부|할부금|월\s*납부|한\s*달\s*요금|개월\s*당|렌탈료|대여료|1\s*개\s*당|\d+\s*(?:g|kg|ml|l|개|매|박스)\s*당|소비자\s*가(?:격)?|정상\s*가|정가|출고\s*가|권장\s*가격|할인\s*전|이전\s*가격|기존\s*가격|회원\s*(?:가|가격|혜택)|멤버십|카드\s*(?:결제|할인|혜택)|쿠폰\s*(?:적용|할인|혜택|사용)|로그인\s*시|와우\s*(?:회원|할인가)|스마일\s*클럽|무통장\s*(?:입금|이체)|최종\s*혜택가|최대\s*혜택가|체감가|모두의\s*할인|N\+\s*멤버십|결제\s*혜택가|총\s*(?:상품\s*)?(?:금액|결제)|주문\s*(?:금액|합계)|결제\s*예정|합계|최종\s*결제\s*금액|최저\s*가|판매\s*가(?:격)?|할인\s*가|행사\s*가|특가|매장\s*가|현재\s*가|즉시\s*구매\s*가|실\s*판매가|구매\s*가|\bprice\b)/gi;
 const reward=/(?:적립|포인트|마일리지|캐시백|캐쉬백|페이백|쇼핑머니|리워드|쿠팡캐시|머니백|지급|할인\s*(?:금액|액|혜택)|절약|배송비|택배비|배송\s*요금|수수료|무이자\s*할부|할부금|월\s*납부|렌탈료|대여료|\d+\s*(?:g|kg|ml|l|개|매|박스)\s*당|1\s*개\s*당)/i;
 const original=/(?:소비자\s*가(?:격)?|정상\s*가|정가|출고\s*가|권장\s*가격|할인\s*전|기존\s*가격|이전\s*가격|취소선)/i;
 const conditional=/(?:회원\s*(?:가|가격|혜택)|멤버십|카드\s*(?:결제|할인|혜택)|쿠폰\s*(?:적용|할인|혜택|사용)|로그인\s*시|와우\s*(?:회원|할인가)|스마일\s*클럽|무통장\s*(?:입금|이체)|최종\s*혜택가|최대\s*혜택가|체감가|모두의\s*할인|결제\s*혜택가)/i;
 const total=/(?:총\s*(?:상품\s*)?(?:금액|결제)|주문\s*(?:금액|합계)|결제\s*예정|합계|최종\s*결제\s*금액)/i;
 const sale=/(?:최저\s*가|판매\s*가(?:격)?|할인\s*가|행사\s*가|특가|매장\s*가|현재\s*가|즉시\s*구매\s*가|실\s*판매가|구매\s*가|\bprice\b)/i;
 const perUnit=/(?:\d+\s*(?:g|kg|ml|l|개|매|박스)\s*당|1\s*개\s*당|단위\s*당|개당|장당)/i;
 function store(text){const lines=String(text||'').split(/\r?\n/).map(condensed).filter(Boolean).slice(0,26).join(' ');return profiles.find(p=>p.match.test(lines))||null;}
 function extract(text){const lines=String(text||'').split(/\r?\n/).map(condensed).filter(Boolean).slice(0,420),out=[];
  for(let row=0;row<lines.length;row++){
   const line=lines[row];amount.lastIndex=0;let m,matches=[];
   while((m=amount.exec(line))){const unit=m[1]||m[3];if(!unit)continue;const value=Number(m[2].replace(/[,，]/g,''))*(m[3]==='만원'?10000:m[3]==='천원'?1000:1);
    if(!Number.isSafeInteger(value)||value<1000||value>200000000)continue;
    if(/\d/.test(line[m.index-1]||'')||/\d/.test(line[amount.lastIndex]||''))continue;
    matches.push({value,raw:m[0],start:m.index,end:amount.lastIndex,row,context:line});
   }
   for(let i=0;i<matches.length;i++){
    const cur=matches[i],previous=i?matches[i-1].end:0,next=i+1<matches.length?matches[i+1].start:line.length;
    const left=line.slice(previous,cur.start),right=line.slice(cur.end,next);
    let tags=[...left.matchAll(labels)];const nearest=tags.length?tags[tags.length-1][0]:'';
    const prevLine=condensed(lines[row-1]||'');
    const label=nearest||(!/[\d]/.test(prevLine)&&prevLine.length<=33?prevLine:'');
    // "835,000원 적립" must be excluded; but "835,000원 포인트 200원" affects only the second amount.
    const trailing= i===matches.length-1 ? right.trim() : '';
    const afterRight=/^(?:적립|포인트|캐시백|마일리지|배송비|할부|할인\s*금액|지급)/.test(trailing);
    const afterOriginal=/^(?:소비자\s*가(?:격)?|정가|정상\s*가|출고\s*가)/.test(trailing);
    const afterConditional=/^(?:혜택가|쿠폰\s*적용|회원\s*가|멤버십\s*가)/.test(trailing);
    const afterMain=/^(?:판매\s*가|최저\s*가|할인\s*가|행사\s*가)/.test(trailing);
    const afterRate=/\b(?:\d+\s*(?:g|kg|ml|l|개|매|박스)\s*당|1\s*개\s*당)/i.test(left.slice(-22));
    let role='main',reason='원화 단위가 있는 표시 금액';
    if(reward.test(label)||afterRight||afterRate||perUnit.test(label)){role='excluded';reason='적립·단위당가격·배송·할부 등 제외';}
    else if(original.test(label)||afterOriginal){role='original';reason='정가·취소선 이전 가격';}
    else if(conditional.test(label)||afterConditional){role='conditional';reason='쿠폰·멤버십·결제수단 조건 가격';}
    else if(total.test(label)){role='total';reason='주문합계(중복 가능)';}
    else if(sale.test(label)||afterMain){role='main';reason='판매가·최저가 라벨 확인';}
    // "17% ~~23,900원~~ 19,830원" is likely a discounted price. For coupon-required deals, not a universal purchase price.
    // Avoid silently treating savings or a per-unit number as the item's selling price.
    const percent=/\b\d{1,2}\s*%/.test(left);
    const score=role==='main'?(((sale.test(label)||afterMain)?190:105)+(percent?16:0)+(left.trim()===''?4:0)):0;
    out.push({...cur,type:role,score,reason,label,source:'merchant-ocr'});
   }
  }
  return out;
 }
 function decision(evidence){const prices=(evidence||[]).map(p=>({...p})),warnings=[],byValue=new Map();
  // An arithmetic match between a percent discount and two prices can identify
  // the crossed-out original. Never infer this from price magnitude alone.
  for(const salePrice of prices){
   if(salePrice.type!=='main')continue;
   const match=String(salePrice.context||'').match(/(?:^|\D)(\d{1,2})\s*%/);
   if(!match)continue;
   const stated=Number(match[1]);
   if(stated<3||stated>90)continue;
   for(const old of prices){
    if(old.type!=='main'||old.value<=salePrice.value||old.score>=175)continue;
    if(old.context===salePrice.context)continue; // same row with 2 prices is ambiguous
    const calculated=100*(1-salePrice.value/old.value);
    if(Math.abs(calculated-stated)<=2){
     old.type='original';old.score=0;old.reason='할인율과 가격 비율이 일치하는 할인 전 가격 추정';
    }
   }
  }
  
  for(const p of prices){if(!byValue.has(p.value))byValue.set(p.value,[]);byValue.get(p.value).push(p);}
  const mains=[];
  for(const [value,rows] of byValue){const untrusted=rows.filter(x=>x.type!=='main'),good=rows.filter(x=>x.type==='main');if(!good.length)continue;
   // If a distinct OCR pass says "membership" while another loses the label, decline this amount.
   if(untrusted.length){
    const onlyTotal=untrusted.every(x=>x.type==='total');
    const strongSale=good.some(x=>x.score>=175);
    if(!(onlyTotal&&strongSale)){warnings.push(`${value.toLocaleString('ko-KR')}원: 다른 OCR 결과와 가격 역할 충돌`);continue;}
   }
   const best=good.slice().sort((a,b)=>b.score-a.score)[0];mains.push({value,best,score:best.score});
  }
  mains.sort((a,b)=>b.score-a.score);
  let chosen=mains[0]||null,confidence='none';
  if(chosen){
   if(mains.length>1){
    // Explicit 최저가 beats distant unlabeled prices; otherwise multiple product-option offers are ambiguous.
    if(chosen.score<175||mains[1].score>=chosen.score-22){warnings.push('서로 다른 일반 판매가가 있어 자동 적용을 보류했습니다.');chosen=null;}
   }
   if(chosen)confidence=chosen.score>=175?'high':'medium';
  }
  const originals=[...new Set(prices.filter(p=>p.type==='original').map(p=>p.value))];
  const conditionalPrices=[...new Set(prices.filter(p=>p.type==='conditional').map(p=>p.value))];
  const excluded=[...new Set(prices.filter(p=>p.type==='excluded').map(p=>p.value))];
  return{price:chosen?.value??null,confidence,canAutofill:!!chosen,originalPrice:originals.find(v=>!chosen||v>=chosen.value)??null,conditionalPrices,excluded,prices,warnings};
 }
 function parse(text){return {store:store(text),...decision(extract(text))};}
 function merge(texts){return {store:texts.map(store).find(Boolean)||null,...decision(texts.flatMap(extract))};}
 function apply(result,parsed){const name=String(result.name||'').trim();const can=parsed.canAutofill&&name.length>1;
  const warnings=[...new Set([...(result.warnings||[]),...parsed.warnings])];
  if(!parsed.price)warnings.push('가격 후보 미확정: 일반가·혜택가·적립금 충돌 또는 금액 미확인');
  // Retain separately classified shopping data for inspection, but purchase decision uses reviewed evidence.
  const prices=[...parsed.prices];
  return {...result,price:parsed.price,originalPrice:parsed.originalPrice,conditionalPrices:parsed.conditionalPrices,prices,priceCandidates:[...new Set(prices.filter(p=>p.type==='main').map(p=>p.value))],priceConfidence:parsed.confidence==='none'?'low':parsed.confidence,confidence:parsed.price&&name?'medium':'low',reviewRequired:!can,autoFillPrice:can?parsed.price:null,merchant:parsed.store?.name||'미확인',merchantId:parsed.store?.id||'',warnings};
 }
 function analyze(text){return apply(oldAnalyze(text),parse(text));}
 function combine(input){const items=(Array.isArray(input)?input:[input]).filter(Boolean),texts=items.filter(x=>typeof x==='string');
  const bases=items.map(x=>typeof x==='string'?oldAnalyze(x):x);
  const base=oldCombine(bases);if(!texts.length)return apply(base,merge([]));
  const parsed=merge(texts);return apply(base,parsed);
 }
 S.analyze=analyze;S.combine=combine;
 return {profiles,store,extract,decision,parse,merge,analyze,combine};
});
