const assert=require('node:assert/strict');
const c=require('../core.js');
const tests=[
()=>assert.equal(c.extractPrices('할인가 7만원')[0].value,70000),
()=>assert.equal(c.extractPrices('판매가: 70,000원')[0].value,70000),
()=>assert.equal(c.extractPrices('10만 원')[0].value,100000),
()=>assert.equal(c.extractPrices('1,234,000')[0].value,1234000),
()=>assert.equal(c.extractPrices('8800000012345').length,0),
()=>assert.equal(c.parsePastedPrice('판매가 130,000원, 배송비 4,000원'),130000),
()=>assert.equal(c.parsePastedPrice('200,000원 정가 / 할인가 70,000원'),70000),
()=>assert.equal(c.matchProduct('Sony A7M4','Sony A7M3').status,'mismatch'),
()=>assert.equal(c.matchProduct('폴라로이드 나우 플러스 3세대','폴라로이드 나우 플러스 2세대').status,'mismatch'),
()=>assert.equal(c.matchProduct('Polaroid Now Plus Generation 3','Polaroid Now Plus Generation 2').status,'mismatch'),
()=>assert.equal(c.matchProduct('Sony A7M4','Sony A7M4 바디').status,'matched'),
()=>assert.equal(c.matchProduct('Sony A7M4','Sony 카메라').status,'review'),
()=>assert.equal(c.validHttpUrl('javascript:alert(1)'),''),
()=>assert.equal(c.listingKey({url:'https://www.example.com/p/123?ref=x'}),c.listingKey({url:'https://example.com/p/123?ref=y'})),
()=>assert.equal(c.stats([{price:10000},{price:20000},{price:30000}]).median,20000),
()=>assert.equal(c.stats([]).median,null),
()=>assert.equal(c.calculate({purchase:70000,sale:130000,shipping:4000,packaging:1000,discount:5000}).profit,50000),
()=>assert.equal(c.calculate({purchase:100000,sale:150000,platformFee:10}).profit,35000),
()=>assert.equal(c.calculate({purchase:100000,sale:110000,platformFee:101}).error!==undefined,true),
()=>assert.equal(c.calculate({purchase:100000,sale:110000,shipping:-1}).error!==undefined,true),
()=>assert.equal(c.validateListing({title:'Sony A7M4',price:1200000,date:'2026-10-18',url:'https://example.com'},'Sony A7M4'),''),
()=>assert.equal(c.validateListing({title:'Sony A7M3',price:1200000,date:'2026-10-18'},'Sony A7M4').includes('불일치'),true),
()=>assert.equal(c.filterListings([{date:'2026-09-01',state:'active'},{date:'2025-09-01',state:'active'}],{months:3,today:new Date('2026-10-18')}).length,1),
()=>assert.equal(c.googleSearch('A7M4','daangn.com').startsWith('https://www.google.com/search?q='),true),
];
let errors=0;for(let i=0;i<tests.length;i++)try{tests[i]();console.log('PASS',i+1);}catch(e){errors++;console.error('FAIL',i+1,e.message);}console.log(`${tests.length-errors}/${tests.length} tests passed`);if(errors)process.exit(1);
