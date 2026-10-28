export const revenuePolicy=Object.freeze({revenue_model:'FOR_PROFIT_LLC',founder_percentage:90,charity_deduction_ceiling_percentage:10,notice:'Internal planning assumptions, not tax advice or a determination of taxable income.'});
const hosts=new Map([['onlinerecycle.net','recycling'],['dream-online.net','dream'],['opencollective.com','dream'],['youandinotai.com','dating'],['youtube.com','media'],['youtu.be','media']]);
function domain(host) { return host.toLowerCase().replace(/^www\./,''); }
function pillar(url) {const h=domain(url.hostname); if(!hosts.has(h)) throw new Error('Unrecognized attribution host'); if(h==='opencollective.com' && !/^\/dream-online(?:\/|$)/.test(url.pathname)) throw new Error('Not the Dream Online collective'); return hosts.get(h);}
export function scoreLead(lead) {
 let score=0; if(typeof lead.email==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) score+=20;
 if(lead.consent===true) score+=20;
 if(['corporate_pickup','purchase','crowdfunding','partnership'].includes(lead.intent)) score+=40;
 if(lead.follow_up_requested===true) score+=20;
 return Math.min(100,score);
}
export function trackAttribution(site, value) {
 const url=new URL(value); if(url.protocol!=='https:' || url.username || url.password) throw new Error('HTTPS attribution URL required');
 const expected=pillar(new URL(`https://${site}`)); if(pillar(url)!==expected) throw new Error('Attribution pillar mismatch');
 const result={pillar:expected}; for(const key of ['utm_source','utm_medium','utm_campaign']) {const v=url.searchParams.get(key)||''; if(v.length>100 || /https?:|darlink|[<>]/i.test(v)) throw new Error('Invalid campaign field'); result[key]=v;} return result;
}
// This generates a link only for a caller-provided private adult context. It cannot verify age or control external destinations.
export function affiliateLink({adult_verified,destination}={}) {if(adult_verified!==true || destination!=='private') throw new Error('Adult verification and private destination required'); return 'https://darlink.ai?fpr=joshua-10c242';}
export function validatePublication(p) {
 if(!p || p.approved!==true || p.method!=='youtube-data-api-v3') throw new Error('Human approval and official YouTube Data API v3 required');
 if(!Number.isSafeInteger(p.duration_us)||p.duration_us<=0||p.duration_us>58_500_000) throw new Error('Invalid Short duration');
 // This validator is defensive, not a universal DLP or a guarantee for content not submitted here.
 let text=JSON.stringify(p); for(let i=0;i<3;i++){try{const decoded=decodeURIComponent(text); if(decoded===text) break; text=decoded;}catch{break;}}
 if(/darlink|joshua-10c242|adult[_\s-]*affiliate/i.test(text)) throw new Error('Adult affiliate content is prohibited');
 return {selfDeclaredMadeForKids:false,containsSyntheticMedia:true};
}
