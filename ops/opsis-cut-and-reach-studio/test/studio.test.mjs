import test from 'node:test';
import assert from 'node:assert/strict';
import { assemble, TimelineStore } from '../timeline-engine.mjs';
import { scoreLead, trackAttribution, affiliateLink, validatePublication, revenuePolicy } from '../inbound-crm-engine.mjs';
import { createStudioServer } from '../server.mjs';

const input = { voice: 'Aoede', duration_us: 5_000_000, words: [{text:'Hello',position_us:0,duration_us:500_000},{text:'world',position_us:1_000_000,duration_us:500_000}] };
test('six stages produce word captions and silence cuts in integer microseconds', () => {
 const plan = assemble(input); assert.equal(plan.stages.length, 6); assert.equal(plan.captions.length, 2); assert.deepEqual(plan.removed_silences, [{position_us:500_000,duration_us:500_000},{position_us:1_500_000,duration_us:3_500_000}]); assert.equal(plan.bgm.duck_db, -14); assert.equal(plan.canvas.width, 1080);
});
test('duration and voices fail closed', () => {
 for (const voice of ['pyttsx3','espeak','sapi','unknown']) assert.throws(() => assemble({...input,voice}));
 for (const voice of ['Aoede','Kore','af_heart','af_bella','LFM3-Omni-2B']) assert.doesNotThrow(() => assemble({...input,voice}));
 assert.throws(() => assemble({...input,duration_us:58_500_001})); assert.throws(() => assemble({...input,duration_us:1.5}));
});
test('revision, request id and dry run are enforced', () => {
 const store = new TimelineStore(); const p = {input,expected_timeline_revision:0,request_id:'one'};
 assert.equal(store.apply({...p,dry_run:true}).revision,0); assert.equal(store.apply(p).revision,1); assert.equal(store.apply(p).revision,1);
 assert.throws(() => store.apply({...p,request_id:'two'})); assert.throws(() => store.apply({...p,input:{...input,voice:'Kore'}}));
});
test('lead score and attribution are bounded and isolated', () => {
 assert.equal(scoreLead({email:'a@b.com',intent:'corporate_pickup',consent:true}),80); assert.equal(scoreLead({}),0);
 assert.deepEqual(trackAttribution('onlinerecycle.net','https://onlinerecycle.net/?utm_source=news&utm_medium=email'),{pillar:'recycling',utm_source:'news',utm_medium:'email',utm_campaign:''});
 assert.throws(() => trackAttribution('onlinerecycle.net','https://darlink.ai/?utm_source=x'));
 assert.equal(revenuePolicy.charity_deduction_ceiling_percentage,10);
});
test('adult links require private verified adult context and cannot enter publication', () => {
 assert.throws(() => affiliateLink({adult_verified:false,destination:'private'}));
 assert.throws(() => affiliateLink({adult_verified:true,destination:'youtube'}));
 assert.match(affiliateLink({adult_verified:true,destination:'private'}), /^https:\/\/darlink\.ai/);
 assert.throws(() => validatePublication({title:'darlink.ai',approved:true,method:'youtube-data-api-v3',duration_us:1}));
 assert.throws(() => validatePublication({title:'safe',approved:true,method:'playwright',duration_us:1}));
});
test('local server exposes plans but no upload endpoint', async () => {
 const server = createStudioServer(); await new Promise(r => server.listen(0,'127.0.0.1',r));
 try { const port=server.address().port; const res=await fetch(`http://127.0.0.1:${port}/`); assert.equal(res.status,200); assert.match(await res.text(), /Cut &amp; Reach/); const upload=await fetch(`http://127.0.0.1:${port}/upload`,{method:'POST'}); assert.equal(upload.status,404); }
 finally { await new Promise(r => server.close(r)); }
});

