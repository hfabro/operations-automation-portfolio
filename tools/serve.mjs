// Loopback-only preview. Private inputs, Git metadata, tools, and temporary files are never served.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf','.xml':'application/xml','.txt':'text/plain'};
createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path.includes('\\'))throw Error('blocked');
  if(path.split('/').some(s=>s.startsWith('.')||['references-private','tmp','tools'].includes(s)))throw Error('blocked');
  let target=resolve(root,'.'+path);
  if(!target.startsWith(resolve(root)+sep)&&target!==resolve(root))throw Error('blocked');
  if((await stat(target)).isDirectory())target=resolve(target,'index.html');
  if(!types[extname(target)])throw Error('blocked');
  const body=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:4173/'));
