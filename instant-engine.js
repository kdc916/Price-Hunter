/* Price Hunter v0.6.0: verified-only instant ROI engine, no prices invented.
 * External search snippets NEVER enter these figures automatically. MIT.
 */
(function(root,factory){const C=root.PriceHunterCore||(typeof require==='function'?require('./core.js'):null);const api=factory(C);if(typeof module==='object'&&module.exports)module.exports=api;root.PriceHunterInstantEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
if(!C)throw Error('PriceHunterCore must load first');
const validMoney=n=>Number.isSafeInteger(Number(n))&&Number(n)>=1000&&Number(n)<=200000000;
function sameProduct(product,record){
 const name=String(product?.name||'').trim(),title=String(record?.title||'');
 if(!name||!title||C.normalize(record.target||'')!==C.normalize(name))return false;
 const model=String(product.model||'').trim();
 if(model&&!C.normalize(title).replace(/ /g,'').includes(C.normalize(model).replace(/ /g,'')))return false;
 return C.matchProduct(name,title,model?{model}:{}).status==='matched';
}
function filter(records,product,months=3,now=new Date()){
 const cut=new Date(now);cut.setMonth(cut.getMonth()-Number(months||3));
 return (Array.isArray(records)?records:[]).filter(r=>{
  const when=new Date(`${r.date||''}T12:00:00`);
  return r.verified===true&&['active','confirmed_sold','new'].includes(r.state)&&validMoney(r.price)&&!Number.isNaN(when.getTime())&&when>=cut&&when<=now&&sameProduct(product,r);
 });
}
function trimOutliers(items){if(items.length<5)return items;
 const mid=C.stats(items).median;
 const deviation=C.stats(items.map(x=>({price:Math.abs(x.price-mid)}))).median;
 if(deviation===null)return items;
 return items.filter(x=>deviation===0?x.price===mid:Math.abs(x.price-mid)<=3*1.4826*deviation);
}
function evaluate({product={},listings=[],months=3,mode='median',platformFee=3.5,shipping=3500,removeOutliers=true,now=new Date()}={}){
 const purchase=validMoney(product.purchase)?Number(product.purchase):null;
 const records=filter(listings,product,months,now);
 const sold=removeOutliers?trimOutliers(records.filter(r=>r.state==='confirmed_sold')):records.filter(r=>r.state==='confirmed_sold');
 const asking=removeOutliers?trimOutliers(records.filter(r=>r.state==='active')):records.filter(r=>r.state==='active');
 const fresh=records.filter(r=>r.state==='new');
 const newLowest=C.stats(fresh).min;
 const source=sold.length>=3?'sold':asking.length>=3?'asking':'insufficient';
 const sample=source==='sold'?sold:asking;
 const stat=C.stats(sample);
 const key={low:'quartile25',median:'median',mean:'mean',high:'quartile75'}[mode]||'median';
 const resale=source==='insufficient'?null:Math.round(stat[key]);
 const fees=Number(platformFee),ship=Number(shipping);
 let finance=null;
 if(purchase!==null&&resale!==null&&Number.isFinite(fees)&&Number.isFinite(ship)){
  const result=C.calculate({purchase,sale:resale,platformFee:fees,shipping:ship});
  if(!result.error)finance=result;
 }
 return {purchase,source,askingCount:asking.length,soldCount:sold.length,newCount:fresh.length,
  sampleCount:sample.length,stat:source==='insufficient'?null:stat,newLowest,resale,
  profit:finance?.profit??null,roi:finance?.roi??null,feeAmount:finance?.feeAmount??null,
  shipping:Number.isFinite(ship)&&ship>=0?ship:null,
  status:purchase===null?'no_purchase':source==='insufficient'?'insufficient':finance?'calculated':'invalid_cost',
  grade:source==='sold'?'confirmed transaction samples':source==='asking'?'verified active asking listings':'no comparable data'};
}
return {validMoney,sameProduct,filter,trimOutliers,evaluate};
});
