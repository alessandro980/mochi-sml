'use strict';
// ===== Risposte "Ci sono / Non posso" e scambi tra squadre =====
D.responses=D.responses||{};D.swaps=D.swaps||{};
const rkey=(mid,sid)=>mid+'__'+sid;
const resp=(mid,sid)=>(D.responses[rkey(mid,sid)]||{}).ans||'';
const teamMembers=sq=>D.servers.filter(s=>s.squadra===sq);
const mD=m=>new Date(m.data+'T'+m.ora+':00');
const fmtL=m=>`${fmt(m.data)} ore ${m.ora}`;
function teamStats(m){const mem=teamMembers(m.squadra);return {mem,si:mem.filter(s=>resp(m.id,s.id)==='si'),no:mem.filter(s=>resp(m.id,s.id)==='no')}}
const swapsFor=m=>Object.values(D.swaps).filter(x=>x.massId===m.id);
const activeSwap=m=>swapsFor(m).find(x=>['aperta','scoperta'].includes(x.status));
const isUncovered=m=>{const w=activeSwap(m);return !!w&&mD(m)>Date.now()&&(w.status==='scoperta'||mD(m)-Date.now()<24*36e5)};
const isLeaderOf=(s,sq)=>!!(s&&s.cer&&(s.leads||[]).includes(sq));
window.answerMass=(mid,ans)=>{const me=sv(D.me);if(!me)return;D.responses[rkey(mid,me.id)]={massId:mid,serverId:me.id,ans,ts:Date.now()};save();render()};
window.requestSwap=mid=>{const m=D.masses.find(x=>x.id===mid),me=sv(D.me);if(!m||!me||activeSwap(m))return;const id='sw'+Date.now().toString(36)+uid();
 D.swaps[id]={id,massId:mid,fromSq:m.squadra,by:me.id,byName:me.nome,ts:Date.now(),status:'aperta'};save();render();alert('Richiesta inviata ai cerimonieri delle altre squadre 🔁')};
window.swapStatus=(id,st)=>{const w=D.swaps[id];if(!w)return;w.status=st;w.ts=Date.now();save();render()};
function swapTargets(w,sq){const m=D.masses.find(x=>x.id===w.massId);return D.masses.filter(y=>y.squadra===sq&&y.id!==m.id&&mD(y)>Date.now()&&y.data!==m.data&&!activeSwap(y)).sort((a,b)=>mD(a)-mD(b)).slice(0,8)}
window.acceptSwap=(id,sq)=>{const w=D.swaps[id],m=D.masses.find(x=>x.id===w.massId),sel=document.getElementById('swt_'+id+'_'+sq);const y=D.masses.find(x=>x.id===(sel&&sel.value));const me=sv(D.me);
 if(!m||!y||!isLeaderOf(me,sq)||w.status!=='aperta'||m.squadra!==w.fromSq)return alert('Scambio non più disponibile');
 if(!confirm(`Confermi? La Squadra ${SQ[sq].n} serve ${fmtL(m)} e la Squadra ${SQ[w.fromSq].n} serve ${fmtL(y)}.`))return;
 m.squadra=sq;y.squadra=w.fromSq;Object.assign(w,{status:'accettata',toSq:sq,withMass:y.id,acceptedBy:me.id,acceptedName:me.nome,ts:Date.now()});save();render()};
function swapLine(m,me){const w=swapsFor(m).sort((a,b)=>b.ts-a.ts)[0];if(!w)return '';const mine=me&&(w.by===me.id||isLeaderOf(me,w.fromSq));
 if(w.status==='aperta')return `<div class="swap">🔁 Richiesta di scambio inviata da ${esc(w.byName)}: in attesa di un'altra squadra…${mine?`<br><button class="s" onclick="swapStatus('${w.id}','scoperta')">Nessuno accetta: cerco un sostituto</button><button class="s" onclick="swapStatus('${w.id}','annullata')">Annulla</button>`:''}</div>`;
 if(w.status==='scoperta')return `<div class="swap warnbox">⚠️ <b>Messa da coprire</b>: ${esc(w.byName)} sta cercando un sostituto.${mine?`<br><button class="p" onclick="swapStatus('${w.id}','risolta')">✅ Sostituto trovato</button>`:''}</div>`;
 if(w.status==='accettata'&&w.fromSq!==m.squadra)return '';
 if(w.status==='accettata')return `<div class="swap okbox">✅ Scambio accettato da ${esc(w.acceptedName)} (Squadra ${SQ[w.toSq].n}).</div>`;
 if(w.status==='risolta')return `<div class="swap okbox">✅ Sostituto trovato.</div>`;return ''}
function massBlock(m,me){const member=me.squadra===m.squadra,lead=isLeaderOf(me,m.squadra),r=resp(m.id,me.id),st=teamStats(m),sw=activeSwap(m);
 return `<div class="ritem" style="border-left-color:${SQ[m.squadra].c}"><div>${longDay(m)} ore <b>${m.ora}</b> serve ${member?'la tua':'la'} ${sqBadge(m.squadra)}</div>
 ${member?`<div class="ans"><button class="${r==='si'?'p yes':'s'}" onclick="answerMass('${m.id}','si')">✅ Ci sono</button><button class="${r==='no'?'p nob':'s'}" onclick="answerMass('${m.id}','no')">❌ Non posso</button></div>`:''}
 ${lead?`<small>Risposte squadra: ✅ ${st.si.length} · ❌ ${st.no.length} · ❔ ${st.mem.length-st.si.length-st.no.length}${st.no.length?' — non possono: '+st.no.map(s=>esc(s.nome)).join(', '):''}</small>`:''}
 ${swapLine(m,me)}
 ${(r==='no'||lead)&&!sw?`<button class="s" onclick="requestSwap('${m.id}')">🔁 Chiedi scambio a un'altra squadra</button>`:''}
 ${lead?`<button class="s wa small" onclick="waRemind('${m.id}')">💬 WhatsApp (facoltativo)</button>`:''}
 <a href="#" class="dis" onclick="dismissRem('${m.id}');return false">nascondi</a></div>`}
function incomingSwaps(me){if(!me||!me.cer||!(me.leads||[]).length)return '';const out=[];
 Object.values(D.swaps).filter(w=>w.status==='aperta').forEach(w=>{const m=D.masses.find(x=>x.id===w.massId);if(!m||mD(m)<Date.now())return;
  me.leads.filter(sq=>sq!==w.fromSq).forEach(sq=>{const t=swapTargets(w,sq);out.push(`<div class="ritem" style="border-left-color:${SQ[w.fromSq].c}">🔁 La ${sqBadge(w.fromSq)} non può servire <b>${fmtL(m)}</b>.<br>La tua ${sqBadge(sq)} può prenderla? In cambio la Squadra ${SQ[w.fromSq].n} serve:
   ${t.length?`<select id="swt_${w.id}_${sq}">${t.map(y=>`<option value="${y.id}">${fmtL(y)}</option>`).join('')}</select><button class="p" onclick="acceptSwap('${w.id}','${sq}')">✅ Accetta scambio</button>`:'<small>nessuna vostra Messa disponibile per lo scambio</small>'}</div>`)})});
 return out.length?`<div class="remind swapreq"><b>🔁 Richieste di scambio</b>${out.join('')}</div>`:''}
function uncoveredCard(me){if(!(admin||(me&&me.cer)))return '';const u=D.masses.filter(isUncovered).sort((a,b)=>mD(a)-mD(b));if(!u.length)return '';
 return `<div class="remind warnbox"><b>⚠️ Messe scoperte – cercare un sostituto</b>${u.map(m=>{const w=activeSwap(m);return `<div class="ritem" style="border-left-color:#b00020">${fmtL(m)} · ${sqBadge(m.squadra)}<br><small>Richiesta di ${esc(w.byName)}${w.status==='aperta'?' (nessuna squadra ha ancora accettato)':''}</small></div>`}).join('')}</div>`}
function reminderCard(){const me=D.me&&sv(D.me);if(!me)return '';const list=leaderMasses(me,3).filter(m=>!D.dismissed.includes(m.id));
 const main=list.length?`<div class="remind"><b>🔔 Promemoria per ${esc(me.nome)}</b>${list.map(m=>massBlock(m,me)).join('')}</div>`:'';
 return uncoveredCard(me)+incomingSwaps(me)+main}
window.massExtra=m=>{let h='';if(isUncovered(m))h+='<span class="badge" style="background:#b00020;color:#fff">⚠️ scoperta – cerca sostituto</span>';
 if(m.squadra&&teamMembers(m.squadra).length){const st=teamStats(m);if(st.si.length||st.no.length)h+=`<span class="badge">✅ ${st.si.length} · ❌ ${st.no.length}</span>`}
 const w=swapsFor(m).find(x=>x.status==='aperta');if(w)h+='<span class="badge">🔁 scambio richiesto</span>';return h?'<div>'+h+'</div>':''};
