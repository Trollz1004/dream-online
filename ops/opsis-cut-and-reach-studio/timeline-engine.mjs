import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const MAX_SHORT_US = 58_500_000;
const voices = new Set(['Aoede','Kore','af_heart','af_bella','LFM3-Omni-2B']);
const fillers = new Set(['um','uh','erm']);
function micros(value, name, allowZero = true) {
 if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new Error(`${name} must be a nonnegative integer in microseconds`);
}
export function assemble(input) {
 if (!input || !voices.has(input.voice)) throw new Error('Voice is not an allowed natural voice');
 micros(input.duration_us,'duration_us',false);
 if (input.duration_us > MAX_SHORT_US) throw new Error('Short exceeds 58.5 second limit');
 if (!Array.isArray(input.words) || input.words.length === 0) throw new Error('Timestamped transcript required');
 const words = input.words.map((w) => {
  if (typeof w.text !== 'string' || !w.text.trim() || w.text.length > 200 || /\s/.test(w.text.trim())) throw new Error('Each transcript entry must be one word');
  micros(w.position_us,'position_us'); micros(w.duration_us,'duration_us',false);
  if (w.position_us + w.duration_us > input.duration_us) throw new Error('Word exceeds source duration');
  return {text:w.text.trim(),position_us:w.position_us,duration_us:w.duration_us};
 }).sort((a,b) => a.position_us-b.position_us);
 for (let i=1;i<words.length;i++) if (words[i].position_us < words[i-1].position_us+words[i-1].duration_us) throw new Error('Overlapping transcript words');
 const removed = []; let cursor = 0;
 for (const w of words) {
  if (w.position_us-cursor > 250_000) removed.push({position_us:cursor,duration_us:w.position_us-cursor});
  if (fillers.has(w.text.toLowerCase().replace(/[^a-z]/g,''))) removed.push({position_us:w.position_us,duration_us:w.duration_us});
  cursor=w.position_us+w.duration_us;
 }
 if (input.duration_us-cursor > 250_000) removed.push({position_us:cursor,duration_us:input.duration_us-cursor});
 const captions = words.filter(w => !fillers.has(w.text.toLowerCase().replace(/[^a-z]/g,''))).map(w => ({...w,position_us:w.position_us-removed.filter(r=>r.position_us+r.duration_us<=w.position_us).reduce((sum,r)=>sum+r.duration_us,0), y:0.0432,border_width:0.06}));
 if (!captions.length) throw new Error('No spoken words remain');
 // Density is a deterministic heuristic, not a claim about viewer retention.
 let hook = {position_us:words[0].position_us, duration_us:Math.min(3_000_000,input.duration_us-words[0].position_us),word_count:0};
 for (const w of words) { const start=Math.min(w.position_us,Math.max(0,input.duration_us-3_000_000)); const count=words.filter(x=>x.position_us>=start && x.position_us<start+3_000_000).length; if(count>hook.word_count) hook={position_us:start,duration_us:Math.min(3_000_000,input.duration_us-start),word_count:count}; }
 const duration_us=input.duration_us-removed.reduce((sum,r)=>sum+r.duration_us,0);
 return {stages:['material_understanding','highlight','script','speaker','lvc','align_bgm_with_video'], source_duration_us:input.duration_us,duration_us,voice:input.voice,hook, candidates:['Direct','Question','Key point'].map(style=>({style,narration:captions.map(w=>w.text).join(' ')})),removed_silences:removed.filter(r=>!words.some(w=>w.position_us===r.position_us && w.duration_us===r.duration_us)),cuts:removed,captions,canvas:{width:1080,height:1920,fps:60,hook_y:0.6544,caption_y:0.0432,cta_y:-0.5712},bgm:{duck_db:-14,regions:captions.map(w=>({position_us:w.position_us,duration_us:w.duration_us}))}, notice:'Edit decision plan only; no media is rendered.'};
}
export class TimelineStore {
 #revision=0; #requests=new Map(); #plan=null;
 apply({input,expected_timeline_revision,request_id,dry_run=false}) {
  if (typeof request_id !== 'string' || !request_id.trim() || request_id.length>128 || typeof dry_run !== 'boolean') throw new Error('Invalid request');
  const fingerprint=JSON.stringify({input,expected_timeline_revision});
  const previous=this.#requests.get(request_id);
  if (previous) { if(previous.fingerprint!==fingerprint) throw new Error('Request ID already used'); return structuredClone(previous.result); }
  if (expected_timeline_revision!==this.#revision) throw new Error('Timeline revision conflict');
  const plan=assemble(input); const result={revision:this.#revision+(dry_run?0:1),dry_run,plan};
  if (!dry_run) {this.#revision++; this.#plan=plan; this.#requests.set(request_id,{fingerprint,result:structuredClone(result)});}
  return structuredClone(result);
 }
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 try { if(process.argv[2]!=='--dry-run' || !process.argv[3]) throw new Error('Usage: node timeline-engine.mjs --dry-run input.json'); console.log(JSON.stringify(assemble(JSON.parse(await readFile(process.argv[3],'utf8'))),null,2)); }
 catch(e) { console.error(e.message); process.exitCode=1; }
}
