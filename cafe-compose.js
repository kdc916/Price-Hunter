/* Price Hunter v0.7.0 — Naver Cafe text composition and validation (no API calls). MIT. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.PriceHunterCafeCompose=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clean=s=>String(s??'').normalize('NFKC').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim();
const int=n=>Number.isSafeInteger(Number(n))?Number(n):0;
const won=n=>int(n).toLocaleString('ko-KR')+'원';
function validate(d){const issues=[];if(clean(d.name).length<3||clean(d.name).length>140)issues.push('상품명은 3~140자로 입력하세요.');if(int(d.price)<1000||int(d.price)>200000000)issues.push('표시 구매가는 1천 원~2억 원이어야 합니다.');if(clean(d.store).length<2||clean(d.store).length>100)issues.push('판매 매장 또는 쇼핑몰을 입력하세요.');if(clean(d.place).length<2||clean(d.place).length>120)issues.push('지점 또는 온라인 구매 링크 소재지를 입력하세요.');if(!['new_sealed','new_open_box'].includes(d.condition))issues.push('새제품 상태를 선택하세요.');if(!['official','member'].includes(d.mode))issues.push('등록 방식을 선택하세요.');if(!d.userApproved)issues.push('표시 가격·위치·새제품 상태를 확인하고 게시에 동의해야 합니다.');if(d.url&&(!/^https:\/\//i.test(d.url)||d.url.length>500))issues.push('구매 링크는 HTTPS 주소만 지원합니다.');return issues;}
function compose(d){const name=clean(d.name),model=clean(d.model),store=clean(d.store),place=clean(d.place),condition=d.condition==='new_open_box'?'새제품(개봉·미사용)':'새제품(미개봉)',price=int(d.price),time=clean(d.discoveredAt||new Date().toISOString().slice(0,16).replace('T',' '));
 const title=`[신품 특가] ${name.slice(0,74)} · ${won(price)} · ${store.slice(0,28)}`.slice(0,140);
 const lines=[`상품명: ${name}`,model?`모델명: ${model}`:'모델명: 미확인',`판매가: ${won(price)}`,`상태: ${condition}`,`판매처: ${store}`,`발견 위치: ${place}`,`확인 시각: ${time}`,d.url?`구매 링크: ${d.url}`:'오프라인 방문 구매',`재고: ${clean(d.stock||'확인 필요')}`,`가격 조건: ${clean(d.conditions||'매장 현장가 기준(추가 조건 여부 확인 필요)')}`,'※ 가격·재고는 시점과 지점에 따라 다를 수 있습니다. 방문 전 확인하세요.','※ 온라인 최저가·예상 재판매 수익은 검증되지 않았다면 게시하지 않습니다.','Price Hunter를 통해 작성된 특가 제보입니다.'];
 return {title,body:lines.join('\n'),price,mode:d.mode};}
function fingerprint(d){return [clean(d.name).toLowerCase(),int(d.price),clean(d.store).toLowerCase(),clean(d.place).toLowerCase(),new Date(d.discoveredAt||Date.now()).toISOString().slice(0,10)].join('|');}
return {clean,validate,compose,fingerprint};
});
