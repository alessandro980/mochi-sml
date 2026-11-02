'use strict';
// ===== Sincronizzazione tra telefoni (Firebase Firestore) con fallback locale =====
// Interfaccia adattatore: { start(onDoc, onStatus), put(key, value), stop() }
// Dati condivisi: SOLO nomi, squadre, ruoli cerimonieri, calendario, presenze, risposte, scambi, periodi premio.
// Mai condivisi: età, contatti dei genitori, PIN, impostazioni.
const SYNC_CFG_KEY='mochi-sync-cfg',SYNC_LAST_KEY='mochi-sync-last';
const DEV=localStorage.getItem('mochi-dev')||(()=>{const d='d'+Math.random().toString(36).slice(2,10);localStorage.setItem('mochi-dev',d);return d})();
const Sync={status:'locale',msg:'Dati solo su questo telefono',adapter:null,last:{},applying:false};
try{Sync.last=JSON.parse(localStorage.getItem(SYNC_LAST_KEY))||{}}catch(e){}
const syncCfg=()=>{try{return JSON.parse(localStorage.getItem(SYNC_CFG_KEY))||{}}catch(e){return {}}};
const EX=/esempio/i;
function sharedEntities(){const E={};
 D.servers.filter(s=>!EX.test(s.nome)).forEach(s=>E['servers/'+s.id]={nome:s.nome,squadra:s.squadra||'',cer:!!s.cer,leads:s.leads||[],esperienza:s.esperienza||''});
 D.masses.filter(m=>!EX.test(m.note||'')).forEach(m=>E['masses/'+m.id]={data:m.data,ora:m.ora,tipo:m.tipo,note:m.note||'',squadra:m.squadra||'',uff:!!m.uff,cer:m.cer,assign:m.assign,presenti:m.presenti,noteServ:m.noteServ||''});
 Object.entries(D.responses||{}).forEach(([k,v])=>E['responses/'+k]=v);
 Object.entries(D.swaps||{}).forEach(([k,v])=>E['swaps/'+k]=v);
 (D.periods||[]).forEach(p=>E['periods/'+p.id]=p);
 D.posts.filter(p=>!EX.test(p.titolo)).forEach(p=>E['posts/'+p.id]={titolo:p.titolo,testo:p.testo,data:p.data,pin:!!p.pin});
 return E}
function applyDoc(key,doc){const [kind,id]=[key.slice(0,key.indexOf('/')),key.slice(key.indexOf('/')+1)];const v=doc.v,del=doc.del;
 if(kind==='servers'){let s=D.servers.find(x=>x.id===id);if(del){D.servers=D.servers.filter(x=>x.id!==id);return}if(!s){s={id,eta:'',contatto:'',nonDisp:[]};D.servers.push(s)}Object.assign(s,v)}
 else if(kind==='masses'){let m=D.masses.find(x=>x.id===id);if(del){D.masses=D.masses.filter(x=>x.id!==id);return}if(!m){m={id,check:null};D.masses.push(m)}Object.assign(m,v)}
 else if(kind==='responses'){if(del)delete D.responses[id];else D.responses[id]=v}
 else if(kind==='swaps'){if(del)delete D.swaps[id];else D.swaps[id]=v}
 else if(kind==='periods'){D.periods=(D.periods||[]).filter(x=>x.id!==id);if(!del)D.periods.push(v)}
 else if(kind==='posts'){let p=D.posts.find(x=>x.id===id);if(del){D.posts=D.posts.filter(x=>x.id!==id);return}if(!p){p={id};D.posts.push(p)}Object.assign(p,v)}}
const enc=k=>k.replace('/','~'),dec=k=>k.replace('~','/');
let _rt=null;
function onRemote(key,doc){if(doc.dev===DEV&&Sync.last[key]!==undefined)return;const cur=Sync.last[key+'#ts']||0;if((doc.ts||0)<=cur)return;
 Sync.applying=true;try{applyDoc(key,doc)}finally{Sync.applying=false}
 const E=sharedEntities();Sync.last[key]=doc.del?null:JSON.stringify(E[key]);Sync.last[key+'#ts']=doc.ts;localStorage.setItem(SYNC_LAST_KEY,JSON.stringify(Sync.last));
 save();clearTimeout(_rt);_rt=setTimeout(()=>{if(document.querySelector('#modal.hidden'))render()},150)}
async function syncPush(){if(!Sync.adapter||Sync.status!=='online')return;const E=sharedEntities(),now=Date.now();const jobs=[];
 for(const [k,v] of Object.entries(E)){const j=JSON.stringify(v);if(Sync.last[k]!==j){Sync.last[k]=j;Sync.last[k+'#ts']=now;jobs.push(Sync.adapter.put(k,{k,v,ts:now,dev:DEV,del:false}))}}
 for(const k of Object.keys(Sync.last)){if(k.includes('#'))continue;if(!(k in E)&&Sync.last[k]!==null){Sync.last[k]=null;Sync.last[k+'#ts']=now;jobs.push(Sync.adapter.put(k,{k,v:null,ts:now,dev:DEV,del:true}))}}
 if(jobs.length){localStorage.setItem(SYNC_LAST_KEY,JSON.stringify(Sync.last));try{await Promise.all(jobs)}catch(e){Sync.msg='Errore invio: '+e.message}}}
// --- Adattatore Firestore ---
function loadScript(src){return new Promise((ok,ko)=>{if(window.FBSDK)return ok();const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>ko(new Error('impossibile caricare '+src));document.head.appendChild(s)})}
function FirestoreAdapter(cfg){let unsub=null;return {
 async start(onDoc,onStatus){await loadScript('firebase-bundle.js');const F=window.FBSDK;
  const app=F.initializeApp({apiKey:cfg.apiKey,authDomain:cfg.authDomain||cfg.projectId+'.firebaseapp.com',projectId:cfg.projectId,appId:cfg.appId},'mochi-'+Date.now());
  const auth=F.getAuth(app);let db;try{db=F.initializeFirestore(app,{localCache:F.persistentLocalCache()})}catch(e){db=F.initializeFirestore(app,{localCache:F.memoryLocalCache()})}
  if(cfg.emu){const [h,p]=cfg.emu.split(':');F.connectFirestoreEmulator(db,h,+p||8080);F.connectAuthEmulator(auth,'http://'+h+':'+(cfg.emuAuth||9099),{disableWarnings:true})}
  await F.signInAnonymously(auth);
  const col=F.collection(db,'gruppi',cfg.group,'docs');this._put=(k,d)=>F.setDoc(F.doc(col,enc(k)),d);
  unsub=F.onSnapshot(col,snap=>{snap.docChanges().forEach(c=>{const d=c.doc.data();onDoc(dec(c.doc.id),d)});onStatus('online')},e=>onStatus('errore',e.message))},
 put(k,d){return this._put(k,d)},stop(){unsub&&unsub()}}}
// --- Adattatore finto (test: due "telefoni" nello stesso browser tramite BroadcastChannel+memoria) ---
function MockAdapter(cfg){const ch=new BroadcastChannel('mochi-mock-'+cfg.group);const store=JSON.parse(localStorage.getItem('mock-hub-'+cfg.group)||'{}');return {
 async start(onDoc,onStatus){ch.onmessage=e=>onDoc(e.data.k,e.data.d);Object.entries(store).forEach(([k,d])=>onDoc(k,d));onStatus('online')},
 async put(k,d){ch.postMessage({k,d})},stop(){ch.close()}}}
window.MochiAdapters={FirestoreAdapter,MockAdapter};
async function syncStart(){const c=syncCfg();Sync.adapter&&Sync.adapter.stop();Sync.adapter=null;
 if(!c.on||!c.group||(!c.mock&&(!c.apiKey||!c.projectId))){Sync.status='locale';Sync.msg='Dati solo su questo telefono';return}
 Sync.status='connessione';Sync.msg='Connessione…';const a=c.mock?MockAdapter(c):FirestoreAdapter(c);Sync.adapter=a;
 try{await a.start(onRemote,(st,m)=>{const was=Sync.status;Sync.status=st;Sync.msg=st==='online'?'Sincronizzato (gruppo '+c.group+')':'Errore: '+m;if(was!=='online'&&st==='online')syncPush()})}
 catch(e){Sync.status='errore';Sync.msg='Errore: '+e.message}}
setInterval(syncPush,1500);syncStart();window.Sync=Sync;window.syncStart=syncStart;
// --- Impostazioni ---
const _setS=V.set;V.set=()=>{if(!admin)return _setS();const c=syncCfg();const f=(k,l,ph)=>`<label>${l}</label><input id="sy_${k}" value="${esc(c[k]||'')}" placeholder="${ph||''}">`;
 return _setS()+`<div class="card"><h3>🔄 Sincronizzazione tra telefoni</h3><p>Stato: <b class="${Sync.status==='online'?'ok':Sync.status==='errore'?'warn':''}">${esc(Sync.msg)}</b></p>
 <small>Serve un progetto Firebase gratuito (vedi guida SYNC-README). Vengono condivisi solo nomi, squadre, calendario, presenze, risposte e scambi: <b>mai età e contatti</b>.</small>
 <label style="display:block;font-size:1rem;font-weight:400"><input type="checkbox" id="sy_on" style="width:auto" ${c.on?'checked':''}> Attiva sincronizzazione</label>
 ${f('group','Codice gruppo (uguale su tutti i telefoni, difficile da indovinare)','es. sml-chierichetti-7k3q9x')}${f('apiKey','apiKey')}${f('projectId','projectId')}${f('appId','appId')}${f('authDomain','authDomain (facoltativo)')}
 <details><summary><small>Avanzate</small></summary>${f('emu','Emulatore (host:porta, solo per test)','localhost:8080')}</details>
 <button class="p" onclick="saveSync()">Salva e connetti</button><button class="s" onclick="shareSync()">📤 Condividi configurazione</button></div>`};
window.saveSync=()=>{const c={};['group','apiKey','projectId','appId','authDomain','emu'].forEach(k=>{const v=$('#sy_'+k).value.trim();if(v)c[k]=v});c.on=$('#sy_on').checked;localStorage.setItem(SYNC_CFG_KEY,JSON.stringify(c));syncStart().then(render);render()};
window.shareSync=()=>{const c=syncCfg();const code='MOCHI-SYNC:'+btoa(unescape(encodeURIComponent(JSON.stringify({group:c.group,apiKey:c.apiKey,projectId:c.projectId,appId:c.appId,authDomain:c.authDomain}))));
 modal(`<h2>📤 Configurazione</h2><p>Manda questo codice ai cerimonieri e alle famiglie. Sul loro telefono: Home → 🔄 Collega al gruppo → incolla.</p><textarea rows="5" readonly>${code}</textarea><button class="s" onclick="close()">Chiudi</button>`)};
window.joinSync=()=>{const t=prompt('Incolla il codice MOCHI-SYNC ricevuto dal responsabile:');if(!t)return;try{const c=JSON.parse(decodeURIComponent(escape(atob(t.trim().replace(/^MOCHI-SYNC:/,'')))));c.on=true;localStorage.setItem(SYNC_CFG_KEY,JSON.stringify(c));syncStart().then(render);alert('Collegato al gruppo '+c.group)}catch(e){alert('Codice non valido')}};
const _homeS=V.home;V.home=()=>_homeS()+`<div class="syncline">${Sync.status==='online'?'🟢 '+esc(Sync.msg):'⚪ '+esc(Sync.msg)} ${Sync.status!=='online'?'· <a href="#" onclick="joinSync();return false">🔄 Collega al gruppo</a>':''}</div>`;
