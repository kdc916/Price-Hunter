/* Price Hunter v0.4.3: OCR-result reconciliation for actual selling price.
 * Works after catalogguard.js, without network requests or model-specific price guesses.
 */
(function(root,factory){
 const api=factory(root.PriceHunterScreenshot||(typeof require==='function'?require('./screenshot.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.PriceHunterCheckoutGuard=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(S){
'use strict';
if(!S?.analyze||!S?.combine)throw Error('Screenshot parser must be ready');
const analyzeBase=S.analyze, combineBase=S.combine;
const benefit=/무통장\s*(?:입금|이체)\s*(?:시|할인|혜택)|모두의\s*할인|회원\s*혜택|멤버십|카드\s*결제|쿠폰\s*적용|혜택가|로그인\s*시/i;
const reward=/적립|포인트|캐시백|할부|배송비|택배비|수수료|마일리지|할인\s*(?:금액|액)|지급/i;
const sale=/(?:판매|최저|할인|행사|매장|구매)\s*가|특가|\b\d{1,2}\s*%/i;
function classify(p){
 const x={...p},ctx=String(x.context||'');
 if(reward.test(ctx)){x.type='excluded';x.score=-120;x.reason='적립·배송·할인액 등 제외';}
 else if(benefit.test(ctx)){x.type='conditional';x.score=-120;x.reason='회원·카드·무통장 등 조건부 혜택가';}
 return x;
}
function reconcile(result){
 const prices=(result.prices||[]).map(classify),main=prices.filter(x=>x.type==='main').sort((a,b)=>(b.score??0)-(a.score??0));
 const first=main[0],second=main.find(x=>first&&x.value!==first.value);
 const ambiguity=Boolean(first&&second&&(second.score??0)>=(first.score??0)-17);
 const price=ambiguity?null:first?.value??null;
 const high=Boolean(price&&(first.score??0)>=125);
 return {...result,prices,price,priceConfidence:high?'high':'low',confidence:high&&result.name?'high':'low',reviewRequired:!high,conditionalPrices:[...new Set(prices.filter(x=>x.type==='conditional').map(x=>x.value))],priceCandidates:[...new Set(main.map(x=>x.value))],_priceScore:first?.score??-100,
 warnings:[...new Set([...(result.warnings||[]),...(!first&&prices.some(x=>x.type==='conditional')?['조건부 가격만 인식됐습니다. 실제 일반 판매가/최저가를 확인해 주세요.']:[]),...(ambiguity?['복수 일반 판매가가 충돌하여 입력을 보류했습니다.']:[])])]};
}
function analyze(input){return reconcile(analyzeBase(input));}
function combine(input){
 const results=(Array.isArray(input)?input:[input]).filter(Boolean).map(x=>typeof x==='string'?analyze(x):reconcile(x));
 if(!results.length)return analyze('');
 const base=combineBase(results),all=results.flatMap(r=>r.prices||[]),grouped=new Map();
 for(const p of all){if(!grouped.has(p.value))grouped.set(p.value,[]);grouped.get(p.value).push(p);}
 const eligible=[];
 for(const [value,rows] of grouped){
  const mains=rows.filter(p=>p.type==='main');if(!mains.length)continue;
  const explicit=mains.filter(p=>sale.test(p.context||'')&&!benefit.test(p.context||''));
  const other=rows.some(p=>p.type==='conditional'||p.type==='excluded'||p.type==='original');
  if(other&&!explicit.length)continue;
  const preferred=(explicit.length?explicit:mains).sort((a,b)=>(b.score??0)-(a.score??0))[0];
  eligible.push({value,score:(preferred.score??0)+(explicit.length?30:0)});
 }
 eligible.sort((a,b)=>b.score-a.score);
 const leader=eligible[0],uncertain=Boolean(leader&&eligible.slice(1).some(x=>x.value!==leader.value&&x.score>=leader.score-17));
 const price=uncertain?null:leader?.value??null,high=Boolean(price&&leader.score>=125);
 const conditionalPrices=[...new Set(all.filter(x=>x.type==='conditional').map(x=>x.value))];
 const warnings=[...new Set(results.flatMap(x=>x.warnings||[]))];
 if(!price&&conditionalPrices.length)warnings.push('일반 판매가는 확인되지 않았습니다. 조건부 혜택가를 구매가로 대체하지 않습니다.');
 if(uncertain)warnings.push('서로 다른 판매가가 충돌하므로 구매가 자동 적용을 보류합니다.');
 return {...base,price,prices:all,conditionalPrices,priceCandidates:[...new Set(eligible.map(x=>x.value))],priceConfidence:high?'high':'low',confidence:high&&base.name?'high':'low',reviewRequired:!high,_priceScore:leader?.score??-100,warnings};
}
// A clearly printed single amount can be auto-filled without a nearby sales label.
// Separate parser confidence from purchase autofill; reject contradictory evidence.
function autoPurchase(result){
 const value=result?.price;
 if(!Number.isSafeInteger(value)||value<1000||value>200000000||!String(result?.name||'').trim())return {price:null,reason:'상품 또는 표시 판매가 미확인'};
 const evidence=Array.isArray(result.prices)?result.prices:[];
 const same=evidence.filter(p=>p.value===value);
 const main=same.filter(p=>p.type==='main');
 if(!main.length)return {price:null,reason:'일반 판매가 근거 부족'};
 if(same.some(p=>p.type!=='main'))return {price:null,reason:'동일 금액의 적립·조건부·정가 표기가 충돌'};
 const otherValues=new Set(evidence.filter(p=>p.type==='main'&&p.value!==value).map(p=>p.value));
 if(otherValues.size)return {price:null,reason:'복수의 일반 판매가가 검출되어 확인 필요'};
 const currency=main.some(p=>/(?:원|만원|천원|₩|￦)/.test(String(p.raw||'')));
 if(!currency)return {price:null,reason:'원화 단위 누락'};
 const clean=main.every(p=>!reward.test(String(p.context||''))&&!benefit.test(String(p.context||'')));
 if(!clean)return {price:null,reason:'가격 주변의 적립·조건부 문구 확인 필요'};
 return {price:value,reason:result.priceConfidence==='high'?'일반 판매가 자동 적용':'단일 원화 표시 판매가 자동 적용'};
}
S.analyze=analyze;S.combine=combine;
return {classify,reconcile,analyze,combine,autoPurchase};
});