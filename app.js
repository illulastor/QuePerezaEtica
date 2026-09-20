// EJCETICA — duelo / equipos / preguntas. Sin login, localStorage.
const LS_TEAMS = 'ejcetica_teams_v2';
const LS_QS = 'ejcetica_questions_v2';

let editingTeamId = null;
let editingQuestionId = null;
let match = { comp:'', A:null, B:null, ptsA:0, ptsB:0, livesA:0, livesB:0, total:5, round:0, turn:'A', asked:[], current:null, over:false };
let answering = false;
let timer = { total:30, left:30, id:null, running:false };

function uid(){ return Math.random().toString(36).slice(2,9); }
function load(k, fb){ try{ const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v)&&v.length?v:fb; }catch{ return fb; } }
function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

const defaultTeams = [
  { id: uid(), name:'Constructores de Paz', color:'#1F7A5A' },
  { id: uid(), name:'Guardianes de Ética', color:'#2E86AB' },
  { id: uid(), name:'Sembradores de Paz', color:'#C98A2B' },
];
const defaultQuestions = [
  { id: uid(), text:'¿Qué harías si ves a un compañero haciendo trampa en una evaluación?' },
  { id: uid(), text:'¿Cómo resolverías un conflicto en tu ambiente de formación sin violencia?' },
  { id: uid(), text:'Un compañero es excluido del grupo. ¿Qué acción concreta propones?' },
  { id: uid(), text:'¿Qué significa actuar con honestidad en tu proyecto?' },
  { id: uid(), text:'¿Qué derecho defenderías primero en tu comunidad y por qué?' },
  { id: uid(), text:'¿Es correcto quedarse callado ante una injusticia para evitar problemas? Justifica.' },
  { id: uid(), text:'Propón un acuerdo de aula que promueva el diálogo y el respeto.' },
  { id: uid(), text:'¿Cómo usarías las redes sociales para construir paz y no odio?' },
  { id: uid(), text:'¿Qué valor te representa más: respeto, responsabilidad o solidaridad? ¿Por qué?' },
  { id: uid(), text:'Si encuentras un objeto perdido en clase, ¿cuál es el actuar ético correcto?' },
];

let teams = load(LS_TEAMS, defaultTeams);
// Migración: las preguntas antiguas traían categoría o color; se conserva solo el texto
let questions = load(LS_QS, defaultQuestions).map(q=>({ id:q.id||uid(), text:String(q.text||'').trim() })).filter(q=>q.text.length>0);
if(questions.length===0) questions = JSON.parse(JSON.stringify(defaultQuestions));
teams.forEach(t=>{ if(!t.color) t.color = '#1F7A5A'; });
persist();
function persist(){ save(LS_TEAMS, teams); save(LS_QS, questions); }

// --- Navegación ---
function showView(v){
  ['duelo','equipos','preguntas'].forEach(k=>{
    document.getElementById('view-'+k).hidden = k!==v;
  });
  document.querySelectorAll('.menu-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.view===v);
  });
  window.scrollTo({top:0, behavior:'smooth'});
}

// --- Color pickers (paleta + input + hex) ---
function bindColor(prefix, pickerId){
  const color = document.getElementById(prefix+'Color');
  const hex = document.getElementById(prefix+'Hex');
  const picker = document.getElementById(pickerId);
  const norm = v=>{
    v = v.trim();
    if(!v.startsWith('#')) v = '#'+v;
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : null;
  };
  const set = v=>{
    color.value = v;
    hex.value = v.toUpperCase();
    picker.querySelectorAll('button').forEach(x=>x.classList.toggle('sel', x.dataset.color.toUpperCase()===v.toUpperCase()));
  };
  color.addEventListener('input', ()=> set(color.value.toUpperCase()));
  hex.addEventListener('input', ()=>{ const v = norm(hex.value); if(v) set(v); });
  picker.addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    set(b.dataset.color);
  });
  return { get: ()=> norm(hex.value) || color.value.toUpperCase(), set };
}
const teamColorCtl = bindColor('team', 'colorPicker');

// --- Equipos: crear / editar / eliminar ---
function saveTeam(){
  const inp = document.getElementById('teamName');
  const name = inp.value.trim();
  const color = teamColorCtl.get();
  if(!name) return alert('Escribe el nombre del equipo.');
  if(!/^#[0-9A-Fa-f]{6}$/.test(color)) return alert('Color inválido. Usa formato #RRGGBB.');
  if(teams.some(t=>t.id!==editingTeamId && t.name.toLowerCase()===name.toLowerCase()))
    return alert('Ese equipo ya existe.');
  if(editingTeamId){
    const t = teams.find(t=>t.id===editingTeamId);
    t.name = name; t.color = color.toUpperCase();
  } else {
    teams.push({ id:uid(), name, color:color.toUpperCase() });
  }
  cancelTeamEdit(); persist(); renderAll();
}
function editTeam(id){
  const t = teams.find(t=>t.id===id); if(!t) return;
  editingTeamId = id;
  document.getElementById('teamName').value = t.name;
  teamColorCtl.set(t.color);
  document.getElementById('teamFormTitle').textContent = 'Editar equipo';
  document.getElementById('teamSubmit').textContent = 'Actualizar equipo';
  document.getElementById('teamCancel').hidden = false;
  showView('equipos');
}
function cancelTeamEdit(){
  editingTeamId = null;
  document.getElementById('teamName').value = '';
  teamColorCtl.set('#1F7A5A');
  document.getElementById('teamFormTitle').textContent = 'Crear equipo';
  document.getElementById('teamSubmit').textContent = 'Guardar equipo';
  document.getElementById('teamCancel').hidden = true;
}
function delTeam(id){
  if(!confirm('¿Eliminar este equipo?')) return;
  teams = teams.filter(t=>t.id!==id);
  if(editingTeamId===id) cancelTeamEdit();
  persist(); renderAll();
}

// --- Preguntas: crear / editar / eliminar ---
function saveQuestion(){
  const text = document.getElementById('qText').value.trim();
  if(text.length < 8) return alert('Escribe una pregunta más completa (mínimo 8 caracteres).');
  if(editingQuestionId){
    questions.find(q=>q.id===editingQuestionId).text = text;
  } else {
    questions.push({ id:uid(), text });
  }
  cancelQuestionEdit(); persist(); renderAll();
}
function editQuestion(id){
  const q = questions.find(q=>q.id===id); if(!q) return;
  editingQuestionId = id;
  document.getElementById('qText').value = q.text;
  document.getElementById('qFormTitle').textContent = 'Editar pregunta';
  document.getElementById('qSubmit').textContent = 'Actualizar pregunta';
  document.getElementById('qCancel').hidden = false;
  showView('preguntas');
}
function cancelQuestionEdit(){
  editingQuestionId = null;
  document.getElementById('qText').value = '';
  document.getElementById('qFormTitle').textContent = 'Crear pregunta';
  document.getElementById('qSubmit').textContent = 'Guardar pregunta';
  document.getElementById('qCancel').hidden = true;
}
function delQuestion(id){
  if(!confirm('¿Eliminar esta pregunta?')) return;
  questions = questions.filter(q=>q.id!==id);
  if(editingQuestionId===id) cancelQuestionEdit();
  persist(); renderAll();
}
function resetData(){
  if(!confirm('¿Restablecer equipos y preguntas a los valores iniciales?')) return;
  cancelTeamEdit(); cancelQuestionEdit();
  teams = JSON.parse(JSON.stringify(defaultTeams));
  questions = JSON.parse(JSON.stringify(defaultQuestions));
  persist(); renderAll();
}

// --- Render ---
function renderAll(){
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('statTeams', teams.length); set('statQuestions', questions.length);
  set('teamCount', teams.length); set('qTotal', questions.length);
  if(teams[0]) set('heroTeamA', teams[0].name);
  if(teams[1]) set('heroTeamB', teams[1].name);

  document.getElementById('teamList').innerHTML = teams.map(t=>
    `<div class="item"><span class="swatch" style="background:${t.color}"></span><b>${esc(t.name)}</b><span class="hex">${esc(t.color)}</span><span class="item-actions"><button class="btn-mini" onclick="editTeam('${t.id}')">Editar</button><button class="btn-mini danger" onclick="delTeam('${t.id}')">Eliminar</button></span></div>`
  ).join('') || '<p class="muted">No hay equipos. Crea el primero.</p>';

  document.getElementById('questionList').innerHTML = questions.map(q=>
    `<div class="item"><span class="qtext">${esc(q.text)}</span><span class="item-actions"><button class="btn-mini" onclick="editQuestion('${q.id}')">Editar</button><button class="btn-mini danger" onclick="delQuestion('${q.id}')">Eliminar</button></span></div>`
  ).join('') || '<p class="muted">No hay preguntas. Crea la primera.</p>';

  const opts = teams.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');
  const a = document.getElementById('selA'), b = document.getElementById('selB');
  const va = a.value, vb = b.value;
  a.innerHTML = opts; b.innerHTML = opts;
  if(teams[0]) a.value = [...a.options].some(o=>o.value===va) ? va : teams[0].id;
  if(teams[1]) b.value = [...b.options].some(o=>o.value===vb) ? vb : teams[1].id;

  document.getElementById('compMsg').textContent =
    teams.length>=2 && questions.length>=1
    ? `Listo: ${teams.length} equipos y ${questions.length} preguntas abiertas.`
    : 'Se necesita mínimo 2 equipos y 1 pregunta. Créalos en el menú Equipos y Preguntas.';
}
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// --- Competición 1v1 ---
function randomTeams(){
  if(teams.length<2) return alert('Crea al menos 2 equipos.');
  let i = Math.floor(Math.random()*teams.length), j;
  do{ j = Math.floor(Math.random()*teams.length); }while(j===i);
  document.getElementById('selA').value = teams[i].id;
  document.getElementById('selB').value = teams[j].id;
}
function startMatch(){
  const idA = document.getElementById('selA').value;
  const idB = document.getElementById('selB').value;
  if(!idA || !idB) return alert('Faltan equipos.');
  if(idA===idB) return alert('Elige dos equipos diferentes para el 1 vs 1.');
  if(questions.length<1) return alert('Crea al menos 1 pregunta en el menú Preguntas.');
  const teamA = teams.find(t=>t.id===idA), teamB = teams.find(t=>t.id===idB);
  let n = parseInt(document.getElementById('qAmount').value, 10);
  if(isNaN(n)) n = 5;
  n = Math.max(1, Math.min(20, n));
  document.getElementById('qAmount').value = n;
  let secs = parseInt(document.getElementById('qTime').value, 10);
  if(isNaN(secs)) secs = 30;
  secs = Math.max(5, Math.min(120, secs));
  document.getElementById('qTime').value = secs;
  timer.total = secs; timer.left = secs;
  match = {
    comp: teamA.name + ' vs ' + teamB.name,
    A: teamA, B: teamB,
    ptsA:0, ptsB:0, livesA:n, livesB:n, total:n, round:0, turn:'A', asked:[], current:null, over:false
  };
  stopTimer(); resetTimer(false);
  document.getElementById('arena').hidden = false;
  document.getElementById('winnerCard').hidden = true;
  battle.shots = []; battle.parts = []; battle.flashA = 0; battle.flashB = 0; battle.shake = 0;
  battle.deadA = battle.deadB = false; battle.surrenderA = battle.surrenderB = false;
  battle.pending = []; battle.rings = []; battle.scorches = []; battle.focusT = 0; battle.holdT = 0; battle.pendingMissile = null; battle.plane = null;
  battle.epoch++;
  resetTankState();
  cam.x = BW/2; cam.y = 120; cam.z = FIT_Z;
  document.getElementById('winnerOverlay').hidden = true;
  stopAllRockets();
  paintMatch();
  nextQuestion();
  document.getElementById('arena').scrollIntoView({behavior:'smooth'});
}
function pips(el, lives, total){
  const e = document.getElementById(el); if(!e) return;
  let h = '';
  for(let i=0;i<total;i++) h += `<i class="${i<lives?'':'off'}"></i>`;
  e.innerHTML = h;
}
// --- Batalla de tanques (canvas) ---
// Acierto = tu tanque dispara al rival y le quita 1 vida. Fallo = tiro errado sin daño.
if(typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
    r = Math.min(typeof r === 'number' ? r : 0, w/2, h/2);
    this.moveTo(x+r, y);
    this.arcTo(x+w, y, x+w, y+h, r);
    this.arcTo(x+w, y+h, x, y+h, r);
    this.arcTo(x, y+h, x, y, r);
    this.arcTo(x, y, x+w, y, r);
    this.closePath();
    return this;
  };
}
const BW = 1800, BH = 220, BGY = 182;
const CW = 640, CH = 220; // tamaño real del canvas en pantalla
const FIT_Z = CW/BW; // encuadre completo: ambos tanques lado a lado
const TY = 132, VGY = 190; // suelo de los tanques (cima) y fondo del valle
const battle = { shots:[], parts:[], pending:[], rings:[], scorches:[], flashA:0, flashB:0, muzzleA:0, muzzleB:0, shake:0, colorA:'#39A900', colorB:'#2E86AB', deadA:false, deadB:false, surrenderA:false, surrenderB:false, focusT:0, focusX:320, holdT:0, holdX:0, holdY:0, ctx:null, bg:null, epoch:0 };
const TANK_AX = 90, TANK_BX = 1710;
const BASE_A = -0.14, BASE_B = Math.PI + 0.14;
const tanks = {
  A:{ ang:BASE_A, recoil:0, aiming:0, aimAng:BASE_A },
  B:{ ang:BASE_B, recoil:0, aiming:0, aimAng:BASE_B },
};
const cam = { x:BW/2, y:120, z:FIT_Z };
// hierba y rocas del campo (posiciones fijas)
let _seed = 1234567;
function _rnd(){ _seed = (_seed*16807)%2147483647; return _seed/2147483647; }
const tufts = []; for(let i=0;i<70;i++) tufts.push({ x:_rnd()*BW, h:4+_rnd()*5 });
const rocks = []; for(let i=0;i<12;i++) rocks.push({ x:_rnd()*BW, r:3+_rnd()*5 });
function battleColors(){ if(match.A){ battle.colorA = match.A.color; battle.colorB = match.B.color; } }
function sideDir(side){ return side==='A' ? 1 : -1; }
function turretPos(side){
  const X = side==='A' ? TANK_AX : TANK_BX;
  return { x:X + sideDir(side)*2, y:VGY-40 };
}
function barrelTip(side){
  const p = turretPos(side), a = tanks[side].ang;
  return { x:p.x + Math.cos(a)*46, y:p.y + Math.sin(a)*46 };
}
function resetTankState(){
  tanks.A.ang = BASE_A; tanks.A.recoil = 0; tanks.A.aiming = 0; tanks.A.aimAng = BASE_A;
  tanks.B.ang = BASE_B; tanks.B.recoil = 0; tanks.B.aiming = 0; tanks.B.aimAng = BASE_B;
  battle.pending = []; battle.focusT = 0;
}
function fireTank(side, hit){
  // artillería estilo Ballistica: se calcula ángulo y velocidad con física real.
  // Acierto = misil rápido y tenso al rival. Fallo/ambiental = parábola lenta al valle.
  // Acierto = parábola exacta al rival. Fallo/ambiental = tiro corto al valle.
  const dir = sideDir(side);
  const x0 = (side==='A' ? TANK_AX : TANK_BX) + dir*46;
  const S = 13 + Math.random()*4;
  const sol = solveShot(x0, dir, hit, S);
  tanks[side].aiming = 1;
  tanks[side].aimAng = sol.ang;
  battle.pending.push({ side, hit, t:22, vx:sol.vx, vy:sol.vy });
}
const GRAV = 0.072; // gravedad del proyectil (la velocidad varía en cada disparo)
function solveShot(x0, dir, hit, S){
  const targetX = dir > 0 ? TANK_BX-32 : TANK_AX+32;
  const dx = Math.abs(targetX - x0);
  // alcance R = S²·sin(2θ)/G  →  ángulo exacto al rival (el mismo para todas las balas)
  let th = Math.asin(Math.max(0.05, Math.min(0.99, dx*GRAV/(S*S))))/2;
  if(!hit){
    // fallo: ángulo aleatorio entre 5° y 55°, cae donde caiga
    const th = (5 + Math.random()*50)*Math.PI/180;
    return { vx: dir*S*Math.cos(th), vy: -S*Math.sin(th), ang: dir > 0 ? -th : Math.PI+th };
  }
  return { vx: dir*S*Math.cos(th), vy: -S*Math.sin(th), ang: dir > 0 ? -th : Math.PI+th };
}
// Misil de remate: aparece solo si el rival sobrevivió al impacto.
// No sale del tanque: nace detrás de la montaña propia, pequeño y lejos,
// se acerca creciendo hasta impactar (visual, sin más daño).
function launchMissile(from, target, finale){
  const dir = sideDir(from);
  const mx = from==='A' ? TANK_AX : TANK_BX;
  const x0 = mx - dir*130, y0 = TY-150;
  const tp = target==='B' ? { x:TANK_BX-10, y:VGY-24 } : { x:TANK_AX+10, y:VGY-24 };
  const dx = tp.x-x0, dy = tp.y-y0, d0 = Math.hypot(dx, dy) || 1;
  battle.shots.push({ x:x0, y:y0, vx:dx/d0*8, vy:dy/d0*8, target, homing:true, finale:!!finale, trail:[], size:0.35, d0, rocket:sndRocketStart() });
  for(let i=0;i<8;i++)
    battle.parts.push({ x:x0, y:y0, vx:(Math.random()-0.5)*2, vy:-0.5-Math.random(), life:0.8, decay:0.03, smoke:true, size:6 });
  sndFire();
}
// --- Sonidos sintetizados (disparo, impacto, explosión) ---
let AC = null;
function ac(){
  if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(AC && AC.state==='suspended') AC.resume();
  return AC;
}
function sndFire(){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  // chasquido inicial brillante
  const snapLen = Math.floor(ctx.sampleRate*0.07), snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate), sd = snapBuf.getChannelData(0);
  for(let i=0;i<snapLen;i++) sd[i] = (Math.random()*2-1)*Math.pow(1-i/snapLen, 1.2);
  const snap = ctx.createBufferSource(); snap.buffer = snapBuf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1600;
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.4, t0); sg.gain.exponentialRampToValueAtTime(0.001, t0+0.07);
  snap.connect(hp); hp.connect(sg); sg.connect(ctx.destination); snap.start(t0);
  // cuerpo del disparo
  const len = Math.floor(ctx.sampleRate*0.35), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 2);
  const ns = ctx.createBufferSource(); ns.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(1100, t0); f.frequency.exponentialRampToValueAtTime(80, t0+0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.65, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+0.35);
  ns.connect(f); f.connect(g); g.connect(ctx.destination); ns.start(t0);
  const o = ctx.createOscillator(), g2 = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(36, t0+0.3);
  g2.gain.setValueAtTime(0.6, t0); g2.gain.exponentialRampToValueAtTime(0.001, t0+0.32);
  o.connect(g2); g2.connect(ctx.destination); o.start(t0); o.stop(t0+0.35);
}
function sndImpact(){
  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime;
  // golpe metálico: agudo + armónicos
  const o0 = ctx.createOscillator(), g0 = ctx.createGain();
  o0.type = 'square'; o0.frequency.value = 185;
  g0.gain.setValueAtTime(0.3, t0); g0.gain.exponentialRampToValueAtTime(0.001, t0+0.1);
  o0.connect(g0); g0.connect(ctx.destination); o0.start(t0); o0.stop(t0+0.12);
  [587, 880, 1320].forEach((fr, i)=>{
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = fr;
    g.gain.setValueAtTime(0.24, t0+i*0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0+0.22+i*0.015);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0+i*0.015); o.stop(t0+0.28);
  });
  const clen = Math.floor(ctx.sampleRate*0.05), cbuf = ctx.createBuffer(1, clen, ctx.sampleRate), cd = cbuf.getChannelData(0);
  for(let i=0;i<clen;i++) cd[i] = (Math.random()*2-1)*Math.pow(1-i/clen, 1.5);
  const cn = ctx.createBufferSource(); cn.buffer = cbuf;
  const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 2800;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.35, t0); cg.gain.exponentialRampToValueAtTime(0.001, t0+0.05);
  cn.connect(chp); chp.connect(cg); cg.connect(ctx.destination); cn.start(t0);
}
// Sirena antiaérea, clic, acierto, tick, fanfarria y derrota
function sndSiren(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime, dur = 1.6;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 600;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.6; lg.gain.value = 260;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.14, t0+0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); lfo.start(t0); o.stop(t0+dur+0.05); lfo.stop(t0+dur+0.05);
  }catch(e){}
}
function sndClick(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 660;
    g.gain.setValueAtTime(0.1, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+0.06);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0+0.07);
  }catch(e){}
}
function sndAcierto(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime;
    [660, 880].forEach((fr, i)=>{
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = fr;
      g.gain.setValueAtTime(0.2, t0+i*0.09);
      g.gain.exponentialRampToValueAtTime(0.001, t0+i*0.09+0.16);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0+i*0.09); o.stop(t0+i*0.09+0.2);
    });
  }catch(e){}
}
function sndTick(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1050;
    g.gain.setValueAtTime(0.07, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+0.05);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0+0.06);
  }catch(e){}
}
function sndRound(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t0); o.frequency.exponentialRampToValueAtTime(620, t0+0.12);
    g.gain.setValueAtTime(0.08, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+0.14);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0+0.15);
  }catch(e){}
}
function sndFanfare(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime;
    [523, 659, 784, 1047].forEach((fr, i)=>{
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = fr;
      g.gain.setValueAtTime(0.22, t0+i*0.13);
      g.gain.exponentialRampToValueAtTime(0.001, t0+i*0.13+0.3);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0+i*0.13); o.stop(t0+i*0.13+0.35);
    });
  }catch(e){}
}
function sndTie(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime;
    [196, 147].forEach((fr, i)=>{
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = fr;
      g.gain.setValueAtTime(0.25, t0+i*0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t0+i*0.3+0.4);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0+i*0.3); o.stop(t0+i*0.3+0.45);
    });
  }catch(e){}
}
function sndBoom(big){  const ctx = ac(); if(!ctx) return;
  const t0 = ctx.currentTime, dur = big ? 1.3 : 0.6;
  const len = Math.floor(ctx.sampleRate*dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 1.4);
  const ns = ctx.createBufferSource(); ns.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(big?650:450, t0); f.frequency.exponentialRampToValueAtTime(42, t0+dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(big?0.8:0.45, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+dur);
  ns.connect(f); f.connect(g); g.connect(ctx.destination); ns.start(t0);
  // eco del retumbe
  if(big){
    const ns2 = ctx.createBufferSource(); ns2.buffer = buf;
    const gE = ctx.createGain();
    gE.gain.setValueAtTime(0.0001, t0+0.22);
    gE.gain.exponentialRampToValueAtTime(0.3, t0+0.26);
    gE.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    ns2.connect(f); f.connect(gE); gE.connect(ctx.destination); ns2.start(t0+0.22);
  }
  const o = ctx.createOscillator(), g2 = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(55, t0); o.frequency.exponentialRampToValueAtTime(24, t0+dur);
  g2.gain.setValueAtTime(big?0.7:0.35, t0); g2.gain.exponentialRampToValueAtTime(0.001, t0+dur);
  o.connect(g2); g2.connect(ctx.destination); o.start(t0); o.stop(t0+dur+0.05);
}
function spawnShot(side, hit, vx, vy){
  const tip = barrelTip(side);
  if(hit){
    battle.shots.push({ x:tip.x, y:tip.y, vx, vy, target: side==='A'?'B':'A', from:side });
  } else {
    battle.shots.push({ x:tip.x, y:tip.y, vx, vy, miss:true });
  }
  if(side==='A') battle.muzzleA = 6; else battle.muzzleB = 6;
  tanks[side].recoil = 1;
  tanks[side].aiming = 0;
  battle.shake = Math.max(battle.shake, 1.5);
  sndFire();
  for(let i=0;i<4;i++){
    battle.parts.push({ x:tip.x, y:tip.y, vx:sideDir(side)*(1+Math.random()*3), vy:(Math.random()-0.5)*3, life:0.5, decay:0.1, col:'#ffd60a', size:2.5 });
  }
}
function explode(x, y, big, gy){
  battle.rings.push({ x, y, r:12, alpha:1 });
  battle.rings.push({ x, y, r:5, alpha:0.7 });
  const fireCols = ['#ffd60a','#ff8500','#e36414','#9d0208'];
  const nF = big ? 34 : 14;
  for(let i=0;i<nF;i++){
    const a = Math.random()*Math.PI*2, sp = 0.8+Math.random()*(big?6:3.2);
    battle.parts.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-2.2, life:1, decay:0.02, col:fireCols[i%fireCols.length], size:big?8:5, grav:0.05 });
  }
  for(let i=0;i<14;i++){
    battle.parts.push({ x:x+(Math.random()-0.5)*18, y:y+(Math.random()-0.5)*10, vx:(Math.random()-0.5)*1.6, vy:-0.8-Math.random()*1.4, life:1.1, decay:0.016, smoke:true, size:8+Math.random()*5 });
  }
  for(let i=0;i<(big?18:8);i++){
    const a = Math.random()*Math.PI*2, sp = 4+Math.random()*6;
    battle.parts.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-1, life:0.6, decay:0.05, col:'#fff3b0', size:2.5 });
  }
  if(big) battle.scorches.push({ x, gy: gy || (VGY+8), a:0.55 });
}
function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const cl = v=>Math.max(0, Math.min(255, v+amt));
  const r = cl(n>>16), g = cl((n>>8)&255), b = cl(n&255);
  return `rgb(${r},${g},${b})`;
}
// Daño visible según vidas: 0 normal · 1 poco humo · 2 mucho humo · 3 fuego · 4 destruido
function damageLevel(side){
  if(!match.A || !match.total) return 0;
  const lives = side==='A' ? match.livesA : match.livesB;
  const f = lives/match.total;
  if(f >= 1) return 0;
  if(f >= 0.66) return 1;
  if(f >= 0.33) return 2;
  if(f > 0) return 3;
  return 4;
}
function damageSmoke(){
  if(!match.A || match.over) return;
  ['A','B'].forEach(k=>{
    const lv = damageLevel(k);
    if(lv <= 0) return;
    const X = k==='A' ? TANK_AX : TANK_BX;
    if(lv===1){
      if(Math.random() < 0.09)
        battle.parts.push({ x:X+(Math.random()-0.5)*30, y:VGY-52, vx:(Math.random()-0.5)*0.4, vy:-0.8, life:1, decay:0.028, smoke:true, size:10 });
      if(Math.random() < 0.02)
        battle.parts.push({ x:X+(Math.random()-0.5)*24, y:VGY-34, vx:(Math.random()-0.5)*0.5, vy:-1.6, life:0.5, decay:0.07, col:'#ffcf5a', size:3.5, grav:-0.05 });
    }
    if(lv===2){
      if(Math.random() < 0.32)
        battle.parts.push({ x:X+(Math.random()-0.5)*38, y:VGY-50, vx:(Math.random()-0.5)*0.5, vy:-1, life:1.1, decay:0.022, smoke:true, dark:true, size:14 });
      if(Math.random() < 0.07)
        battle.parts.push({ x:X+(Math.random()-0.5)*28, y:VGY-32, vx:(Math.random()-0.5)*0.8, vy:-2, life:0.55, decay:0.06, col:'#ffb703', size:4, grav:-0.08 });
    }
    if(lv>=3){
      if(Math.random() < 0.55)
        battle.parts.push({ x:X+(Math.random()-0.5)*34, y:VGY-28-Math.random()*12, vx:(Math.random()-0.5)*0.9, vy:-1.6-Math.random()*1.2, life:0.7, decay:0.05, col:Math.random()<0.5?'#ff8500':'#ffd60a', size:11, grav:-0.1 });
      if(Math.random() < 0.3)
        battle.parts.push({ x:X+(Math.random()-0.5)*34, y:VGY-52, vx:(Math.random()-0.5)*0.5, vy:-1.1, life:1.1, decay:0.026, smoke:true, dark:true, size:13 });
      if(Math.random() < 0.16)
        battle.parts.push({ x:X+(Math.random()-0.5)*40, y:VGY-30, vx:(Math.random()-0.5)*2.2, vy:-2.4-Math.random(), life:0.5, decay:0.07, col:'#fff3b0', size:3, grav:-0.05 });
    }
  });
}
function drawTank(side, wreck, surrender, dmg){
  const c = battle.ctx;
  const BGY = VGY; // los tanques están en el valle, al pie de su montaña
  const dir = sideDir(side);
  const X = side==='A' ? TANK_AX : TANK_BX;
  const st = tanks[side];
  const base = side==='A' ? battle.colorA : battle.colorB;
  const color = wreck ? '#6b706b' : base;
  const dark = wreck ? '#565b56' : shade(base, -38);
  const light = wreck ? '#7d827d' : shade(base, 34);
  const label = match[side] ? match[side].name.slice(0,14) : side;
  const aimAng = st.ang + (wreck ? dir*0.55 : 0);
  c.save();
  c.translate(X - dir*st.recoil*8, 0);
  // sombra
  c.fillStyle = 'rgba(0,0,0,.14)';
  c.beginPath(); c.ellipse(0, BGY+5, 48, 6, 0, 0, Math.PI*2); c.fill();
  // resplandor de incendio cuando está crítico
  if((dmg || 0) >= 3 && !wreck){
    const gg = c.createRadialGradient(0, BGY-28, 4, 0, BGY-28, 52);
    gg.addColorStop(0, 'rgba(255,120,0,.5)');
    gg.addColorStop(1, 'rgba(255,120,0,0)');
    c.fillStyle = gg;
    c.beginPath(); c.arc(0, BGY-28, 52, 0, Math.PI*2); c.fill();
  }
  // orugas
  c.fillStyle = wreck ? '#545954' : '#242b26';
  c.beginPath(); c.roundRect(-37, BGY-17, 74, 17, 8); c.fill();
  c.fillStyle = 'rgba(255,255,255,.08)';
  c.fillRect(-33, BGY-15, 66, 3);
  for(let i=-2;i<=2;i++){
    c.fillStyle = '#10140f';
    c.beginPath(); c.arc(i*13, BGY-8.5, 5.2, 0, Math.PI*2); c.fill();
    c.fillStyle = wreck ? '#8b918b' : '#c9cfc4';
    c.beginPath(); c.arc(i*13, BGY-8.5, 2.1, 0, Math.PI*2); c.fill();
  }
  // casco con brillo y placa frontal
  c.fillStyle = color;
  c.beginPath(); c.roundRect(-32, BGY-37, 64, 22, 6); c.fill();
  c.fillStyle = 'rgba(0,0,0,.22)';
  c.fillRect(-32, BGY-24, 64, 9);
  c.fillStyle = 'rgba(255,255,255,.28)';
  c.fillRect(-28, BGY-36, 56, 3);
  c.fillStyle = dark;
  c.beginPath();
  if(dir > 0){ c.moveTo(32, BGY-37); c.lineTo(42, BGY-28); c.lineTo(42, BGY-15); c.lineTo(32, BGY-15); }
  else { c.moveTo(-32, BGY-37); c.lineTo(-42, BGY-28); c.lineTo(-42, BGY-15); c.lineTo(-32, BGY-15); }
  c.closePath(); c.fill();
  // franja del equipo
  c.fillStyle = light;
  c.fillRect(-24, BGY-31, 48, 4);
  // calcinado por daño recibido
  if((dmg || 0) >= 2 && !wreck){
    c.fillStyle = 'rgba(15,15,15,.5)';
    c.beginPath(); c.ellipse(6, BGY-28, 15, 7, 0.2, 0, Math.PI*2); c.fill();
    c.beginPath(); c.ellipse(-14, BGY-32, 8, 5, -0.3, 0, Math.PI*2); c.fill();
  }
  // torreta
  const tpx = dir*2, tpy = BGY-41;
  c.fillStyle = color;
  c.beginPath(); c.arc(tpx, tpy, 13, Math.PI, 0); c.fill();
  c.fillRect(tpx-13, tpy-2, 26, 4);
  c.fillStyle = 'rgba(255,255,255,.22)';
  c.beginPath(); c.arc(tpx-4, tpy-6, 5, Math.PI, 0); c.fill();
  // escotilla
  c.fillStyle = dark;
  c.beginPath(); c.roundRect(tpx-11, tpy-15, 11, 5, 2); c.fill();
  // antena
  c.strokeStyle = '#20261f';
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(tpx-9, tpy-12); c.lineTo(tpx-15, tpy-32); c.stroke();
  c.fillStyle = wreck ? '#777' : '#e63946';
  c.beginPath(); c.arc(tpx-15, tpy-33, 2.4, 0, Math.PI*2); c.fill();
  // cañón (gira al apuntar)
  c.save();
  c.translate(tpx, tpy);
  c.rotate(aimAng);
  c.fillStyle = '#20261f';
  c.fillRect(6, -6, 16, 12);
  c.fillRect(20, -4, 22, 8);
  c.fillStyle = '#0c0f0c';
  c.fillRect(38, -5.5, 8, 11);
  c.restore();
  // nombre
  const flash = side==='A' ? battle.flashA : battle.flashB;
  c.fillStyle = '#33403a';
  c.font = '700 13px "Plus Jakarta Sans", sans-serif';
  c.textAlign = 'center';
  c.fillText(label, 0, surrender ? BGY-94 : BGY-62);
  // destello al recibir impacto
  if(flash > 0){
    c.globalAlpha = Math.min(1, flash);
    c.fillStyle = '#fff';
    c.beginPath(); c.roundRect(-38, BGY-56, 76, 58, 9); c.fill();
    c.globalAlpha = 1;
  }
  // bandera blanca de rendición
  if(surrender){
    const t = performance.now()/280;
    const wave = Math.sin(t + X)*3;
    c.strokeStyle = '#20261f';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, BGY-48); c.lineTo(0, BGY-82); c.stroke();
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#c9cfc9';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, BGY-82);
    c.quadraticCurveTo(16, BGY-84+wave, 32, BGY-80+wave);
    c.lineTo(32, BGY-62+wave);
    c.quadraticCurveTo(16, BGY-66+wave, 0, BGY-64);
    c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}
function pine(c, x, y, s){
  c.fillStyle = '#3d6b4f';
  c.beginPath();
  c.moveTo(x, y-s*3); c.lineTo(x-s, y); c.lineTo(x+s, y);
  c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(x, y-s*4.2); c.lineTo(x-s*0.75, y-s*1.4); c.lineTo(x+s*0.75, y-s*1.4);
  c.closePath(); c.fill();
  c.fillStyle = '#5a4632';
  c.fillRect(x-1.5, y, 3, s*0.9);
}
function drawBG(t){
  const c = battle.ctx;
  if(!battle.bg){
    const g = c.createLinearGradient(0, 0, 0, BH);
    g.addColorStop(0, '#9fcbe4');
    g.addColorStop(0.6, '#d8e8dc');
    g.addColorStop(1, '#c9d8c9');
    battle.bg = g;
  }
  c.fillStyle = battle.bg;
  c.fillRect(-320, -200, BW+640, BH+340);
  // sol
  c.fillStyle = 'rgba(255,244,200,.55)';
  c.beginPath(); c.arc(150, 40, 32, 0, Math.PI*2); c.fill();
  c.fillStyle = '#fff6d8';
  c.beginPath(); c.arc(150, 40, 19, 0, Math.PI*2); c.fill();
  // nubes a la deriva
  c.fillStyle = 'rgba(255,255,255,.9)';
  for(let i=0;i<6;i++){
    const cx = ((i*230 + t*0.012*(i+1)) % (BW+280)) - 140;
    const cy = 24 + i*18;
    c.beginPath();
    c.arc(cx, cy, 14, 0, Math.PI*2);
    c.arc(cx+16, cy+3, 10, 0, Math.PI*2);
    c.arc(cx-16, cy+4, 9, 0, Math.PI*2);
    c.fill();
  }
  // cordillera lejana
  c.fillStyle = '#a9c2d4';
  c.beginPath();
  c.moveTo(-320, VGY);
  c.lineTo(-180, 60); c.lineTo(-40, VGY);
  c.lineTo(180, 36); c.lineTo(360, VGY);
  c.lineTo(560, 56); c.lineTo(740, VGY);
  c.lineTo(940, 40); c.lineTo(1120, VGY);
  c.lineTo(1320, 58); c.lineTo(1500, VGY);
  c.lineTo(1700, 44); c.lineTo(1880, VGY);
  c.lineTo(2050, 62); c.lineTo(2120, VGY);
  c.closePath(); c.fill();
  // montaña izquierda (tanque A en la cima)
  c.fillStyle = '#7d8b84';
  c.beginPath();
  c.moveTo(-60, VGY); c.lineTo(TANK_AX, TY-8); c.lineTo(200, VGY);
  c.closePath(); c.fill();
  c.fillStyle = '#6a776f';
  c.beginPath();
  c.moveTo(TANK_AX, TY-8); c.lineTo(200, VGY); c.lineTo(120, VGY);
  c.closePath(); c.fill();
  // montaña derecha (tanque B en la cima)
  c.fillStyle = '#7d8b84';
  c.beginPath();
  c.moveTo(1900, VGY); c.lineTo(TANK_BX, TY-8); c.lineTo(1560, VGY);
  c.closePath(); c.fill();
  c.fillStyle = '#6a776f';
  c.beginPath();
  c.moveTo(TANK_BX, TY-8); c.lineTo(1560, VGY); c.lineTo(1640, VGY);
  c.closePath(); c.fill();
  // nieve en ambas cimas
  c.fillStyle = '#f4f8f7';
  [[TANK_AX, 1], [TANK_BX, -1]].forEach(([px])=>{
    c.beginPath();
    c.moveTo(px-26, TY+2); c.lineTo(px, TY-14);
    c.lineTo(px+26, TY+2); c.lineTo(px+14, TY-2);
    c.lineTo(px+5, TY-6); c.lineTo(px-4, TY+1); c.lineTo(px-13, TY-4);
    c.closePath(); c.fill();
  });
  // pinos en las laderas
  pine(c, 8, 176, 7); pine(c, 152, 168, 6); pine(c, 30, 150, 5);
  pine(c, 1790, 176, 7); pine(c, 1648, 168, 6); pine(c, 1752, 150, 5);
  pine(c, 660, VGY-2, 6); pine(c, 1140, VGY-2, 7);
  // valle con río
  c.fillStyle = '#9fae9c';
  c.fillRect(-320, VGY, BW+640, BH-VGY+140);
  c.fillStyle = '#8ba086';
  c.fillRect(-320, VGY, BW+640, 4);
  c.fillStyle = '#7fb6d9';
  c.beginPath(); c.ellipse(900, VGY+16, 120, 7, 0, 0, Math.PI*2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.5)';
  c.beginPath(); c.ellipse(880, VGY+15, 50, 3, 0, 0, Math.PI*2); c.fill();
  // línea divisoria entre territorios (sin tintes de color)
  // marcas de quemado
  battle.scorches.forEach(s=>{
    c.globalAlpha = Math.max(0, s.a);
    c.fillStyle = '#3a3f3a';
    c.beginPath(); c.ellipse(s.x, s.gy || (VGY+6), 28, 6, 0, 0, Math.PI*2); c.fill();
    c.globalAlpha = 1;
  });
  // hierba y rocas del valle
  c.strokeStyle = '#5d7a5d';
  c.lineWidth = 1.6;
  tufts.forEach(o=>{
    const y = VGY+10+(o.x%14);
    c.beginPath();
    c.moveTo(o.x, y); c.lineTo(o.x-3, y-o.h);
    c.moveTo(o.x+3, y); c.lineTo(o.x+3, y-o.h-2);
    c.stroke();
  });
  c.fillStyle = '#8d948d';
  rocks.forEach(o=>{ c.beginPath(); c.ellipse(o.x, VGY+10, o.r, o.r*0.55, 0, 0, Math.PI*2); c.fill(); });
}
const cam2 = { x:BW/2, y:120, z:1.6 };
const camL = { x:TANK_AX, y:120, z:1.7 };
const camR = { x:TANK_BX, y:120, z:1.7 };
function clampCam(o){
  const hw = (CW/2)/o.z, hh = (CH/2)/o.z;
  o.x = hw >= BW/2 ? BW/2 : Math.max(hw, Math.min(BW-hw, o.x));
  o.y = hh >= BH/2 ? BH/2 : Math.max(hh-160, Math.min(BH-hh, o.y));
}
function stepBattle(){
    ['A','B'].forEach(k=>{
      const st = tanks[k];
      const base = k==='A' ? BASE_A : BASE_B;
      let tgt = st.aiming ? st.aimAng : base;
      // acercar el objetivo al ángulo actual (evita giros de 360°)
      while(tgt - st.ang > Math.PI) tgt -= Math.PI*2;
      while(tgt - st.ang < -Math.PI) tgt += Math.PI*2;
      st.ang += (tgt - st.ang)*0.18;
      st.recoil *= 0.86;
    });
    // disparos en espera (apuntando...)
    battle.pending = battle.pending.filter(p=>{
      p.t--;
      if(p.t <= 0){ spawnShot(p.side, p.hit, p.vx, p.vy); return false; }
      return true;
    });
    // fuego ambiental: 1 cada 2 segundos, alternando un tanque y otro, sin impactar
    if(match.A && !match.over && !answering && battle.pending.length===0){
      battle.ambientT = (battle.ambientT === undefined ? 100 : battle.ambientT) - 1;
      if(battle.ambientT <= 0){
        battle.ambientSide = battle.ambientSide === 'A' ? 'B' : 'A';
        fireTank(battle.ambientSide, false);
        battle.ambientT = 120;
      }
    } else {
      battle.ambientT = 100;
    }
    battle.shake *= 0.88;
    if(battle.shake < 0.4) battle.shake = 0;
    battle.white = Math.max(0, (battle.white || 0) - 0.04);
    // proyectiles: solo física (el dibujo va en drawScene para las dos vistas)
    battle.shots = battle.shots.filter(s=>{
      s.trail = s.trail || [];
      s.age = (s.age || 0) + 1;
      if(s.age > 360) return false; // nadie vuela por siempre
      if(s.nuke){
        s.vy += 0.22; s.y += s.vy;
        s.x += Math.sin(s.y*0.05)*0.6;
        s.trail.push({ x:s.x, y:s.y });
        if(s.trail.length > 40) s.trail.shift();
        if(s.y >= VGY){ nukeBlast(s.x); return false; }
        return true;
      }
      if(s.homing){
        // misil guiado hacia el rival (algo lento), sin daño extra: puro remate visual
        const tp = s.target==='B' ? { x:TANK_BX-10, y:VGY-24 } : { x:TANK_AX+10, y:VGY-24 };
        const dx = tp.x-s.x, dy = tp.y-s.y, d = Math.hypot(dx, dy) || 1, sp = 14;
        s.vx += (dx/d*sp - s.vx)*0.07;
        s.vy += (dy/d*sp - s.vy)*0.07;
        s.x += s.vx; s.y += s.vy;
        s.size = 0.35 + 0.85*Math.max(0, Math.min(1, 1 - d/(s.d0 || d)));
        s.trail.push({ x:s.x, y:s.y });
        if(s.trail.length > 60) s.trail.shift();
        battle.parts.push({ x:s.x, y:s.y, vx:(Math.random()-0.5), vy:-0.6-Math.random(), life:0.5, decay:0.08, col:Math.random()<0.6?'#ff8500':'#ffd60a', size:5 });
        if(d < 22){
          if(s.rocket){ try{s.rocket.stop();}catch(e){} s.rocket = null; }
          explode(s.x, s.y, true, VGY+8);
          battle.shake = 11;
          sndImpact(); sndBoom(true);
          if(s.target==='B') battle.flashB = 1; else battle.flashA = 1;
          // remate final: el perdedor explota, se rinde y, ya destruido, se anuncia el ganador
          if(s.finale && match.A && match.over){
            if(s.target==='B'){ battle.deadB = true; battle.surrenderB = true; }
            else { battle.deadA = true; battle.surrenderA = true; }
            setTimeout(()=>explode(s.target==='B' ? TANK_BX : TANK_AX, VGY-24, true, VGY+8), 250);
            const ep = battle.epoch;
            setTimeout(()=>{ if(battle.epoch!==ep || !match.over) return; checkWinner(true); showWinner('win'); }, 900);
          }
          return false;
        }
        return s.x > -60 && s.x < BW+60 && s.y > -160 && s.y < BH+60;
      }
      s.vy += GRAV; s.x += s.vx; s.y += s.vy;
      s.trail.push({ x:s.x, y:s.y });
      if(s.trail.length > 46) s.trail.shift();
      if(s.miss){
        if(s.y >= VGY){ explode(s.x, VGY-4, false, VGY+8); battle.shake = Math.max(battle.shake, 3); sndBoom(false); return false; }
        return s.x > -60 && s.x < BW+60;
      }
      battle.parts.push({ x:s.x - Math.sign(s.vx)*9, y:s.y, vx:-s.vx*0.06, vy:(Math.random()-0.5)*0.6, life:0.4, decay:0.09, smoke:true, size:3 });
      const hitX = s.target==='B' ? TANK_BX-32 : TANK_AX+32;
      const arrived = s.vx > 0 ? s.x >= hitX : s.x <= hitX;
      if(arrived){
        const hx = s.target==='B' ? TANK_BX-10 : TANK_AX+10;
        explode(hx, VGY-22, true, VGY+8);
        battle.shake = 11;
        sndImpact(); sndBoom(true);
        // cambio de estado AL IMPACTO: quita 1 vida y suma el acierto
        if(match.A && !match.over){
          if(s.target==='B'){ match.livesB = Math.max(0, match.livesB-1); match.ptsA++; }
          else { match.livesA = Math.max(0, match.livesA-1); match.ptsB++; }
          paintMatch();
        }
        if(s.target==='B') battle.flashB = 1; else battle.flashA = 1;
        return false;
      }
      return true;
    });
    // tanques: destrozado si se quedó sin vidas o perdió el duelo; bandera blanca al rendirse o empatar
    const wreckA = battle.deadA || (match.over && match.livesA <= 0);
    const wreckB = battle.deadB || (match.over && match.livesB <= 0);
    const surA = battle.surrenderA || wreckA;
    const surB = battle.surrenderB || wreckB;
    if(match.over && (wreckA || wreckB) && Math.random() < 0.35){
      const sx = wreckA && wreckB ? (Math.random() < 0.5 ? TANK_AX : TANK_BX) : (wreckA ? TANK_AX : TANK_BX);
      battle.parts.push({ x:sx+(Math.random()-0.5)*22, y:VGY-48, vx:(Math.random()-0.5)*0.6, vy:-0.8-Math.random(), life:1, decay:0.03, smoke:true, dark:true, size:14 });
      if(Math.random() < 0.2)
        battle.parts.push({ x:sx+(Math.random()-0.5)*26, y:VGY-30, vx:(Math.random()-0.5)*0.8, vy:-1.6, life:0.6, decay:0.06, col:'#ff8500', size:8, grav:-0.1 });
    }
    damageSmoke();
    if(battle.muzzleA > 0) battle.muzzleA--;
    if(battle.muzzleB > 0) battle.muzzleB--;
    battle.flashA = Math.max(0, battle.flashA - 0.06);
    battle.flashB = Math.max(0, battle.flashB - 0.06);
    // partículas (solo física; se dibujan en drawScene)
    battle.parts = battle.parts.filter(p=>{
      p.x += p.vx; p.y += p.vy; p.vy += (p.grav || 0.1); p.vx *= 0.985; p.life -= p.decay;
      return p.life > 0;
    });
    // ondas de choque (solo física; se dibujan en drawScene)
    battle.rings = battle.rings.filter(r=>{
      r.r += 6; r.alpha -= 0.035;
      return r.alpha > 0;
    });
    battle.scorches.forEach(s=>{ s.a = Math.max(0.25, s.a - 0.002); });
}
function drawScene(t){
  const c = battle.ctx;
  if(battle.shake > 0) c.translate((Math.random()-0.5)*battle.shake, (Math.random()-0.5)*battle.shake);
  drawBG(t);
  // estelas punteadas y balas (grandes y visibles desde lejos)
  battle.shots.forEach(s=>{
    const ts = s.size || 1;
    for(let i=0;i<s.trail.length;i+=3){
      const p = s.trail[i], a = i/s.trail.length;
      c.globalAlpha = 0.12 + a*0.45;
      c.fillStyle = '#ffb703';
      c.beginPath(); c.arc(p.x, p.y, (2.5+a*2.5)*ts, 0, Math.PI*2); c.fill();
    }
    c.globalAlpha = 1;
    if(s.nuke){
      // bomba nuclear cayendo: dardo oscuro con aletas y luz parpadeante
      c.fillStyle = '#20261f';
      c.beginPath(); c.ellipse(s.x, s.y, 7, 13, 0, 0, Math.PI*2); c.fill();
      c.beginPath();
      c.moveTo(s.x-7, s.y-6); c.lineTo(s.x-12, s.y-16); c.lineTo(s.x-3, s.y-12);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(s.x+7, s.y-6); c.lineTo(s.x+12, s.y-16); c.lineTo(s.x+3, s.y-12);
      c.closePath(); c.fill();
      c.fillStyle = '#ffb703';
      c.beginPath(); c.arc(s.x, s.y+8, 3, 0, Math.PI*2); c.fill();
      if(Math.floor(performance.now()/120)%2===0){
        c.fillStyle = '#ff2a2a';
        c.beginPath(); c.arc(s.x, s.y-10, 3, 0, Math.PI*2); c.fill();
      }
      return;
    }
    if(s.homing){
      // misil orientado según su velocidad, con llama trasera (crece al acercarse)
      const ma = Math.atan2(s.vy, s.vx), k = ts;
      c.fillStyle = 'rgba(255,120,0,.45)';
      c.beginPath(); c.arc(s.x, s.y, 20*k, 0, Math.PI*2); c.fill();
      c.save(); c.translate(s.x, s.y); c.rotate(ma);
      c.fillStyle = '#ff6d00';
      c.beginPath(); c.moveTo(-9*k,-5*k); c.lineTo((-20-Math.random()*8)*k,0); c.lineTo(-9*k,5*k); c.closePath(); c.fill();
      c.fillStyle = '#20261f';
      c.beginPath(); c.roundRect(-9*k,-4.5*k,22*k,9*k,4*k); c.fill();
      c.fillStyle = '#ffb703';
      c.beginPath(); c.arc(4*k,0,2.6*k,0,Math.PI*2); c.fill();
      c.restore();
      return;
    }
    const R = 14, rB = 7, rC = 3.4;
    c.fillStyle = 'rgba(255,183,3,.35)';
    c.beginPath(); c.arc(s.x, s.y, R, 0, Math.PI*2); c.fill();
    c.fillStyle = '#20261f';
    c.beginPath(); c.arc(s.x, s.y, rB, 0, Math.PI*2); c.fill();
    c.fillStyle = '#ffb703';
    c.beginPath(); c.arc(s.x, s.y, rC, 0, Math.PI*2); c.fill();
  });
  // tanques: destrozado si se quedó sin vidas o perdió el duelo; bandera blanca al rendirse o empatar
  const wreckA = battle.deadA || (match.over && match.livesA <= 0);
  const wreckB = battle.deadB || (match.over && match.livesB <= 0);
  drawTank('A', wreckA, wreckA || battle.surrenderA, damageLevel('A'));
  drawTank('B', wreckB, wreckB || battle.surrenderB, damageLevel('B'));
  // fogonazos en la boca del cañón
  ['A','B'].forEach(k=>{
    const m = k==='A' ? battle.muzzleA : battle.muzzleB;
    if(m > 0){
      const tip = barrelTip(k);
      c.fillStyle = 'rgba(255,183,3,.85)';
      c.beginPath(); c.arc(tip.x, tip.y, 8+m*4, 0, Math.PI*2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.beginPath(); c.arc(tip.x, tip.y, 4+m, 0, Math.PI*2); c.fill();
    }
  });
  // partículas: humo volumétrico que se expande y fuego con núcleo incandescente
  battle.parts.forEach(p=>{
    const lr = Math.max(0, Math.min(1, p.life));
    if(lr <= 0) return;
    if(p.smoke){
      const r = (p.size || 6)*(1.7 - lr);
      const pal = p.dark ? ['#6a716a','#4c534c','#333833'] : ['#9aa39a','#6f786f','#4c534c'];
      c.globalAlpha = 0.42*lr;
      c.fillStyle = pal[0];
      c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI*2); c.fill();
      c.globalAlpha = 0.4*lr;
      c.fillStyle = pal[1];
      c.beginPath(); c.arc(p.x-r*0.15, p.y-r*0.1, r*0.62, 0, Math.PI*2); c.fill();
      c.globalAlpha = 0.45*lr;
      c.fillStyle = pal[2];
      c.beginPath(); c.arc(p.x-r*0.2, p.y-r*0.15, r*0.34, 0, Math.PI*2); c.fill();
    } else {
      const fl = 0.85 + Math.random()*0.3;
      const r = Math.max(0.5, (p.size || 4)*lr*fl);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.35*lr;
      c.fillStyle = '#ff5a00';
      c.beginPath(); c.arc(p.x, p.y, r*1.9, 0, Math.PI*2); c.fill();
      c.globalAlpha = 0.85*lr;
      c.fillStyle = p.col || '#ff8500';
      c.beginPath(); c.ellipse(p.x, p.y-r*0.35, r*0.8, r*1.15, 0, 0, Math.PI*2); c.fill();
      c.globalAlpha = 0.9*lr;
      c.fillStyle = '#ffe66d';
      c.beginPath(); c.ellipse(p.x, p.y-r*0.5, r*0.38, r*0.6, 0, 0, Math.PI*2); c.fill();
      c.globalCompositeOperation = 'source-over';
    }
  });
  c.globalAlpha = 1;
  // ondas de choque
  battle.rings.forEach(r=>{
    c.globalAlpha = Math.max(0, r.alpha);
    c.strokeStyle = '#fff3b0';
    c.lineWidth = 5;
    c.beginPath(); c.arc(r.x, r.y, r.r, 0, Math.PI*2); c.stroke();
  });
  c.globalAlpha = 1;
  // destello blanco nuclear sobre todo
  if((battle.white || 0) > 0.02){
    c.fillStyle = `rgba(255,255,240,${Math.min(1, battle.white)})`;
    c.fillRect(-500, -300, BW+1000, BH+600);
  }
}
function renderView(ctx, o, t){
  battle.ctx = ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  ctx.setTransform(o.z, 0, 0, o.z, CW/2 - o.x*o.z, CH/2 - o.y*o.z);
  drawScene(t);
}
function battleLoop(){
  const cv = document.getElementById('battle');
  const cvA = document.getElementById('viewA');
  const cvM = document.getElementById('viewMid');
  const cvB = document.getElementById('viewB');
  if(cv && cvA && cvM && cvB && !document.getElementById('arena').hidden){
    if(!battle.c0) battle.c0 = cv.getContext('2d');
    if(!battle.vc) battle.vc = {};
    if(!battle.vc.a) battle.vc.a = cvA.getContext('2d');
    if(!battle.vc.m) battle.vc.m = cvM.getContext('2d');
    if(!battle.vc.b) battle.vc.b = cvB.getContext('2d');
    const t = performance.now();
    stepBattle();
    // vista general: siempre todo el campo (O I - I O)
    let tx = BW/2, ty = 120, tz = FIT_Z;
    if(battle.focusT > 0){ tx = battle.focusX; ty = 120; tz = 1.3; battle.focusT--; }
    cam.x += (tx-cam.x)*0.07; cam.y += (ty-cam.y)*0.07; cam.z += (tz-cam.z)*0.06;
    clampCam(cam);
    renderView(battle.c0, cam, t);
    // tríptico: tanque A | bala | tanque B (tanques centrados en su panel)
    camL.x = TANK_AX; camL.y = 120; camL.z = 1.7;
    renderView(battle.vc.a, camL, t);
    let mx = BW/2, my = 120, mz = FIT_Z;
    if(battle.shots.length){ const s = battle.shots[0]; mx = s.x; my = s.y; mz = s.y < 50 ? 1.1 : 1.8; }
    else if(battle.pending.length){ const p = battle.pending[0]; mx = p.side==='A' ? TANK_AX : TANK_BX; my = 120; mz = 1.6; }
    else if(battle.focusT > 0){ mx = battle.focusX; my = 120; mz = 1.5; }
    else if(match.A){ mx = match.turn==='A' ? TANK_AX : TANK_BX; my = 120; mz = 1.6; }
    cam2.x += (mx-cam2.x)*0.3; cam2.y += (my-cam2.y)*0.3; cam2.z += (mz-cam2.z)*0.25;
    clampCam(cam2);
    renderView(battle.vc.m, cam2, t);
    camR.x = TANK_BX; camR.y = 120; camR.z = 1.7;
    renderView(battle.vc.b, camR, t);
  }
  requestAnimationFrame(battleLoop);
}
function paintMatch(){
  document.getElementById('arenaComp').textContent = match.comp;
  document.getElementById('nameA').textContent = match.A.name;
  document.getElementById('nameB').textContent = match.B.name;
  document.getElementById('avA').textContent = match.A.name[0].toUpperCase();
  document.getElementById('avB').textContent = match.B.name[0].toUpperCase();
  document.querySelector('.teamA').style.setProperty('--cA', match.A.color);
  document.querySelector('.teamB').style.setProperty('--cB', match.B.color);
  battleColors();
  document.getElementById('ptsA').textContent = match.livesA;
  document.getElementById('ptsB').textContent = match.livesB;
  document.getElementById('hitsA').textContent = match.ptsA + (match.ptsA===1?' acierto':' aciertos');
  document.getElementById('hitsB').textContent = match.ptsB + (match.ptsB===1?' acierto':' aciertos');
  pips('livesA', match.livesA, match.total);
  pips('livesB', match.livesB, match.total);
  document.getElementById('infoNameA').textContent = match.A.name;
  document.getElementById('infoNameB').textContent = match.B.name;
  document.getElementById('infoLivesA').textContent = match.livesA + (match.livesA===1 ? ' vida' : ' vidas') + ' · ' + match.ptsA + ' aciertos';
  document.getElementById('infoLivesB').textContent = match.livesB + (match.livesB===1 ? ' vida' : ' vidas') + ' · ' + match.ptsB + ' aciertos';
  pips('infoPipsA', match.livesA, match.total);
  pips('infoPipsB', match.livesB, match.total);
  document.getElementById('infoPipsA').style.setProperty('--lc', match.A.color);
  document.getElementById('infoPipsB').style.setProperty('--lc', match.B.color);
  document.getElementById('turnLabel').textContent = 'Turno: ' + (match.turn==='A'?match.A.name:match.B.name);
  const qr = document.getElementById('qRound');
  if(qr) qr.textContent = 'Ronda ' + match.round + ' de ' + match.total;
  checkWinner(false);
}
// Avanza cuando el show terminó: sin balas con objetivo, sin puntería ni misil pendiente
function awaitShow(cb){
  const busy = battle.shots.some(s=>s.target) || battle.pending.length > 0 || battle.pendingMissile;
  if(!busy) setTimeout(cb, 700);
  else setTimeout(()=>awaitShow(cb), 250);
}
// Responde el equipo: acierto = su tanque dispara al rival y le quita 1 vida al impactar
function answer(side, ok){
  if(!match.A || match.over || answering) return;
  answering = true;
  stopTimer();
  fireTank(side, ok);
  if(ok) sndAcierto();
  // el daño y los puntos se aplican al impacto de la bala, no al pulsar
  paintMatch();
  awaitShow(()=>{
    answering = false;
    if(!match.A || match.over) return;
    if(match.livesA<=0 || match.livesB<=0 || match.round>=match.total) endMatch();
    else nextQuestion();
  });
}
function resetScores(){
  if(!match.A) return;
  match.ptsA = 0; match.ptsB = 0;
  match.livesA = match.total; match.livesB = match.total;
  match.round = 0; match.asked = []; match.over = false;
  battle.shots = []; battle.parts = []; battle.flashA = 0; battle.flashB = 0;
  battle.deadA = battle.deadB = false; battle.surrenderA = battle.surrenderB = false;
  battle.pending = []; battle.rings = []; battle.scorches = []; battle.focusT = 0; battle.holdT = 0; battle.pendingMissile = null; battle.plane = null;
  battle.epoch++;
  resetTankState();
  cam.x = BW/2; cam.y = 120; cam.z = FIT_Z;
  document.getElementById('winnerCard').hidden = true;
  document.getElementById('winnerOverlay').hidden = true;
  stopAllRockets();
  paintMatch(); nextQuestion();
}
// Sonido de cohete en vuelo (bucle de propulsión, se detiene al impactar)
function sndRocketStart(){
  const ctx = ac(); if(!ctx) return null;
  try{
    const len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime(0.15, ctx.currentTime+0.3);
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 7; lg.gain.value = 170;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    return { stop(){ try{
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.25);
      src.stop(ctx.currentTime+0.3); lfo.stop(ctx.currentTime+0.3);
    }catch(e){} } };
  }catch(e){ return null; }
}
function stopAllRockets(){
  battle.shots.forEach(s=>{ if(s.rocket){ try{s.rocket.stop();}catch(e){} s.rocket = null; } });
}
// Silbido de bomba cayendo (estilo CoD) y explosión nuclear colosal
function sndPlane(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime, dur = 2.6;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 82;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.11, t0+0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0+dur+0.05);
    const len = Math.floor(ctx.sampleRate*dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(Math.sin(Math.PI*i/len), 1.5);
    const ns = ctx.createBufferSource(); ns.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g2 = ctx.createGain(); g2.gain.value = 0.5;
    ns.connect(f); f.connect(g2); g2.connect(ctx.destination); ns.start(t0);
  }catch(e){}
}
function sndWhistle(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime, dur = 0.8;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1250, t0);
    o.frequency.exponentialRampToValueAtTime(180, t0+dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.2, t0+0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0+dur+0.05);
  }catch(e){}
}
function sndNukeBoom(){
  const ctx = ac(); if(!ctx) return;
  try{
    const t0 = ctx.currentTime, dur = 2.4;
    const len = Math.floor(ctx.sampleRate*dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 1.2);
    const ns = ctx.createBufferSource(); ns.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t0); f.frequency.exponentialRampToValueAtTime(32, t0+dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    ns.connect(f); f.connect(g); g.connect(ctx.destination); ns.start(t0);
    const o = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(48, t0); o.frequency.exponentialRampToValueAtTime(22, t0+dur);
    g2.gain.setValueAtTime(0.8, t0); g2.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    o.connect(g2); g2.connect(ctx.destination); o.start(t0); o.stop(t0+dur+0.05);
    const ns2 = ctx.createBufferSource(); ns2.buffer = buf;
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.0001, t0+0.5);
    g3.gain.exponentialRampToValueAtTime(0.4, t0+0.55);
    g3.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    ns2.connect(f); f.connect(g3); g3.connect(ctx.destination); ns2.start(t0+0.5);
  }catch(e){}
}
// Hongo nuclear: columna de humo + copa de fuego expansiva
function spawnMushroom(x){
  for(let i=0;i<38;i++){
    const h = Math.random();
    battle.parts.push({ x:x+(Math.random()-0.5)*(26+h*74), y:VGY-6-h*112, vx:(Math.random()-0.5)*0.8, vy:-0.6-Math.random()*0.9, life:1.5, decay:0.013, smoke:true, size:9+Math.random()*7 });
  }
  for(let i=0;i<26;i++){
    const a = Math.random()*Math.PI*2;
    battle.parts.push({ x:x+Math.cos(a)*48, y:VGY-106+(Math.random()-0.5)*26, vx:Math.cos(a)*1.4, vy:-0.4, life:1.2, decay:0.018, col:['#ffd60a','#ff8500','#e36414'][i%3], size:7 });
  }
  battle.rings.push({ x, y:VGY-106, r:16, alpha:1 });
}
// Cataclismo nuclear sobre el centro: arrasa con los dos tanques
function nukeBlast(x){
  battle.white = 1;
  battle.shake = 16;
  explode(x, VGY-10, true, VGY+8);
  explode(x-45, VGY-6, true, VGY+8);
  explode(x+45, VGY-6, true, VGY+8);
  spawnMushroom(x);
  setTimeout(()=>explode(x, VGY-40, true, VGY+8), 200);
  battle.flashA = 1; battle.flashB = 1;
  sndNukeBoom();
  battle.deadA = true; battle.deadB = true;
  battle.surrenderA = true; battle.surrenderB = true;
  const ep = battle.epoch;
  setTimeout(()=>{ if(battle.epoch!==ep || !match.over) return; checkWinner(true); showWinner('tie'); }, 1600);
}
function endMatch(){
  if(!match.A || match.over) return;
  match.over = true;
  stopTimer();
  battle.deadA = battle.deadB = false;
  battle.surrenderA = battle.surrenderB = false;
  // Si el perdedor ya está en 0 vidas, explota de una vez; si le quedan vidas,
  // el misil de remate sale a buscarlo y el desenlace se muestra al impactar
  if(match.livesA < match.livesB){
    if(match.livesA <= 0){
      battle.deadA = true;
      battle.focusX = TANK_AX; battle.focusT = 110;
      explode(TANK_AX, VGY-30, true, VGY+8);
      setTimeout(()=>explode(TANK_AX+10, VGY-24, true, VGY+8), 250);
      battle.shake = 9;
      sndImpact(); sndBoom(true);
      const ep = battle.epoch;
      setTimeout(()=>{ if(battle.epoch!==ep || !match.over) return; checkWinner(true); showWinner('win'); }, 1000);
    } else {
      battle.focusX = TANK_AX; battle.focusT = 200;
      setTimeout(()=>{ if(match.over) launchMissile('B', 'A', true); }, 600);
    }
  } else if(match.livesB < match.livesA){
    if(match.livesB <= 0){
      battle.deadB = true;
      battle.focusX = TANK_BX; battle.focusT = 110;
      explode(TANK_BX, VGY-30, true, VGY+8);
      setTimeout(()=>explode(TANK_BX-10, VGY-24, true, VGY+8), 250);
      battle.shake = 9;
      sndImpact(); sndBoom(true);
      const ep = battle.epoch;
      setTimeout(()=>{ if(battle.epoch!==ep || !match.over) return; checkWinner(true); showWinner('win'); }, 1000);
    } else {
      battle.focusX = TANK_BX; battle.focusT = 200;
      setTimeout(()=>{ if(match.over) launchMissile('A', 'B', true); }, 600);
    }
  } else {
    // EMPATE NUCLEAR: la bomba cae sobre el centro y arrasa con los dos
    battle.focusX = BW/2; battle.focusT = 260;
    sndSiren();
    setTimeout(()=>{
      if(!match.over) return;
      battle.shots.push({ x:BW/2, y:-70, vx:0, vy:1.2, nuke:true, trail:[] });
      sndWhistle();
    }, 700);
  }
}
function showWinner(mood){
  const o = document.getElementById('winnerOverlay');
  if(!o || !match.A) return;
  const big = document.getElementById('winnerBig');
  const sub = document.getElementById('winnerSub');
  const tied = match.livesA===match.livesB && match.ptsA===match.ptsB;
  if(tied){
    big.textContent = '¡Empate!';
  } else {
    const w = (match.livesA > match.livesB || (match.livesA===match.livesB && match.ptsA > match.ptsB)) ? match.A : match.B;
    big.textContent = `¡${w.name} gana el duelo!`;
  }
  sub.textContent = `${match.A.name}: ${match.livesA} vidas · ${match.ptsA} aciertos — ${match.B.name}: ${match.livesB} vidas · ${match.ptsB} aciertos`;
  o.hidden = false;
  if(mood === 'tie') sndTie(); else sndFanfare();
}
function hideWinner(){ document.getElementById('winnerOverlay').hidden = true; }
function checkWinner(announce){
  const w = document.getElementById('winnerCard'), t = document.getElementById('winnerText');
  if(!match.A) return;
  const played = match.round>0 || match.ptsA>0 || match.ptsB>0 || match.livesA<match.total || match.livesB<match.total;
  if(!played){ w.hidden = true; return; }
  if(match.livesA===match.livesB){
    if(match.ptsA===match.ptsB){ w.hidden = !announce && !match.over; t.textContent = match.over ? 'Empate — ambos conservan las mismas vidas' : 'Empate parcial en vidas y aciertos'; return; }
    const win = match.ptsA>match.ptsB ? match.A : match.B;
    w.hidden = false;
    t.textContent = match.over ? `Ganador por aciertos: ${win.name} (${Math.max(match.ptsA,match.ptsB)} aciertos)` : `${win.name} va ganando por aciertos`;
    return;
  }
  const win = match.livesA>match.livesB ? match.A : match.B;
  const lives = Math.max(match.livesA, match.livesB);
  w.hidden = false;
  t.textContent = match.over ? `Ganador: ${win.name} (${lives} ${lives===1?'vida':'vidas'})` : `${win.name} va ganando (${lives} ${lives===1?'vida':'vidas'})`;
}
function switchTurn(){ if(match.A){ match.turn = match.turn==='A'?'B':'A'; paintMatch(); } }

// --- Pregunta aleatoria (una por ronda, hasta el total elegido) ---
function nextQuestion(){
  if(!match.A || match.over) return;
  if(match.round>=match.total){ endMatch(); return; }
  let pool = questions.filter(q=>!match.asked.includes(q.id));
  if(pool.length===0){ match.asked = []; pool = questions; }
  const q = pool[Math.floor(Math.random()*pool.length)];
  match.asked.push(q.id); match.current = q; match.round++;
  document.getElementById('qTextLive').textContent = q.text;
  document.getElementById('qCount').textContent = `Pregunta ${match.round} de ${match.total}`;
  document.getElementById('qProgress').style.width = (match.round/match.total*100)+'%';
  sndRound();
  startTimer();
  switchTurn();
}

// --- Temporizador 30s con pausa ---
function paintTimer(){
  document.getElementById('timeLeft').textContent = timer.left;
  const C = 326.7;
  document.getElementById('ringFg').style.strokeDashoffset = C * (1 - timer.left/timer.total);
  document.getElementById('btnTimer').textContent = timer.running ? 'Pausar' : (timer.left<timer.total && timer.left>0 ? 'Continuar' : 'Iniciar');
  document.getElementById('ringFg').style.stroke = timer.left<=5 ? '#c0392b' : '#7fd6b5';
  document.querySelector('.timer-ring').classList.toggle('low', timer.left<=5 && timer.left>0);
}
function toggleTimer(){
  if(timer.running){ stopTimer(); }
  else{
    if(timer.left<=0) timer.left = timer.total;
    timer.running = true;
    timer.id = setInterval(()=>{
      timer.left--;
      if(timer.left<=0){ timer.left=0; stopTimer(); beep(); }
      else if(timer.left<=5) sndTick();
      paintTimer();
    }, 1000);
  }
  paintTimer();
}
function stopTimer(){ clearInterval(timer.id); timer.running = false; paintTimer(); }
function resetTimer(){ stopTimer(); timer.left = timer.total; paintTimer(); }
function startTimer(){ stopTimer(); timer.left = timer.total; toggleTimer(); }
function beep(){
  // alarma tipo despertador: timbre doble repetido
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const t0 = ctx.currentTime;
    for(let i=0;i<6;i++){
      [0, 0.2].forEach(off=>{
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = 1750;
        const s = t0 + i*0.45 + off;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.22, s+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, s+0.16);
        o.connect(g); g.connect(ctx.destination);
        o.start(s); o.stop(s+0.2);
      });
    }
  }catch{}
}

// Teclado: Q dispara el Equipo 1, W el Equipo 2 (solo con duelo iniciado)
document.addEventListener('click', e=>{
  if(e.target.closest && e.target.closest('.btn,.btn-mini,.menu-btn')) sndClick();
});
document.addEventListener('keydown', e=>{
  if(e.repeat) return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if(tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT') return;
  const k = e.key.toLowerCase();
  if(k!=='q' && k!=='w') return;
  if(!match.A || match.over || answering) return;
  if(document.getElementById('arena').hidden) return;
  answer(k==='q' ? 'A' : 'B', true);
});

renderAll(); paintTimer(); battleLoop();
