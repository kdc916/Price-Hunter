const assert=require('node:assert/strict'), S=require('../screenshot.js');
const base='공식인증 자급제 특가\n삼성전자 갤럭시 Z 폴드8 5G 256GB\n자급제 Fs\n30일 내 최저가\n2,208,300원\n9% 1,993,540원\n최대 적립 포인트\n20,170P';
const bad='공식인증 자급제 특가\n삼성전자 갤럭시 7 폴드856 25668 자급제 「5 <\n30일 내 최저가\n2,208,300원\n9% 1,993,540웡\n최대 적립 포인트\n20,170원';
const a=S.analyze(base),b=S.analyze(bad),c=S.combine(['삼성전자 갤럭시 Z 폴드8 5G 256GB\n최대 적립 포인트\n20,170원','삼성전자 갤럭시 Z 폴드8\n2,208,300원\n9% 1,993,540원']);
const cases=[
()=>assert.equal(a.name,'삼성전자 갤럭시 Z 폴드8 5G 256GB 자급제'),
()=>assert.equal(a.price,1993540),
()=>assert.equal(a.originalPrice,2208300),
()=>assert.equal(a.model,''),
()=>assert.ok(!a.prices.some(x=>x.value===20170&&x.type==='main')),
()=>assert.equal(b.name,'삼성전자 갤럭시 Z 폴드8 5G 256GB 자급제'),
()=>assert.equal(b.price,1993540),
()=>assert.equal(b.originalPrice,2208300),
()=>assert.equal(b.model,''),
()=>assert.equal(b.prices.find(x=>x.value===20170).type,'excluded'),
()=>assert.equal(S.analyze('삼성 갤럭시\n적립 포인트\n20,170원').price,null),
()=>assert.equal(S.analyze('포인트\n20,170P').price,null),
()=>assert.equal(S.analyze('갤럭시 Z 폴드8\n할인가 1,993,540원').price,1993540),
()=>assert.equal(S.analyze('갤럭시 Z 폴드8\n할인가 1,993,540원').model,''),
()=>assert.equal(S.analyze('갤럭시 Z 폴드8\n1,993,540원').price,1993540),
()=>assert.equal(S.analyze('갤럭시 Z 폴드8\n9% 1,993,540원').price,1993540),
()=>assert.equal(S.analyze('갤럭시 Z 폴드8\n9% 1,993,540웡').price,1993540),
()=>assert.equal(S.analyze('갤럭시 Z 폴드8\n2,208,300원\n9% 1,993,540원').originalPrice,2208300),
()=>assert.equal(S.analyze('폴라로이드 나우플러스 3세대\n할인가 7만원').price,70000),
()=>assert.equal(S.analyze('Sony A7M4\n159만원').price,1590000),
()=>assert.equal(S.analyze('LG전자 NANO TV 43NU810BENA\n6% 593,330원').model,'43NU810BENA'),
()=>assert.equal(S.analyze('LG전자 NANO TV 43NU810BENA\n6% 593,330원').price,593330),
()=>assert.equal(S.analyze('쿠폰가 190,000원\n할인가 210,000원').price,210000),
()=>assert.equal(S.analyze('로그인시 최대 혜택가\n593,328원').price,null),
()=>assert.deepEqual(S.analyze('LG전자 43NU810BENA\n6% 593,330원\n로그인 최대 혜택\n593,328원').conditionalPrices,[593328]),
()=>assert.equal(c.price,1993540),
()=>assert.equal(c.originalPrice,2208300),
()=>assert.ok(c.name.includes('갤럭시 Z 폴드8')),
()=>assert.ok(!S.modelTokens('Fold8 256GB').includes('FOLD8')),
()=>assert.equal(S.analyze('아무 정보 없음').price,null)
];let failed=0;
cases.forEach((fn,i)=>{try{fn();console.log('PASS',i+1)}catch(e){failed++;console.error('FAIL',i+1,e.message)}});
console.log((cases.length-failed)+'/'+cases.length+' v0.3 screenshot regression tests passed');if(failed)process.exitCode=1;
