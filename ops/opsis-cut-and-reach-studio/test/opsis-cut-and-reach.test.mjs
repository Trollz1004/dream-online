import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyPartnerConfig, planSocialStrike, planMusaCampaign, scoreLeadForgeBatch, maskSecrets, assertCustomerCopy, scoreLead, judgeApproveAndDispatch, TRUST_LEVEL_MAX_JUDGES } from '../inbound-crm-engine.mjs';
import { createStudioServer, startStudioServer, resolveStudioBindHost, resolveStudioPort, validateStudioBindConfig, isAllowedStudioHost, isAllowedStudioOrigin } from '../server.mjs';

test('partner registry validates isolated URLs and creator split math', () => {
 const registry=verifyPartnerConfig(JSON.parse(readFileSync(new URL('../affiliate-partners.json',import.meta.url))));
 assert.equal(registry.length,6); const slugs=Object.fromEntries(registry.filter(p=>p.slug).map(p=>[p.slug,p]));
 assert.equal(slugs['bot-slayer'].registration_url,'https://youandinotai.com/register?ref=bot-slayer');
 assert.equal(slugs['human-only-hub'].creator_share_cents,5000); assert.equal(slugs['human-only-hub'].platform_keeps_cents,5000);
 assert.throws(()=>verifyPartnerConfig([{partner:'x',slug:'bad',context:'youtube'}]));
});
test('social strike stages disclosed drafts and never posts', () => {
 const d=planSocialStrike(); assert.equal(d.auto_post,false); assert.equal(d.drafts.length,5);
 assert.match(d.drafts[0].body,/I built|we built|honest product|affiliate|50%/i);
 assert.doesNotThrow(()=>planSocialStrike({surface:'r/Tinder'})); assert.throws(()=>planSocialStrike({surface:'youtube'}));
 assert.throws(()=>planSocialStrike({surface:'r/Tinder',body:'I found this accidentally today'}));
 assert.match(JSON.stringify(d),/manual_review_required/);
});
test('Musa cards are recycling only and have no mission wording', () => {
 const c=planMusaCampaign(); assert.equal(c.channels.join(','),'instagram,facebook'); assert.equal(c.auto_post,false);
 assert.match(c.cards[0].headline,/e-waste|pickup|refurb/i); assertCustomerCopy(c.cards.map(x=>x.headline+' '+x.body).join(' '));
 assert.throws(()=>planMusaCampaign({copy:'This funds our mission and charity'}));
});
test('LeadForge pricing stays local and deterministic with zero LLM spend', () => {
 assert.equal(scoreLeadForgeBatch('starter',[]).tier.llm_cost_usd,0); assert.equal(scoreLeadForgeBatch('pro',new Array(30).fill({email:'a@b.com'})).scored.length,30);
 assert.throws(()=>scoreLeadForgeBatch('starter',new Array(11).fill({email:'a@b.com'})));
});
test('secrets are masked and customer copy has no mission language', () => {
 assert.equal(maskSecrets({key:'sk-secret-123',nested:'Bearer abcdefghijklmnop'}).key,'XXXX');
 assert.throws(()=>assertCustomerCopy('support mission charity donation'));
 assert.doesNotThrow(()=>assertCustomerCopy('verified accounts, safer matching, direct support'));
});
test('Trust Level Max judges (Gemini 4 High Reasoning and Opus 5.5 Fable) can approve and dispatch zero-cost work', () => {
 assert.deepEqual(TRUST_LEVEL_MAX_JUDGES,['gemini-4-high-reasoning','opus-5.5-fable']);
 const g=judgeApproveAndDispatch({judge_lane:'gemini-4-high-reasoning',source_agent:'emergent',item_type:'partner_email',cost_usd:0,copy:'Verified accounts and 50% creator affiliate splits.'});
 assert.equal(g.approved,true); assert.equal(g.trust_level,'MAX'); assert.equal(g.dispatched,true);
 const f=judgeApproveAndDispatch({judge_lane:'opus-5.5-fable',source_agent:'musa',item_type:'musa_campaign',cost_usd:0,copy:'Electronics pickup and AI-assisted intake.'});
 assert.equal(f.approved,true); assert.equal(f.trust_level,'MAX');
 assert.throws(()=>judgeApproveAndDispatch({judge_lane:'untrusted-bot',item_type:'partner_email'}));
 assert.throws(()=>judgeApproveAndDispatch({judge_lane:'gemini-4-high-reasoning',item_type:'partner_email',cost_usd:10}));
});
 test('server exposes four one-click staging endpoints and rejects automation', async () => {
 const server=createStudioServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try { const loopback=['127','0','0','1'].join('.'); const base=`http://${loopback}:${server.address().port}`; const session=await (await fetch(base+'/api/session')).json();
 for(const path of ['/api/stage-social','/api/verify-partners','/api/stage-musa','/api/leadforge']) {
  const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','Origin':base,'X-Studio-Token':session.token},body:'{}'}); assert.notEqual(r.status,404); const body=await r.json(); assert.match(JSON.stringify(body),/manual_review_required|valid|approved_count|auto_post|price_usd_per_month|llm_cost_usd/i);
 }
 const autopost=await fetch(base+'/api/stage-social',{method:'POST',headers:{'Content-Type':'application/json','Origin':base,'X-Studio-Token':session.token},body:'{"auto_post":true}'}); assert.equal(autopost.status,400); }
 finally { await new Promise(r=>server.close(r)); }
});
test('server defaults to 127.0.0.1 with warning when no token is set, resolves 0.0.0.0:8390 with token, and accepts Alienware and T5500 Host/Origin', () => {
 assert.equal(resolveStudioBindHost({ OPSIS_STUDIO_TOKEN: '', FLEET_SHARED_TOKEN: '' }), '127.0.0.1');
 assert.equal(resolveStudioBindHost({ OPSIS_STUDIO_TOKEN: 'studio-secret' }), '0.0.0.0');
 assert.equal(resolveStudioBindHost({ FLEET_SHARED_TOKEN: 'fleet-secret' }), '0.0.0.0');
 assert.equal(resolveStudioBindHost({ OPSIS_STUDIO_BIND: '127.0.0.1', OPSIS_STUDIO_TOKEN: 'studio-secret' }), '127.0.0.1');
 assert.equal(resolveStudioBindHost({ OPSIS_STUDIO_BIND: '0.0.0.0' }), '0.0.0.0');
 const noTokenCfg = validateStudioBindConfig({ OPSIS_STUDIO_TOKEN: '', FLEET_SHARED_TOKEN: '' });
 assert.equal(noTokenCfg.host, '127.0.0.1');
 assert.match(String(noTokenCfg.warning), /OPSIS_STUDIO_TOKEN/);
 assert.match(String(noTokenCfg.warning), /FLEET_SHARED_TOKEN/);
 assert.throws(() => validateStudioBindConfig({ OPSIS_STUDIO_BIND: '0.0.0.0', OPSIS_STUDIO_TOKEN: '', FLEET_SHARED_TOKEN: '' }), /OPSIS_STUDIO_TOKEN/i);
 assert.throws(() => validateStudioBindConfig({ OPSIS_STUDIO_BIND: '192.168.0.40', OPSIS_STUDIO_TOKEN: '', FLEET_SHARED_TOKEN: '' }), /OPSIS_STUDIO_TOKEN/i);
 assert.throws(() => startStudioServer({ OPSIS_STUDIO_BIND: '0.0.0.0', OPSIS_STUDIO_TOKEN: '', FLEET_SHARED_TOKEN: '' }), /OPSIS_STUDIO_TOKEN/i);
 assert.equal(resolveStudioPort({}), 8390);
 assert.equal(isAllowedStudioHost('192.168.0.40:8390'), true);
 assert.equal(isAllowedStudioHost('192.168.0.15:8390'), true);
 assert.equal(isAllowedStudioHost('evil.example.com:8390'), false);
 assert.equal(isAllowedStudioOrigin('http://192.168.0.40:8390', '192.168.0.40:8390'), true);
 assert.equal(isAllowedStudioOrigin('http://192.168.0.15:8390', '192.168.0.40:8390'), true);
 assert.equal(isAllowedStudioOrigin('http://evil.example.com:8390', '192.168.0.40:8390'), false);
});

test('studio live-start without token binds 127.0.0.1, emits one warning naming missing setting, and keeps loopback routes working', async () => {
 const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));
 const loopback = ['127', '0', '0', '1'].join('.');
 const child = spawn(process.execPath, [serverPath], {
  env: {
   ...process.env,
   PORT: '0',
   OPSIS_STUDIO_PORT: '0',
   OPSIS_STUDIO_BIND: '',
   OPSIS_STUDIO_TOKEN: '',
   FLEET_SHARED_TOKEN: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
 });
 let stdout = '';
 let stderr = '';
 const listenRe = new RegExp(`listening on ${loopback.replace(/\./g, '\\.')}:(\\d+)`);
 try {
  const port = await new Promise((resolve, reject) => {
   const timer = setTimeout(() => reject(new Error(`Timed out waiting for studio start: stdout=${stdout} stderr=${stderr}`)), 10000);
   child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
    const m = listenRe.exec(stdout);
    if (m) {
     clearTimeout(timer);
     resolve(Number(m[1]));
    }
   });
   child.stderr.on('data', (chunk) => { stderr += String(chunk); });
   child.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`studio exited early (${code}): stdout=${stdout} stderr=${stderr}`));
   });
  });
  const warningLines = stderr.trim().split(/\r?\n/).filter(Boolean);
  assert.equal(warningLines.length, 1);
  assert.match(warningLines[0], /OPSIS_STUDIO_TOKEN/);
  assert.match(warningLines[0], /FLEET_SHARED_TOKEN/);
  assert.match(warningLines[0], /127\.0\.0\.1/);

  const base = `http://${loopback}:${port}`;
  const sessionRes = await fetch(`${base}/api/session`);
  assert.equal(sessionRes.status, 200);
  const session = await sessionRes.json();
  assert.ok(session.token);

  const stageRes = await fetch(`${base}/api/stage-social`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json', Origin: base, 'X-Studio-Token': session.token },
   body: '{}',
  });
  assert.equal(stageRes.status, 200);
 } finally {
  child.kill();
  await new Promise((resolve) => child.once('exit', resolve));
 }
});

test('studio with OPSIS_STUDIO_TOKEN or FLEET_SHARED_TOKEN resolves 0.0.0.0 and enforces Bearer / X-Fleet-Token on /api/session and POST /api/*', async () => {
 const env = { OPSIS_STUDIO_BIND: '0.0.0.0', OPSIS_STUDIO_TOKEN: 'studio-lan-secret', FLEET_SHARED_TOKEN: 'fleet-shared-secret' };
 assert.equal(validateStudioBindConfig(env).host, '0.0.0.0');
 const server = createStudioServer({ env });
 const loopback = ['127', '0', '0', '1'].join('.');
 await new Promise((resolve) => server.listen(0, loopback, resolve));
 try {
  const base = `http://${loopback}:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/session`)).status, 401);
  assert.equal((await fetch(`${base}/api/session`, { headers: { Authorization: 'Bearer wrong-token' } })).status, 401);

  const bearerSession = await fetch(`${base}/api/session`, { headers: { Authorization: 'Bearer studio-lan-secret' } });
  assert.equal(bearerSession.status, 200);
  const fleetSession = await fetch(`${base}/api/session`, { headers: { 'X-Fleet-Token': 'fleet-shared-secret' } });
  assert.equal(fleetSession.status, 200);

  const unauthedPost = await fetch(`${base}/api/stage-social`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json', Origin: base },
   body: '{}',
  });
  assert.equal(unauthedPost.status, 401);

  const wrongTokenPost = await fetch(`${base}/api/stage-social`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json', 'X-Fleet-Token': 'wrong-token' },
   body: '{}',
  });
  assert.equal(wrongTokenPost.status, 401);

  const bearerPost = await fetch(`${base}/api/stage-social`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json', Authorization: 'Bearer studio-lan-secret' },
   body: '{}',
  });
  assert.equal(bearerPost.status, 200);

  const fleetPost = await fetch(`${base}/api/stage-social`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json', 'X-Fleet-Token': 'fleet-shared-secret' },
   body: '{}',
  });
  assert.equal(fleetPost.status, 200);

  const badOriginPost = await fetch(`${base}/api/stage-social`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example.com', Authorization: 'Bearer studio-lan-secret' },
   body: '{}',
  });
  assert.equal(badOriginPost.status, 403);
 } finally {
  await new Promise((resolve) => server.close(resolve));
 }
});


