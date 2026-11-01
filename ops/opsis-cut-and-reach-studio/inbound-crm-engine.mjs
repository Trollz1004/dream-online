export const revenuePolicy=Object.freeze({revenue_model:'FOR_PROFIT_LLC',founder_percentage:90,charity_deduction_ceiling_percentage:10,notice:'Internal planning assumptions, not tax advice or a determination of taxable income.'});
export const TRUST_LEVEL_MAX_JUDGES=Object.freeze(['gemini-4-high-reasoning','opus-5.5-fable']);
export const LEADFORGE_TIERS=Object.freeze({starter:{price_usd_per_month:29,leads_per_day:10,model:'muse-spark-open',gateway:'http://192.168.0.15:20128/v1',llm_cost_usd:0},pro:{price_usd_per_month:99,leads_per_day:50,model:'muse-spark-open',gateway:'http://192.168.0.15:20128/v1',llm_cost_usd:0}});
const hosts=new Map([['onlinerecycle.net','recycling'],['dream-online.net','dream'],['opencollective.com','dream'],['youandinotai.com','dating'],['youtube.com','media'],['youtu.be','media']]);
const allowedSlugs=new Set(['bot-slayer','skeptic-squad','tech-unfiltered','dating-exposed','human-only-hub']);
const bannedCopy=/\b(charity|donation|fundrais\w*|shriners|mission|foundation|non[- ]?profit)\b/i;
function domain(host) { return host.toLowerCase().replace(/^www\./,''); }
function pillar(url) {const h=domain(url.hostname); if(!hosts.has(h)) throw new Error('Unrecognized attribution host'); if(h==='opencollective.com' && !/^\/dream-online(?:\/|$)/.test(url.pathname)) throw new Error('Not the Dream Online collective'); return hosts.get(h);}
function validPublicUrl(value) {const url=new URL(value); if(url.protocol!=='https:'||url.username||url.password) throw new Error('HTTPS URL required'); return url;}
export function assertCustomerCopy(text) {if(typeof text!=='string'||!text||text.length>20_000) throw new Error('Public copy required'); if(bannedCopy.test(text)) throw new Error('Customer-facing copy may not include mission or charity wording'); return true;}
export function maskSecrets(value) {
 if(typeof value==='string') return /(api[_-]?key|token|secret|bearer|password|authorization)/i.test(value)||value.length>=24 ? 'XXXX' : value;
 if(Array.isArray(value)) return value.map(maskSecrets);
 if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>{const q=maskSecrets(v); if(q==='XXXX') return [k,q]; return [k,value&&typeof v==='object'?undefined:q]}));
 return value;
}
export function scoreLead(lead) {
 let score=0; if(typeof lead.email==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) score+=20;
 if(lead.consent===true) score+=20;
 if(['corporate_pickup','purchase','crowdfunding','partnership'].includes(lead.intent)) score+=40;
 if(lead.follow_up_requested===true) score+=20;
 return Math.min(100,score);
}
export function trackAttribution(site, value) {
 const url=validPublicUrl(value); const expected=pillar(new URL(`https://${site}`)); if(pillar(url)!==expected) throw new Error('Attribution pillar mismatch');
 const result={pillar:expected}; for(const key of ['utm_source','utm_medium','utm_campaign']) {const v=url.searchParams.get(key)||''; if(v.length>100 || /https?:|darlink|[<>]/i.test(v)) throw new Error('Invalid campaign field'); result[key]=v;} return result;
}
// This helper builds approved URLs for private caller-supplied contexts; it cannot verify a person's age or control reposting elsewhere.
export function affiliateLink({adult_verified,destination}={}) {if(adult_verified!==true || destination!=='private') throw new Error('Adult verification and private destination required'); return 'https://darlink.ai?fpr=joshua-10c242';}
export function verifyPartnerConfig(rows) {
 if(!Array.isArray(rows)||rows.length!==6) throw new Error('Six partner entries required');
 const seen=new Set();
 return rows.map(row=>{
  if(!row||typeof row!=='object'||typeof row.partner!=='string'||!row.partner) throw new Error('Partner name required');
  if(seen.has(row.partner)) throw new Error('Duplicate partner'); seen.add(row.partner);
  if(row.partner==='DarLink AI') {const u=validPublicUrl(row.url); if(domain(u.hostname)!=='darlink.ai'||u.searchParams.get('fpr')!=='joshua-10c242') throw new Error('Invalid DarLink URL'); if(row.context!=='date_app_verified_18_only') throw new Error('DarLink must be adult-gated only'); return {...row,url:u.href.replace(/s+$/,'')};}
  if(!allowedSlugs.has(row.slug)||row.share_percent!==50||row.context!=='date_app_verified_18_plus') throw new Error('Invalid Date App partner');
  const registration_url=`https://youandinotai.com/register?ref=${row.slug}`; if(row.url!==registration_url) throw new Error('Partner URL mismatch');
  return {...row,registration_url,creator_share_cents:Math.floor(row.share_percent*100),platform_keeps_cents:10_000-Math.floor(row.share_percent*100)};
 });
}
export function planSocialStrike(options={}) {
 const draft={
  surface:'r/Tinder',
  body:'I built a human-verified dating app to reduce bots and fake profiles. This is direct founder promotion, and approved creators can earn a 50% lifetime commission. Please remove this if transparent product promotion is not allowed here.',
  url:'https://youandinotai.com/register?ref=bot-slayer',
  ...options
 };
 if(draft.auto_post===true) throw new Error('Automatic posting is disabled'); assertCustomerCopy(draft.body);
 if(/(found.*by accident|randomly found|just discovered|not affiliated|no affiliation)/i.test(draft.body)||!/built|founder|i made|we made/i.test(draft.body)||!/(50%|fifty percent)/i.test(draft.body)) throw new Error('Post must disclose founder promotion and the 50% affiliate offer');
 const surfaces=['r/technology','r/Tinder','r/dating','r/Creators','discord_verified_18_plus']; if(draft.surface&&!surfaces.includes(draft.surface)) throw new Error('Unsupported social surface');
 const base=draft.body; const drafts=surfaces.map(surface=>({surface,title:surface==='r/Creators'?'A transparent creator offer for verified dating':'A founder-built verification tool for real dating',body:surface==='r/Creators'?base+' Creator note: I am disclosing the 50% lifetime referral offer clearly before anyone joins.':base,url:surface==='r/technology'?'https://youandinotai.com/':draft.url,model:'joshlcoleman/Fable',manual_review_required:true,auto_post:false}));
 return {approved_count:drafts.length,drafts,manual_review_required:true,auto_post:false,llm_cost_usd:0,model:'joshlcoleman/Fable'};
}
export function planMusaCampaign(options={}) {
 const card=options.copy||'Schedule a pickup, get AI-assisted intake guidance, and keep usable hardware in circulation. onlineRecycle helps households and businesses sort electronics, identify likely value, and choose refurbishment, pickup, or responsible handling.';
 assertCustomerCopy(card); if(options.auto_post===true) throw new Error('Automatic posting is disabled');
 return {channels:['instagram','facebook'],cards:[{headline:'Electronics pickup and intake made simpler',body:card,url:'https://onlinerecycle.net/',manual_review_required:true}],manual_review_required:true,auto_post:false,llm_cost_usd:0};
}
export function scoreLeadForgeBatch(tierName,leads) {
 const tier=LEADFORGE_TIERS[tierName]; if(!tier) throw new Error('Unknown LeadForge tier'); if(!Array.isArray(leads)||leads.length>tier.leads_per_day) throw new Error('Lead batch exceeds daily tier limit');
 return {tier,scored:leads.map(lead=>({score:scoreLead(lead),routed_to:lead?.intent==='corporate_pickup'?'recycling':'dating'})),daily_limit:tier.leads_per_day,auto_contact:false};
}
export function validatePublication(p) {
 if(!p || p.approved!==true || p.method!=='youtube-data-api-v3') throw new Error('Human or Trust-Level-Max Judge approval and official YouTube Data API v3 required');
 if(!Number.isSafeInteger(p.duration_us)||p.duration_us<=0||p.duration_us>58_500_000) throw new Error('Invalid Short duration');
 let text=JSON.stringify(p); for(let i=0;i<3;i++){try{const decoded=decodeURIComponent(text); if(decoded===text) break; text=decoded;}catch{break;}}
 if(/darlink|joshua-10c242|adult[_\s-]*affiliate/i.test(text)) throw new Error('Adult affiliate content is prohibited');
 return {selfDeclaredMadeForKids:false,containsSyntheticMedia:true};
}
export function judgeApproveAndDispatch({judge_lane,source_agent='emergent',item_type='social_strike',cost_usd=0,copy='',email_subject='',recipient_role=''}={}) {
 if(!TRUST_LEVEL_MAX_JUDGES.includes(judge_lane)) throw new Error('Only Trust Level Max judges (gemini-4-high-reasoning or opus-5.5-fable) can approve and dispatch platform work');
 if(typeof cost_usd!=='number'||cost_usd!==0) throw new Error('Nothing costs money until Founder Joshua Coleman says finalize');
 if(copy) assertCustomerCopy(copy);
 const allowedTypes=new Set(['social_strike','musa_campaign','partner_email','link_forge','leadforge','code_merge']);
 if(!allowedTypes.has(item_type)) throw new Error('Unsupported judge approval item_type');
 return {
  approved:true,
  trust_level:'MAX',
  judge_lane,
  source_agent,
  item_type,
  cost_usd:0,
  dispatched:true,
  email_subject:email_subject||undefined,
  recipient_role:recipient_role||undefined
 };
}


