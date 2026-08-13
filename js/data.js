/* ------------------------------------------------------------------
   data.js — todo el contenido y el balance del juego.
   El mundo mide MUNDO_W x MUNDO_H unidades lógicas y se escala a la
   pantalla, así se ve igual en celular y en monitor.
-------------------------------------------------------------------*/
const MUNDO_W = 1000;
const MUNDO_H = 420;
const SUELO   = 340;

const CASTILLO = {
  vida:  950,
  x:     { jugador: 62, enemigo: 938 },
  ancho: 92,
  alto:  150
};

const SPAWN = { jugador: 130, enemigo: 870 };

/* ===================== TROPAS =====================
   costo      oro que sale
   vida/daño  obvios
   alcance    a qué distancia empieza a pegar
   cadencia   ataques por segundo (0.22 = uno cada 4,5 s)
   velocidad  unidades por segundo
   cantidad   cuántas salen por invocación
   cura       si está, en vez de pegar cura al aliado más herido
   golpeTorre multiplicador de daño contra el castillo
   arena      en qué arena se desbloquea
--------------------------------------------------------*/
const UNIDADES = {
  piquero: {
    nombre:"Piquero", icono:"🔱", costo:35,
    vida:130, daño:14, alcance:40, cadencia:1.1, velocidad:70, radio:11,
    color:"#7ec8a9", arena:0, rol:"Tropa de línea",
    pista:"Barato y ligero. Las picas frenan en seco a la caballería."
  },
  ballestero: {
    nombre:"Ballestero", icono:"🏹", costo:45,
    vida:90, daño:16, alcance:190, cadencia:0.9, velocidad:48, radio:10,
    color:"#e8c46a", proyectil:"flecha", arena:0, rol:"Tiro medio",
    pista:"Castiga de lejos. Si lo alcanzan, dura dos segundos."
  },
  guardia: {
    nombre:"Guardia de Hierro", icono:"🛡️", costo:60,
    vida:240, daño:22, alcance:42, cadencia:1.0, velocidad:55, radio:13,
    color:"#8fb8ff", arena:0, rol:"Muro",
    pista:"Aguanta todo y camina sobre los tiradores."
  },

  jauria: {
    nombre:"Jauría", icono:"🐺", costo:40,
    vida:55, daño:11, alcance:30, cadencia:1.6, velocidad:95, radio:9,
    color:"#b9a48c", cantidad:3, arena:0, rol:"Enjambre",
    pista:"Salen tres. Muerden rapidísimo y mueren igual de rápido."
  },
  hechicero: {
    nombre:"Hechicero", icono:"🔮", costo:110,
    vida:85, daño:30, alcance:200, cadencia:0.55, velocidad:40, radio:11,
    color:"#c99bff", proyectil:"bola", area:50, arena:1, rol:"Daño en área",
    pista:"Su bola estalla. Contra un montón junto, no hay nada mejor."
  },

  hermana: {
    nombre:"Hermana Vela", icono:"✨", costo:80,
    vida:95, daño:0, cura:22, alcance:130, cadencia:0.8, velocidad:45, radio:10,
    color:"#9fe3d0", arena:1, rol:"Sanadora",
    pista:"No pelea: cura al aliado más herido. Mandala detrás de un muro."
  },
  bombarda: {
    nombre:"Bombarda", icono:"💣", costo:140,
    vida:70, daño:75, alcance:330, cadencia:0.22, velocidad:22, radio:14,
    color:"#d98b5f", proyectil:"bomba", area:62, arena:2, rol:"Asedio",
    pista:"Alcance brutal y un pepinazo enorme, pero tarda 4 segundos en recargar."
  },

  furia: {
    nombre:"Furia del Norte", icono:"🪓", costo:90,
    vida:150, daño:46, alcance:44, cadencia:1.15, velocidad:66, radio:12,
    color:"#e0745f", arena:2, rol:"Rompedor",
    pista:"Pega como un camión. Sin armadura: cae rápido si lo enfocan."
  },
  sombra: {
    nombre:"Sombra", icono:"🗡️", costo:70,
    vida:80, daño:30, alcance:36, cadencia:1.5, velocidad:110, radio:10,
    color:"#8f8fc9", arena:3, rol:"Asesina",
    pista:"La más rápida del juego. Va directo a los que tiran de lejos."
  },

  ariete: {
    nombre:"Rompeportones", icono:"🐏", costo:160,
    vida:420, daño:20, golpeTorre:3.5, alcance:46, cadencia:0.7, velocidad:32, radio:16,
    color:"#a98f6f", arena:4, rol:"Derriba torres",
    pista:"Lentísimo y durísimo. Contra tropas es flojo; contra el castillo, demoledor."
  }
};

const TODAS = Object.keys(UNIDADES);

/* Ventajas: pegarle con la tropa correcta multiplica el daño. */
const VENTAJAS = {
  piquero:    { guardia:2.2, ariete:1.9 },
  guardia:    { ballestero:1.9, sombra:1.7 },
  ballestero: { piquero:1.7, jauria:1.8 },
  furia:      { guardia:1.6, ariete:1.5 },
  sombra:     { ballestero:1.8, hechicero:2.0, bombarda:2.2 },
  jauria:     { hechicero:1.8, bombarda:2.0 }
};

function multiplicador(atacante, defensor){
  const v = VENTAJAS[atacante];
  return (v && v[defensor]) || 1;
}

/* ===================== ARENAS ===================== */
const ARENAS = [
  { nombre:"Campo de Entrenamiento", copas:0,    color:"#6a8f5e", iaRenta:0.90 },
  { nombre:"Valle de Ceniza",        copas:120,  color:"#8a6f5e", iaRenta:0.98 },
  { nombre:"Puente Quebrado",        copas:300,  color:"#5e7d8a", iaRenta:1.06 },
  { nombre:"Bosque Colgante",        copas:550,  color:"#5b7a52", iaRenta:1.14 },
  { nombre:"Fortaleza del Trueno",   copas:850,  color:"#7a5e8a", iaRenta:1.22 },
  { nombre:"Trono de Hierro",        copas:1250, color:"#8a5e5e", iaRenta:1.30 }
];

const PREMIOS = {
  copasGanar: 30,
  copasPerder: -18,
  gemasGanar: 12,
  gemasPerder: 3,
  bonoArena: 4        // gemas extra por arena alcanzada
};

const SLOTS_EQUIPO = 4;

/* ===================== SKINS DE TORRE ===================== */
/* `precioGemas` = se compra jugando.  `precioPesos` = pack pago (todavía
   no conectado: ver pagos.js). */
const SKINS = [
  { id:"piedra",   nombre:"Piedra",         desc:"La de siempre.",
    muro:"#8b93a8", almena:"#79839b", bandera:"#5b8dd6", porton:"#4a3524", precioGemas:0 },
  { id:"bosque",   nombre:"Torre del Bosque", desc:"Cubierta de hiedra.",
    muro:"#6f8a63", almena:"#5e7654", bandera:"#8fd06a", porton:"#3f3222", precioGemas:300 },
  { id:"marfil",   nombre:"Marfil",         desc:"Piedra clara pulida.",
    muro:"#d8d3c4", almena:"#c2bcab", bandera:"#e8c46a", porton:"#6b563c", precioGemas:600 },
  { id:"obsidiana",nombre:"Obsidiana",      desc:"Piedra volcánica negra.",
    muro:"#3b3f4d", almena:"#2e3240", bandera:"#c95b5b", porton:"#241d17", precioGemas:900 },
  { id:"real",     nombre:"Fortaleza Real", desc:"Oro macizo y estandarte púrpura.",
    muro:"#c9a94f", almena:"#b0913c", bandera:"#8b5bd6", porton:"#5a4020", precioPesos:1500 },
  { id:"infernal", nombre:"Ciudadela Ígnea",desc:"Piedra al rojo vivo.",
    muro:"#6b3030", almena:"#552424", bandera:"#ff7a3d", porton:"#2a1410", precioPesos:2500 }
];

const skinPorId = id => SKINS.find(s => s.id === id) || SKINS[0];

/* ===================== ECONOMÍA DE PARTIDA ===================== */
const ECO = {
  oroInicial:  70,
  oroMaximo:   260,
  rentaBase:   12,
  mejora: { costoBase:80, incremento:60, renta:5, maximo:5 }
};

/* Sin esto las arenas altas se empantanan: dos líneas parejas se traban en
   el medio y no pasa nada nunca. Desde `desde` segundos todo el daño se va
   multiplicando, así la partida se rompe sola; y al llegar al `limite` gana
   el que tenga el castillo más entero. */
const ASALTO = {
  desde:   130,
  hasta:   260,
  maximo:  2.6,
  limite:  260
};

function multiplicadorAsalto(t){
  if(t <= ASALTO.desde) return 1;
  const f = (t - ASALTO.desde) / (ASALTO.hasta - ASALTO.desde);
  return 1 + Math.min(1, f) * (ASALTO.maximo - 1);
}

const IA = {
  rentaInicial:   8,
  rentaPorMinuto: 1.0,
  rentaMaxima:    14,
  pausaMin: 0.7,
  pausaMax: 2.2,
  astucia: 0.7
};
