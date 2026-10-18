/* Price Hunter v0.4.2: public Google Programmable Search Engine CX parser. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.PriceHunterCX=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function validCX(value){const s=String(value||'');return /^[A-Za-z0-9][A-Za-z0-9:_-]{7,119}$/.test(s)&&!/^AIza[A-Za-z0-9_-]{20,}$/.test(s);}
function parseCX(value){const input=String(value||'').trim();if(validCX(input))return input;
 // Official "Get code" snippet with cse.google.com/cse.js?cx=...
 const js=input.match(/(?:cse\.google\.com\/cse\.js\?[^\s"'<>]*?\bcx=)([A-Za-z0-9:_-]{8,120})/i);
 if(js&&validCX(js[1]))return js[1];
 const data=input.match(/\bdata-cx\s*=\s*["']([A-Za-z0-9:_-]{8,120})["']/i);
 return data&&validCX(data[1])?data[1]:'';
}
return {validCX,parseCX};
});
