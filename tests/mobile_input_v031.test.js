const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
const cases=[
  ['gallery input exists and never forces capture',()=>{const tag=html.match(/<input[^>]*id="scanFile"[^>]*>/)?.[0];assert.ok(tag);assert.match(tag,/type="file"/);assert.match(tag,/accept="image\/\*"/);assert.doesNotMatch(tag,/\bcapture\s*=/i);} ],
  ['camera input exists and requests rear camera',()=>{const tag=html.match(/<input[^>]*id="cameraFile"[^>]*>/)?.[0];assert.ok(tag);assert.match(tag,/capture="environment"/);} ],
  ['separate clearly labelled choices',()=>{assert.match(html,/<label[^>]+for="scanFile"[^>]*>🖼️ 갤러리 · 파일 선택<\/label>/);assert.match(html,/<label[^>]+for="cameraFile"[^>]*>📷 사진 촬영<\/label>/);} ],
  ['drop target is not bound to camera',()=>{const target=html.match(/<div class="drop-target"[^>]*>/)?.[0];assert.ok(target);assert.doesNotMatch(target,/\bfor=/);} ],
  ['both photo sources have change listeners and OCR path',()=>{assert.match(app,/\$\('scanFile'\)\.addEventListener\('change'/);assert.match(app,/\$\('cameraFile'\)\.addEventListener\('change'/);assert.match(app,/receiveFile\(file,'카메라로 촬영한 이미지'\)/);assert.match(app,/receiveFile\(file,'갤러리·파일에서 선택한 이미지'\)/);} ],
  ['selectedFile supports camera gallery and paste',()=>assert.match(app,/return currentPastedFile\|\|\$\('scanFile'\)\.files\?\.\[0\]\|\|\$\('cameraFile'\)\.files\?\.\[0\]/)],
  ['same image can be picked twice',()=>{assert.match(app,/\$\('scanFile'\)\.addEventListener\('click',/);assert.match(app,/\$\('cameraFile'\)\.addEventListener\('click',/);} ],
  ['PWA new cache key',()=>assert.match(sw,/price-hunter-v040/)],
  ['no old capture on gallery',()=>assert.doesNotMatch(html,/id="scanFile"[^>]+capture/)],
  ['preserves localStorage identifier',()=>assert.match(app,/price-hunter-0\.1\.0/)]
];
let fail=0;for(const [name,fn] of cases){try{fn();console.log('PASS',name)}catch(e){fail++;console.error('FAIL',name,e.message)}}
console.log(`${cases.length-fail}/${cases.length} mobile input checks passed`);
if(fail)process.exitCode=1;
