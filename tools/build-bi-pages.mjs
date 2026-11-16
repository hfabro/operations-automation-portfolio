// Canonical simulations stay in bi-prototype/preview; publish only this explicit static projection.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,basename,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const BI_PAGES=[
 {source:'showcase.html',output:'index.html',label:'Business Intelligence',title:'Connected Business Intelligence'},
 {source:'machine-intelligence.html',output:'machine-intelligence.html',label:'Machine intelligence',title:'Machine intelligence — signal to business action'},
 {source:'connected-journey.html',output:'connected-journey.html',label:'Connected purchasing',title:'Connected purchasing — one coding trail'},
 {source:'business-report.html',output:'business-report.html',label:'Purchasing intelligence',title:'Purchasing intelligence — inspectable BI'},
 {source:'work-execution.html',output:'work-execution.html',label:'Work completion',title:'Work execution — completion and verification'},
 {source:'invoice-batch.html',output:'invoice-batch.html',label:'Connected invoice intake',title:'Connected invoice intake — multi-line batch'},
 {source:'data-and-methods.html',output:'data-and-methods.html',label:'Data and methods',title:'Data and methods — inspect the business model'},
 {source:'guided-entry.html',output:'guided-entry.html',label:'Governed coding',title:'Governed purchasing — consistent cost coding'},
 {source:'invoice-intake.html',output:'invoice-intake.html',label:'Invoice sorting',title:'Invoice sorting — owned review queues'},
 {source:'erp-controls.html',output:'erp-controls.html',label:'ERP cost controls',title:'ERP cost controls — allocations and approvals'},
 {source:'index.html',output:'historical-analysis.html',label:'Historical P2P research',title:'Historical purchasing analysis — BPI Challenge 2019'}
];
const origin='https://hfabro.github.io/operations-automation-portfolio/';
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const hash=s=>createHash('sha256').update(s).digest('hex');
const text=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const routeMap=new Map(BI_PAGES.map(p=>[p.source,p.output]));
const rewriteRoute=ref=>{const m=ref.match(/^([^?#]+)([?#].*)?$/);return m&&routeMap.has(m[1])?routeMap.get(m[1])+(m[2]||''):ref;};

function header(page){return `<header class="site-header" data-header><div class="container header-inner">
<a class="brand" href="../"><span class="brand-mark" aria-hidden="true">DF</span><span class="brand-copy"><strong>David H. Fabro</strong><small>Operations Automation &amp; Digital Transformation</small></span></a>
<nav class="primary-nav" id="primary-nav" aria-label="Primary navigation" data-nav><a href="../work/">Work</a><a href="../demos/">Demos</a><a href="../smart-factory/">Smart Factory</a><a href="./" aria-current="${page.output==='index.html'?'page':'location'}">Business Intelligence</a><a href="../about/">About</a><a href="../resume/">Resume</a><a href="../#contact">Contact</a></nav>
<button class="nav-toggle" type="button" data-nav-toggle aria-controls="primary-nav" aria-expanded="false" aria-label="Open navigation menu"><span class="nav-toggle-icon" aria-hidden="true"><i></i><i></i></span><span class="nav-toggle-label" data-nav-label>Menu</span></button>
<button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch color theme" aria-pressed="false"><span aria-hidden="true">◐</span><span class="theme-label">Theme</span></button>
</div></header>`;}
function footer(){return `<footer class="site-footer"><div class="container bi-footer"><a href="../">David H. Fabro · Portfolio</a><nav aria-label="Business intelligence footer"><a href="./">All BI demonstrations</a><a href="data-and-methods.html">Data model and methods</a><a href="historical-analysis.html#methods">Historical source and methods</a><a href="data-attribution.txt">Research data license</a></nav><p>Company records and outcomes are simulated. Historical research is separately attributed.</p><p>© 2026 David H. Fabro · Original portfolio material. Third-party data retain their own license.</p></div></footer>`;}

export function buildPlan(root){
 const sourceRoot=resolve(root,'tools/bi-prototype/preview'),plan=new Map(),entries=[],assets=new Set();
 const add=(source,output,original,content)=>{if(plan.has(output))throw Error('Duplicate generated path: '+output);plan.set(output,content);entries.push({source,output,sourceSha256:hash(original),sha256:hash(content)});};
 for(const page of BI_PAGES){
  const source='tools/bi-prototype/preview/'+page.source,original=text(resolve(root,source));
  for(const [,ref]of original.matchAll(/(?:href|src)="([^\"]+\.(?:js|css|csv))"/g)){if(!/^[a-z0-9-]+\.(?:js|css)$/.test(ref)&&ref!=='invoice-sample.csv')throw Error('Unexpected simulation asset: '+ref);assets.add(ref);}
  if((original.match(/<header>/g)||[]).length!==1||(original.match(/<footer>/g)||[]).length!==1)throw Error('Unexpected simulation framing: '+page.source);
  let html=original.replace(/\b(href|src)="([^\"]+)"/g,(_,attribute,ref)=>`${attribute}="${rewriteRoute(ref)}"`);
  html=html.replace(/<meta name="robots"[^>]+>/,'').replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(page.title)} | David H. Fabro</title>`);
  html=html.replace('<link rel="stylesheet"',`<script src="../scripts/theme.js?v=20261115.1"></script><link rel="stylesheet" href="../styles.css?v=20260926.3"><link rel="stylesheet"`);
  const canonical=origin+'business-intelligence/'+(page.output==='index.html'?'':page.output),description=html.match(/<meta name="description" content="([^\"]+)"/)?.[1];
  if(!description)throw Error('Missing source description: '+page.source);
  html=html.replace('</head>',`<meta name="robots" content="index, follow"><meta name="referrer" content="no-referrer"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#f4f5f1"><link rel="canonical" href="${canonical}"><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml"><meta property="og:type" content="website"><meta property="og:title" content="${escape(page.title)} | David H. Fabro"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${origin}assets/og.png"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="../assets/bi-discovery.css?v=20261115.1"><link rel="stylesheet" href="bi-shell.css"><script src="../scripts/app.js?v=20261115.1" defer></script></head>`);
  html=html.replace('<body>',`<body class="bi-public-page" data-bi-page="${page.output}">`).replace(/<header>[\s\S]*?<\/header>/,header(page)).replace(/<footer>[\s\S]*?<\/footer>/,footer());
  const crumbs=`<nav class="bi-breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="../">Home</a></li>${page.output==='index.html'?'<li aria-current="page">Business Intelligence</li>':`<li><a href="./">Business Intelligence</a></li><li aria-current="page">${escape(page.label)}</li>`}</ol></nav>`;
  const fallback=page.output==='index.html'?'':`<noscript><p class="bi-noscript">JavaScript is needed to operate this simulation. The business scenario and methods remain readable. <a href="./">Explore all BI demonstrations</a>.</p></noscript>`;
  if(!html.includes('<main id="main">'))throw Error('Unexpected main landmark: '+page.source);
  html=html.replace('<main id="main">','<main id="main">'+crumbs+fallback);
  if(/(?:href|src)="[^\"]*tools\//.test(html))throw Error('Development route leaked into public page: '+page.source);
  add(source,'business-intelligence/'+page.output,original,'<!-- Generated by tools/build-bi-pages.mjs; edit the canonical simulation source. -->\n'+html.trimEnd()+'\n');
 }
 for(const name of [...assets].sort()){
  const source='tools/bi-prototype/preview/'+name,original=text(resolve(sourceRoot,name));
  const content=extname(name)==='.js'?original.replace(/(["'])([a-z0-9-]+\.html(?:[?#][^"']*)?)\1/g,(_,quote,ref)=>quote+rewriteRoute(ref)+quote):original;
  add(source,'business-intelligence/'+name,original,content.trimEnd()+'\n');
 }
 const shell=text(resolve(root,'tools/bi-shell.css'));add('tools/bi-shell.css','business-intelligence/bi-shell.css',shell,shell.trimEnd()+'\n');
 const attribution=text(resolve(root,'tools/bi-prototype/THIRD-PARTY-DATA.md'));
 const notice='Public research-data notice\n\nThe source-derived file on this route is p2p-data.js; historical-analysis.html presents the attributed analysis. The remaining company simulations are independently fictional.\n\n'+attribution;
 add('tools/bi-prototype/THIRD-PARTY-DATA.md','business-intelligence/data-attribution.txt',attribution,notice.trimEnd()+'\n');
 plan.set('tools/bi-public-manifest.json',JSON.stringify({version:1,generator:'tools/build-bi-pages.mjs',normalization:'UTF-8 without BOM; LF line endings',pages:BI_PAGES,files:entries.sort((a,b)=>a.output.localeCompare(b.output))},null,2)+'\n');
 return plan;
}

export function checkPlan(root,plan){const errors=[];for(const [name,expected]of plan)if(!existsSync(resolve(root,name))||text(resolve(root,name))!==expected)errors.push(name);const output=resolve(root,'business-intelligence');if(existsSync(output))for(const name of readdirSync(output))if(!plan.has('business-intelligence/'+name))errors.push('Unexpected generated file: business-intelligence/'+name);return errors;}
export function writePlan(root,plan){for(const [name,content]of plan){const target=resolve(root,name);if(!target.startsWith(resolve(root)+sep))throw Error('Output escaped root.');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content,'utf8');}}
const ownFile=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===ownFile){
 const root=resolve(dirname(ownFile),'..'),plan=buildPlan(root);
 if(process.argv.includes('--check')){const errors=checkPlan(root,plan);if(errors.length){console.error('BI generated output differs: '+errors.join(', '));process.exitCode=1;}else console.log('BI projection current: '+BI_PAGES.length+' pages and '+(plan.size-BI_PAGES.length-1)+' approved assets/notices.');}
 else{writePlan(root,plan);console.log('Generated '+BI_PAGES.length+' BI portfolio pages; canonical business rules preserved.');}
}
