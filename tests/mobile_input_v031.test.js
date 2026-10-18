const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
const cases=[
 ['gallery must not force camera',()=>{const tag=html.match(/<input[^>]*id="scanFile"[^>]*>/)?.[0];assert.ok(tag);assert.match(tag,/accept="image\/\*"/);assert.doesNotMatch(tag,/\bcapture\s*=/i)}],
 ['camera uses separate rear-facing capture',()=>{const tag=html.match(/<input[^>]*id="cameraFile"[^>]*>/)?.[0];assert.ok(tag);assert.match(tag,/capture="environment"/)}],
 ['gallery and camera have separate visible actions',()=>{assert.match(html,/for="scanFile">🖼️ 갤러리 · 파일 선택<\/label>/);assert.match(html,/for="cameraFile">📷 사진 촬영<\/label>/)}],
 ['drop target no longer opens camera',()=>{const tag=html.match(/<div class="drop-target"[^>]*>/)?.[0];assert.ok(tag);assert.doesNotMatch(tag,/for=/)}],
 ['gallery change routed through OCR',()=>assert.match(app,/receiveFile\(file,'갤러리·파일에서 선택한 이미지'\)/)],
 ['camera change routed through OCR',()=>assert.match(app,/receiveFile\(file,'카메라로 촬영한 이미지'\)/)],
 ['both inputs can reselect the same photo',()=>{assert.match(app,/\$\('scanFile'\)\.addEventListener\('click'/);assert.match(app,/\$\('cameraFile'\)\.addEventListener\('click'/)}],
 ['both inputs can be used by OCR retry',()=>assert.match(app,/currentPastedFile\|\|\$\('scanFile'\)\.files\?\.\[0\]\|\|\$\('cameraFile'\)/)],
 ['new service worker key',()=>assert.match(sw,/price-hunter-v031/)],
 ['existing saved data key preserved',()=>assert.match(app,/price-hunter-0\.1\.0/)]
];
let failures=0;for(const [name,fn] of cases){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
console.log(`${cases.length-failures}/${cases.length} mobile file picker checks passed`);if(failures)process.exitCode=1;
