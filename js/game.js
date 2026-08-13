/* ------------------------------------------------------------------
   game.js — la batalla: simulación, IA, entrada y bucle principal.
   El menú, la tienda y los ajustes viven en ui.js.
-------------------------------------------------------------------*/
const Batalla = (() => {
"use strict";

const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const rival = lado => lado === "jugador" ? "enemigo" : "jugador";

const MAX_TROPAS = 30;

/* ===================== SONIDO ===================== */
const Sonido = (() => {
  let ac = null;
  const activo = () => Progreso.datos().sonido !== false;
  const ctxAudio = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());

  function bip(freq, dur, tipo = "square", vol = .05){
    if(!activo()) return;
    try{
      const a = ctxAudio();
      if(a.state === "suspended") a.resume();
      const o = a.createOscillator(), g = a.createGain();
      o.type = tipo; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    }catch{}
  }
  return {
    invocar:  () => bip(430, .09, "triangle", .06),
    golpe:    () => bip(150 + Math.random() * 60, .05, "square", .03),
    muerte:   () => bip(110, .18, "sawtooth", .04),
    castillo: () => bip(70, .3, "sawtooth", .07),
    cura:     () => bip(760, .14, "sine", .05),
    bomba:    () => bip(55, .35, "sawtooth", .09),
    error:    () => bip(120, .1, "sine", .04),
    fin: ok => { bip(ok ? 520 : 200, .18, "triangle", .07);
                 setTimeout(() => bip(ok ? 700 : 150, .3, "triangle", .07), 170); }
  };
})();

/* ===================== ESTADO ===================== */
let e, ia, ultimoSpawn = 0, anterior = 0, acumHUD = 0, animId = null;
let alTerminar = null;          // callback que pone ui.js

function nuevoEstado(){
  return {
    tiempo: 0, reloj: 0,
    pausado: true, jugando: false, resultado: null,
    oro: ECO.oroInicial, renta: ECO.rentaBase, mejoras: 0,
    unidades: [], proyectiles: [], particulas: [], textos: [],
    castillos: {
      jugador: { vida: CASTILLO.vida, temblor: 0 },
      enemigo: { vida: CASTILLO.vida, temblor: 0 }
    },
    bajas: { jugador: 0, enemigo: 0 },
    equipo: ["piquero", "ballestero", "guardia", "jauria"],
    arena: 0
  };
}
e = nuevoEstado();

/* ===================== FECHAS Y FORMATO ===================== */
const formatoTiempo = s =>
  Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

/* ===================== TOAST ===================== */
let toastT = null;
function toast(msg, err){
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast" + (err ? " err" : "");
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.add("oculto"), 2600);
}

/* ===================== TROPAS ===================== */
function crearUnidad(tipo, lado, desplazamiento = 0){
  const def = UNIDADES[tipo];
  return {
    tipo, lado, def,
    x: SPAWN[lado] + desplazamiento,
    vida: def.vida, vidaMax: def.vida,
    recarga: 0, estado: "camina",
    animGolpe: 0, destello: 0, aura: 0,
    fase: Math.random() * 6.28
  };
}

function invocar(tipo, lado){
  const def = UNIDADES[tipo];
  if(!def) return false;
  if(e.unidades.filter(u => u.lado === lado).length >= MAX_TROPAS) return false;

  if(lado === "jugador"){
    if(!e.jugando) return false;
    if(e.oro < def.costo){ Sonido.error(); toast("Te falta oro", true); return false; }
    if(e.reloj - ultimoSpawn < 0.18) return false;
    e.oro -= def.costo;
    ultimoSpawn = e.reloj;
    Sonido.invocar();
  }else{
    if(ia.oro < def.costo) return false;
    ia.oro -= def.costo;
  }

  const cuantas = def.cantidad || 1;
  for(let i = 0; i < cuantas; i++){
    // las que salen de a varias se separan un poco para no pisarse
    const off = cuantas === 1 ? 0 : (i - (cuantas - 1) / 2) * 26 * (lado === "jugador" ? -1 : 1);
    e.unidades.push(crearUnidad(tipo, lado, off));
  }
  humo(SPAWN[lado], SUELO - 10, def.color, 7);
  if(lado === "jugador") actualizarHUD();
  return true;
}

function buscarObjetivo(u){
  const dir = u.lado === "jugador" ? 1 : -1;
  let mejor = null, mejorD = Infinity;
  for(const o of e.unidades){
    if(o.lado === u.lado || o.vida <= 0) continue;
    const d = (o.x - u.x) * dir;
    if(d < -8) continue;
    if(Math.abs(d) < mejorD){ mejorD = Math.abs(d); mejor = o; }
  }
  if(mejor) return { obj: mejor, dist: mejorD };
  const cx = CASTILLO.x[rival(u.lado)];
  return { obj: "castillo", dist: Math.abs(cx - u.x) - CASTILLO.ancho / 2 };
}

/* el aliado más herido al alcance, para la Hermana Vela */
function buscarHerido(u){
  let mejor = null, peor = 1;
  for(const o of e.unidades){
    if(o === u || o.lado !== u.lado || o.vida <= 0) continue;
    if(Math.abs(o.x - u.x) > u.def.alcance) continue;
    const frac = o.vida / o.vidaMax;
    if(frac < peor && frac < 0.98){ peor = frac; mejor = o; }
  }
  return mejor;
}

function bloqueado(u){
  const dir = u.lado === "jugador" ? 1 : -1;
  for(const o of e.unidades){
    if(o === u || o.lado !== u.lado) continue;
    const d = (o.x - u.x) * dir;
    if(d > 0 && d < u.def.radio + o.def.radio + 5) return true;
  }
  return false;
}

function dañarCastillo(lado, cantidad){
  const c = e.castillos[lado];
  c.vida = Math.max(0, c.vida - cantidad * multiplicadorAsalto(e.reloj));
  c.temblor = 6;
  Sonido.castillo();
  chispas(CASTILLO.x[lado], SUELO - 40, "#d8c9a0", 6);
  if(c.vida <= 0) terminar(lado === "enemigo");
}

function dañar(objetivo, cantidad, atacante){
  const mult = multiplicador(atacante.tipo, objetivo.tipo);
  const total = Math.round(cantidad * mult * multiplicadorAsalto(e.reloj));
  objetivo.vida -= total;
  objetivo.destello = 1;
  if(mult > 1) flotante(objetivo.x, SUELO - 62, "¡" + total + "!", "#ffd166");
  chispas(objetivo.x, SUELO - 30, "#ffe9a8", 4);
  Sonido.golpe();
  if(objetivo.vida <= 0) morir(objetivo);
}

function curar(objetivo, cantidad){
  objetivo.vida = Math.min(objetivo.vidaMax, objetivo.vida + cantidad);
  objetivo.aura = 1;
  flotante(objetivo.x, SUELO - 62, "+" + cantidad, "#9fe3d0");
  Sonido.cura();
}

function morir(u){
  if(u.muerto) return;
  u.muerto = true;
  e.bajas[rival(u.lado)]++;
  humo(u.x, SUELO - 14, u.def.color, 10);
  Sonido.muerte();
}

/* ===================== PROYECTILES ===================== */
function disparar(u, objetivo){
  const destino = objetivo === "castillo"
    ? { x: CASTILLO.x[rival(u.lado)], y: SUELO - 50 }
    : { x: objetivo.x, y: SUELO - 26 };
  const desde = { x: u.x, y: SUELO - u.def.radio * 2.5 - 6 };
  const dx = destino.x - desde.x, dy = destino.y - desde.y;
  const dist = Math.hypot(dx, dy) || 1;
  const vel = u.def.proyectil === "flecha" ? 470 : u.def.proyectil === "bomba" ? 380 : 330;

  if(u.def.proyectil === "bomba") Sonido.bomba();

  e.proyectiles.push({
    x: desde.x, y: desde.y,
    vx: dx / dist * vel, vy: dy / dist * vel,
    tipo: u.def.proyectil, daño: u.def.daño, area: u.def.area || 0,
    golpeTorre: u.def.golpeTorre || 1,
    lado: u.lado, dueño: u, vida: 3
  });
}

function estallido(p){
  if(!p.area) return;
  let pegó = 0;
  for(const o of e.unidades){
    if(o.lado === p.lado || o.vida <= 0) continue;
    if(Math.hypot(o.x - p.x, (SUELO - 26) - p.y) <= p.area){ dañar(o, p.daño, p.dueño); pegó++; }
  }
  if(pegó > 1) flotante(p.x, SUELO - 90, "¡" + pegó + " de una!", "#c99bff");
  chispas(p.x, p.y, p.tipo === "bomba" ? "#ffb066" : "#dcb6ff", p.tipo === "bomba" ? 24 : 16);
}

/* ===================== EFECTOS ===================== */
function chispas(x, y, color, n){
  for(let i = 0; i < n; i++)
    e.particulas.push({ x, y, vx: rnd(-70, 70), vy: rnd(-110, -20),
      r: rnd(1.5, 3.5), color, vida: rnd(.25, .5), vidaMax: .5, atras: false });
}
function humo(x, y, color, n){
  for(let i = 0; i < n; i++)
    e.particulas.push({ x, y, vx: rnd(-35, 35), vy: rnd(-55, -10),
      r: rnd(3, 7), color, vida: rnd(.4, .8), vidaMax: .8, atras: true });
}
function flotante(x, y, txt, color){
  e.textos.push({ x, y, txt, color, vida: .9, vidaMax: .9 });
}

/* ===================== IA ===================== */
function pensarIA(dt){
  const minutos = e.reloj / 60;
  const factor = ARENAS[e.arena].iaRenta;
  const renta = Math.min(IA.rentaMaxima, IA.rentaInicial + IA.rentaPorMinuto * minutos) * factor;
  ia.oro = Math.min(ECO.oroMaximo * 1.2, ia.oro + renta * dt);

  ia.proxima -= dt;
  if(ia.proxima > 0) return;
  ia.proxima = rnd(IA.pausaMin, IA.pausaMax);

  const conteo = {};
  for(const u of e.unidades) if(u.lado === "jugador") conteo[u.tipo] = (conteo[u.tipo] || 0) + 1;
  const dominante = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a])[0];

  let elegido = null;
  if(dominante && Math.random() < IA.astucia){
    elegido = ia.mazo.find(t => multiplicador(t, dominante) > 1) || null;
  }
  if(!elegido || ia.oro < UNIDADES[elegido].costo){
    const posibles = ia.mazo.filter(t => UNIDADES[t].costo <= ia.oro);
    if(!posibles.length) return;
    posibles.sort((a, b) => UNIDADES[a].costo - UNIDADES[b].costo);
    elegido = Math.random() < .25
      ? posibles[posibles.length - 1]
      : posibles[Math.floor(Math.random() * posibles.length)];
  }
  invocar(elegido, "enemigo");
}

/* ===================== SIMULACIÓN ===================== */
function actualizar(dt){
  e.tiempo += dt;
  if(e.pausado) return;
  if(e.jugando){
    e.reloj += dt;
    if(e.reloj >= ASALTO.limite){
      terminar(e.castillos.jugador.vida >= e.castillos.enemigo.vida);
      return;
    }
    e.oro = Math.min(ECO.oroMaximo, e.oro + e.renta * dt);
    pensarIA(dt);
  }

  for(const lado of ["jugador", "enemigo"]){
    const c = e.castillos[lado];
    if(c.temblor > 0) c.temblor = Math.max(0, c.temblor - dt * 22);
  }

  for(const u of e.unidades){
    if(u.vida <= 0) continue;
    u.recarga   = Math.max(0, u.recarga   - dt);
    u.animGolpe = Math.max(0, u.animGolpe - dt * 3.2);
    u.destello  = Math.max(0, u.destello  - dt * 5);
    u.aura      = Math.max(0, u.aura      - dt * 2);
    if(!e.jugando){ u.estado = "quieto"; continue; }

    /* --- sanadora: cura en vez de pegar --- */
    if(u.def.cura){
      const herido = buscarHerido(u);
      if(herido){
        u.estado = "pelea";
        if(u.recarga === 0){
          u.recarga = 1 / u.def.cadencia;
          u.animGolpe = 1;
          curar(herido, u.def.cura);
        }
        continue;
      }
      if(!bloqueado(u)){
        u.estado = "camina";
        u.x += (u.lado === "jugador" ? 1 : -1) * u.def.velocidad * dt;
      }else u.estado = "quieto";
      continue;
    }

    const { obj, dist } = buscarObjetivo(u);
    if(dist <= u.def.alcance){
      u.estado = "pelea";
      if(u.recarga === 0){
        u.recarga = 1 / u.def.cadencia;
        u.animGolpe = 1;
        if(u.def.proyectil) disparar(u, obj);
        else if(obj === "castillo") dañarCastillo(rival(u.lado), u.def.daño * (u.def.golpeTorre || 1));
        else dañar(obj, u.def.daño, u);
      }
    }else if(!bloqueado(u)){
      u.estado = "camina";
      u.x += (u.lado === "jugador" ? 1 : -1) * u.def.velocidad * dt;
    }else u.estado = "quieto";
  }
  e.unidades = e.unidades.filter(u => u.vida > 0);

  for(const p of e.proyectiles){
    p.vida -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if(p.tipo !== "flecha") p.vy += 120 * dt;

    let impacto = false;
    for(const o of e.unidades){
      if(o.lado === p.lado || o.vida <= 0) continue;
      if(Math.abs(o.x - p.x) < o.def.radio + 6 && p.y > SUELO - 46){
        if(p.area) estallido(p); else dañar(o, p.daño, p.dueño);
        impacto = true; break;
      }
    }
    if(!impacto){
      const cx = CASTILLO.x[rival(p.lado)];
      const llego = p.lado === "jugador" ? p.x >= cx - CASTILLO.ancho / 2
                                         : p.x <= cx + CASTILLO.ancho / 2;
      if(llego){ dañarCastillo(rival(p.lado), p.daño * p.golpeTorre); impacto = true; }
    }
    if(impacto || p.y > SUELO || p.vida <= 0){
      if(p.area && !impacto) estallido(p);
      p.muerto = true;
    }
  }
  e.proyectiles = e.proyectiles.filter(p => !p.muerto);

  for(const p of e.particulas){
    p.vida -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 190 * dt;
  }
  e.particulas = e.particulas.filter(p => p.vida > 0);
  for(const f of e.textos){ f.vida -= dt; f.y -= 26 * dt; }
  e.textos = e.textos.filter(f => f.vida > 0);
}

/* ===================== FIN ===================== */
function terminar(gano){
  if(!e.jugando) return;
  e.jugando = false;
  e.resultado = gano;
  Sonido.fin(gano);
  const premio = Progreso.registrarPartida(gano);
  if(alTerminar) alTerminar(gano, premio, {
    duracion: formatoTiempo(e.reloj),
    bajas: e.bajas.jugador,
    perdidas: e.bajas.enemigo
  });
}

/* ===================== HUD ===================== */
function construirCartas(){
  const cont = $("cartas");
  cont.innerHTML = "";
  e.equipo.forEach((tipo, i) => {
    const d = UNIDADES[tipo];
    const b = document.createElement("button");
    b.className = "carta";
    b.dataset.tipo = tipo;
    b.innerHTML = '<span class="carta-tecla"></span><span class="carta-ico"></span>' +
                  '<span class="carta-nombre"></span><span class="carta-costo"></span>';
    b.querySelector(".carta-tecla").textContent  = i + 1;
    b.querySelector(".carta-ico").textContent    = d.icono;
    b.querySelector(".carta-nombre").textContent = d.nombre;
    b.querySelector(".carta-costo").textContent  = d.costo;
    b.title = d.pista;
    b.style.setProperty("--c", d.color);
    b.onclick = () => invocar(tipo, "jugador");
    cont.appendChild(b);
  });
}

function actualizarHUD(){
  $("oro").textContent = Math.floor(e.oro);
  $("renta").textContent = "+" + e.renta + "/s";
  for(const b of document.querySelectorAll(".carta"))
    b.classList.toggle("sinplata", e.oro < UNIDADES[b.dataset.tipo].costo);

  const m = ECO.mejora, btn = $("mejoraBtn");
  if(e.mejoras >= m.maximo){
    btn.disabled = true;
    btn.innerHTML = "<span>Economía</span><small>al máximo</small>";
  }else{
    const costo = m.costoBase + m.incremento * e.mejoras;
    btn.disabled = e.oro < costo;
    btn.innerHTML = "<span>+" + m.renta + " oro/s</span><small>" + costo + "</small>";
  }
}

function mejorarEconomia(){
  if(!e.jugando) return;
  const m = ECO.mejora;
  if(e.mejoras >= m.maximo) return;
  const costo = m.costoBase + m.incremento * e.mejoras;
  if(e.oro < costo){ Sonido.error(); toast("Te falta oro", true); return; }
  e.oro -= costo; e.mejoras++; e.renta += m.renta;
  flotante(CASTILLO.x.jugador, SUELO - 170, "+" + m.renta + " oro/s", "#ffd166");
  Sonido.invocar();
  actualizarHUD();
}

/* ===================== BUCLE ===================== */
function bucle(ts){
  animId = requestAnimationFrame(bucle);
  if(!anterior) anterior = ts;
  const dt = Math.min((ts - anterior) / 1000, 0.05);
  anterior = ts;

  actualizar(dt);
  Render.pintar(e);

  acumHUD += dt;
  if(acumHUD > 0.1){
    acumHUD = 0;
    actualizarHUD();
    $("reloj").textContent = formatoTiempo(e.reloj);

    const mult = multiplicadorAsalto(e.reloj);
    const av = $("asalto");
    av.classList.toggle("oculto", mult <= 1.01);
    if(mult > 1.01) av.textContent = "⚔️ Asalto final x" + mult.toFixed(1);

    $("vidaJugador").style.width = (e.castillos.jugador.vida / CASTILLO.vida * 100) + "%";
    $("vidaEnemigo").style.width = (e.castillos.enemigo.vida / CASTILLO.vida * 100) + "%";
  }
}

/* ===================== API ===================== */
function iniciar(){
  const arena = Progreso.arenaActual();
  e = nuevoEstado();
  e.equipo = Progreso.equipo();
  e.arena = arena;
  e.pausado = false;
  e.jugando = true;

  // el rival juega con lo que hay disponible en esta arena
  const disponibles = TODAS.filter(t => UNIDADES[t].arena <= arena);
  ia = { oro: 40, proxima: 1.2, mazo: disponibles };

  ultimoSpawn = -1;      // en 0 el anti-spam bloquearía la primera invocación
  construirCartas();
  actualizarHUD();
  $("arenaEnJuego").textContent = ARENAS[arena].nombre;
}

const pausar = v => { e.pausado = v; };

/* teclas y botones de la pantalla de batalla */
addEventListener("keydown", ev => {
  if(ev.repeat || !e.jugando || e.pausado) return;
  const i = "1234".indexOf(ev.key);
  if(i !== -1 && e.equipo[i]){ ev.preventDefault(); invocar(e.equipo[i], "jugador"); }
  if(ev.key === "e" || ev.key === "E") mejorarEconomia();
});

return {
  iniciar, pausar, invocar, mejorarEconomia, terminar, toast,
  estado: () => e,
  alTerminar: fn => { alTerminar = fn; },
  arrancarBucle: () => { if(!animId) animId = requestAnimationFrame(bucle); },
  /* sólo para probar balance desde la consola */
  avanzar(segundos, paso = 1 / 60){
    const n = Math.round(segundos / paso);
    for(let i = 0; i < n && e.jugando; i++) actualizar(paso);
  }
};
})();
