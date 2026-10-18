/* Price Hunter v0.5.1 — geometry-driven, device-local OCR regions (MIT).
 * Product photos and decorative UI are not OCR evidence. Crop text-rich zones
 * with original pixel geometry before enlargement. No network or paid service.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.PriceHunterOCRRegions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
 function regions(width,height){
  if(!(width>0&&height>0))return [];
  const aspect=width/height;
  let def;
  if(aspect>=1.55){
   // Horizontal shopping cards: thumbnail at left, description/price at right.
   def=[['price-band',.20,.44,.78,.34,6],['product-copy',.24,.12,.74,.65,11],['price-line',.22,.53,.72,.22,6]];
  }else if(aspect>=1.02){
   // Two-column desktop product pages.
   def=[['price-column',.34,.12,.64,.76,11],['product-heading',.29,.03,.68,.39,6],['price-band',.31,.37,.66,.41,6]];
  }else{
   // Tall phone screenshots: pricing frequently follows the image hero.
   def=[['mobile-lower',.03,.40,.94,.48,11],['mobile-heading',.03,.13,.94,.40,6],['mobile-mid',.03,.28,.94,.44,6]];
  }
  return def.map(([name,fx,fy,fw,fh,psm])=>{
   const left=Math.floor(width*fx),top=Math.floor(height*fy);
   return {name,left,top,width:Math.max(1,Math.min(width-left,Math.floor(width*fw))),height:Math.max(1,Math.min(height-top,Math.floor(height*fh))),psm};
  });
 }
 function crop(source,region,canvasFactory){
  const {left,top,width,height}=region;
  if(!source||!width||!height)throw Error('invalid OCR region');
  const longest=Math.max(width,height);
  const multiplier=clamp(2400/longest,1,3.4);
  const canvas=(canvasFactory||(()=>document.createElement('canvas')))();
  canvas.width=Math.round(width*multiplier);canvas.height=Math.round(height*multiplier);
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('OCR region 2D canvas unavailable');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,left,top,width,height,0,0,canvas.width,canvas.height);
  return canvas;
 }
 function isGoodCandidate(result){
  const value=Number(result?.autoFillPrice||0);
  return Number.isSafeInteger(value)&&value>=1000&&Boolean(String(result?.name||'').trim());
 }
 return {regions,crop,isGoodCandidate};
});