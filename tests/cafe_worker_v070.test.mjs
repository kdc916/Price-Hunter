import assert from 'node:assert/strict';
import handler,{configured,router,encodedImage,naverBody,safeDeal} from '../worker/src/index.mjs';
let ok=0,fail=0;
async function t(label,fn){try{await fn();console.log('PASS',label);ok++;}catch(e){console.error('FAIL',label,e.message);fail++;}}
const base='https://price-hunter.example';
await t('require first-party secrets',()=>assert.equal(configured({}),false));
await t('check valid configuration',()=>assert.equal(configured({NAVER_CLIENT_ID:'test',NAVER_CLIENT_SECRET:'test',NAVER_CAFE_ID:'1234',NAVER_OFFICIAL_MENU_ID:'1',NAVER_MEMBER_MENU_ID:'2',TOKEN_ENCRYPTION_KEY:'dummy',DB:{}}),true));
await t('reject invalid cafe ID',()=>assert.equal(configured({NAVER_CLIENT_ID:'a',NAVER_CLIENT_SECRET:'b',NAVER_CAFE_ID:'https://cafe.naver.com',NAVER_OFFICIAL_MENU_ID:'1',NAVER_MEMBER_MENU_ID:'2',TOKEN_ENCRYPTION_KEY:'abc',DB:{}}),false));
await t('config returns false when not configured',async()=>{const r=await router(new Request(base+'/api/config'),{});assert.equal(r.status,200);assert.equal((await r.json()).configured,false);});
await t('me returns null without setup',async()=>{const r=await router(new Request(base+'/api/me'),{});assert.equal((await r.json()).user,null);});
await t('OAuth login cannot silently start without configuration',async()=>{const r=await router(new Request(base+'/auth/naver/start'),{});assert.equal(r.status,503);});
await t('POST blocks cross-site CSRF requests',async()=>{const r=await router(new Request(base+'/api/deals',{method:'POST',headers:{Origin:'https://evil.example'}}),{});assert.equal(r.status,403);});
await t('POST without origin blocked',async()=>{const r=await router(new Request(base+'/api/deals',{method:'POST'}),{});assert.equal(r.status,403);});
await t('same-origin POST still requires configuration',async()=>{const r=await router(new Request(base+'/api/deals',{method:'POST',headers:{Origin:base}}),{});assert.equal(r.status,503);});
await t('unknown API route error',async()=>{const r=await handler.fetch(new Request(base+'/api/unknown'),{});assert.equal(r.status,503) // before setup, unknown endpoint is intentionally inaccessible
});
await t('reject malformed photo data',()=>assert.throws(()=>encodedImage('data:image/svg+xml;base64,PGh0bWw+'),/JPEG/));
await t('accept empty image',()=>assert.equal(encodedImage(null),null));
await t('body HTML must escape user supplied content',()=>{const h=naverBody({name:'소니 <script>alert(1)</script> 카메라',store:'마트',place:'서울',price:100000,condition:'new_sealed',mode:'member',discoveredAt:'2026-10-19T10:00'});assert.ok(!h.includes('<script>'));});
await t('safe deals conceal tokens and images',()=>{const d=safeDeal({id:'uuid',price:70000,name:'Camera',store:'A',place:'B',condition:'new_sealed',created_at:Date.now(),status:'pending',image:'SECRET'});assert.equal('image' in d,false);});
console.log(`${ok}/${ok+fail} Cafe Worker tests`);if(fail)process.exitCode=1;
