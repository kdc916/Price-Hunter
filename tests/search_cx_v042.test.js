const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const CX=require('../cx-setup.js'),M=require('../marketsearch.js');
const root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'market-ui.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const tests=[
 ()=>assert.equal(CX.parseCX('abcd1234efgh5678'),'abcd1234efgh5678'),
 ()=>assert.equal(CX.parseCX('<script async src="https://cse.google.com/cse.js?cx=abcd1234efgh5678"></script>'),'abcd1234efgh5678'),
 ()=>assert.equal(CX.parseCX('<div class="gcse-search" data-cx="abc12345:def"></div>'),'abc12345:def'),
 ()=>assert.equal(CX.parseCX('AIzaSyabcdefghijklmnopqrstuvwxyz1234'),''),
 ()=>assert.equal(CX.parseCX('<script src="https://evil.example/?cx=abcd1234efgh5678"></script>'),''),
 ()=>assert.equal(CX.parseCX('my google account password'),''),
 ()=>assert.equal(CX.parseCX(''),''),
 ()=>assert.ok(ui.includes('configCX||parseCX(localStorage.getItem(CXKEY))')),
 ()=>assert.ok(ui.includes('window.open(url')),
 ()=>assert.ok(ui.includes('M.collectiveLink(currentProduct)')),
 ()=>assert.ok(ui.includes('marketSearchResults')),
 ()=>assert.ok(html.includes('cx-setup.js')),
 ()=>assert.ok(html.includes('maxLength="1500"')===false),
 ()=>assert.ok(html.includes('maxlength="1500"')),
 ()=>assert.ok(sw.includes('price-hunter-v042')),
 ()=>assert.ok(sw.includes('cx-setup.js')),
 ()=>assert.ok(M.collectiveLink({model:'ILCE-7M5',name:'Sony A7V'}).includes('google.com/search'))
];
let errors=0;tests.forEach((t,i)=>{try{t();console.log('PASS',i+1)}catch(e){errors++;console.error('FAIL',i+1,e.message)}});
console.log(`${tests.length-errors}/${tests.length} search setup checks`);if(errors)process.exitCode=1;
