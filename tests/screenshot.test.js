const assert=require('node:assert/strict');
const C=require('../core.js');
const S=require('../screenshot.js');
const lg=`LG전자 >\nLG전자 NANO 4K UHD AI LED TV 43NU810BENA\n스탠드형 107cm-검스\n631,200원\n6% 593,330원\n무료배송\n로그인시 최대 혜택가\n593,328원`;
const tests=[
()=>assert.equal(S.analyze(lg).model,'43NU810BENA'),
()=>assert.equal(S.analyze(lg).price,593330),
()=>assert.equal(S.analyze(lg).originalPrice,631200),
()=>assert.deepEqual(S.analyze(lg).conditionalPrices,[593328]),
()=>assert.equal(S.analyze(lg).name,'LG전자 NANO 4K UHD AI LED TV 43NU810BENA 스탠드형 107cm-검스'),
()=>assert.equal(S.analyze(lg).confidence,'high'),
()=>assert.equal(S.modelTokens('TV 43NU810BENA 스탠드 107cm 4K')[0],'43NU810BENA'),
()=>assert.equal(C.modelCodes('LG 43NU810BENA').includes('43nu810bena'),true),
()=>assert.equal(C.matchProduct('LG 43NU810BENA','LG 43NU810BEND').status,'mismatch'),
()=>assert.equal(S.analyze('폴라로이드 나우플러스 3세대\n정상가 199,000원\n매장 특가 74,000원').price,74000),
()=>assert.equal(S.analyze('폴라로이드 나우플러스 3세대\n정상가 199,000원\n매장 특가 74,000원').originalPrice,199000),
()=>assert.equal(S.analyze('Sony A7M4\n159만원').price,1590000),
()=>assert.equal(S.analyze('로그인시 최대 혜택가\n58,000원').price,null),
()=>assert.equal(S.analyze('할인가 70,000원\n로그인 시 최대 혜택가\n60,000원').price,70000),
()=>assert.equal(S.analyze('별도 이미지 제품 소개, 금액 없음').price,null),
()=>assert.equal(S.analyze('상품 코드:\nQLED TV 55QNED85\n799,000원').model,'55QNED85'),
()=>assert.equal(S.analyze('LG전자 NANO 4K UHD AI LED TV 43NU810BENA\n6% 593,3302\n로그인시최대혜택가 593,328원').price,593330),
()=>assert.equal(S.analyze('LG전자 NANO 4K UHD AI LED TV 43NU810BENA\n6% 593,3302\n로그인시최대혜택가 593,328원').conditionalPrices[0],593328),
];
let errors=0;tests.forEach((t,i)=>{try{t();console.log('PASS',i+1);}catch(e){errors++;console.error('FAIL',i+1,e.stack);}});
console.log(`${tests.length-errors}/${tests.length} screenshot tests passed`);if(errors)process.exit(1);
