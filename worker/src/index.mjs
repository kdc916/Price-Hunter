/* Price Hunter v0.7.0 Naver Cafe server — Cloudflare Workers + D1, no paid API.
 * OAuth 2.0, encrypted tokens, user session, safe moderation and explicit posting.
 */
import Compose from '../../cafe-compose.js';
const textEncoder=new TextEncoder(),textDecoder=new TextDecoder();
const now=()=>Date.now();
const secureCookie=(k,v,age)=>`${k}=${encodeURIComponent(v)}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`;
function asJson(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}
function problem(error,status=400){return asJson({error},status);}
const random=()=>crypto.randomUUID()+'.'+crypto.randomUUID();
const bytesToB64=data=>btoa(String.fromCharCode(...data));
const b64ToBytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function digest(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',textEncoder.encode(s))),x=>x.toString(16).padStart(2,'0')).join('');}
async function getKey(env){const data=b64ToBytes(env.TOKEN_ENCRYPTION_KEY||'');if(data.length!==32)throw Error('TOKEN_ENCRYPTION_KEY는 32바이트 base64여야 합니다.');return crypto.subtle.importKey('raw',data,'AES-GCM',false,['encrypt','decrypt']);}
async function encrypt(value,env){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await getKey(env),textEncoder.encode(value||''));return bytesToB64(iv)+'.'+bytesToB64(new Uint8Array(cipher));}
async function decrypt(value,env){if(!value)return '';const [i,c]=value.split('.');return textDecoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(i)},await getKey(env),b64ToBytes(c)));}
function getCookie(req,key){const v=req.headers.get('Cookie')||'';const p=v.split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='));return p?decodeURIComponent(p.slice(key.length+1)):'';}
function configured(e){return Boolean(e.NAVER_CLIENT_ID&&e.NAVER_CLIENT_SECRET&&/^\d+$/.test(e.NAVER_CAFE_ID||'')&&/^\d+$/.test(e.NAVER_OFFICIAL_MENU_ID||'')&&/^\d+$/.test(e.NAVER_MEMBER_MENU_ID||'')&&e.TOKEN_ENCRYPTION_KEY&&e.DB);}
function requestOrigin(req){return new URL(req.url).origin;}
function verifyOrigin(req){const origin=req.headers.get('Origin');return Boolean(origin&&origin===requestOrigin(req));}
function backendCallback(req){return requestOrigin(req)+'/auth/naver/callback';}
function titleEsc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));}
function naverBody(d){return titleEsc(Compose.compose({...d,userApproved:true}).body).replace(/\n/g,'<br>');}
async function session(req,e){const raw=getCookie(req,'ph_session');if(!raw)return null;const sha=await digest(raw);const user=await e.DB.prepare('SELECT u.id,u.nickname,u.access_enc,u.refresh_enc,u.expires_at,s.expires_at AS session_expires FROM ph_sessions s JOIN ph_users u ON u.id=s.user_id WHERE s.key_hash=?').bind(sha).first();if(!user||user.session_expires<now())return null;return {...user,admin:Boolean(e.NAVER_ADMIN_ID&&user.id===e.NAVER_ADMIN_ID)};}
async function getAccess(user,e){if(user.expires_at>now()+120000)return decrypt(user.access_enc,e);const refresh=await decrypt(user.refresh_enc,e);if(!refresh)throw Error('재로그인이 필요합니다.');const params=new URLSearchParams({grant_type:'refresh_token',client_id:e.NAVER_CLIENT_ID,client_secret:e.NAVER_CLIENT_SECRET,refresh_token:refresh});const r=await fetch('https://nid.naver.com/oauth2.0/token',{method:'POST',body:params});const j=await r.json();if(!r.ok||!j.access_token)throw Error('네이버 토큰 갱신 실패. 다시 로그인하세요.');const exp=now()+Math.min(Number(j.expires_in||3600),7200)*1000;await e.DB.prepare('UPDATE ph_users SET access_enc=?,refresh_enc=?,expires_at=?,updated_at=? WHERE id=?').bind(await encrypt(j.access_token,e),await encrypt(j.refresh_token||refresh,e),exp,now(),user.id).run();return j.access_token;}
async function oauthBegin(req,e){if(!configured(e))return problem('네이버 앱·카페·서버 설정이 완료되지 않았습니다.',503);const state=random();await e.DB.prepare('INSERT INTO ph_oauth(state,expires_at) VALUES(?,?)').bind(await digest(state),now()+600000).run();const query=new URLSearchParams({response_type:'code',client_id:e.NAVER_CLIENT_ID,redirect_uri:backendCallback(req),state});return new Response(null,{status:302,headers:{Location:'https://nid.naver.com/oauth2.0/authorize?'+query,'Set-Cookie':secureCookie('ph_oauth',state,600),'Cache-Control':'no-store'}});}
async function oauthCallback(req,e){const u=new URL(req.url);const state=u.searchParams.get('state')||'',code=u.searchParams.get('code')||'';if(!state||!code||getCookie(req,'ph_oauth')!==state)return problem('로그인 요청 검증 실패. 다시 로그인하세요.',403);const hashed=await digest(state);const row=await e.DB.prepare('SELECT state FROM ph_oauth WHERE state=? AND expires_at>?').bind(hashed,now()).first();if(!row)return problem('로그인 요청 만료 또는 재사용.',403);await e.DB.prepare('DELETE FROM ph_oauth WHERE state=?').bind(hashed).run();
 const params=new URLSearchParams({grant_type:'authorization_code',client_id:e.NAVER_CLIENT_ID,client_secret:e.NAVER_CLIENT_SECRET,code,state});const t=await fetch('https://nid.naver.com/oauth2.0/token',{method:'POST',body:params});const jt=await t.json();if(!t.ok||!jt.access_token)return problem('네이버 토큰 발급 실패',502);
 const me=await fetch('https://openapi.naver.com/v1/nid/me',{headers:{Authorization:'Bearer '+jt.access_token}});const jm=await me.json();if(!me.ok||!jm.response?.id)return problem('네이버 프로필 확인 실패',502);const id=String(jm.response.id),nickname=String(jm.response.nickname||'사용자').slice(0,60),created=now(),expiry=created+Math.min(Number(jt.expires_in||3600),7200)*1000;const old=await e.DB.prepare('SELECT refresh_enc FROM ph_users WHERE id=?').bind(id).first();const refresh=jt.refresh_token|| (old?await decrypt(old.refresh_enc,e):'');
 await e.DB.prepare('INSERT INTO ph_users(id,nickname,access_enc,refresh_enc,expires_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nickname=excluded.nickname,access_enc=excluded.access_enc,refresh_enc=excluded.refresh_enc,expires_at=excluded.expires_at,updated_at=excluded.updated_at').bind(id,nickname,await encrypt(jt.access_token,e),await encrypt(refresh,e),expiry,created).run();
 const key=random();await e.DB.prepare('INSERT INTO ph_sessions(key_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(key),id,created+86400000).run();return new Response(null,{status:302,headers:{Location:requestOrigin(req)+'/#cafe', 'Set-Cookie':secureCookie('ph_session',key,86400),'Cache-Control':'no-store'}});
}
async function logout(req,e){const raw=getCookie(req,'ph_session');if(raw)await e.DB.prepare('DELETE FROM ph_sessions WHERE key_hash=?').bind(await digest(raw)).run();return asJson({ok:true},200,{'Set-Cookie':secureCookie('ph_session','',0)});}
function safeDeal(d){return {id:d.id,name:d.name,price:d.price,store:d.store,place:d.place,condition:d.condition,created_at:new Date(d.created_at).toISOString(),status:d.status,articleUrl:d.article_url||null};}
function encodedImage(data){if(!data)return null;if(typeof data!=='string'||data.length>720000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('이미지는 0.5MB 이하의 JPEG만 허용합니다.');const base64=data.split(',')[1];const raw=b64ToBytes(base64);if(raw.length>525000||raw.length<4||raw[0]!==0xff||raw[1]!==0xd8)throw Error('올바른 JPEG 사진이 아닙니다.');return base64;}
async function publish(deal,operator,e){const access=await getAccess(operator,e);const f=new FormData();const content=naverBody(deal);const title=Compose.compose({...deal,userApproved:true}).title;
 // Naver official multipart examples URL-encode subject/content fields before submitting.
 f.append('subject',encodeURIComponent(title));f.append('content',encodeURIComponent(content));f.append('openyn','false');f.append('searchopen','false');f.append('replyyn','true');
 if(deal.image){const raw=b64ToBytes(deal.image);f.append('image',new Blob([raw],{type:'image/jpeg'}),'price-hunter.jpg');}
 const board=deal.mode==='official'?e.NAVER_OFFICIAL_MENU_ID:e.NAVER_MEMBER_MENU_ID;const url=`https://openapi.naver.com/v1/cafe/${e.NAVER_CAFE_ID}/menu/${board}/articles`;
 const res=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+access},body:f});const json=await res.json().catch(()=>null);const result=json?.message;
 if(!res.ok||String(result?.status)!=='200'||!result?.result?.articleId)throw Error(result?.error?.code?`네이버 글쓰기 거부: ${result.error.code}`:'네이버 게시 확인 실패(중복 여부 수동 확인 필요)');
 return {articleUrl:String(result.result.articleUrl||''),articleId:Number(result.result.articleId)};
}
async function submit(req,e,user){if(!configured(e))return problem('카페 연동 설정이 없습니다.',503);if(Number(req.headers.get('Content-Length')||0)>850000)return problem('업로드 용량 초과',413);let d;try{d=await req.json();}catch{return problem('JSON 형식이 아닙니다.');}if(!d||typeof d!=='object')return problem('유효하지 않은 제보입니다.');
 const normalized={...d,name:Compose.clean(d.name),model:Compose.clean(d.model).slice(0,120),store:Compose.clean(d.store),place:Compose.clean(d.place),stock:Compose.clean(d.stock).slice(0,120),conditions:Compose.clean(d.conditions).slice(0,240),url:Compose.clean(d.url).slice(0,500),discoveredAt:String(d.discoveredAt||'').slice(0,19)};
 if(normalized.name.length>140||normalized.store.length>100||normalized.place.length>120||String(normalized.conditions).length>240)return problem('입력 길이 초과');const errors=Compose.validate(normalized);if(errors.length)return problem(errors.join(' · '));if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized.discoveredAt))return problem('발견 시각 형식을 확인하세요.');
 let image;try{image=encodedImage(d.image);}catch(err){return problem(err.message);}
 const recent=await e.DB.prepare('SELECT COUNT(*) AS n FROM ph_deals WHERE user_id=? AND created_at>?').bind(user.id,now()-86400000).first();if(Number(recent?.n||0)>=5)return problem('안전한 운영을 위해 하루 최대 5건까지 제보할 수 있습니다.',429);
 const last=await e.DB.prepare('SELECT created_at FROM ph_deals WHERE user_id=? ORDER BY created_at DESC LIMIT 1').bind(user.id).first();if(last&&now()-last.created_at<60000)return problem('연속 게시 방지를 위해 1분 후 다시 시도하세요.',429);
 const fingerprint=await digest(Compose.fingerprint(normalized));const existing=await e.DB.prepare('SELECT id FROM ph_deals WHERE fingerprint=?').bind(fingerprint).first();if(existing)return problem('같은 상품·가격·판매처의 중복 제보가 이미 있습니다.',409);
 const id=crypto.randomUUID(),when=now(),status=normalized.mode==='official'?'pending':'publishing';
 try{await e.DB.prepare(`INSERT INTO ph_deals(id,user_id,mode,status,name,model,price,store,place,condition,discovered_at,conditions,stock,url,image,fingerprint,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,normalized.mode,status,normalized.name,normalized.model,normalized.price,normalized.store,normalized.place,normalized.condition,normalized.discoveredAt,normalized.conditions,normalized.stock,normalized.url,image,fingerprint,when,when).run();}catch{return problem('중복 제보가 감지됐습니다.',409);}
 if(normalized.mode==='official')return asJson({id,status:'pending'},201);
 return finishPublishing(e,id,normalized,user,image);
}
async function finishPublishing(e,id,deal,user,image){try{const result=await publish({...deal,image},user,e);await e.DB.prepare('UPDATE ph_deals SET status=?,article_url=?,image=NULL,updated_at=? WHERE id=?').bind('published',result.articleUrl,now(),id).run();return asJson({id,status:'published',articleUrl:result.articleUrl},201);}catch(err){await e.DB.prepare('UPDATE ph_deals SET status=?,error=?,updated_at=? WHERE id=?').bind('needs_review',String(err.message||'게시 상태 확인 필요').slice(0,180),now(),id).run();return problem('게시 여부를 확정할 수 없습니다. 카페에서 중복 여부를 확인하세요. '+String(err.message||''),502);}}
async function review(req,e,user,id,action){if(!user.admin)return problem('운영자 전용 기능입니다.',403);const row=await e.DB.prepare('SELECT * FROM ph_deals WHERE id=?').bind(id).first();if(!row||row.mode!=='official'||row.status!=='pending')return problem('대기 상태의 공식 제보만 처리할 수 있습니다.',409);
 if(action==='reject'){const q=await e.DB.prepare('UPDATE ph_deals SET status=?,image=NULL,updated_at=? WHERE id=? AND status=?').bind('rejected',now(),id,'pending').run();if(!q.meta?.changes)return problem('이미 처리된 제보입니다.',409);return asJson({id,status:'rejected'});}
 const q=await e.DB.prepare('UPDATE ph_deals SET status=?,updated_at=? WHERE id=? AND status=?').bind('publishing',now(),id,'pending').run();if(!q.meta?.changes)return problem('동시에 다른 운영자가 처리했습니다.',409);return finishPublishing(e,id,row,user,row.image);
}
async function router(req,e){const {pathname}=new URL(req.url),method=req.method;
 if(pathname==='/auth/naver/start'&&method==='GET')return oauthBegin(req,e);
 if(pathname==='/auth/naver/callback'&&method==='GET')return oauthCallback(req,e);
 if(pathname==='/api/config'&&method==='GET')return asJson({configured:configured(e),cafeId:e.NAVER_CAFE_ID||null});
 if(pathname.startsWith('/api/')||pathname==='/auth/logout'){
  if(method!=='GET'&&!verifyOrigin(req))return problem('요청 출처를 확인할 수 없습니다.',403);
  if(pathname==='/api/me'&&method==='GET'){if(!configured(e))return asJson({configured:false,user:null});const me=await session(req,e);return asJson({configured:true,user:me?{id:me.id,nickname:me.nickname,admin:me.admin}:null});}
  if(!configured(e))return problem('카페 서버 설정이 완료되지 않았습니다.',503);
  const user=await session(req,e);if(!user)return problem('네이버 로그인 후 사용하세요.',401);
  if(pathname==='/auth/logout'&&method==='POST')return logout(req,e);
  if(pathname==='/api/deals'&&method==='GET'){const scope=new URL(req.url).searchParams.get('scope');const rows=scope==='pending'&&user.admin?await e.DB.prepare('SELECT * FROM ph_deals WHERE status=? ORDER BY created_at DESC LIMIT 50').bind('pending').all():await e.DB.prepare('SELECT * FROM ph_deals WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(user.id).all();return asJson({deals:(rows.results||[]).map(safeDeal)});}
  if(pathname==='/api/deals'&&method==='POST')return submit(req,e,user);
  const action=pathname.match(/^\/api\/deals\/([a-z0-9-]{36})\/(approve|reject)$/i);if(action&&method==='POST')return review(req,e,user,action[1],action[2]);
  return problem('API 경로가 없습니다.',404);
 }
 if(e.ASSETS)return e.ASSETS.fetch(req);return problem('정적 파일이 배포되지 않았습니다.',404);
}
export default {async fetch(req,env){try{return await router(req,env);}catch(err){return problem('서버 처리 중 오류가 발생했습니다. 관리자에게 문의하세요.',500);}}};
export {configured,router,encodedImage,naverBody,safeDeal};
