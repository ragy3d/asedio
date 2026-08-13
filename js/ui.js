/* ------------------------------------------------------------------
   ui.js — menú, pestañas, armado de equipo, tienda, ajustes y la
   pantalla de resultado. Habla con Progreso y con Batalla.
-------------------------------------------------------------------*/
(() => {
"use strict";

const $  = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];

let ranuraElegida = 0;

/* ===================== NAVEGACIÓN ===================== */
function mostrarPantalla(cual){
  $$(".pantalla").forEach(p => p.classList.toggle("oculto", p.dataset.pantalla !== cual));
  Batalla.pausar(cual !== "batalla");
  // el canvas recién tiene medidas reales cuando su pantalla está visible
  if(cual === "batalla") Render.redimensionar();
}

function abrirPestaña(cual){
  $$(".tab").forEach(b => b.classList.toggle("activa", b.dataset.tab === cual));
  $$(".panel-tab").forEach(p => p.classList.toggle("oculto", p.dataset.panel !== cual));
  if(cual === "equipo") pintarEquipo();
  if(cual === "tienda") pintarTienda();
  if(cual === "ajustes") pintarAjustes();
}

/* ===================== CABECERA ===================== */
function pintarCabecera(){
  const d = Progreso.datos();
  const p = Progreso.progresoArena();
  const a = ARENAS[p.i];

  $("copas").textContent = d.copas;
  $("gemas").textContent = d.gemas;
  $("arenaNombre").textContent = a.nombre;
  $("arenaNum").textContent = "Arena " + (p.i + 1);
  $("arenaBarra").style.width = Math.max(0, Math.min(100, p.frac * 100)) + "%";
  $("arenaBarra").style.background = a.color;
  $("arenaFaltan").textContent = p.faltan === null
    ? "Llegaste al final"
    : "Faltan " + p.faltan + " copas para " + p.siguiente.nombre;
}

/* ===================== PESTAÑA BATALLA ===================== */
function pintarBatallaTab(){
  const eq = Progreso.equipo();
  $("equipoResumen").innerHTML = "";
  eq.forEach(t => {
    const d = UNIDADES[t];
    const el = document.createElement("div");
    el.className = "mini-carta";
    el.style.setProperty("--c", d.color);
    el.innerHTML = '<span class="mini-ico"></span><span class="mini-nom"></span>';
    el.querySelector(".mini-ico").textContent = d.icono;
    el.querySelector(".mini-nom").textContent = d.nombre;
    $("equipoResumen").appendChild(el);
  });

  const d = Progreso.datos();
  $("estadisticas").textContent =
    d.partidas.jugadas + " partidas · " + d.partidas.ganadas + " ganadas";

  // lista de arenas con lo que desbloquea cada una
  const actual = Progreso.arenaActual();
  $("listaArenas").innerHTML = "";
  ARENAS.forEach((a, i) => {
    const nuevas = Progreso.nuevasDe(i);
    const el = document.createElement("div");
    el.className = "arena-fila" + (i === actual ? " actual" : i > actual ? " bloqueada" : "");
    el.innerHTML =
      '<span class="arena-punto"></span>' +
      '<div class="arena-info"><b></b><small></small></div>' +
      '<div class="arena-tropas"></div>';
    el.querySelector(".arena-punto").style.background = a.color;
    el.querySelector("b").textContent = a.nombre;
    el.querySelector("small").textContent = a.copas + " copas";
    el.querySelector(".arena-tropas").textContent =
      nuevas.map(t => UNIDADES[t].icono).join(" ") || "—";
    $("listaArenas").appendChild(el);
  });
}

/* ===================== PESTAÑA EQUIPO ===================== */
function pintarEquipo(){
  const eq = Progreso.equipo();

  $("ranuras").innerHTML = "";
  eq.forEach((t, i) => {
    const d = UNIDADES[t];
    const b = document.createElement("button");
    b.className = "ranura" + (i === ranuraElegida ? " elegida" : "");
    b.style.setProperty("--c", d.color);
    b.innerHTML = '<span class="ranura-ico"></span><span class="ranura-nom"></span>' +
                  '<span class="ranura-costo"></span>';
    b.querySelector(".ranura-ico").textContent   = d.icono;
    b.querySelector(".ranura-nom").textContent   = d.nombre;
    b.querySelector(".ranura-costo").textContent = d.costo;
    b.onclick = () => { ranuraElegida = i; pintarEquipo(); };
    $("ranuras").appendChild(b);
  });

  const arena = Progreso.arenaActual();
  $("coleccion").innerHTML = "";
  TODAS.forEach(t => {
    const d = UNIDADES[t];
    const abierta = d.arena <= arena;
    const enEquipo = eq.includes(t);

    const el = document.createElement("button");
    el.className = "tropa" + (abierta ? "" : " cerrada") + (enEquipo ? " puesta" : "");
    el.style.setProperty("--c", d.color);
    el.innerHTML =
      '<div class="tropa-cab"><span class="tropa-ico"></span>' +
      '<div><b class="tropa-nom"></b><small class="tropa-rol"></small></div>' +
      '<span class="tropa-costo"></span></div>' +
      '<p class="tropa-pista"></p>' +
      '<div class="tropa-nums"></div>';

    el.querySelector(".tropa-ico").textContent   = d.icono;
    el.querySelector(".tropa-nom").textContent   = d.nombre;
    el.querySelector(".tropa-rol").textContent   = abierta ? d.rol : "Arena " + (d.arena + 1);
    el.querySelector(".tropa-costo").textContent = d.costo;
    el.querySelector(".tropa-pista").textContent = d.pista;

    const nums = [
      ["Vida", d.vida],
      [d.cura ? "Cura" : "Daño", d.cura || d.daño],
      ["Alcance", d.alcance],
      ["Recarga", (1 / d.cadencia).toFixed(1) + "s"],
      ["Velocidad", d.velocidad]
    ];
    if(d.cantidad) nums.push(["Salen", d.cantidad]);
    if(d.golpeTorre) nums.push(["A la torre", "x" + d.golpeTorre]);
    if(d.area) nums.push(["Área", d.area]);
    el.querySelector(".tropa-nums").innerHTML =
      nums.map(([k, v]) => '<span><i>' + k + '</i>' + v + '</span>').join("");

    el.onclick = () => {
      if(!abierta){
        Batalla.toast("Se abre en la arena " + (d.arena + 1) + ": " + ARENAS[d.arena].nombre, true);
        return;
      }
      Progreso.ponerEnEquipo(t, ranuraElegida);
      ranuraElegida = (ranuraElegida + 1) % SLOTS_EQUIPO;
      pintarEquipo();
      pintarBatallaTab();
    };
    $("coleccion").appendChild(el);
  });

  // tabla de ventajas
  $("tablaVentajas").innerHTML = Object.entries(VENTAJAS).map(([a, contra]) =>
    Object.entries(contra).map(([b, m]) =>
      '<li>' + UNIDADES[a].icono + ' <b>' + UNIDADES[a].nombre + '</b> → ' +
      UNIDADES[b].icono + ' ' + UNIDADES[b].nombre + ' <em>x' + m + '</em></li>'
    ).join("")
  ).join("");
}

/* ===================== TIENDA ===================== */
function miniTorre(s){
  return '<svg viewBox="0 0 60 66" class="mini-torre" aria-hidden="true">' +
    '<rect x="14" y="16" width="32" height="46" fill="' + s.muro + '"/>' +
    '<rect x="14" y="10" width="7" height="8" fill="' + s.almena + '"/>' +
    '<rect x="26" y="10" width="7" height="8" fill="' + s.almena + '"/>' +
    '<rect x="38" y="10" width="7" height="8" fill="' + s.almena + '"/>' +
    '<rect x="25" y="44" width="11" height="18" rx="5" fill="' + s.porton + '"/>' +
    '<line x1="14" y1="10" x2="14" y2="2" stroke="#5a4632" stroke-width="2"/>' +
    '<path d="M14 2 L30 6 L14 10 Z" fill="' + s.bandera + '"/></svg>';
}

function pintarTienda(){
  const d = Progreso.datos();
  $("gemasTienda").textContent = d.gemas;

  const conGemas = SKINS.filter(s => s.precioGemas !== undefined);
  const conPesos = SKINS.filter(s => s.precioPesos !== undefined);

  const tarjeta = s => {
    const tiene = Progreso.tieneSkin(s.id);
    const puesta = d.skinActiva === s.id;
    const el = document.createElement("div");
    el.className = "skin" + (puesta ? " puesta" : "") + (tiene ? " comprada" : "");
    el.innerHTML =
      miniTorre(s) +
      '<b class="skin-nom"></b><small class="skin-desc"></small>' +
      '<button class="skin-btn"></button>';
    el.querySelector(".skin-nom").textContent  = s.nombre;
    el.querySelector(".skin-desc").textContent = s.desc;

    const btn = el.querySelector(".skin-btn");
    if(puesta){
      btn.textContent = "En uso"; btn.disabled = true; btn.className = "skin-btn puesta";
    }else if(tiene){
      btn.textContent = "Usar";
      btn.onclick = () => { Progreso.equiparSkin(s.id); pintarTienda(); };
    }else if(s.precioGemas !== undefined){
      btn.className = "skin-btn comprar";
      btn.innerHTML = '<span class="gema"></span>' + s.precioGemas;
      btn.onclick = () => {
        const r = Progreso.comprarSkin(s.id);
        if(r.ok){ Batalla.toast("¡" + s.nombre + " desbloqueada!"); pintarTienda(); pintarCabecera(); }
        else if(r.motivo === "gemas") Batalla.toast("Te faltan " + r.faltan + " gemas", true);
      };
    }else{
      btn.className = "skin-btn pago";
      btn.textContent = "$" + s.precioPesos.toLocaleString("es-AR");
      btn.onclick = () => Pagos.intentarComprar(s);
    }
    return el;
  };

  $("skinsGemas").innerHTML = "";
  conGemas.forEach(s => $("skinsGemas").appendChild(tarjeta(s)));
  $("skinsPesos").innerHTML = "";
  conPesos.forEach(s => $("skinsPesos").appendChild(tarjeta(s)));

  $("avisoPagos").textContent = Pagos.estado();
}

/* ===================== AJUSTES ===================== */
function pintarAjustes(){
  const d = Progreso.datos();
  $("cfgSonido").checked = d.sonido !== false;
  $("resumenProgreso").textContent =
    d.copas + " copas · " + d.gemas + " gemas · " + d.skins.length + " skins · " +
    d.partidas.ganadas + "/" + d.partidas.jugadas + " partidas ganadas";
}

/* ===================== RESULTADO ===================== */
Batalla.alTerminar((gano, premio, datos) => {
  $("finTitulo").textContent = gano ? "¡Victoria!" : "Derrota";
  $("finTitulo").className = "titulo " + (gano ? "gano" : "perdio");
  $("finTexto").textContent = gano
    ? "Tiraste abajo el castillo enemigo."
    : "Cayó tu castillo. Mirá qué tropas manda el rival y respondé con su counter.";

  $("finPremios").innerHTML =
    '<div class="premio"><span class="copa"></span><b>' +
      (premio.copas > 0 ? "+" : "") + premio.copas + '</b><small>copas</small></div>' +
    '<div class="premio"><span class="gema"></span><b>+' + premio.gemas +
      '</b><small>gemas</small></div>';

  $("finDatos").textContent =
    "Duró " + datos.duracion + " · bajas enemigas: " + datos.bajas +
    " · perdiste " + datos.perdidas + " tropas";

  const asc = $("finAscenso");
  if(premio.subioArena){
    const nuevas = premio.nuevas.map(t => UNIDADES[t].icono + " " + UNIDADES[t].nombre);
    asc.className = "ascenso";
    asc.innerHTML = "<b>¡Subiste a " + premio.subioArena.nombre + "!</b>" +
      (nuevas.length ? "<br>Se te suman: " + nuevas.join(", ") : "");
    asc.classList.remove("oculto");
  }else if(premio.bajoArena){
    asc.className = "ascenso baja";
    asc.innerHTML = "<b>Bajaste a " + premio.bajoArena.nombre + "</b>";
    asc.classList.remove("oculto");
  }else{
    asc.classList.add("oculto");
  }

  $("finOverlay").classList.remove("oculto");
  pintarCabecera();
});

/* ===================== EVENTOS ===================== */
$$(".tab").forEach(b => b.onclick = () => abrirPestaña(b.dataset.tab));

$("pelearBtn").onclick = () => {
  mostrarPantalla("batalla");
  Batalla.iniciar();
  $("finOverlay").classList.add("oculto");
};

$("otraBtn").onclick = () => {
  $("finOverlay").classList.add("oculto");
  Batalla.iniciar();
};

$("alMenuBtn").onclick = () => {
  $("finOverlay").classList.add("oculto");
  mostrarPantalla("menu");
  pintarCabecera(); pintarBatallaTab(); abrirPestaña("batalla");
};

$("mejoraBtn").onclick = () => Batalla.mejorarEconomia();
$("rendirseBtn").onclick = () => {
  const e = Batalla.estado();
  if(!e.jugando){                       // ya terminó: sólo volvemos
    mostrarPantalla("menu");
    pintarCabecera(); pintarBatallaTab();
    return;
  }
  if(confirm("¿Abandonar la partida? Cuenta como derrota.")) Batalla.terminar(false);
};

$("cfgSonido").onchange = ev => Progreso.ajustar("sonido", ev.target.checked);

$("cfgBorrar").onclick = () => {
  if(!confirm("Esto borra copas, gemas, skins y todo el progreso. ¿Seguro?")) return;
  Progreso.borrarTodo();
  pintarCabecera(); pintarBatallaTab(); pintarAjustes();
  Batalla.toast("Progreso borrado");
};

$("ayudaBtn").onclick    = () => $("ayudaOverlay").classList.remove("oculto");
$("ayudaCerrar").onclick = () => $("ayudaOverlay").classList.add("oculto");

addEventListener("keydown", ev => {
  if(ev.key === "Escape"){
    $("ayudaOverlay").classList.add("oculto");
  }
});

/* ===================== INSTALAR ===================== */
let eventoInstalar = null;

addEventListener("beforeinstallprompt", ev => {
  ev.preventDefault();
  eventoInstalar = ev;
  $("instalarBtn").classList.remove("oculto");
});

$("instalarBtn").onclick = async () => {
  if(!eventoInstalar) return;
  eventoInstalar.prompt();
  const { outcome } = await eventoInstalar.userChoice;
  eventoInstalar = null;
  $("instalarBtn").classList.add("oculto");
  if(outcome === "accepted") Batalla.toast("Instalado 🎉 buscalo entre tus apps");
};

addEventListener("appinstalled", () => {
  eventoInstalar = null;
  $("instalarBtn").classList.add("oculto");
});

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

/* ===================== ARRANQUE ===================== */
Render.init($("lienzo"));
Batalla.arrancarBucle();
pintarCabecera();
pintarBatallaTab();
abrirPestaña("batalla");
mostrarPantalla("menu");

window.Juego = { Progreso, Batalla, pintarCabecera, pintarBatallaTab, abrirPestaña, mostrarPantalla };

})();
