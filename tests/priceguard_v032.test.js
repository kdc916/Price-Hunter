const assert=require('node:assert/strict');
const S=require('../screenshot.js');
const P=require('../priceguard.js');
const sony=`소니 소니코리아 정품 A7M5 (새상품) 알파 ILCE-7M5 A75 A7 V 미러리스 카메라
3,533,050원
11% 3,109,090원
멤버십 최대 68,181원 적립
오늘출발 무료배송`;
const sony2=`소니 소니코리아 정품 A7M5 (새상품) 알파 ILCE-7M5 A75 A7 V 미러리스 카메라
3,533,050원
11% 3,109,090원
멤버십 최대 68,181원
적립`; 
const lg='LG전자 NANO 4K UHD AI LED TV 43NU810BENA\n스탠드형 107cm-검스\n631,200원\n6% 593,330원\n무료배송\n로그인시 최대 혜택가\n593,328원';
const cases=[
 ['sony sale not point',()=>assert.equal(S.analyze(sony).price,3109090)],
 ['sony original',()=>assert.equal(S.analyze(sony).originalPrice,3533050)],
 ['sony point excluded',()=>assert.equal(S.analyze(sony).prices.find(x=>x.value===68181).type,'excluded')],
 ['point in next line',()=>assert.equal(S.analyze(sony2).prices.find(x=>x.value===68181).type,'excluded')],
 ['reward previous row',()=>assert.equal(S.analyze('소니 A7M5\n최대 적립 포인트\n68,181원').price,null)],
 ['reward in same line',()=>assert.equal(S.analyze('소니 A7M5\n적립 68,181원').price,null)],
 ['reward suffix',()=>assert.equal(S.analyze('소니 A7M5\n68,181원 적립').price,null)],
 ['points P suffix',()=>assert.equal(S.analyze('소니 A7M5\n적립 68,181P').price,null)],
 ['points G suffix',()=>assert.equal(S.analyze('소니 A7M5\n20,170G').price,null)],
 ['unmarked comma not price',()=>assert.equal(S.analyze('소니 A7M5\n68,181').price,null)],
 ['unmarked OCR suffix corruption not autofill',()=>assert.equal(S.analyze('소니 A7M5\n11% 3,109,0902').price,null)],
 ['reward on single line with sale',()=>assert.equal(S.analyze('소니 A7M5\n11% 3,109,090원 최대 적립 68,181원').price,3109090)],
 ['reward before sale on same line',()=>assert.equal(S.analyze('소니 A7M5\n포인트 68,181원 / 판매가 3,109,090원').price,3109090)],
 ['reward after sale on same line',()=>assert.equal(S.analyze('소니 A7M5\n판매가 3,109,090원 / 68,181원 적립').price,3109090)],
 ['reward between sale and points',()=>assert.equal(S.analyze('소니 A7M5\n3,109,090원 적립 68,181원').price,3109090)],
 ['plain 할인 amount excluded',()=>assert.equal(S.analyze('소니 A7M5\n할인 68,181원').price,null)],
 ['savings excluded',()=>assert.equal(S.analyze('소니 A7M5\n할인금액 424,000원').price,null)],
 ['savings near legitimate price',()=>assert.equal(S.analyze('소니 A7M5\n할인금액 424,000원\n판매가 3,109,090원').price,3109090)],
 ['normal discounted price permitted',()=>assert.equal(S.analyze('소니 A7M5\n할인가 3,109,090원').price,3109090)],
 ['percent discount permitted',()=>assert.equal(S.analyze('소니 A7M5\n11% 3,109,090원').price,3109090)],
 ['LG actual price',()=>assert.equal(S.analyze(lg).price,593330)],
 ['LG conditional no override',()=>assert.equal(S.analyze(lg).conditionalPrices[0],593328)],
 ['LG original',()=>assert.equal(S.analyze(lg).originalPrice,631200)],
 ['points only not sale',()=>assert.equal(S.analyze('소니 A7M5\n포인트 최대 68,181원 적립').price,null)],
 ['card cashback excluded',()=>assert.equal(S.analyze('소니 A7M5\n캐시백 68,181원\n실제 판매가 3,109,090원').price,3109090)],
 ['monthly payment excluded',()=>assert.equal(S.analyze('소니 A7M5\n24개월 할부 월 129,000원').price,null)],
 ['shipping excluded',()=>assert.equal(S.analyze('소니 A7M5\n배송비 3,500원').price,null)],
 ['benefit price only no autofill',()=>assert.equal(S.analyze('소니 A7M5\n로그인시 최대 혜택가\n3,099,090원').price,null)],
 ['ambiguous different selling prices do not autofill',()=>assert.equal(S.analyze('소니 A7M5\n3,109,090원\n3,209,090원').price,null)],
 ['combine OCR original + contrast',()=>assert.equal(S.combine([sony,'소니 A7M5\n11% 3,109,090원\n포인트 68,181원']).price,3109090)],
 ['combine one ambiguous OCR should not overwrite explicit sale',()=>assert.equal(S.combine(['소니 A7M5\n멤버십 적립 68,181원','소니 A7M5\n11% 3,109,090원']).price,3109090)],
 ['fixed title kept by legacy parser',()=>assert.ok(S.analyze(sony).name.includes('소니'))]
];
let failed=0;for(const [name,fn] of cases){try{fn();console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.message)}}console.log(`${cases.length-failed}/${cases.length} priceguard cases`);if(failed)process.exitCode=1;