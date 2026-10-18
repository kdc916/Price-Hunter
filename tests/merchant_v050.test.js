const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const S=require('../screenshot.js');require('../catalogguard.js');require('../checkoutguard.js');
const M=require('../merchantguard.js');
const cases=[];const check=(name,run)=>cases.push({name,run});
function p(text){return M.parse(text)}
const examples=[
 ['naver','네이버쇼핑\n소니 A7V ILCE-7M5\n판매가 3,109,090원\n최대 68,181원 적립',3109090,null,68181],
 ['danawa','다나와 가격비교\n삼성전자 DDR5-5600 16GB\n최저가\n349,690원\n멤버십/카드결제 최대 혜택가\n344,840원\n네이버페이 최대 13,160원 적립\n배송비 3,000원',349690,344840,13160],
 ['shinsegaetv','신세계TV쇼핑\nLG TV OLED55C5\n판매가 1,350,000원\n쿠폰 적용가 1,290,000원',1350000,1290000,null],
 ['ssg','SSG.COM\n삼성 공기청정기 AX120\n판매가 850,000원\nSSG MONEY 15,000원 적립',850000,null,15000],
 ['11st','11번가\n소니 렌즈 SEL70200GM2\n판매가 2,740,000원\n쿠폰 할인 적용가 2,650,000원',2740000,2650000,null],
 ['gmarket','G마켓\n애플 아이패드 A16\n판매가 489,000원\n쿠폰적용가 469,000원',489000,469000,null],
 ['auction','옥션 쇼핑 상품\nDJI Pocket 4 짐벌 카메라\n최저가 835,000원\n스마일캐시 4,000원 적립',835000,null,4000],
 ['coupang','쿠팡\n무선 청소기 VC56\n판매가 269,000원\n쿠팡캐시 최대 13,450원 적립',269000,null,13450],
 ['lotteon','롯데ON\nLG 그램 17\n판매가 1,490,000원\n카드 결제 혜택가 1,435,000원',1490000,1435000,null],
 ['cj','CJ온스타일\n로봇청소기\n판매가 599,000원\n적립 11,000원',599000,null,11000],
 ['hmall','현대Hmall\n갤럭시 탭 S11\n판매가 930,000원\nH포인트 9,300원 적립',930000,null,9300],
 ['gs','GS SHOP\n드롱기 머신\n할인가 750,000원\n쿠폰적용가 710,000원',750000,710000,null],
 ['emart','이마트몰\n노트북 T14\n판매가 890,000원\n배송비 3,000원',890000,null,3000],
 ['himart','롯데하이마트\n소니 A7V\n매장가 2,950,000원\n적립 2,950원',2950000,null,2950],
 ['kakao','카카오톡딜\n에어프라이어\n판매가 79,000원\n쿠폰적용가 69,000원',79000,69000,null],
 ['homeplus','홈플러스 온라인\n세탁기 BD90\n현재가 640,000원\n배송비 20,000원',640000,null,20000],
 ['akmall','AK MALL\n후지 카메라 X100VI\n판매가 2,390,000원\nAK포인트 3,000원 적립',2390000,null,3000]
];
for(const [id,text,basic,benefit,exclude] of examples){
 check(id+' recognizer',()=>assert.equal(p(text).store?.id,id));
 check(id+' main price',()=>assert.equal(p(text).price,basic));
 if(benefit!==null)check(id+' conditional price',()=>assert.ok(p(text).conditionalPrices.includes(benefit)));
 if(exclude!==null)check(id+' reward/fee excluded',()=>assert.ok(p(text).excluded.includes(exclude)));
}
const six=[
 ['파나소닉 DC-L10 카메라\n판매가 2,550,000원\n소비자가 2,700,000원',2550000,2700000],
 ['파나소닉 루믹스 S 24-60mm F2.8\n판매가 1,100,000원\n총 상품금액 1,100,000원',1100000,null],
 ['SONY FE 70-200 F2.8 GM OSS II\n판매가 2,740,000원\n결제액 2,740,000원',2740000,null],
 ['MSI Titan 18 HX RTX5090 SSD 2TB\n가격 11,770,000원\n상품코드 122726680',11770000,null],
 ['삼성전자 DDR5-5600 (16GB)\n최저가 349,690원\n무통장입금시 344,840원\nN+멤버십 최대 13,160원 적립',349690,null],
 ['ESSENCORE KLEVV DDR5-5600 CL46 (16GB)\n판매가 343,920원\n포인트 340원',343920,null]
];
six.forEach(([text,basic,original],i)=>{check('user screenshot '+(i+1),()=>assert.equal(p(text).price,basic));if(original)check('user screenshot '+(i+1)+' original',()=>assert.equal(p(text).originalPrice,original));});
check('DJI unlabeled won single price autofills',()=>{const r=S.analyze('DJI Osmo Pocket 4 크리에이터콤보\n835,000원\n리뷰 997');assert.equal(r.price,835000);assert.equal(r.autoFillPrice,835000)});
check('Sony original after amount',()=>assert.equal(p('소니 A7V\n2,208,300원 소비자가\n판매가 1,993,540원').originalPrice,2208300));
check('reward after amount',()=>assert.equal(p('삼성전자 DDR5\n68,181원 적립').price,null));
check('membership after amount',()=>assert.equal(p('삼성전자 DDR5\n344,840원 혜택가').price,null));
check('bare discounted percent without explicit sale safe',()=>assert.equal(p('청소기\n20% 1,000,000원 800,000원').price,null));
check('two real selling prices without product scope blocked',()=>assert.equal(p('후지 X100VI\n판매가 1,990,000원\n판매가 1,890,000원').price,null));
check('single true sale overrides incidental unmarked merchant offer',()=>assert.equal(p('다나와 가격비교\n최저가\n349,690원\nSSG 390,000원').price,349690));
check('separate membership price cannot become main across OCR passes',()=>assert.equal(M.merge(['삼성전자 DDR5\n344,840원','무통장입금 시 344,840원']).price,null));
check('zero verified price when only rewards',()=>assert.equal(p('소니 카메라\n최대 68,181원 포인트 적립\n배송비 3,000원').price,null));
check('unit price rejected',()=>assert.equal(p('쿠팡\n10g당 305원\n판매가 5,490원').price,5490));
check('per unit amount excluded',()=>assert.ok(p('쿠팡\n10g당 305원\n판매가 5,490원').excluded.includes(305)===false)); // sub-1000 intentionally not collected
check('coupon-only price not auto',()=>assert.equal(p('G마켓\n쿠폰 적용가 95,000원').price,null));
check('plain currency prefix',()=>assert.equal(p('11번가\n판매가 ₩ 95,000').price,95000));
check('상품코드 numeric ignored',()=>assert.equal(p('MSI 노트북\n상품코드 122726680').price,null));
check('purchase autofill prohibited if same amount conditional in other pass',()=>{const r=S.combine(['DJI Pocket 4\n판매가 835,000원','DJI Pocket 4\n회원 혜택가 835,000원']);assert.equal(r.autoFillPrice,null)});
check('merchant recognition not inferred from product brand',()=>assert.equal(p('삼성전자 DDR5-5600 16GB\n판매가 349,690원').store,null));
const index=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
check('merchant guard loaded before app',()=>assert.match(index,/merchantguard\.js"><\/script><script src="ocr-regions\.js"><\/script><script src="app\.js/));
check('version updated',()=>assert.match(index,/v0\.5\.1/));
check('autofill backed by price evidence',()=>assert.match(app,/result\?\.autoFillPrice/));
check('PWA cache invalidated',()=>assert.match(sw,/price-hunter-v051/));
let failure=0;for(const c of cases){try{c.run();console.log('PASS '+c.name)}catch(e){failure++;console.error('FAIL '+c.name+' — '+e.message)}}
console.log('Merchant v0.5.0: '+(cases.length-failure)+'/'+cases.length);if(failure)process.exitCode=1;
