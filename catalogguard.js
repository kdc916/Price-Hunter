/* Price Hunter v0.4.1 — screenshot catalog and price evidence guard. MIT.
 * OCR transcriptions are untrusted. A listing's asking price is not a closed sale.
 */
(function(root,factory){
 const api=factory(root.PriceHunterScreenshot||(typeof require==='function'?require('./screenshot.js'):null),root.PriceHunterCore||(typeof require==='function'?require('./core.js'):null),root.PriceHunterMarketSearch||(typeof require==='function'?require('./marketsearch.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.PriceHunterCatalogGuard=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(S,C,M){
'use strict';
if(!S||!C)throw Error('Screenshot and Core must be loaded first');
const norm=x=>String(x??'').normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g,'').replace(/\s+/g,' ').trim();
const key=x=>norm(x).toUpperCase().replace(/[^\p{L}\p{N}]+/gu,'');
const MONEY=/(?<![\p{L}\p{N}])(?:(₩|￦)\s*)?(\d{1,3}(?:[,，.]\d{3}){1,3}|\d{4,9}|\d{1,3})\s*(만원|천원|원)?(?![\p{L}\p{N}])/gu;
const REWARD=/적립|포인트|마일리지|캐시백|캐쉬백|페이백|리워드|지급|할인\s*(?:금액|액|혜택|쿠폰)|쿠폰\s*(?:금액|할인액|혜택)|절약\s*(?:금액|액)|배송비|택배비|수수료|할부|무이자|이자|매월\s*(?:납부|할부)/i;
const ORIGINAL=/소비자\s*가(?:격)?|정상\s*가(?:격)?|정가|할인\s*전|기존\s*가(?:격)?|출고\s*가|권장\s*(?:소비자\s*)?가격|취소선|정상판매가/i;
const BENEFIT=/혜택가|회원\s*가|멤버십\s*(?:할인|혜택)|카드\s*(?:결제|할인)|쿠폰\s*적용|로그인\s*시|무통장\s*이체.*혜택/i;
const TOTAL=/총\s*상품\s*금액|주문\s*금액|결제\s*예정|합계|총\s*결제/i;
const SALE=/판매\s*가(?:격)?|할인\s*가|행사\s*가|특가|매장\s*가|최저\s*가|구매\s*가|판매\s*금액|결제\s*(?:예정\s*)?금액|최종\s*(?:결제)?\s*가|즉시\s*구매\s*가|상품\s*금액|^가격\s*[:：]?\s*$/i;
const PERCENT=/\d{1,2}\s*%/;
function moneyTokens(line){let m,out=[];MONEY.lastIndex=0;while((m=MONEY.exec(line))){
 const unit=m[1]||m[3];if(!unit)continue;
 const value=Number(m[2].replace(/[,，.]/g,''))*(m[3]==='만원'?10000:m[3]==='천원'?1000:1);
 if(!Number.isSafeInteger(value)||value<1000||value>200000000)continue;
 if(/\d$/.test(line.slice(0,m.index))||/^\d/.test(line.slice(MONEY.lastIndex)))continue;
 if(/^\s*(?:P\b|점|%|GB|TB|MHz|개|회|개월|명)/i.test(line.slice(MONEY.lastIndex)))continue;
 out.push({value,raw:m[0],start:m.index,end:MONEY.lastIndex,unit});
}return out;}
function markerKind(s){if(REWARD.test(s))return'excluded';if(ORIGINAL.test(s))return'original';if(BENEFIT.test(s))return'conditional';if(TOTAL.test(s))return'total';if(SALE.test(s))return'main';return'';}
function nearestLabel(s){const re=/(적립금?|포인트|마일리지|캐시백|할인\s*(?:금액|액|혜택)|배송비|택배비|수수료|할부|소비자가|정상가|정가|할인\s*전|혜택가|회원가|멤버십|카드\s*결제|쿠폰\s*적용|최저가|판매가|할인가|행사가|특가|매장가|구매가|총\s*상품\s*금액|결제예정|합계|가격)\s*(?::|：|-|최대|약|은|는|이)?\s*/gi;
 let last=-1,m;while((m=re.exec(s)))last=m.index;
 return norm((last>=0?s.slice(last):s).slice(-55));}
function classify(lines){const out=[];
 for(let row=0;row<lines.length;row++){
  const line=norm(lines[row]),hits=moneyTokens(line);
  for(let j=0;j<hits.length;j++){
   const h=hits[j],left=line.slice(j?hits[j-1].end:0,h.start),right=line.slice(h.end,j+1<hits.length?hits[j+1].start:line.length);
   const label=nearestLabel(left);
   let type=markerKind(label),score=47,reason='원화 단위 가격 후보';
   if(!type&&/^\s*(?:적립|포인트|마일리지|캐시백|지급|할인\s*(?:금액|액)|배송비|택배비|할부|P\b)/i.test(right))type='excluded';
   if(!type&&hits.length===1){
    const previous=norm(lines[row-1]||''),prev2=norm(lines[row-2]||'');
    if(previous.length<52&&!/\d/.test(previous)){
     type=markerKind(previous);
     if(!type&&previous.length<15&&prev2&&!/\d/.test(prev2))type=markerKind(prev2);
    }
   }
   if(!type)type='main';
   if(type==='main'){
    if(markerKind(label)==='main'){score+=90;reason='판매가·최저가 라벨 확인';}
    else if(row>0&&markerKind(lines[row-1])==='main'&&!/\d/.test(lines[row-1])){score+=80;reason='직전 줄의 판매가 라벨 확인';}
    if(PERCENT.test(left))score+=85;
    if(line===h.raw)score+=5;
   }else{score=type==='total'?25:-120;reason={excluded:'적립금·할인액·배송비·할부 등 제외',original:'소비자가 또는 정가',conditional:'조건부 혜택가',total:'주문합계·중복 금액'}[type];}
   out.push({...h,type,score,row,context:line,reason});
  }
 }
 for(const p of out)if(p.type==='main'&&p.score<125&&/^(?:최대\s*)?(?:적립(?:금)?|포인트|마일리지|캐시백|지급)(?:\s*예정)?\s*$/.test(norm(lines[p.row+1]||''))){p.type='excluded';p.score=-120;p.reason='다음 줄로 이어진 적립·지급 문구';}
 for(const a of out)if(a.type==='main'){
  const newer=out.find(b=>b.type==='main'&&b.row>a.row&&b.row<=a.row+4&&b.value<a.value&&b.score>=a.score&&(PERCENT.test(b.context)||/할인\s*가|행사\s*가/.test(b.context)));
  if(newer){a.type='original';a.score=-120;a.reason='할인 전 표시가로 추정';}
 }
 return out;
}
const brands=[['SAMSUNG',/삼성\s*전자|\bSAMSUNG\b/i],['KLEVV',/에센코어|\bESSENCORE\b|\bKLEVV\b/i],['PANASONIC',/파나소닉|\bPANASONIC\b|\bLUMIX\b|루믹스/i],['SONY',/소니|\bSONY\b/i],['MSI',/\bMSI\b|타이탄\s*18\s*HX/i],['LG',/LG\s*전자|\bLG\b/i]];
function brand(s){return brands.find(([,re])=>re.test(s))?.[0]||'';}
function identity(raw){const s=norm(raw);let type='other';
 const focal=s.match(/(\d{2,3})\s*[-~]\s*(\d{2,3})\s*mm\b/i);
 if(/\bDDR[345]\s*[- ]?\s*\d{4,5}\b/i.test(s))type='ram';
 else if(focal)type='lens';
 else if(/타이탄\s*18\s*HX|노트북|\bRTX\s*\d{4}\b/i.test(s))type='laptop';
 else if(/DC[- ]?L\d+|ILCE[- ]?\w+|미러리스\s*카메라|루믹스/i.test(s))type='camera';
 const ddr=s.match(/\bDDR\s*([345])\s*[- ]?\s*(\d{4,5})\b/i),gb=s.match(/(?:\(|\b)(8|16|32|48|64|128)\s*GB\b/i),cl=s.match(/\bCL\s*(\d{2})\b/i);
 const models=[...s.matchAll(/\b(?:ILCE[- ]?[A-Z0-9]+|DC[- ]?L\d+[A-Z0-9]*|A2WJ[- ]?U9\+?|\d{2}[A-Z]{2,5}\d{3,}[A-Z0-9]*)\b/gi)].map(x=>key(x[0]));
 return {brand:brand(s),type,model:[...new Set(models)],speed:ddr?ddr[1]+'-'+ddr[2]:'',capacity:gb?Number(gb[1]):null,cl:cl?Number(cl[1]):null,focal:focal?focal[1]+'-'+focal[2]:'',aperture:(s.match(/\bF\s*\/?\s*(\d+(?:\.\d+)?)\b/i)||[])[1]||'',raw:s};
}
function checkIdentity(a,b){const x=typeof a==='string'?identity(a):a,y=typeof b==='string'?identity(b):b;
 if(x.brand&&y.brand&&x.brand!==y.brand)return{status:'mismatch',reason:'제조사 불일치'};
 if(x.type!=='other'&&y.type!=='other'&&x.type!==y.type)return{status:'mismatch',reason:'제품 종류 불일치'};
 if(x.model.length&&y.model.length&&!x.model.some(m=>y.model.includes(m)))return{status:'mismatch',reason:'제조사 모델 코드 불일치'};
 if(x.type==='ram'&&y.type==='ram'){for(const field of ['speed','capacity','cl'])if(x[field]&&y[field]&&x[field]!==y[field])return{status:'mismatch',reason:'메모리 '+field+' 사양 불일치'};}
 if(x.type==='lens'&&y.type==='lens'){for(const field of ['focal','aperture'])if(x[field]&&y[field]&&x[field]!==y[field])return{status:'mismatch',reason:'렌즈 '+field+' 사양 불일치'};}
 return{status:'review',reason:'동일 상품·구성 확인 필요'};
}
function titleInfo(base,lines){const titleLines=lines.filter(x=>x.length>=6&&x.length<210&&!moneyTokens(x).length&&!/^(판매가|소비자가|상품코드|상품명|제조사|정가|최저가|총\s*상품금액|배송비|모델명|주문수량|수량)/.test(x));
 const ranked=titleLines.map((s,i)=>({s,score:(/소니|삼성전자|ESSENCORE|KLEVV|DDR|MSI|타이탄|SONY|파나소닉|루믹스|LUMIX|렌즈|ILCE|DC-L|A2WJ/i.test(s)?65:0)+(identity(s).model.length?30:0)+(identity(s).type!=='other'?35:0)+Math.min(s.length,92)*.12-i*.2})).sort((a,b)=>b.score-a.score);
 let name=norm(ranked[0]?.s||base.name||'').replace(/\[P[0-9A-Z]{5,12}\]/ig,'').replace(/\b\d{2,4}-\d{3,4}-\d{4}\b/g,'').replace(/(?:주문\s*전|구매\s*전|재고\s*확인|전화\s*문의|전화\s*요망|무료\s*배송|장바구니).*/ig,'').replace(/^[\s\[\]<>]+|[\s<>]+$/g,'').trim();
 const contextual=identity(lines.join(' '));if(contextual.brand==='MSI'&&!/\bMSI\b/.test(name))name='MSI '+name;
 if(contextual.brand==='KLEVV'&&!/KLEVV|ESSENCORE|에센코어/i.test(name))name='ESSENCORE KLEVV '+name;
 if(contextual.brand==='SONY'&&!/소니|SONY/i.test(name))name='소니 '+name;
 const parsed=identity(name+' '+lines.join(' ').slice(0,160));
 const model=parsed.model[0]||(parsed.type==='other'&&!/^(?:P\d{5,}|DDR\d)/.test(base.model||'')?base.model:'')||'';
 return{name:name.slice(0,150),model,productIdentity:parsed};
}
const old=S.analyze;
function analyze(text){const lines=String(text??'').split(/\r?\n/).map(norm).filter(Boolean).slice(0,350),all=classify(lines);
 const mains=all.filter(x=>x.type==='main').sort((a,b)=>b.score-a.score||a.row-b.row),top=mains[0],second=mains.find(x=>top&&x.value!==top.value);
 const conflict=!!(top&&second&&second.score>=top.score-17),price=conflict?null:top?.value??null;
 const original=all.filter(x=>x.type==='original'&&(!price||x.value>=price)).sort((a,b)=>a.row-b.row)[0];
 const conditional=[...new Set(all.filter(x=>x.type==='conditional').map(x=>x.value))];
 const b=old(text),title=titleInfo(b,lines),high=!!(price&&top.score>=125),warnings=[];
 if(!top)warnings.push('일반 판매가가 불명확합니다. 포인트나 혜택가를 구매가로 사용하지 않습니다.');
 if(conflict)warnings.push('판매가 후보가 충돌하여 직접 확인이 필요합니다.');
 if(!high&&top)warnings.push('가격 맥락이 부족하여 직접 확인이 필요합니다.');
 if(all.some(x=>x.type==='excluded'))warnings.push('포인트·적립금·배송비·할인액을 제외했습니다.');
 if(conditional.length)warnings.push('조건부 혜택가는 기본 구매가에 적용하지 않았습니다.');
 return{...b,...title,price,originalPrice:original?.value??null,conditionalPrices:conditional,prices:all.map(x=>({...x,uncertain:false})),priceCandidates:[...new Set(mains.map(x=>x.value))],priceConfidence:high?'high':'low',confidence:high&&title.name?'high':'low',reviewRequired:!high,_priceScore:top?.score??-100,warnings};
}
function combine(inputs){const v=(Array.isArray(inputs)?inputs:[inputs]).filter(Boolean).map(x=>typeof x==='string'?analyze(x):x);if(!v.length)return analyze('');
 const title=v.find(x=>x.productIdentity?.model?.length)||v.find(x=>x.name)||v[0];
 const priced=v.filter(x=>x.price).sort((a,b)=>(b._priceScore??0)-(a._priceScore??0)),best=priced[0]||v[0];
 const conflict=priced.some(x=>x.price!==best.price&&(x._priceScore??0)>=(best._priceScore??0)-17);
 const price=conflict?null:best.price,all=v.flatMap(x=>x.prices||[]);
 const original=all.filter(x=>x.type==='original'&&(!price||x.value>=price)).sort((a,b)=>a.row-b.row)[0];
 const warnings=[...new Set(v.flatMap(x=>x.warnings||[]))];if(conflict)warnings.push('여러 OCR 결과의 가격이 충돌합니다.');
 return{...best,name:title.name,model:title.model,productIdentity:title.productIdentity,price,originalPrice:original?.value??best.originalPrice,conditionalPrices:[...new Set(all.filter(x=>x.type==='conditional').map(x=>x.value))],prices:all,priceConfidence:conflict?'low':best.priceConfidence,confidence:!price?'low':best.confidence,reviewRequired:conflict||best.reviewRequired,warnings,_titleScore:title._titleScore??1,_priceScore:best._priceScore??-100};
}
S.analyze=analyze;S.combine=combine;
const match=C.matchProduct;C.matchProduct=function(a,b,opts){const c=checkIdentity(a,b);return c.status==='mismatch'?{status:'mismatch',score:0,reason:c.reason}:match(a,b,opts);};
if(M?.normalizeResults){const oldNorm=M.normalizeResults;M.normalizeResults=function(items,product){const r=oldNorm(items,product);for(const x of r){const c=checkIdentity(product?.name||'',x.title);if(c.status==='mismatch'){x.modelStatus='mismatch';x.modelLabel=c.reason;}}return r;};}
return{moneyTokens,markerKind,classify,brand,identity,checkIdentity,analyze,combine};
});