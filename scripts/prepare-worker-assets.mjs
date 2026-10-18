import {cp,mkdir,readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),target=path.join(root,'worker','public');
await mkdir(target,{recursive:true});
for(const f of await readdir(root)){if(/\.(?:html|js|webmanifest)$/i.test(f)&&!f.startsWith('_'))await cp(path.join(root,f),path.join(target,f));}
await cp(path.join(root,'assets'),path.join(target,'assets'),{recursive:true});
console.log('Worker 정적 웹 자산 준비 완료:',target);
