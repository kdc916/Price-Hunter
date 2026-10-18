/* Price Hunter Market Search v0.4.0 — official free Google Programmable Search Element.
   User-visible results are indexed snippets, NOT a live marketplace API or settled transaction price.
   Google branding/ads and the default search results element remain visible. */
(function(root,factory){const api=factory(root.PriceHunterCore||(typeof module==='object'?require('./core.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;root.PriceHunterMarketSearch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const markets=[
 {name:'중고나라',domain:/\b(?:web\.)?joongna\.com$|\bjoonggonara\.co\.kr$/i},
 {name:'번개장터',domain:/\b(?:www\.|m\.)?bunjang\.co\.kr$/i},
 {name:'당근',domain:/\b(?:www\.|m\.)?(?:daangn\.com|karrotmarket\.com)$/i},
 {name:'네이버 중고나라',domain:/\bcafe\.naver\.com$/i, path:/^\/(?:joonggonara|joonggonara2)(?:\/|$)/i}
];
const token=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/[^\p{L}\p{N}]+/gu,'');
const esc=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&(?:nbsp|amp|lt|gt|quot);/g,' ').trim();
const MONEY=/((?:\d{1,3}(?:[,，]\d{3}){1,3}|\d{4,9}))\s*(?:원|₩|￦)(?![\p{L}\p{N}])/gu;
const BAD=/포인트|적립|캐시백|마일리지|쿠폰|배송비|할부|수수료|할인\s*(?:금액|혜택|쿠폰)|혜택\s*금액/i;
const PRICE_HINT=/판매가|가격|매물|거래가|즉시구매|중고\s*가격|특가/i;
function marketFor(url){try{const u=new URL(url);if(!/^https?:$/.test(u.protocol))return null;const market=markets.find(m=>m.domain.test(u.hostname)&&(!m.path||m.path.test(u.pathname)));return market?market.name:null;}catch{return null;}}
function queryFor(product){const model=String(product?.model||'').trim();const name=String(product?.name||'').trim();const q=model.length>=4?model: name.replace(/(?:정품|새상품|새제품|무료배송|공식인증|자급제|\d{1,2}%)/g,' ').replace(/\s+/g,' ').trim().slice(0,75);return q?`${q} 중고`:'';}
function detectPrice(title,content){const text=[esc(title),esc(content)].join('\n');const rows=text.split(/\n/);const hits=[];
 for(let i=0;i<rows.length;i++){const line=rows[i];for(const match of line.matchAll(MONEY)){
   const value=Number(match[1].replace(/[,，]/g,''));if(!Number.isInteger(value)||value<1000||value>200000000)continue;
   const before=line.slice(Math.max(0,match.index-30),match.index),after=line.slice(match.index+match[0].length,match.index+match[0].length+26);
   if(BAD.test(before)||BAD.test(after))continue;
   const wordScore=(PRICE_HINT.test(before)?3:0)+(i===0?1:0);
   hits.push({value,score:wordScore});
 }}
 const values=[...new Set(hits.map(x=>x.value))];
 // If several independent money amounts appear in a snippet, do not invent which is the asking price.
 if(values.length!==1)return {price:null,reason:values.length?'복수 가격 후보 — 원문 확인':'가격 단위 확인 불가'};
 return {price:values[0],reason:'검색 색인 표시 호가 (미검증)'};
}
function compareModel(product,title){const model=token(product?.model||'');const name=token(product?.name||'');const candidate=token(title);
 if(model){if(candidate.includes(model))return {status:'matched',label:'모델코드 확인'};
  // another SKU from same series in a result is an explicit mismatch, not an automatic match
  const other=(title.match(/(?:ILCE[- ]?\d[A-Z0-9-]+|\b\d{2}[A-Z]{2,5}\d{3,}[A-Z0-9]*\b)/gi)||[]).map(token);
  if(other.some(t=>t!==model))return {status:'mismatch',label:'모델코드 다름'};
 }
 if(name&&candidate&&C&&C.matchProduct){const m=C.matchProduct(product.name,title,{model:''});if(m.status==='matched'&&!model)return {status:'review',label:'상품명 유사 · 원문 확인'};}
 return {status:'review',label:'세부 모델 미확인'};
}
function normalizeResults(results,product){const seen=new Set(),out=[];for(const item of (Array.isArray(results)?results:[])){
 const url=String(item?.url||'');const market=marketFor(url);if(!market)continue;
 let parsed;try{parsed=new URL(url);}catch{continue;}
 const key=(parsed.origin+parsed.pathname).replace(/\/$/,'');if(seen.has(key))continue;seen.add(key);
 const title=esc(item.titleNoFormatting||item.title||'').slice(0,240),snippet=esc(item.contentNoFormatting||item.content||'').slice(0,450);
 if(!title)continue;
 const model=compareModel(product,title),price=detectPrice(title,snippet);
 out.push({url,title,snippet,market,modelStatus:model.status,modelLabel:model.label,price:price.price,priceLabel:price.reason,verified:false,source:'Google 검색 색인'});
 }return out;}
function collectiveLink(product){const q=queryFor(product),filter='(site:joongna.com OR site:web.joongna.com OR site:bunjang.co.kr OR site:daangn.com OR site:cafe.naver.com/joonggonara)';return `https://www.google.com/search?hl=ko&q=${encodeURIComponent(q+' '+filter)}`;}
return {markets,marketFor,queryFor,detectPrice,compareModel,normalizeResults,collectiveLink};
});
