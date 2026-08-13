/* ------------------------------------------------------------------
   progreso.js — lo único que sobrevive entre partidas: copas, arena,
   gemas, tropas desbloqueadas, equipo elegido y skins compradas.
   Vive en localStorage, en el navegador del jugador.
-------------------------------------------------------------------*/
const Progreso = (() => {
  const CLAVE = "asedio.progreso.v1";

  const INICIAL = {
    copas: 0,
    gemas: 120,
    equipo: ["piquero", "ballestero", "guardia", "jauria"],
    skins: ["piedra"],
    skinActiva: "piedra",
    sonido: true,
    partidas: { jugadas: 0, ganadas: 0 },
    mejorArena: 0
  };

  let d = cargar();

  function cargar(){
    try{
      const g = JSON.parse(localStorage.getItem(CLAVE));
      return g ? Object.assign(structuredClone(INICIAL), g) : structuredClone(INICIAL);
    }catch{
      return structuredClone(INICIAL);
    }
  }

  const guardar = () => {
    try{ localStorage.setItem(CLAVE, JSON.stringify(d)); }catch{}
  };

  /* -------- arenas -------- */
  function arenaActual(){
    let i = 0;
    for(let k = 0; k < ARENAS.length; k++) if(d.copas >= ARENAS[k].copas) i = k;
    return i;
  }
  const arena = () => ARENAS[arenaActual()];

  /* copas que faltan para la próxima arena, o null si ya está arriba de todo */
  function progresoArena(){
    const i = arenaActual();
    if(i >= ARENAS.length - 1) return { i, frac: 1, faltan: null, siguiente: null };
    const desde = ARENAS[i].copas, hasta = ARENAS[i + 1].copas;
    return {
      i,
      frac: (d.copas - desde) / (hasta - desde),
      faltan: hasta - d.copas,
      siguiente: ARENAS[i + 1]
    };
  }

  /* -------- tropas -------- */
  const desbloqueadas = () => TODAS.filter(t => UNIDADES[t].arena <= arenaActual());
  const estaDesbloqueada = t => UNIDADES[t].arena <= arenaActual();

  /* las que se suman justo al llegar a esta arena */
  const nuevasDe = i => TODAS.filter(t => UNIDADES[t].arena === i);

  /* -------- equipo -------- */
  function equipo(){
    // filtramos por las si acaso quedó guardada una tropa que ya no corresponde
    const limpio = d.equipo.filter(estaDesbloqueada);
    for(const t of desbloqueadas()){
      if(limpio.length >= SLOTS_EQUIPO) break;
      if(!limpio.includes(t)) limpio.push(t);
    }
    return limpio.slice(0, SLOTS_EQUIPO);
  }

  function ponerEnEquipo(tropa, ranura){
    if(!estaDesbloqueada(tropa)) return false;
    const e = equipo();
    const yaEsta = e.indexOf(tropa);
    if(yaEsta !== -1 && yaEsta !== ranura){        // si ya está, las intercambia
      e[yaEsta] = e[ranura];
    }
    e[ranura] = tropa;
    d.equipo = e;
    guardar();
    return true;
  }

  /* -------- resultado de una partida -------- */
  function registrarPartida(gano){
    const antes = arenaActual();
    d.partidas.jugadas++;
    if(gano) d.partidas.ganadas++;

    d.copas = Math.max(0, d.copas + (gano ? PREMIOS.copasGanar : PREMIOS.copasPerder));
    const gemas = (gano ? PREMIOS.gemasGanar : PREMIOS.gemasPerder) + antes * PREMIOS.bonoArena;
    d.gemas += gemas;

    const ahora = arenaActual();
    if(ahora > d.mejorArena) d.mejorArena = ahora;
    guardar();

    return {
      copas: gano ? PREMIOS.copasGanar : PREMIOS.copasPerder,
      gemas,
      subioArena: ahora > antes ? ARENAS[ahora] : null,
      bajoArena:  ahora < antes ? ARENAS[ahora] : null,
      nuevas: ahora > antes ? nuevasDe(ahora) : []
    };
  }

  /* -------- tienda -------- */
  const tieneSkin = id => d.skins.includes(id);

  function comprarSkin(id){
    const s = skinPorId(id);
    if(tieneSkin(id))           return { ok:false, motivo:"ya la tenés" };
    if(!s.precioGemas)          return { ok:false, motivo:"pago" };
    if(d.gemas < s.precioGemas) return { ok:false, motivo:"gemas", faltan: s.precioGemas - d.gemas };
    d.gemas -= s.precioGemas;
    d.skins.push(id);
    d.skinActiva = id;
    guardar();
    return { ok:true };
  }

  function equiparSkin(id){
    if(!tieneSkin(id)) return false;
    d.skinActiva = id;
    guardar();
    return true;
  }

  /* Alta de una skin comprada con dinero real. Hoy sólo la puede llamar
     pagos.js después de que un servidor confirme el pago. */
  function otorgarSkin(id, comprobante){
    if(!comprobante) return false;              // sin comprobante no se entrega nada
    if(!tieneSkin(id)) d.skins.push(id);
    d.skinActiva = id;
    guardar();
    return true;
  }

  /* -------- ajustes -------- */
  function ajustar(clave, valor){ d[clave] = valor; guardar(); }

  function borrarTodo(){
    d = structuredClone(INICIAL);
    guardar();
  }

  return {
    datos: () => d,
    guardar, arenaActual, arena, progresoArena,
    desbloqueadas, estaDesbloqueada, nuevasDe,
    equipo, ponerEnEquipo,
    registrarPartida,
    tieneSkin, comprarSkin, equiparSkin, otorgarSkin,
    ajustar, borrarTodo
  };
})();
