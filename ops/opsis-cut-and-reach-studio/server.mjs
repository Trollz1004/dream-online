import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { TimelineStore } from './timeline-engine.mjs';
import { scoreLead, trackAttribution, verifyPartnerConfig, planSocialStrike, planMusaCampaign, scoreLeadForgeBatch } from './inbound-crm-engine.mjs';
const html=await readFile(new URL('./public/index.html',import.meta.url));
const partners=JSON.parse(await readFile(new URL('./affiliate-partners.json',import.meta.url),'utf8'));
async function json(req){let raw=''; for await (const chunk of req){raw+=chunk; if(raw.length>100_000)throw new Error('Request too large');} return raw?JSON.parse(raw):{};}
export function createStudioServer() {
 const store=new TimelineStore(); const token=randomBytes(32).toString('hex');
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
  const host=req.headers.host || ''; if(!/^127\.0\.0\.1:\d+$/.test(host)) {res.writeHead(403).end(); return;}
  if(req.method==='GET' && req.url==='/') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(html);return;}
  if(req.method==='GET' && req.url==='/api/session') {res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({token}));return;}
  const routes=['/api/timeline','/api/lead','/api/stage-social','/api/verify-partners','/api/stage-musa','/api/leadforge'];
  if(req.method!=='POST' || !routes.includes(req.url)) {res.writeHead(404).end();return;}
  if(req.headers.origin!==`http://${host}` || req.headers['x-studio-token']!==token || !/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) {res.writeHead(403).end();return;}
  try {
   const body=await json(req); let result;
   if(req.url==='/api/timeline') result=store.apply(body);
   else if(req.url==='/api/lead') result={score:scoreLead(body.lead||{}),attribution:trackAttribution(body.site,body.url)};
   else if(req.url==='/api/stage-social') result=planSocialStrike(body||{});
   else if(req.url==='/api/verify-partners') result={valid:true,partners:verifyPartnerConfig(partners).map(p=>({...p,token:'XXXX'}))};
   else if(req.url==='/api/stage-musa') result=planMusaCampaign(body||{});
   else {const leads=Array.isArray(body.leads)?body.leads:[]; const tier=body.tier||'starter'; result=scoreLeadForgeBatch(tier,leads);}
   res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));
  } catch {res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Request rejected. Check the input, disclosure, duration, voice, and revision.'}));}
 });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) createStudioServer().listen(8390,'127.0.0.1',()=>console.log('OPSis studio listening on 127.0.0.1:8390'));
