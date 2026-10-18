const assert=require('node:assert/strict');
const C=require('../core.js');
const S=require('../screenshot.js');
require('../priceguard.js');
const G=require('../catalogguard.js');
const cases=[
['Panasonic DC-L10',`[P0000EQM] 파나소닉 한국정품 DC-L10 + 무료배송 + 새상품
판매가
2,550,000원
소비자가격
2,700,000원
상품코드 P0000EQM`,2550000,2700000],
['Lumix S 24-60 lens',`파나소닉 루믹스 S 24-60mm F2.8 /최신제품 주문전 재고확인
판매가 1,100,000원
총 상품금액(수량): 1,100,000원 (1개)`,1100000,null],
['Sony GM lens',`SONY 알파 FE 70-200mm F2.8 GM OSS II
판매가
2,740,000 원
결제액 : 2740000 원`,2740000,null],
['MSI laptop',`타이탄 18 HX 드래곤 에디션 Draco Epic A2WJ-U9+ RTX5090
제조사 MSI
가격 11,770,000원
상품코드 122726680`,11770000,null],
['Samsung DDR5',`삼성전자 DDR5-5600 (16GB)
최저가 349,690원
멤버십/카드결제 최대 혜택가
무통장입금시 344,840원
N+ 멤버십 최대 13,160원 적립 시`,349690,null],
['KLEVV DDR5',`ESSENCORE KLEVV DDR5-5600 CL46 (16GB)
판매가 343,920 원
포인트 340 원
제품코드 5676616040
총상품금액 343,920원`,343920,null]
];
let count=0;
for(const [label,text,price,original] of cases){
 const r=G.analyze(text);assert.equal(r.price,price,label);count++;
 if(original){assert.equal(r.originalPrice,original,label+' original');count++;}
}
for(const [text,want] of [
 ['적립금 68,181원',null],
 ['68,181원 적립',null],
 ['포인트 340원',null],
 ['네이버페이 1만원 지급',null],
 ['배송비 3,500원',null],
 ['할인금액 25,000원',null],
 ['판매가 343,920원 포인트 340원',343920],
 ['최저가 349,690원 멤버십 혜택가 344,840원',349690],
 ['11% 3,109,090원',3109090],
 ['판매가 1,000,000원\n판매가 900,000원',null],
 ['총상품금액 500,000원',null]
]){assert.equal(G.analyze(text).price,want,text);count++;}
assert.ok(G.analyze(cases[4][1]).conditionalPrices.includes(344840));count++;
assert.ok(!G.analyze(cases[4][1]).prices.some(x=>x.value===13160&&x.type==='main'));count++;
assert.equal(G.checkIdentity(cases[4][1],cases[5][1]).status,'mismatch');count++;
assert.equal(G.checkIdentity(cases[1][1],cases[2][1]).status,'mismatch');count++;
assert.equal(G.checkIdentity('삼성전자 DDR5-5600 16GB','삼성전자 DDR5-5600 32GB').status,'mismatch');count++;
assert.equal(C.matchProduct('삼성전자 DDR5-5600 16GB','ESSENCORE KLEVV DDR5-5600 16GB').status,'mismatch');count++;
assert.equal(G.combine(['판매가 999,000원','판매가 899,000원']).price,null);count++;
assert.equal(G.analyze('제품코드 5676616040').price,null);count++;
console.log('v0.4.1 catalog regression:',count,'passed');