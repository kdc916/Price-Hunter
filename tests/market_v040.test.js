const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../marketsearch.js');
const base=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const app=fs.readFileSync(path.join(base,'app.js'),'utf8');
const ui=fs.readFileSync(path.join(base,'market-ui.js'),'utf8');
const cases=[
 ['market classification joongna',()=>assert.equal(M.marketFor('https://web.joongna.com/product/123'),'중고나라')],
 ['market classification bunjang',()=>assert.equal(M.marketFor('https://m.bunjang.co.kr/products/888'),'번개장터')],
 ['market classification daangn',()=>assert.equal(M.marketFor('https://www.daangn.com/kr/buy-sell/123'),'당근')],
 ['market classification naver cafe',()=>assert.equal(M.marketFor('https://cafe.naver.com/joonggonara/123'),'네이버 중고나라')],
 ['unknown marketplace blocked',()=>assert.equal(M.marketFor('https://example.com/listing'),null)],
 ['javascript scheme rejected',()=>assert.equal(M.marketFor('javascript:alert(1)'),null)],
 ['query uses exact SKU not whole broken OCR',()=>assert.equal(M.queryFor({name:'소니 소니코리아 정품 &71W5 알파 ILCE-7M5 미러리스',model:'ILCE-7M5'}),'ILCE-7M5 중고')],
 ['one recognized result',()=>{const rows=M.normalizeResults([{title:'소니 A7 V ILCE-7M5 - 2,850,000원',url:'https://web.joongna.com/product/100',content:'풀박스'}],{name:'소니 A7 V ILCE-7M5',model:'ILCE-7M5'});assert.equal(rows.length,1);assert.equal(rows[0].price,2850000);assert.equal(rows[0].market,'중고나라');assert.equal(rows[0].modelStatus,'matched');assert.equal(rows[0].verified,false)}],
 ['old camera generation mismatched',()=>assert.equal(M.compareModel({name:'소니 A7V ILCE-7M5',model:'ILCE-7M5'},'소니 ILCE-7M4 바디').status,'mismatch')],
 ['uncertain product needs review',()=>assert.equal(M.compareModel({name:'소니 A7V ILCE-7M5',model:'ILCE-7M5'},'소니 A7 V 본체').status,'review')],
 ['points never asking price',()=>assert.equal(M.detectPrice('Sony A7V','최대 적립 68,181원').price,null)],
 ['different amounts ambiguous',()=>assert.equal(M.detectPrice('A7V','정가 3,533,050원 판매가 3,109,090원').price,null)],
 ['no won suffix not asking price',()=>assert.equal(M.detectPrice('소니 카메라','68,181P 적립').price,null)],
 ['money explicitly won acceptable',()=>assert.equal(M.detectPrice('A7V ILCE-7M5 2,850,000원','풀박스').price,2850000)],
 ['dedup product same URL path',()=>{const r=M.normalizeResults([{title:'카메라 ILCE-7M5 2,800,000원',url:'https://web.joongna.com/product/1?a=1'},{title:'카메라 ILCE-7M5 2,800,000원',url:'https://web.joongna.com/product/1?a=2'}],{name:'카메라 ILCE-7M5',model:'ILCE-7M5'});assert.equal(r.length,1)}],
 ['no fabricated price',()=>assert.equal(M.normalizeResults([{title:'ILCE-7M5 문의',url:'https://www.daangn.com/kr/buy-sell/1',content:'가격 문의'}],{name:'ILCE-7M5',model:'ILCE-7M5'})[0].price,null)],
 ['one click UI',()=>{assert.match(html,/id="runMarketSearch"/);assert.match(app,/PriceHunterAutoMarket\?\.run\(p\)/)}],
 ['no clickable marketplaces choice on search step',()=>{const page=html.split('<section class="page" id="search">')[1].split('<section class="page" id="records">')[0];assert.doesNotMatch(page,/id="searchLinks"/);assert.doesNotMatch(page,/id="includeNew"/)}],
 ['google source advertising preserved',()=>assert.match(ui,/default search results element|default search results|Google Standard Search Element still renders/i)],
 ['free engine configuration explicit',()=>assert.match(html,/id="marketEngineId"/)],
 ['service worker caches market modules',()=>{const sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');assert.match(sw,/price-hunter-v041/);assert.match(sw,/market-ui\.js/)}],
];
let fails=0;for(const [label,test] of cases)try{test();console.log('PASS',label)}catch(e){fails++;console.error('FAIL',label,e.message)}
console.log(`Market integration: ${cases.length-fails}/${cases.length}`);if(fails)process.exitCode=1;
