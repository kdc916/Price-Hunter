/* Price Hunter: deterministic, dependency-free parsing and pricing engine. MIT */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PriceHunterCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const won = n => (Number.isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString('ko-KR') + '원' : '—');
  const normalize = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[\u200b-\u200f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const stop = new Set(['정품','판매','중고','새제품','미개봉','당근','번개장터','중고나라','무료배송','포함','최저가','카메라','제품','할인','급처','가격','세일','the','for','with','of']);
  const tokenize = s => normalize(s).split(' ').filter(x=>x.length>1&&!stop.has(x));
  const SKU_RE = /\b(?=[a-z0-9-]{3,}\b)(?=[a-z0-9-]*\d)(?=[a-z0-9-]*[a-z])[a-z]+[\s-]?\d[a-z0-9-]*\b/gi;
  function modelCodes(text) {return [...new Set((String(text||'').match(/[a-z0-9][a-z0-9-]{3,24}/gi)||[]).map(s=>s.toLowerCase().replace(/-+/g,'').trim()).filter(s=>s.length>=4 && /[a-z]/.test(s)&&/\d/.test(s)&&!/^\d{1,4}(?:cm|mm|kg|gb|tb|hz|mah|inch|fps|mp|k|p)$/.test(s)))];}
  function parseNumber(s) { return Number(String(s).replace(/,/g,'').replace(/\s+/g,'')); }
  function extractPrices(text) {
    const s=String(text||'').normalize('NFKC');
    const hits=[];
    const re=/(\d{1,3}(?:,\d{3})+|\d{1,8}(?:\.\d{1,2})?)\s*(만원|천원|원|만\s*원|천\s*원)?/g;
    let m;
    while ((m=re.exec(s))) {
      const raw=m[0], unit=(m[2]||'').replace(/\s+/g,''), value=parseNumber(m[1]);
      const nearby=s.slice(Math.max(0,m.index-12),Math.min(s.length,re.lastIndex+12));
      if (!unit && !m[1].includes(',')) continue;
      if (!unit && !m[1].includes(',') && value<1000) continue;
      const price=Math.round(value*(unit.startsWith('만')?10000:unit.startsWith('천')?1000:1));
      if (price<1000||price>200000000||!Number.isSafeInteger(price)) continue;
      if (/%|퍼센트|할인율/.test(nearby)&&!unit) continue;
      if (/\d{11,}/.test(raw)) continue;
      hits.push({value:price,raw,index:m.index,context:nearby});
    }
    return hits.filter((v,i,a)=>a.findIndex(x=>x.index===v.index)===i);
  }
  function suggestProduct(ocrText) {
    const lines=String(ocrText||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const ignore=/^(가격|합계|할인가|할인|바코드|유효기간|원산지|증정|행사|적립|매장|상품코드|결제|회원가|구매가|판매가|정상가|\d[\d\s,.원만천]+$)/i;
    const viable=lines.filter(l=>/\p{L}/u.test(l)&&!ignore.test(l)&&l.length>=3 && l.length<=90);
    const scored=viable.map(l=>({text:l.replace(/(?:\d{1,3}(?:,\d{3})+|\d{1,7})\s*(?:원|만원|천원)/g,'').trim(),score:(modelCodes(l).length?20:0)+(l.match(/[A-Za-z]{2,}/g)||[]).length*3+Math.min(l.length,38)/10-(/\b(?:www|http|행사|포인트|구매|적립|쿠폰)\b/i.test(l)?10:0)}))
      .filter(v=>v.text.length>2).sort((a,b)=>b.score-a.score);
    const prices=extractPrices(ocrText);
    const priced=prices.filter(p=>/할인가|행사가|판매가|특가|회원가|세일|discount/i.test(p.context));
    return {name:scored[0]?.text||'', price:priced[0]?.value||prices[0]?.value||null, allPrices:prices, candidates:scored.slice(0,5).map(s=>s.text)};
  }
  function getGeneration(value) {
    const s=normalize(value);
    const m=s.match(/(?:^|\s)([1-9])\s*세대(?:$|\s)/)||s.match(/(?:^|\s)(?:gen|generation)\s*([1-9])(?:$|\s)/)||s.match(/(?:^|\s)([1-9])(?:st|nd|rd|th)\s*(?:gen|generation)(?:$|\s)/);
    return m?Number(m[1]):null;
  }
  function matchProduct(target, candidate, opts={}) {
    const wanted=tokenize(target), got=tokenize(candidate), targetCodes=modelCodes(target), candidateCodes=modelCodes(candidate);
    if(!wanted.length||!got.length) return {status:'review',score:0,reason:'모델명이 부족합니다.'};
    const expectedGen=getGeneration(target),observedGen=getGeneration(candidate);
    if(expectedGen!==null&&observedGen!==null&&expectedGen!==observedGen)return {status:'mismatch',score:0,reason:'제품 세대가 다릅니다.'};
    const required=String(opts.model||'').trim();
    if(required && !normalize(candidate).replace(/ /g,'').includes(normalize(required).replace(/ /g,''))) return {status:'mismatch',score:0,reason:'필수 모델 코드가 일치하지 않습니다.'};
    if(targetCodes.length && candidateCodes.length && !targetCodes.some(x=>candidateCodes.includes(x)))
      return {status:'mismatch',score:0,reason:'서로 다른 모델 코드가 감지되었습니다.'};
    let score=wanted.filter(w=>got.includes(w)).length / wanted.length;
    if(targetCodes.length && !candidateCodes.length) score=Math.min(score,0.69);
    if(expectedGen!==null&&observedGen===null)score=Math.min(score,0.65);
    const value=Math.round(score*100);
    return {status:score>=0.84?'matched':score>=0.4?'review':'mismatch',score:value,reason:score>=0.84?'문자열·모델 식별 일치':'상품 세부 모델·세대·구성품 직접 확인 필요'};
  }
  function validHttpUrl(url) { try {const u=new URL(url);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';} }
  function listingKey(item) {const url=validHttpUrl(item.url); if(url) {let u=new URL(url);return (u.hostname.replace(/^www\./,'')+u.pathname).toLowerCase().replace(/\/$/,'');}return normalize([item.market,item.title,item.price,item.date].join('|'));}
  function validateListing(item,target) {
    const price=Number(item.price),title=String(item.title||'').trim();
    if(!title||title.length>140) return '매물 제목은 1~140자로 입력하세요.';
    if(!Number.isInteger(price)||price<1000||price>200000000)return '가격은 1,000원~2억 원 범위의 정수여야 합니다.';
    if(item.url && !validHttpUrl(item.url))return '링크는 http 또는 https 주소여야 합니다.';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || Number.isNaN(new Date(item.date+'T12:00:00').getTime()))return '날짜를 확인하세요.';
    if(new Date(item.date+'T12:00:00').getTime()>Date.now()+86400000)return '미래의 매물은 등록할 수 없습니다.';
    if(target && matchProduct(target,title).status==='mismatch')return '제품 불일치 가능성이 높습니다. 정확한 모델을 확인하세요.';
    return '';
  }
  function parsePastedPrice(text){
    const rows=extractPrices(text);
    if(!rows.length)return null;
    const rank=r=>{
      const before=String(text).slice(Math.max(0,r.index-18),r.index);
      const after=String(text).slice(r.index+r.raw.length,r.index+r.raw.length+9);
      const around=before+after;
      let score=0;
      if(/(?:판매가|거래가|할인가|특가|구매가|즉시구매|가격|판매가격|현재가)\s*[:：]?\s*$/i.test(before))score+=8;
      if(/(?:배송비|택배비|포장비|수수료|포인트|적립|쿠폰|할인율|정가|정상가|원가)\s*[:：]?\s*$/i.test(before))score-=10;
      if(/(?:배송비|택배비|포장비|수수료|포인트|적립|쿠폰)/i.test(around)&&r.value<=15000)score-=4;
      score-=r.index/Math.max(100,String(text).length)*2;
      return score;
    };
    rows.sort((a,b)=>rank(b)-rank(a)||a.index-b.index);
    return rows[0].value;
  }
  function filterListings(items,{months=3,state='all',today=new Date(),target=''}={}){
    const cut=new Date(today);cut.setMonth(cut.getMonth()-Number(months));
    return items.filter(x=>new Date(x.date+'T12:00:00')>=cut && (state==='all'||x.state===state) && (!target||matchProduct(target,x.title).status!=='mismatch'));
  }
  function median(a){ const v=a.filter(Number.isFinite).sort((x,y)=>x-y);const n=v.length;return n?(n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2):null; }
  function stats(items){ const prices=items.map(x=>Number(x.price)).filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);const n=prices.length;
    const mid=median(prices), mean=n?prices.reduce((s,x)=>s+x,0)/n:null;
    const deviations=prices.map(x=>Math.abs(x-mid)),mad=median(deviations);
    const suspicious=n>=5 && mad!==null ? prices.filter(x=>mad===0?x!==mid:Math.abs(x-mid)>3*1.4826*mad):[];
    return {count:n,min:n?prices[0]:null,max:n?prices[n-1]:null,mean,median:mid,suspiciousCount:suspicious.length,quartile25:n?prices[Math.floor((n-1)*.25)]:null,quartile75:n?prices[Math.floor((n-1)*.75)]:null};
  }
  function calculate({purchase=0,sale=0,shipping=0,packaging=0,platformFee=0,discount=0,other=0,tax=0}={}){
    const p=[purchase,sale,shipping,packaging,platformFee,discount,other,tax].map(Number);
    if(p.some(x=>!Number.isFinite(x)||x<0))return {error:'입력값은 0 이상의 숫자여야 합니다.'};
    const [buy,sell,ship,pack,fee,nego,misc,taxes]=p;
    if(fee>100)return {error:'수수료율은 0~100%여야 합니다.'};
    const collected=Math.max(0,sell-nego),feeAmount=collected*fee/100, cost=buy+ship+pack+misc+taxes+feeAmount;
    const profit=collected-cost;
    return {profit,roi:buy>0?profit/buy*100:null,margin:collected>0?profit/collected*100:null,collected,cost,feeAmount,breakeven:fee<100?(buy+ship+pack+misc+taxes+nego*(1-fee/100))/(1-fee/100):null};
  }
  function googleSearch(query,site){const q=[String(query||'').trim(),site?'site:'+site:''].filter(Boolean).join(' ');return 'https://www.google.com/search?q='+encodeURIComponent(q)+'&hl=ko';}
  return {won,normalize,tokenize,modelCodes,extractPrices,suggestProduct,matchProduct,validHttpUrl,listingKey,validateListing,parsePastedPrice,filterListings,stats,calculate,googleSearch};
});
