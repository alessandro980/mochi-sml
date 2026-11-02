'use strict';
// ===== Promemoria per i cerimonieri responsabili di squadra =====
const GIORNI=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const mDate=m=>new Date(m.data+'T'+m.ora+':00');
const longDay=m=>{const d=mDate(m);return `${GIORNI[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('it-IT',{month:'short'}).replace('.','')}`};
const myLeads=s=>s&&s.cer?(s.leads||[]):[];
function leaderMasses(s,days){const now=Date.now(),lim=now+days*864e5;return D.masses.filter(m=>m.squadra&&myLeads(s).includes(m.squadra)&&mDate(m)>now-60*6e4&&mDate(m)<=lim).sort((a,b)=>mDate(a)-mDate(b))}
function waText(m){const q=SQ[m.squadra].n;return `Ciao squadra ${q}! 🙏\nVi ricordo il servizio all'altare:\n📅 ${longDay(m)} ore ${m.ora}${m.note?' ('+m.note+')':''}\n⛪ Parrocchia Santa Maria di Lourdes\n\nPresentatevi in sacrestia almeno 15 minuti prima dell'inizio della S. Messa.\nSe non potete, organizzate voi una sostituzione e segnalatela sul gruppo WhatsApp, così nessuna celebrazione resta scoperta.\n\nGrazie! 💛`}
window.waRemind=id=>{const m=D.masses.find(x=>x.id===id);window.open('https://wa.me/?text='+encodeURIComponent(waText(m)),'_blank')};
window.dismissRem=id=>{D.dismissed.push(id);save();render()};
function reminderCard(){const me=D.me&&sv(D.me);if(!me||!myLeads(me).length)return '';
 const list=leaderMasses(me,3).filter(m=>!D.dismissed.includes(m.id));if(!list.length)return '';
 return `<div class="remind"><b>🔔 Promemoria per ${esc(me.nome)}</b>${list.map(m=>`<div class="ritem" style="border-left-color:${SQ[m.squadra].c}"><div>${longDay(m)} ore <b>${m.ora}</b> serve la tua ${sqBadge(m.squadra)}</div><button class="p wa" onclick="waRemind('${m.id}')">💬 Ricorda alla squadra</button><button class="s" onclick="dismissRem('${m.id}')">✓ Visto</button></div>`).join('')}</div>`}
// wrap views
const _home=V.home,_cer=V.cer;
V.home=()=>{const h=_home();return h.replace('<h2>Pace e bene! 🙏</h2>','<h2>Pace e bene! 🙏</h2>'+reminderCard())};
V.cer=()=>{const me=D.me&&sv(D.me);let x=_cer();const extra=reminderCard()+(me&&myLeads(me).length?`<div class="card"><b>🧭 Le tue squadre:</b> ${me.leads.map(sqBadge).join('')}<br><small>Prossimi turni: ${leaderMasses(me,45).slice(0,6).map(m=>fmt(m.data)+' '+m.ora+' ('+SQ[m.squadra].n+')').join(', ')||'nessuno'}</small></div>`:'')+notifCard();
 return x.replace('<h2>🎗️ Area Cerimonieri</h2>','<h2>🎗️ Area Cerimonieri</h2>'+extra)};
// ===== Notifiche =====
const CAP=window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform();
const LN=CAP?(window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications)||(window.Capacitor.registerPlugin&&window.Capacitor.registerPlugin('LocalNotifications')):null;
const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
function notifSupport(){if(LN)return {ok:true,how:'app'};if(!('Notification' in window))return {ok:false,why:isIOS?(standalone?'Su iPhone le notifiche locali programmate non sono disponibili: usa il promemoria in Home.':'Su iPhone/iPad le notifiche web funzionano solo aggiungendo l\'app alla schermata Home (iOS 16.4+) e comunque non possono essere programmate: usa il promemoria in Home.'):'Questo browser non supporta le notifiche.'};return {ok:true,how:'web'}}
function notifCard(){const me=D.me&&sv(D.me);if(!me||!myLeads(me).length)return '';const s=notifSupport();
 return `<div class="card"><b>🔔 Notifiche promemoria</b><br>${s.ok?`<label style="font-weight:400;font-size:1rem"><input type="checkbox" style="width:auto" ${D.notif.on?'checked':''} onchange="setNotif(this.checked)"> Avvisami quando serve la mia squadra</label><br><small>${s.how==='app'?'Il giorno prima alle 18:00 e 2 ore prima della Messa, anche ad app chiusa.':'Nel browser le notifiche arrivano solo quando apri l\'app (il giorno prima dalle 18:00 e nelle 2 ore prima). Per avvisi ad app chiusa usa l\'app Android.'}</small>`:`<small>${s.why}</small>`}</div>`}
const notifTimes=m=>{const t=mDate(m),d=new Date(t);d.setDate(d.getDate()-1);d.setHours(18,0,0,0);return [{at:d,k:'v',txt:`Domani ore ${m.ora} serve la tua squadra ${SQ[m.squadra].n}`},{at:new Date(t-2*36e5),k:'2h',txt:`Alle ${m.ora} serve la tua squadra ${SQ[m.squadra].n} – in sacrestia 15 minuti prima`}]};
const nid=(m,k)=>{let h=7;for(const c of m.id+k)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)%2000000000};
async function scheduleNative(){if(!LN)return;try{const p=await LN.getPending();if(p.notifications.length)await LN.cancel({notifications:p.notifications.map(n=>({id:n.id}))});
 const me=D.me&&sv(D.me);if(!D.notif.on||!me)return;const now=Date.now(),list=[];
 leaderMasses(me,60).forEach(m=>notifTimes(m).forEach(x=>{if(+x.at>now)list.push({id:nid(m,x.k),title:'Mochi SML – promemoria',body:x.txt,schedule:{at:x.at,allowWhileIdle:true},extra:{mass:m.id}})}));
 if(list.length)await LN.schedule({notifications:list.slice(0,60)})}catch(e){console.warn('notifiche',e)}}
async function checkWeb(){if(LN||!D.notif.on||!('Notification' in window)||Notification.permission!=='granted')return;const me=D.me&&sv(D.me);if(!me)return;const now=Date.now();
 for(const m of leaderMasses(me,2))for(const x of notifTimes(m)){const key=m.id+x.k;if(now>=+x.at&&now<+mDate(m)&&!D.notif.sent.includes(key)){D.notif.sent.push(key);save();
  try{const r=await navigator.serviceWorker?.getRegistration();r?r.showNotification('Mochi SML – promemoria',{body:x.txt,icon:'icon-192.png',tag:key}):new Notification('Mochi SML – promemoria',{body:x.txt,icon:'icon-192.png'})}catch(e){}}}}
window.setNotif=async on=>{if(on){let ok=false;try{if(LN){const r=await LN.requestPermissions();ok=r.display==='granted'}else{ok=(await Notification.requestPermission())==='granted'}}catch(e){}
  if(!ok){alert('Permesso per le notifiche non concesso. Puoi attivarlo nelle impostazioni del telefono.');D.notif.on=false;save();render();return}}
 D.notif.on=on;save();await scheduleNative();checkWeb();render()};
window.notifRefresh=()=>{scheduleNative();checkWeb()};
// ri-programma quando cambia l'utente o i dati
const _save=save;
document.addEventListener('visibilitychange',()=>{if(!document.hidden)notifRefresh()});setInterval(checkWeb,10*6e4);
let _lastSig='';setInterval(()=>{const sig=D.me+'|'+D.notif.on+'|'+D.masses.length+'|'+JSON.stringify(D.servers.map(s=>s.leads));if(sig!==_lastSig){_lastSig=sig;scheduleNative()}},5000);
const _set=V.set;V.set=()=>_set()+(admin?notifCard():'');
render();notifRefresh();
