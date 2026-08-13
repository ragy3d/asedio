/* ------------------------------------------------------------------
   render.js — todo el dibujo en canvas 2D.
   No toca la lógica: recibe el estado y lo pinta.
-------------------------------------------------------------------*/
const Render = (() => {

  let cv, ctx, escala = 1, offX = 0, offY = 0, listo = false;
  // rectángulo del mundo que realmente se ve, para pintar el fondo hasta
  // los bordes y que no queden franjas negras arriba y abajo
  let vista = { x0: 0, y0: 0, x1: MUNDO_W, y1: MUNDO_H };

  function init(canvas){
    cv = canvas;
    ctx = cv.getContext("2d");
    redimensionar();
    addEventListener("resize", redimensionar);
  }

  /* El mundo es fijo (1000x420) y lo encajamos en la pantalla sin deformarlo. */
  function redimensionar(){
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();

    /* El canvas vive en una pantalla que puede estar oculta: ahí mide 0 y
       todas las divisiones dan infinito. Marcamos que no se puede pintar
       y volvemos a medir cuando la pantalla se muestre. */
    if(r.width < 4 || r.height < 4){ listo = false; return; }
    listo = true;

    cv.width  = Math.round(r.width  * dpr);
    cv.height = Math.round(r.height * dpr);

    /* Ancho: entra el campo completo, porque hay que ver los dos castillos.
       Alto: dejamos aire suficiente para la torre más su bandera (unas 210
       unidades sobre el piso) y apoyamos el suelo cerca del borde inferior,
       así no queda medio pantallazo de pasto vacío. */
    const ALTO_UTIL = 300;
    escala = Math.min(r.width / MUNDO_W, r.height / ALTO_UTIL);

    const pisoPx = Math.min(r.height * 0.80, r.height - 26);
    offX = (r.width - MUNDO_W * escala) / 2;
    offY = pisoPx - SUELO * escala;

    vista = {
      x0: -offX / escala,
      y0: -offY / escala,
      x1: (r.width  - offX) / escala,
      y1: (r.height - offY) / escala
    };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const enMundo = fn => { ctx.save(); ctx.translate(offX, offY); ctx.scale(escala, escala); fn(); ctx.restore(); };

  /* ---------------- fondo ---------------- */
  let nubes = null;

  function fondo(t){
    const V = vista;
    const g = ctx.createLinearGradient(0, V.y0, 0, SUELO);
    g.addColorStop(0,    "#1b2a4a");
    g.addColorStop(0.55, "#37547e");
    g.addColorStop(1,    "#6a7f9e");
    ctx.fillStyle = g;
    ctx.fillRect(V.x0, V.y0, V.x1 - V.x0, SUELO - V.y0);

    if(!nubes){
      nubes = Array.from({ length: 7 }, (_, i) => ({
        x: (i * 173) % MUNDO_W, y: 40 + (i * 37) % 90,
        r: 22 + (i * 13) % 26, v: 4 + (i % 3) * 2
      }));
    }
    ctx.fillStyle = "rgba(255,255,255,.10)";
    for(const n of nubes){
      const x = (n.x + t * n.v) % (MUNDO_W + 160) - 80;
      ctx.beginPath();
      ctx.arc(x, n.y, n.r, 0, 7);
      ctx.arc(x + n.r * 0.9, n.y + 5, n.r * 0.75, 0, 7);
      ctx.arc(x - n.r * 0.9, n.y + 6, n.r * 0.65, 0, 7);
      ctx.fill();
    }

    // cerros de fondo
    ctx.fillStyle = "#2c4468";
    ctx.beginPath();
    ctx.moveTo(V.x0, SUELO);
    for(let x = V.x0; x <= V.x1; x += 50){
      ctx.lineTo(x, SUELO - 55 - Math.sin(x * 0.011) * 34 - Math.cos(x * 0.023) * 16);
    }
    ctx.lineTo(V.x1, SUELO); ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#26405f";
    ctx.beginPath();
    ctx.moveTo(V.x0, SUELO);
    for(let x = V.x0; x <= V.x1; x += 40){
      ctx.lineTo(x, SUELO - 24 - Math.sin(x * 0.02 + 2) * 18);
    }
    ctx.lineTo(V.x1, SUELO); ctx.closePath(); ctx.fill();

    // piso
    const p = ctx.createLinearGradient(0, SUELO, 0, V.y1);
    p.addColorStop(0, "#4a7a4e");
    p.addColorStop(1, "#2f5233");
    ctx.fillStyle = p;
    ctx.fillRect(V.x0, SUELO, V.x1 - V.x0, V.y1 - SUELO);

    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(V.x0, SUELO); ctx.lineTo(V.x1, SUELO); ctx.stroke();

    // pastitos
    ctx.strokeStyle = "rgba(20,60,25,.35)";
    ctx.lineWidth = 2;
    for(let x = Math.floor(V.x0 / 27) * 27; x < V.x1; x += 27){
      const h = 5 + (((x % 100) + 100) % 6);
      ctx.beginPath(); ctx.moveTo(x, SUELO + 10); ctx.lineTo(x + 2, SUELO + 10 - h); ctx.stroke();
    }
  }

  /* ---------------- castillos ---------------- */
  const SKIN_ENEMIGO = { muro:"#9a8288", almena:"#8b757b", bandera:"#d65b5b", porton:"#4a3524" };

  function castillo(c, lado, t, skinJugador){
    const x = CASTILLO.x[lado], w = CASTILLO.ancho, h = CASTILLO.alto;
    const base = SUELO + 6, top = base - h;
    const vivo = c.vida > 0;
    const dañado = c.vida / CASTILLO.vida;
    const sk = lado === "jugador" ? skinJugador : SKIN_ENEMIGO;

    ctx.save();
    ctx.translate(x, 0);
    if(c.temblor > 0){
      ctx.translate((Math.random() - .5) * c.temblor, (Math.random() - .5) * c.temblor);
    }

    ctx.fillStyle = sk.muro;
    ctx.fillRect(-w / 2, top, w, h);

    // sombreado
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(w / 2 - 16, top, 16, h);

    // almenas
    ctx.fillStyle = sk.almena;
    for(let i = 0; i < 5; i++){
      ctx.fillRect(-w / 2 + i * (w / 5) + 2, top - 14, w / 5 - 6, 14);
    }

    // portón
    ctx.fillStyle = sk.porton;
    const pw = 30, ph = 44;
    ctx.fillRect(-pw / 2, base - ph, pw, ph);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.arc(0, base - ph, pw / 2, Math.PI, 0); ctx.fill();

    // ventanitas
    ctx.fillStyle = dañado > .35 ? "rgba(255,220,140,.85)" : "rgba(255,120,90,.9)";
    for(let i = 0; i < 2; i++) ctx.fillRect(-18 + i * 30, top + 30, 8, 12);

    // bandera
    const bx = -w / 2 + 12;
    ctx.strokeStyle = "#5a4632"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, top - 14); ctx.lineTo(bx, top - 52); ctx.stroke();
    ctx.fillStyle = sk.bandera;
    ctx.beginPath();
    ctx.moveTo(bx, top - 52);
    ctx.lineTo(bx + 26 + Math.sin(t * 3) * 3, top - 45);
    ctx.lineTo(bx, top - 36);
    ctx.closePath(); ctx.fill();

    // grietas cuando está golpeado
    if(dañado < .6){
      ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, top + 20); ctx.lineTo(-8, top + 55); ctx.lineTo(-22, top + 90);
      if(dañado < .3){ ctx.moveTo(24, top + 34); ctx.lineTo(12, top + 74); }
      ctx.stroke();
    }
    if(!vivo){
      ctx.fillStyle = "rgba(20,15,15,.55)";
      ctx.fillRect(-w / 2, top, w, h);
    }
    ctx.restore();

    barraVida(x, top - 26, 78, c.vida / CASTILLO.vida, lado === "jugador");
  }

  /* ---------------- unidades ---------------- */
  function barraVida(x, y, ancho, frac, aliada){
    frac = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = "rgba(0,0,0,.5)";
    ctx.fillRect(x - ancho / 2 - 1, y - 1, ancho + 2, 7);
    ctx.fillStyle = aliada ? "#5ad6a0" : "#e06a6a";
    ctx.fillRect(x - ancho / 2, y, ancho * frac, 5);
  }

  /* tropas que no son humanoides y se dibujan enteras aparte */
  const ESPECIALES = { jauria:1, bombarda:1, ariete:1 };

  function unidad(u, t){
    const dir = u.lado === "jugador" ? 1 : -1;
    const paso = u.estado === "camina" ? Math.sin(t * 11 + u.fase) : 0;
    const golpe = u.animGolpe > 0 ? Math.sin((1 - u.animGolpe) * Math.PI) : 0;
    const alto = u.def.radio * 2.5;

    ctx.save();
    ctx.translate(u.x + dir * golpe * 7, SUELO);
    ctx.scale(dir, 1);

    // sombra
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.ellipse(0, 2, u.def.radio + 3, 4, 0, 0, 7); ctx.fill();

    if(u.destello > 0){ ctx.shadowColor = "#fff"; ctx.shadowBlur = 14 * u.destello; }
    if(u.aura > 0){ ctx.shadowColor = "#9fe3d0"; ctx.shadowBlur = 16 * u.aura; }

    if(ESPECIALES[u.tipo]){
      ({ jauria:lobo, bombarda:cañon, ariete:ariete })[u.tipo](u, paso, golpe, t);
    }else{
      humanoide(u, alto, paso);
      dibujarEquipo(u, alto, golpe, t);
    }

    ctx.restore();
    ctx.shadowBlur = 0;

    const altoBarra = ESPECIALES[u.tipo] ? u.def.radio * 1.9 : alto + 22;
    barraVida(u.x, SUELO - altoBarra, 30, u.vida / u.vidaMax, u.lado === "jugador");
  }

  function humanoide(u, alto, paso){
    // piernas
    ctx.strokeStyle = "#3b3f52"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-2, -8); ctx.lineTo(-3 + paso * 5, 0);
    ctx.moveTo(2, -8);  ctx.lineTo(3 - paso * 5, 0);
    ctx.stroke();

    // cuerpo
    ctx.fillStyle = u.def.color;
    ctx.beginPath();
    ctx.roundRect(-u.def.radio * .75, -alto, u.def.radio * 1.5, alto - 7, 4);
    ctx.fill();

    // cabeza
    ctx.fillStyle = "#f2d3ae";
    ctx.beginPath(); ctx.arc(0, -alto - 5, 6, 0, 7); ctx.fill();
  }

  /* ---- Jauría: lobo de perfil ---- */
  function lobo(u, paso){
    const c = u.def.color;
    ctx.strokeStyle = "#4a4038"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-6, -9); ctx.lineTo(-7 + paso * 6, 0);
    ctx.moveTo(5, -9);  ctx.lineTo(6 - paso * 6, 0);
    ctx.stroke();

    ctx.fillStyle = c;                                    // lomo
    ctx.beginPath(); ctx.roundRect(-10, -18, 20, 10, 5); ctx.fill();
    ctx.beginPath(); ctx.arc(11, -20, 6, 0, 7); ctx.fill();   // cabeza
    ctx.beginPath();                                      // hocico
    ctx.moveTo(15, -21); ctx.lineTo(23, -19); ctx.lineTo(15, -16);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();                                      // oreja
    ctx.moveTo(9, -25); ctx.lineTo(12, -31); ctx.lineTo(14, -24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 3;               // cola
    ctx.beginPath(); ctx.moveTo(-10, -15); ctx.lineTo(-19, -20); ctx.stroke();
    ctx.fillStyle = "#2a2622";
    ctx.beginPath(); ctx.arc(13, -21, 1.4, 0, 7); ctx.fill();
  }

  /* ---- Bombarda: mortero sobre ruedas ---- */
  function cañon(u, paso, golpe, t){
    ctx.strokeStyle = "#5a4632"; ctx.lineWidth = 3;
    ctx.fillStyle = "#4a3a28";
    ctx.beginPath(); ctx.roundRect(-14, -16, 28, 9, 3); ctx.fill();   // carro
    ctx.strokeStyle = "#3a2e20"; ctx.lineWidth = 2.5;                 // ruedas
    for(const rx of [-8, 8]){
      ctx.beginPath(); ctx.arc(rx, -5, 6, 0, 7); ctx.stroke();
    }
    ctx.save();                                                       // tubo
    ctx.translate(2, -17);
    ctx.rotate(-0.62 + golpe * 0.30);
    ctx.fillStyle = u.def.color;
    ctx.beginPath(); ctx.roundRect(-5, -9, 26, 13, 5); ctx.fill();
    ctx.fillStyle = "#2f2a26";
    ctx.beginPath(); ctx.ellipse(21, -2.5, 3, 6, 0, 0, 7); ctx.fill();
    if(golpe > .25){                                                  // fogonazo
      ctx.fillStyle = "rgba(255,190,90," + golpe + ")";
      ctx.beginPath(); ctx.arc(28, -2.5, 4 + golpe * 8, 0, 7); ctx.fill();
    }
    ctx.restore();
    // el artillero
    ctx.fillStyle = "#6d5a46";
    ctx.beginPath(); ctx.roundRect(-17, -26, 8, 15, 3); ctx.fill();
    ctx.fillStyle = "#f2d3ae";
    ctx.beginPath(); ctx.arc(-13, -30, 4.5, 0, 7); ctx.fill();
  }

  /* ---- Rompeportones: tronco con techo ---- */
  function ariete(u, paso, golpe){
    ctx.strokeStyle = "#3a2e20"; ctx.lineWidth = 3;
    for(const rx of [-13, 0, 13]){
      ctx.beginPath(); ctx.arc(rx, -6, 6.5, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = "#6b5540";                              // armazón
    ctx.beginPath(); ctx.roundRect(-19, -20, 38, 9, 3); ctx.fill();
    ctx.fillStyle = u.def.color;                            // tronco
    ctx.beginPath(); ctx.roundRect(-16 + golpe * 9, -33, 40, 13, 6); ctx.fill();
    ctx.fillStyle = "#5b5145";                              // cabeza de hierro
    ctx.beginPath(); ctx.roundRect(20 + golpe * 9, -34, 9, 15, 3); ctx.fill();
    ctx.fillStyle = "#4f4132";                              // techito
    ctx.beginPath();
    ctx.moveTo(-22, -36); ctx.lineTo(22, -36); ctx.lineTo(16, -44); ctx.lineTo(-16, -44);
    ctx.closePath(); ctx.fill();
  }

  /* cada tropa con su pinta: casco, escudo, arco, bastón… */
  function dibujarEquipo(u, alto, golpe, t){
    const tipo = u.tipo;

    if(tipo === "furia"){
      ctx.fillStyle = "#8a5a3a";                         // melena
      ctx.beginPath(); ctx.arc(0, -alto - 6, 8, Math.PI, 0.2); ctx.fill();
      ctx.fillStyle = "#c9a06a";                         // cuernos del casco
      for(const s of [-1, 1]){
        ctx.beginPath();
        ctx.moveTo(s * 5, -alto - 10); ctx.lineTo(s * 12, -alto - 20); ctx.lineTo(s * 8, -alto - 8);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 3.5;  // mango del hacha
      ctx.beginPath();
      ctx.moveTo(-4, -alto + 16); ctx.lineTo(14 + golpe * 10, -alto - 12 + golpe * 14); ctx.stroke();
      ctx.fillStyle = "#dfe6f5";                         // hoja
      ctx.beginPath();
      ctx.arc(15 + golpe * 10, -alto - 12 + golpe * 14, 9, -1.1, 1.1);
      ctx.lineTo(12 + golpe * 10, -alto - 12 + golpe * 14);
      ctx.closePath(); ctx.fill();

    }else if(tipo === "sombra"){
      ctx.fillStyle = "#3f3f5c";                         // capucha
      ctx.beginPath(); ctx.arc(0, -alto - 5, 7.5, Math.PI, 0.5); ctx.fill();
      ctx.fillStyle = "#ffe9a8";                         // ojos
      ctx.fillRect(2, -alto - 6, 4, 2);
      ctx.strokeStyle = "#e6e9f5"; ctx.lineWidth = 2.5;  // daga
      ctx.beginPath();
      ctx.moveTo(4, -alto + 14); ctx.lineTo(15 + golpe * 13, -alto + 5 - golpe * 5); ctx.stroke();
      ctx.fillStyle = "rgba(143,143,201,.35)";           // estela
      ctx.beginPath(); ctx.roundRect(-16, -alto + 2, 12, alto - 10, 5); ctx.fill();

    }else if(tipo === "hermana"){
      ctx.fillStyle = "#e8f6f1";                         // toca
      ctx.beginPath(); ctx.arc(0, -alto - 5, 7.5, Math.PI, 0.35); ctx.fill();
      ctx.strokeStyle = "#9fe3d0"; ctx.lineWidth = 2;    // aureola
      ctx.beginPath(); ctx.ellipse(0, -alto - 16, 9, 3.2, 0, 0, 7); ctx.stroke();
      const brillo = 4 + Math.sin(t * 4 + u.fase) * 1.2 + golpe * 5;
      ctx.fillStyle = "#dffaf1";                         // farol
      ctx.shadowColor = "#9fe3d0"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(12, -alto + 6, brillo, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(7, -alto + 18); ctx.lineTo(12, -alto + 6); ctx.stroke();

    }else if(tipo === "guardia"){
      ctx.fillStyle = "#dfe6f5";                       // yelmo
      ctx.beginPath(); ctx.arc(0, -alto - 6, 7, Math.PI, 0); ctx.fill();
      ctx.fillRect(-7, -alto - 6, 14, 5);
      ctx.fillStyle = "#e05c5c";                        // penacho
      ctx.fillRect(-2, -alto - 18, 4, 8);
      ctx.fillStyle = "#c9d4ea";                        // escudo
      ctx.beginPath();
      ctx.roundRect(6 + golpe * 3, -alto + 4, 11, 20, 3);
      ctx.fill();
      ctx.strokeStyle = "#8fb8ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(11, -alto + 8); ctx.lineTo(11, -alto + 20); ctx.stroke();
      ctx.strokeStyle = "#cfd8ea"; ctx.lineWidth = 3;   // espada
      ctx.beginPath(); ctx.moveTo(-6, -alto + 12); ctx.lineTo(-10 - golpe * 12, -alto - 2 - golpe * 6); ctx.stroke();

    }else if(tipo === "piquero"){
      ctx.fillStyle = "#b9754a";                        // gorro
      ctx.beginPath(); ctx.arc(0, -alto - 7, 6.5, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = "#a5814f"; ctx.lineWidth = 4;   // asta
      ctx.beginPath();
      ctx.moveTo(-6, -alto + 18); ctx.lineTo(22 + golpe * 14, -alto + 1); ctx.stroke();
      ctx.fillStyle = "#eef3ff";                        // punta
      ctx.beginPath();
      ctx.moveTo(21 + golpe * 14, -alto + 4);
      ctx.lineTo(35 + golpe * 14, -alto - 2);
      ctx.lineTo(21 + golpe * 14, -alto - 7);
      ctx.closePath(); ctx.fill();

    }else if(tipo === "ballestero"){
      ctx.fillStyle = "#4f7a4a";                        // capucha
      ctx.beginPath(); ctx.arc(0, -alto - 6, 7, Math.PI, 0.3); ctx.fill();
      ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 2.5; // arco
      ctx.beginPath();
      ctx.arc(9, -alto + 10, 12, -1.3, 1.3);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 1;
      const tensa = 3 + golpe * 7;
      ctx.beginPath();
      ctx.moveTo(12, -alto - 1);
      ctx.lineTo(12 - tensa, -alto + 10);
      ctx.lineTo(12, -alto + 21);
      ctx.stroke();

    }else if(tipo === "mago"){
      ctx.fillStyle = "#7b5bb5";                        // sombrero
      ctx.beginPath();
      ctx.moveTo(-9, -alto - 8); ctx.lineTo(9, -alto - 8); ctx.lineTo(1, -alto - 26);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(-11, -alto - 9, 22, 4);
      ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 3;   // bastón
      ctx.beginPath(); ctx.moveTo(8, -alto + 20); ctx.lineTo(12, -alto - 12); ctx.stroke();
      const brillo = 3.5 + Math.sin(t * 6 + u.fase) * 1.2 + golpe * 4;
      ctx.fillStyle = "#e9c6ff";
      ctx.shadowColor = "#c99bff"; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(12, -alto - 14, brillo, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  /* ---------------- proyectiles y efectos ---------------- */
  function proyectil(p){
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx));
    if(p.tipo === "flecha"){
      ctx.strokeStyle = "#e8d5a8"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(7, 0); ctx.stroke();
      ctx.fillStyle = "#cfd8ea";
      ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(1, -3); ctx.lineTo(1, 3); ctx.closePath(); ctx.fill();
    }else if(p.tipo === "bomba"){
      ctx.shadowColor = "#ff9d4d"; ctx.shadowBlur = 18;
      ctx.fillStyle = "#5a4a40";
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffc27a";                       // mecha encendida
      ctx.beginPath(); ctx.arc(-8, -4, 2.6, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }else{
      ctx.shadowColor = "#c99bff"; ctx.shadowBlur = 16;
      ctx.fillStyle = "#dcb6ff";
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function particula(p){
    ctx.globalAlpha = Math.max(0, p.vida / p.vidaMax);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function texto(f){
    ctx.globalAlpha = Math.max(0, f.vida / f.vidaMax);
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.6)";
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  /* ---------------- pintar todo ---------------- */
  function pintar(e){
    if(!listo){ redimensionar(); if(!listo) return; }
    const r = cv.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);

    enMundo(() => {
      fondo(e.tiempo);
      const skin = skinPorId(Progreso.datos().skinActiva);
      castillo(e.castillos.jugador, "jugador", e.tiempo, skin);
      castillo(e.castillos.enemigo, "enemigo", e.tiempo, skin);

      for(const p of e.particulas) if(p.atras) particula(p);

      // los de más atrás primero, para que se superpongan bien
      [...e.unidades].sort((a, b) => a.x - b.x).forEach(u => unidad(u, e.tiempo));

      for(const p of e.proyectiles) proyectil(p);
      for(const p of e.particulas) if(!p.atras) particula(p);
      for(const f of e.textos) texto(f);
    });
  }

  return { init, pintar, redimensionar };
})();
