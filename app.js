'use strict';
const ROLES=['Crocifero','Ceroferario 1','Ceroferario 2','Turiferario','Navicella','Libro','Campanelli','Acqua e vino'];
const TIPI={feriale:'Feriale',festiva:'Festiva',solennita:'Solennità'};
const PUNTI={feriale:1,festiva:2,solennita:3};
const KEY='chierichetti-v1'/*storage key kept to preserve data*/;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const iso=d=>d.toISOString().slice(0,10);
const fmt=d=>new Date(d+'T12:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});
function addDays(n){const d=new Date();d.setDate(d.getDate()+n);return iso(d)}
function seed(){
 const s=[['Luca (esempio)',11,'Mamma 333 0000001'],['Giulia (esempio)',10,'Papà 333 0000002'],['Marco (esempio)',13,'Mamma 333 0000003'],['Sofia (esempio)',9,'Papà 333 0000004'],['Pietro (esempio)',12,'Mamma 333 0000005']].map(([nome,eta,contatto])=>({id:uid(),nome,eta,contatto,nonDisp:[]}));
 s[1].nonDisp=[addDays(6)];
 const nextSun=(()=>{const d=new Date();d.setDate(d.getDate()+((7-d.getDay())%7||7));return iso(d)})();
 return {pin:'1234',servers:s,
  masses:[{id:uid(),data:addDays(2),ora:'18:00',tipo:'feriale',note:'Esempio',assign:{},presenti:[]},
   {id:uid(),data:nextSun,ora:'10:00',tipo:'festiva',note:'Messa delle famiglie (esempio)',assign:{'Crocifero':s[0].id,'Ceroferario 1':s[1].id,'Ceroferario 2':s[3].id},presenti:[]},
   {id:uid(),data:addDays(-5),ora:'10:00',tipo:'festiva',note:'Esempio passato',assign:{'Crocifero':s[2].id,'Libro':s[4].id},presenti:[s[2].id,s[4].id]}],
  posts:[{id:uid(),titolo:'Benvenuti! (esempio)',testo:'Questa è Mochi SML, la nuova app dei chierichetti. Il responsabile può modificare tutto (PIN iniziale 1234: cambialo nelle Impostazioni!).',data:iso(new Date()),pin:true},
   {id:uid(),titolo:'Prova generale sabato (esempio)',testo:'Sabato alle 15:00 in chiesa prova per la Messa solenne.',data:iso(new Date()),pin:false}],
  me:null};
}
let D; try{D=JSON.parse(localStorage.getItem(KEY))}catch(e){} if(!D)D=seed();
let admin=false,tab='home';
const save=()=>localStorage.setItem(KEY,JSON.stringify(D));save();
const sv=id=>D.servers.find(s=>s.id===id);
const nm=id=>sv(id)?.nome||'—';
function modal(h){$('#mbox').innerHTML=h;$('#modal').classList.remove('hidden')}
function close(){$('#modal').classList.add('hidden')}
$('#modal').onclick=e=>{if(e.target.id==='modal')close()};
function points(){const p={};D.servers.forEach(s=>p[s.id]={n:0,pt:0});D.masses.forEach(m=>m.presenti.forEach(id=>{if(p[id]){p[id].n++;p[id].pt+=PUNTI[m.tipo]||1}}));return p}
const TABS=[['home','🏠','Home'],['turni','📅','Turni'],['disp','✋','Disponib.'],['punti','🏆','Punti'],['avvisi','📢','Avvisi'],['form','📖','Formaz.']];
function render(){
 $('#roleBtn').textContent=admin?'🔓 Responsabile':'👦 Chierichetto';
 $('#nav').innerHTML=TABS.map(([k,i,l])=>`<button data-t="${k}" class="${k===tab?'on':''}"><b>${i}</b>${l}</button>`).join('');
 $('#view').innerHTML=V[tab]();window.scrollTo(0,0);
}
$('#nav').onclick=e=>{const b=e.target.closest('button');if(b){tab=b.dataset.t;render()}};
$('#roleBtn').onclick=()=>{if(admin){admin=false;render()}else modal(`<h2>Accesso Responsabile</h2><input id="pin" type="password" inputmode="numeric" placeholder="PIN"><button class="p" onclick="login()">Entra</button><button class="s" onclick="close()">Annulla</button>`)};
window.login=()=>{if($('#pin').value===D.pin){admin=true;close();render()}else alert('PIN errato')};
window.close=close;
const upcoming=()=>D.masses.filter(m=>m.data>=iso(new Date())).sort((a,b)=>(a.data+a.ora).localeCompare(b.data+b.ora));
const V={};
V.home=()=>{const u=upcoming(),me=D.me&&sv(D.me);const mine=me?u.filter(m=>Object.values(m.assign).includes(me.id)):[];
 return `<h2>Pace e bene! 🙏</h2>
 <div class="card"><label>Chi sei?</label><select onchange="D.me=this.value||null;save();render()"><option value="">— scegli il tuo nome —</option>${D.servers.map(s=>`<option value="${s.id}" ${s.id===D.me?'selected':''}>${esc(s.nome)}</option>`).join('')}</select>
 ${me?(mine.length?'<b>I tuoi prossimi servizi:</b>'+mine.map(m=>`<div>${fmt(m.data)} ${m.ora} – ${esc(Object.keys(m.assign).find(r=>m.assign[r]===me.id))}</div>`).join(''):'<div>Nessun servizio in programma.</div>'):''}</div>
 <div class="grid"><div class="tile"><b>${u.length}</b>Messe in programma</div><div class="tile"><b>${D.servers.length}</b>Chierichetti</div></div>
 ${u[0]?`<h3>Prossima Messa</h3>`+massCard(u[0]):''}
 ${D.posts.filter(p=>p.pin).map(p=>`<div class="card pin">📌 <b>${esc(p.titolo)}</b><div>${esc(p.testo)}</div></div>`).join('')}
 ${admin?`<h3>Gestione</h3><button class="p" onclick="tab='roster';render()">👥 Elenco chierichetti</button><button class="s" onclick="tab='set';render()">⚙️ Impostazioni e backup</button>`:''}`};
function conflicts(m){return Object.entries(m.assign).filter(([r,id])=>sv(id)?.nonDisp.includes(m.data)).map(([r,id])=>`${nm(id)} non disponibile (${r})`)
 .concat(dupes(m))}
function dupes(m){const c={};Object.values(m.assign).forEach(id=>c[id]=(c[id]||0)+1);return Object.keys(c).filter(k=>c[k]>1).map(k=>`${nm(k)} ha più ruoli`)}
function massCard(m){const cf=conflicts(m);
 return `<div class="card ${m.tipo}"><b>${fmt(m.data)} · ${m.ora}</b> <span class="badge">${TIPI[m.tipo]}</span>${/esempio/i.test(m.note)?'<span class="badge es">esempio</span>':''}<div><small>${esc(m.note)}</small></div>
 <div>${Object.entries(m.assign).map(([r,id])=>`<span class="badge">${esc(r)}: ${esc(nm(id))}</span>`).join('')||'<small>Nessuno assegnato</small>'}</div>
 ${cf.map(c=>`<div class="warn">⚠️ ${esc(c)}</div>`).join('')}
 ${admin?`<button class="s" onclick="editMass('${m.id}')">✏️ Modifica / assegna</button><button class="s" onclick="attend('${m.id}')">✅ Presenze</button>`:''}</div>`}
V.turni=()=>`<h2>Turni delle Messe</h2>${admin?`<button class="p" onclick="editMass()">+ Nuova Messa</button>`:''}${upcoming().map(massCard).join('')||'<p>Nessuna Messa in programma.</p>'}
 <details><summary>Messe passate</summary>${D.masses.filter(m=>m.data<iso(new Date())).sort((a,b)=>b.data.localeCompare(a.data)).map(massCard).join('')}</details>`;
window.editMass=id=>{const m=id?D.masses.find(x=>x.id===id):{id:uid(),data:addDays(1),ora:'10:00',tipo:'festiva',note:'',assign:{},presenti:[],nuova:1};
 window._m=JSON.parse(JSON.stringify(m));drawMass()};
function drawMass(){const m=_m;
 modal(`<h2>${m.nuova?'Nuova':'Modifica'} Messa</h2><div class="row"><div><label>Data</label><input type="date" value="${m.data}" onchange="_m.data=this.value;drawMass()"></div><div><label>Ora</label><input type="time" value="${m.ora}" onchange="_m.ora=this.value"></div></div>
 <label>Tipo</label><select onchange="_m.tipo=this.value">${Object.entries(TIPI).map(([k,v])=>`<option value="${k}" ${k===m.tipo?'selected':''}>${v}</option>`).join('')}</select>
 <label>Note</label><input value="${esc(m.note)}" onchange="_m.note=this.value">
 <h3>Ruoli</h3>${ROLES.map(r=>`<label>${r}</label><select onchange="if(this.value)_m.assign['${r}']=this.value;else delete _m.assign['${r}'];drawMass()"><option value="">—</option>${D.servers.map(s=>`<option value="${s.id}" ${m.assign[r]===s.id?'selected':''}>${esc(s.nome)}${s.nonDisp.includes(m.data)?' ⚠️ non disp.':''}</option>`).join('')}</select>`).join('')}
 ${conflicts(m).map(c=>`<div class="warn">⚠️ ${esc(c)}</div>`).join('')}
 <button class="s" onclick="suggest()">✨ Suggerisci rotazione equa</button><br><button class="p" onclick="saveMass()">Salva</button><button class="s" onclick="close()">Annulla</button>${m.nuova?'':`<button class="s warn" onclick="delMass()">Elimina</button>`}`)}
window.suggest=()=>{const m=_m,cnt={};D.servers.forEach(s=>cnt[s.id]=0);D.masses.forEach(x=>Object.values(x.assign).forEach(id=>{if(id in cnt)cnt[id]++}));
 const n=+prompt('Quanti ruoli coprire? (1-'+ROLES.length+')',m.tipo==='feriale'?2:m.tipo==='festiva'?4:ROLES.length)||0;
 const pool=D.servers.filter(s=>!s.nonDisp.includes(m.data)).sort((a,b)=>cnt[a.id]-cnt[b.id]||Math.random()-.5);
 const keep={};for(const r in m.assign){const s=sv(m.assign[r]);if(s&&!s.nonDisp.includes(m.data))keep[r]=m.assign[r]}m.assign=keep;const used=new Set(Object.values(keep));const free=pool.filter(s=>!used.has(s.id));ROLES.slice(0,n).forEach(r=>{if(!m.assign[r]&&free.length)m.assign[r]=free.shift().id});drawMass()};
window.saveMass=()=>{const m=_m;delete m.nuova;const i=D.masses.findIndex(x=>x.id===m.id);i<0?D.masses.push(m):D.masses[i]=m;save();close();render()};
window.delMass=()=>{if(confirm('Eliminare questa Messa?')){D.masses=D.masses.filter(x=>x.id!==_m.id);save();close();render()}};
window.attend=id=>{const m=D.masses.find(x=>x.id===id);
 modal(`<h2>Presenze ${fmt(m.data)}</h2><p>Punti per questa Messa: ${PUNTI[m.tipo]}</p>${D.servers.map(s=>`<label style="display:block;font-size:1rem"><input type="checkbox" style="width:auto" ${m.presenti.includes(s.id)?'checked':''} onchange="tog('${id}','${s.id}',this.checked)"> ${esc(s.nome)} ${Object.values(m.assign).includes(s.id)?'<span class=badge>assegnato</span>':''}</label>`).join('')}<button class="p" onclick="close();render()">Fatto</button>`)};
window.tog=(mid,sid,on)=>{const m=D.masses.find(x=>x.id===mid);m.presenti=m.presenti.filter(x=>x!==sid);if(on)m.presenti.push(sid);save()};
V.disp=()=>{const id=admin?(window._dsel||D.me):D.me;const s=id&&sv(id);
 return `<h2>Disponibilità</h2><label>${admin?'Chierichetto':'Il tuo nome'}</label><select onchange="${admin?'window._dsel':'D.me'}=this.value;save();render()"><option value="">— scegli —</option>${D.servers.map(x=>`<option value="${x.id}" ${x.id===id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select>
 ${s?`<p>Tocca per segnare se ci sei. Di base sei <b class="ok">disponibile</b>.</p>${upcoming().map(m=>{const no=s.nonDisp.includes(m.data);return `<div class="card"><b>${fmt(m.data)} ${m.ora}</b> ${TIPI[m.tipo]}<br><button class="${no?'s no':'p yes'}" onclick="setD('${s.id}','${m.data}',${!no})">${no?'❌ Non disponibile':'✅ Disponibile'}</button></div>`}).join('')}
 <h3>Altre date in cui non ci sei</h3><input type="date" id="nd"><button class="s" onclick="setD('${s.id}',$('#nd').value,true)">Aggiungi</button>
 <div>${s.nonDisp.sort().map(d=>`<span class="badge">${fmt(d)} <a href="#" onclick="setD('${s.id}','${d}',false);return false">✕</a></span>`).join('')}</div>`:''}`};
window.setD=(sid,d,no)=>{if(!d)return;const s=sv(sid);s.nonDisp=s.nonDisp.filter(x=>x!==d);if(no)s.nonDisp.push(d);save();render()};
V.punti=()=>{const p=points();const r=[...D.servers].sort((a,b)=>p[b.id].pt-p[a.id].pt);
 return `<h2>Classifica 🏆</h2><p><small>Punti: feriale ${PUNTI.feriale}, festiva ${PUNTI.festiva}, solennità ${PUNTI.solennita}. Il servizio è un dono: i punti servono a dire grazie!</small></p>
 <table><tr><th>#</th><th>Nome</th><th>Presenze</th><th>Punti</th></tr>${r.map((s,i)=>`<tr><td>${(p[s.id].pt>0&&['🥇','🥈','🥉'][i])||i+1}</td><td>${esc(s.nome)}</td><td>${p[s.id].n}</td><td><b>${p[s.id].pt}</b></td></tr>`).join('')}</table>
 ${admin?'<p><small>Segna le presenze da Turni → ✅ Presenze.</small></p>':''}`};
V.avvisi=()=>`<h2>Avvisi</h2>${admin?`<button class="p" onclick="editPost()">+ Nuovo avviso</button>`:''}
 ${[...D.posts].sort((a,b)=>(b.pin-a.pin)||b.data.localeCompare(a.data)).map(p=>`<div class="card ${p.pin?'pin':''}">${p.pin?'📌 ':''}<b>${esc(p.titolo)}</b> <small>${fmt(p.data)}</small><div style="white-space:pre-wrap">${esc(p.testo)}</div>${admin?`<button class="s" onclick="editPost('${p.id}')">✏️</button><button class="s" onclick="delPost('${p.id}')">🗑</button>`:''}</div>`).join('')}`;
window.editPost=id=>{const p=id?D.posts.find(x=>x.id===id):{titolo:'',testo:'',data:iso(new Date()),pin:false};
 modal(`<h2>Avviso</h2><label>Titolo</label><input id="pt" value="${esc(p.titolo)}"><label>Testo</label><textarea id="px" rows="5">${esc(p.testo)}</textarea><label>Data</label><input id="pd" type="date" value="${p.data}"><label><input id="pp" type="checkbox" style="width:auto" ${p.pin?'checked':''}> In evidenza</label><br><button class="p" onclick="savePost('${id||''}')">Salva</button><button class="s" onclick="close()">Annulla</button>`)};
window.savePost=id=>{const o={id:id||uid(),titolo:$('#pt').value||'Senza titolo',testo:$('#px').value,data:$('#pd').value,pin:$('#pp').checked};const i=D.posts.findIndex(x=>x.id===id);i<0?D.posts.push(o):D.posts[i]=o;save();close();render()};
window.delPost=id=>{if(confirm('Eliminare?')){D.posts=D.posts.filter(x=>x.id!==id);save();render()}};
V.roster=()=>admin?`<h2>Chierichetti</h2><button class="p" onclick="editSrv()">+ Aggiungi</button>${D.servers.map(s=>`<div class="card"><b>${esc(s.nome)}</b> · ${s.eta||'?'} anni<br><small>📞 ${esc(s.contatto)}</small><br><button class="s" onclick="editSrv('${s.id}')">✏️</button><button class="s" onclick="delSrv('${s.id}')">🗑</button></div>`).join('')}`:'<p>Solo per il responsabile.</p>';
window.editSrv=id=>{const s=id?sv(id):{nome:'',eta:'',contatto:''};modal(`<h2>Chierichetto</h2><label>Nome</label><input id="sn" value="${esc(s.nome)}"><label>Età</label><input id="se" type="number" value="${s.eta}"><label>Contatto genitore</label><input id="sc" value="${esc(s.contatto)}"><button class="p" onclick="saveSrv('${id||''}')">Salva</button><button class="s" onclick="close()">Annulla</button>`)};
window.saveSrv=id=>{const s=id?sv(id):{id:uid(),nonDisp:[]};s.nome=$('#sn').value||'Senza nome';s.eta=+$('#se').value||'';s.contatto=$('#sc').value;if(!id)D.servers.push(s);save();close();render()};
window.delSrv=id=>{if(confirm('Eliminare questo chierichetto?')){D.servers=D.servers.filter(x=>x.id!==id);D.masses.forEach(m=>{for(const r in m.assign)if(m.assign[r]===id)delete m.assign[r];m.presenti=m.presenti.filter(x=>x!==id)});save();render()}};
V.set=()=>admin?`<h2>Impostazioni</h2><div class="card"><label>Nuovo PIN</label><input id="np" type="password" inputmode="numeric"><button class="p" onclick="if($('#np').value.length>=4){D.pin=$('#np').value;save();alert('PIN cambiato')}else alert('Almeno 4 cifre')">Cambia PIN</button></div>
 <div class="card"><h3>Backup</h3><button class="p" onclick="exp()">⬇️ Esporta JSON</button><label>Importa backup</label><input type="file" accept=".json,application/json" onchange="imp(this.files[0])"></div>
 <div class="card"><button class="s" onclick="if(confirm('Rimuovere tutti i dati di esempio?'))clearEx()">🧹 Rimuovi esempi</button><button class="s warn" onclick="if(confirm('Cancellare TUTTO?')){localStorage.removeItem(KEY);location.reload()}">Reset totale</button></div>`:'<p>Solo per il responsabile.</p>';
window.exp=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,2)],{type:'application/json'}));a.download='mochi-sml-backup-'+iso(new Date())+'.json';a.click()};
window.imp=f=>{if(!f)return;f.text().then(t=>{const o=JSON.parse(t);if(!o.servers||!o.masses)throw 0;D=o;save();alert('Backup importato');render()}).catch(()=>alert('File non valido'))};
window.clearEx=()=>{const ex=D.servers.filter(s=>/esempio/i.test(s.nome)).map(s=>s.id);ex.forEach(id=>{D.servers=D.servers.filter(x=>x.id!==id)});D.masses=D.masses.filter(m=>!/esempio/i.test(m.note));D.posts=D.posts.filter(p=>!/esempio/i.test(p.titolo));if(ex.includes(D.me))D.me=null;save();render()};
const G={
 'I ruoli':`<p><b>Crocifero</b>: porta la croce astile e apre la processione. Cammina con calma, la croce dritta!</p><p><b>Ceroferari</b>: due chierichetti con i candelieri accesi ai lati della croce; accompagnano anche la proclamazione del Vangelo.</p><p><b>Turiferario</b>: porta il turibolo con l'incenso. Il fumo che sale è segno della preghiera che sale a Dio.</p><p><b>Navicella</b>: porta la navicella, il piccolo contenitore dell'incenso, e la porge al sacerdote.</p><p><b>Libro</b>: tiene aperto il Messale davanti al sacerdote per le preghiere alla sede.</p><p><b>Campanelli</b>: suona il campanello all'epiclesi (quando il sacerdote stende le mani sui doni) e all'elevazione dell'Ostia e del Calice.</p><p><b>Acqua e vino</b>: porta le ampolline all'altare per la preparazione dei doni e l'acqua per il lavabo.</p>`,
 'Le vesti liturgiche':`<p><b>Del chierichetto</b>: la <b>tunica</b> o <b>veste talare</b> con la <b>cotta</b> bianca sopra; il bianco ricorda il Battesimo.</p><p><b>Del sacerdote</b>: <b>camice</b> (veste bianca lunga), <b>cingolo</b> (cordone in vita), <b>stola</b> (striscia di stoffa al collo, segno del ministero) e <b>casula</b> (veste esterna del colore del tempo liturgico).</p><p><b>Del diacono</b>: camice, stola portata di traverso sulla spalla sinistra e <b>dalmatica</b>.</p>`,
 'Le parti della Messa':`<ol><li><b>Riti di introduzione</b>: processione, segno della croce, saluto, atto penitenziale, Gloria (nei giorni di festa), colletta.</li><li><b>Liturgia della Parola</b>: prima lettura, salmo, seconda lettura (la domenica), Alleluia, <b>Vangelo</b>, omelia, Credo, preghiera dei fedeli.</li><li><b>Liturgia Eucaristica</b>: preparazione dei doni, preghiera eucaristica con la <b>consacrazione</b>, Padre Nostro, scambio della pace, Agnello di Dio, Comunione.</li><li><b>Riti di conclusione</b>: benedizione e congedo: «Andate in pace».</li></ol><p><small>Nota: a Milano molte parrocchie seguono il <b>rito ambrosiano</b>, con alcune differenze (es. lo scambio della pace prima dell'offertorio, Avvento di 6 settimane). Chiedi al tuo responsabile come si fa nella nostra parrocchia!</small></p>`,
 'Colori e tempi liturgici':`<p><span class="sw" style="background:#fff"></span> <b>Bianco</b>: Natale, Pasqua, feste del Signore, della Madonna e dei Santi non martiri. Segno di gioia e luce.</p><p><span class="sw" style="background:#c00"></span> <b>Rosso</b>: Pentecoste, Domenica delle Palme, Venerdì Santo, feste dei martiri e degli Apostoli. Ricorda lo Spirito Santo e il sangue dei martiri.</p><p><span class="sw" style="background:#2e6b3a"></span> <b>Verde</b>: Tempo Ordinario. Colore della speranza.</p><p><span class="sw" style="background:#5b3a8c"></span> <b>Viola</b>: Avvento e Quaresima. Tempo di attesa e conversione.</p><p><span class="sw" style="background:#e8a0b8"></span> <b>Rosaceo</b> (facoltativo): III domenica di Avvento e IV di Quaresima nel rito romano.</p><p><b>L'anno liturgico</b>: Avvento → Natale → Tempo Ordinario → Quaresima → Triduo Pasquale → Tempo di Pasqua (fino a Pentecoste) → Tempo Ordinario, fino a Cristo Re.</p><p><small>Nel rito ambrosiano l'uso dei colori ha alcune differenze rispetto al rito romano. Segui le indicazioni del parroco.</small></p>`,
 'Regole d\'oro':`<ul><li>Arriva 15 minuti prima.</li><li>Fai un breve momento di preghiera in sacrestia.</li><li>Cammina piano, mani giunte, sguardo all'altare.</li><li>Inchinati all'altare passandoci davanti; genufletti davanti al tabernacolo.</li><li>Se sbagli, niente panico: sorridi e continua!</li><li>Se non puoi venire, segnalalo subito nella sezione Disponibilità.</li></ul>`};
V.form=()=>`<h2>Formazione 📖</h2>${Object.entries(G).map(([t,h])=>`<details class="card"><summary><b>${t}</b></summary>${h}</details>`).join('')}`;
render();
if(!window.Capacitor&&'serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
