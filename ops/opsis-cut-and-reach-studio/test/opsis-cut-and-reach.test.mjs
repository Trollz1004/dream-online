import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyPartnerConfig, planSocialStrike, planMusaCampaign, scoreLeadForgeBatch, maskSecrets, assertCustomerCopy, scoreLead } from '../inbound-crm-engine.mjs';
import { createStudioServer } from '../server.mjs';

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
test('server exposes four one-click staging endpoints and rejects automation', async () => {
 const server=createStudioServer(); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try { const base=`http://127.0.0.1:${server.address().port}`; const session=await (await fetch(base+'/api/session')).json();
 for(const path of ['/api/stage-social','/api/verify-partners','/api/stage-musa','/api/leadforge']) {
  const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','Origin':base,'X-Studio-Token':session.token},body:'{}'}); assert.notEqual(r.status,404); const body=await r.json(); assert.match(JSON.stringify(body),/manual_review_required|valid|approved_count|auto_post|price_usd_per_month|llm_cost_usd/i);
 }
 const autopost=await fetch(base+'/api/stage-social',{method:'POST',headers:{'Content-Type':'application/json','Origin':base,'X-Studio-Token':session.token},body:'{"auto_post":true}'}); assert.equal(autopost.status,400); }
 finally { await new Promise(r=>server.close(r)); }
});


