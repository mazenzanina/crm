import { NextRequest, NextResponse } from 'next/server';
import { cloudReady, serviceDb } from '@/lib/server';
import { telegramConfig, sendTelegramMessage, sendTelegramPhoto, sendTelegramVoice, answerCallbackQuery, welcomeKeyboard, linkedKeyboard, helpText, dailyKeyboard } from '@/lib/telegram';
import { computeSky } from '@/lib/sky';
import { makeDailyMessage, joinMessage } from '@/lib/messages';
const CARD_FILES = ["00-the-fool","01-the-magician","02-the-high-priestess","03-the-empress","04-the-emperor","05-the-hierophant","06-the-lovers","07-the-chariot","08-strength","09-the-hermit","10-wheel-of-fortune","11-justice","12-the-hanged-man","13-death","14-temperance","15-the-devil","16-the-tower","17-the-star","18-the-moon","19-the-sun","20-judgement","21-the-world","22-ace-of-cups","23-two-of-cups","24-three-of-cups","25-four-of-cups","26-five-of-cups","27-six-of-cups","28-seven-of-cups","29-eight-of-cups","30-nine-of-cups","31-ten-of-cups","32-page-of-cups","33-knight-of-cups","34-queen-of-cups","35-king-of-cups","36-ace-of-pentacles","37-two-of-pentacles","38-three-of-pentacles","39-four-of-pentacles","40-five-of-pentacles","41-six-of-pentacles","42-seven-of-pentacles","43-eight-of-pentacles","44-nine-of-pentacles","45-ten-of-pentacles","46-page-of-pentacles","47-knight-of-pentacles","48-queen-of-pentacles","49-king-of-pentacles","50-ace-of-swords","51-two-of-swords","52-three-of-swords","53-four-of-swords","54-five-of-swords","55-six-of-swords","56-seven-of-swords","57-eight-of-swords","58-nine-of-swords","59-ten-of-swords","60-page-of-swords","61-knight-of-swords","62-queen-of-swords","63-king-of-swords","64-ace-of-wands","65-two-of-wands","66-three-of-wands","67-four-of-wands","68-five-of-wands","69-six-of-wands","70-seven-of-wands","71-eight-of-wands","72-nine-of-wands","73-ten-of-wands","74-page-of-wands","75-knight-of-wands","76-queen-of-wands","77-king-of-wands"];
function stableHash(s:string){let v=2166136261;for(let i=0;i<s.length;i++){v^=s.charCodeAt(i);v=Math.imul(v,16777619);}return v>>>0;}
function cardFileFor(a:string,b:string){return CARD_FILES[stableHash(b+'|'+a)%CARD_FILES.length];}
function daysAgo(n:number){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);}
export const runtime='nodejs';export const dynamic='force-dynamic';
async function getClient(chatId:string){
  try{
    const db=serviceDb();
    const {data, error} = await db.from('clients').select('id,name,preferred_language,telegram_opt_in,sun_sign,birth_date').eq('telegram_chat_id',chatId).maybeSingle();
    if(error){
      // column missing -> return null but log
      console.error('getClient error', error.message);
      return null;
    }
    if(data) return data as any;
    // fallback: try with numeric chatId if string failed (in case column is integer)
    try{
      const num = Number(chatId);
      if(!isNaN(num)){
        const {data: data2} = await db.from('clients').select('id,name,preferred_language,telegram_opt_in,sun_sign,birth_date').eq('telegram_chat_id', num as any).maybeSingle();
        if(data2) return data2 as any;
      }
    }catch{}
    return null;
  }catch(e){ console.error('getClient exception', e); return null; }
}
async function sendDaily(client:any,chatId:string){try{const sky=computeSky();const db=serviceDb();const {data:settings}=await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();const bookingUrl=(settings as any)?.booking_url||'https://tarot-tn.vercel.app/booking.html';const parts=makeDailyMessage({id:client.id,name:client.name,sun_sign:client.sun_sign,preferred_language:'en'},sky,bookingUrl);const text=joinMessage(parts);const kb=dailyKeyboard(bookingUrl,client.id);await sendTelegramMessage(chatId,text,kb);}catch(e){try{const sky2=computeSky();const parts2=makeDailyMessage({id:client.id,name:client.name,sun_sign:client.sun_sign,preferred_language:'en'},sky2,'https://tarot-tn.vercel.app/booking.html');await sendTelegramMessage(chatId,joinMessage(parts2),dailyKeyboard('https://tarot-tn.vercel.app/booking.html',client.id));}catch{}}}
export async function POST(req:NextRequest){
  const cfg=telegramConfig();const update=await req.json().catch(()=>null) as any;const db=serviceDb();
  const cq=update?.callback_query;
  if(cq?.id){
    const chatId=String(cq.message?.chat?.id||cq.from?.id||'');const data=String(cq.data||'').trim();
    try{await answerCallbackQuery(cq.id);}catch{}
    if(!cfg||!cloudReady()){
      try{await sendTelegramMessage(chatId,'Bot starting, try again in 10s.');}catch{}
      return NextResponse.json({ok:true});
    }
    let client=null;try{client=await getClient(chatId);}catch{}
    try{
      if(data==='fb_up'||data==='fb_down'){
        const v=data==='fb_up'?'up':'down';
        if(client) try{const sky=computeSky();await db.from('telegram_feedback').insert({client_id:client.id,chat_id:chatId,date_key:sky.dateKey,feedback:v});}catch{}
        await sendTelegramMessage(chatId,v==='up'?'Thanks 👍 See you tomorrow 09:00.':'Thanks 👎 Noted for tomorrow.',linkedKeyboard());
        return NextResponse.json({ok:true});
      }
      if(data==='share'){
        const bot=(process.env.TELEGRAM_BOT_USERNAME||'tarot_tn_bot').replace(/^@/,'');
        await sendTelegramMessage(chatId,'Share your daily sky ✨\nhttps://t.me/'+bot+'?start=ref_'+(client?.id||'share')+'\nFriend taps → /start → +216...',linkedKeyboard());
        return NextResponse.json({ok:true});
      }
      if(data==='voice'){
        const url=process.env.TELEGRAM_VOICE_URL||'https://crm-flame-rho-25.vercel.app/audio/intro.ogg';
        try{await sendTelegramVoice(chatId,url,'Hello from Mazen ✨');}catch{await sendTelegramMessage(chatId,'Voice intro coming soon — Mazen is recording a short hello ✨',linkedKeyboard());}
        return NextResponse.json({ok:true});
      }
      if(data==='missed'){
        if(!client){await sendTelegramMessage(chatId,'Not linked yet. Send /start then +216...\nIf already linked, run the SQL fix for telegram columns.',welcomeKeyboard());return NextResponse.json({ok:true});}
        for(let d=2;d>=0;d--){
          const dk=daysAgo(d);const sky=computeSky();const fake={...sky,dateKey:dk} as any;
          const {data:settings}=await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();const bookingUrl=(settings as any)?.booking_url||'https://tarot-tn.vercel.app/booking.html';
          const parts=makeDailyMessage({id:client.id,name:client.name,sun_sign:client.sun_sign,preferred_language:'en'},fake,bookingUrl);
          const txt=joinMessage(parts)+(d>0?'\\n\\n_'+dk+'_':'');const kb=d===0?dailyKeyboard(bookingUrl,client.id):undefined;
          try{await sendTelegramMessage(chatId,txt,kb);}catch{}
          await new Promise(r=>setTimeout(r,180));
        }
        return NextResponse.json({ok:true});
      }
      if(data==='stop'){
        if(client) try{await db.from('clients').update({telegram_opt_in:false,telegram_opted_out_at:new Date().toISOString()}).eq('id',client.id);}catch{}
        await sendTelegramMessage(chatId,'Paused. Send /resume to restart.',{inline_keyboard:[[{text:'▶️ Resume',callback_data:'resume'}]]});
        return NextResponse.json({ok:true});
      }
      if(data==='resume'){
        if(client) try{await db.from('clients').update({telegram_opt_in:true,telegram_opted_in_at:new Date().toISOString(),telegram_opted_out_at:null}).eq('id',client.id);}catch{}
        if(client) await sendTelegramMessage(chatId,'Resumed ✨ Daily at 09:00.',linkedKeyboard());
        else await sendTelegramMessage(chatId,'Not linked yet. Send /start then +216...\nIf already linked, run the SQL fix for telegram columns.',welcomeKeyboard());
        return NextResponse.json({ok:true});
      }
      if(data==='today'){
        if(!client){
        // Debug: check if column exists
        await sendTelegramMessage(chatId,'Not linked yet. Send /start then +216...\nIf you already linked, your database may be missing telegram columns — run the SQL fix I sent.',welcomeKeyboard());
        return NextResponse.json({ok:true});
      }
        if(!client.telegram_opt_in){await sendTelegramMessage(chatId,'Paused. Send /resume.',{inline_keyboard:[[{text:'▶️ Resume',callback_data:'resume'}]]});return NextResponse.json({ok:true});}
        await sendDaily(client,chatId);
        return NextResponse.json({ok:true});
      }
      if(data==='help'||data==='hint_lang'){
        await sendTelegramMessage(chatId,helpText(),linkedKeyboard());
        return NextResponse.json({ok:true});
      }
      if(data==='hint_link'){
        await sendTelegramMessage(chatId,'Send your WhatsApp number as +216...\nExample: +21622481622',welcomeKeyboard());
        return NextResponse.json({ok:true});
      }
    }catch(e){try{await sendTelegramMessage(chatId,'Try again — tap the button once more.');}catch{}}
    return NextResponse.json({ok:true});
  }
  const msg=update?.message;if(!msg?.chat?.id) return NextResponse.json({ok:true});
  const chatId=String(msg.chat.id);const username=msg.chat.username?String(msg.chat.username):null;const text=String(msg.text||'').trim();
  if(!cfg||!cloudReady()){
    try{await sendTelegramMessage(chatId,'Service starting, try /start again.');}catch{}
    return NextResponse.json({ok:true});
  }
  try{
    if(/^\/stats/i.test(text)){
      const adminIds=(process.env.TELEGRAM_ADMIN_IDS||'').split(',').map(s=>s.trim()).filter(Boolean);
      const isAdm=adminIds.includes(chatId)||(username&& (process.env.TELEGRAM_ADMIN_USERNAMES||'').split(',').map(s=>s.trim().replace(/^@/,'')).includes(username));
      if(adminIds.length&&!isAdm){await sendTelegramMessage(chatId,'Admin only.',linkedKeyboard());return NextResponse.json({ok:true});}
      const {count:total}=await db.from('clients').select('id',{count:'exact',head:true});const {count:linked}=await db.from('clients').select('id',{count:'exact',head:true}).not('telegram_chat_id','is',null);const {count:opted}=await db.from('clients').select('id',{count:'exact',head:true}).eq('telegram_opt_in',true);const today=new Date().toISOString().slice(0,10);
      const {count:sentToday}=await db.from('telegram_sends').select('id',{count:'exact',head:true}).eq('date_key',today);let up=0,down=0;try{const r1=await db.from('telegram_feedback').select('id',{count:'exact',head:true}).eq('feedback','up').eq('date_key',today);up=(r1 as any).count||0;}catch{}try{const r2=await db.from('telegram_feedback').select('id',{count:'exact',head:true}).eq('feedback','down').eq('date_key',today);down=(r2 as any).count||0;}catch{}
      await sendTelegramMessage(chatId,'*Admin stats* 📊\nTotal: '+(total||0)+'\nLinked: '+(linked||0)+'\nOpted: '+(opted||0)+'\nSent today ('+today+'): '+(sentToday||0)+'\nFeedback: 👍 '+(up||0)+' 👎 '+(down||0),linkedKeyboard());
      return NextResponse.json({ok:true});
    }
    if(/^\/stop/i.test(text)){try{await db.from('clients').update({telegram_opt_in:false,telegram_opted_out_at:new Date().toISOString()}).eq('telegram_chat_id',chatId);}catch{}await sendTelegramMessage(chatId,'Paused. Send /resume.',{inline_keyboard:[[{text:'▶️ Resume',callback_data:'resume'}]]});return NextResponse.json({ok:true});}
    if(/^\/resume/i.test(text)){try{const {data:cl}=await db.from('clients').select('id').eq('telegram_chat_id',chatId).maybeSingle();if(cl) await db.from('clients').update({telegram_opt_in:true,telegram_opted_in_at:new Date().toISOString(),telegram_opted_out_at:null}).eq('id',(cl as any).id);}catch{}await sendTelegramMessage(chatId,'Resumed ✨ Daily at 09:00.',linkedKeyboard());return NextResponse.json({ok:true});}
    if(/^\/help/i.test(text)){await sendTelegramMessage(chatId,helpText(),linkedKeyboard());return NextResponse.json({ok:true});}
    if(/^\/share/i.test(text)){let c=null;try{c=await getClient(chatId);}catch{}const bot=(process.env.TELEGRAM_BOT_USERNAME||'tarot_tn_bot').replace(/^@/,'');await sendTelegramMessage(chatId,'Share ✨\nhttps://t.me/'+bot+'?start=ref_'+(c?.id||'share'),linkedKeyboard());return NextResponse.json({ok:true});}
    if(/^\/voice/i.test(text)){const url=process.env.TELEGRAM_VOICE_URL||'https://crm-flame-rho-25.vercel.app/audio/intro.ogg';try{await sendTelegramVoice(chatId,url,'Hello from Mazen ✨');}catch{await sendTelegramMessage(chatId,'Voice coming soon ✨',linkedKeyboard());}return NextResponse.json({ok:true});}
    if(/^\/missed/i.test(text)){let c=null;try{c=await getClient(chatId);}catch{}if(!c){await sendTelegramMessage(chatId,'Not linked yet. Send /start then +216...\nIf already linked, run the SQL fix for telegram columns.',welcomeKeyboard());return NextResponse.json({ok:true});}for(let d=2;d>=0;d--){const dk=daysAgo(d);const sky=computeSky();const fake={...sky,dateKey:dk} as any;const {data:settings}=await db.from('app_settings').select('booking_url').eq('id',1).maybeSingle();const bookingUrl=(settings as any)?.booking_url||'https://tarot-tn.vercel.app/booking.html';const parts=makeDailyMessage({id:c.id,name:c.name,sun_sign:c.sun_sign,preferred_language:'en'},fake,bookingUrl);const txt=joinMessage(parts)+(d>0?'\\n\\n_'+dk+'_':'');const kb=d===0?dailyKeyboard(bookingUrl,c.id):undefined;try{await sendTelegramMessage(chatId,txt,kb);}catch{}await new Promise(r=>setTimeout(r,200));}return NextResponse.json({ok:true});}
    if(/^\/today/i.test(text)){let c=null;try{c=await getClient(chatId);}catch{}if(!c){await sendTelegramMessage(chatId,'Not linked yet. Send /start then +216...\nIf already linked, run the SQL fix for telegram columns.',welcomeKeyboard());return NextResponse.json({ok:true});}if(!c.telegram_opt_in){await sendTelegramMessage(chatId,'Paused. Send /resume.',{inline_keyboard:[[{text:'▶️ Resume',callback_data:'resume'}]]});return NextResponse.json({ok:true});}await sendDaily(c,chatId);return NextResponse.json({ok:true});}
    if(/^\/start/i.test(text)){
      const ref=(text.split(/\s+/)[1]||'');if(ref.startsWith('ref_')) try{await db.from('telegram_refs').insert({chat_id:chatId,ref:ref.slice(4),created_at:new Date().toISOString()});}catch{}
      let c=null;try{c=await getClient(chatId);}catch{}
      if(c) await sendTelegramMessage(chatId,'Hi '+(c.name.split(' ')[0])+' ✨ Already linked! /today to replay, /missed for last 3, /share to invite.',linkedKeyboard());
      else await sendTelegramMessage(chatId,'Hi ✨ Welcome to Tarot TN — your daily sky note.\nSend your WhatsApp number as *+216...* to link.\nExample: `+21622481622`',welcomeKeyboard());
      return NextResponse.json({ok:true});
    }
    let norm=text.replace(/[\s\-\(\)\.]/g,'');if(norm.startsWith('00')) norm='+'+norm.slice(2);const m=norm.match(/^\+[1-9][0-9]{7,14}$/);
    if(m){
      const phone=norm;const {data:cl}=await db.from('clients').select('id,name,sun_sign,birth_date').eq('phone',phone).maybeSingle();
      if(cl){
        try{await db.from('clients').update({telegram_chat_id:chatId,telegram_username:username,telegram_opt_in:true,telegram_opted_in_at:new Date().toISOString(),telegram_opted_out_at:null}).eq('id',(cl as any).id);}catch{}
        const first=(cl as any).name.split(' ')[0];let extra='';if(!(cl as any).birth_date&&!(cl as any).sun_sign) extra='\n\nWant it more personal? Send your sign or birth date. Optional.';
        await sendTelegramMessage(chatId,'Linked ✨ Welcome '+first+'! Daily at 09:00 Tunis.'+extra,linkedKeyboard());
        try{const linked={id:(cl as any).id,name:(cl as any).name,sun_sign:(cl as any).sun_sign,preferred_language:'en',telegram_opt_in:true};await sendDaily(linked as any,chatId);}catch{}
      } else {
        await sendTelegramMessage(chatId,'Number not found in CRM. Check +216 format or ask Mazen to add you.\nGot: `'+phone+'`',welcomeKeyboard());
      }
      return NextResponse.json({ok:true});
    }
    let linked=null;try{linked=await getClient(chatId);}catch{}
    if(linked&&text.length>=3&&text.length<30){
      const map:any={aries:'Aries',taurus:'Taurus',gemini:'Gemini',cancer:'Cancer',leo:'Leo',virgo:'Virgo',libra:'Libra',scorpio:'Scorpio',sagittarius:'Sagittarius',capricorn:'Capricorn',aquarius:'Aquarius',pisces:'Pisces','bélier':'Aries','taureau':'Taurus','gémeaux':'Gemini','vierge':'Virgo','balance':'Libra','scorpion':'Scorpio','sagittaire':'Sagittarius','capricorne':'Capricorn','verseau':'Aquarius','poissons':'Pisces','حمل':'Aries','ثور':'Taurus','جوزاء':'Gemini','سرطان':'Cancer','اسد':'Leo','عذراء':'Virgo','ميزان':'Libra','عقرب':'Scorpio','قوس':'Sagittarius','جدي':'Capricorn','دلو':'Aquarius','حوت':'Pisces'};
      const low=text.toLowerCase();const f=Object.keys(map).find(k=>low.includes(k));
      if(f){const eng=map[f];try{await db.from('clients').update({sun_sign:eng}).eq('id',linked.id);}catch{}await sendTelegramMessage(chatId,'Saved ✨ '+eng+' — tomorrow more personal. /today to see again.',linkedKeyboard());return NextResponse.json({ok:true});}
    }
    await sendTelegramMessage(chatId,'Send /start to link, /today to replay, /missed for last 3, /share to invite, /stop to pause. Or send +216...',linked?linkedKeyboard():welcomeKeyboard());
  }catch(e){try{await sendTelegramMessage(chatId,'Try again — tap once more.');}catch{}}
  return NextResponse.json({ok:true});
}
export async function GET(){return NextResponse.json({ok:true,webhook:'telegram'});}
