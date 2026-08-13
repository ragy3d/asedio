# ⚔️ Asedio

Batalla medieval en tiempo real con progresión por arenas. Ganás copas, subís
de arena, desbloqueás tropas, armás tu equipo de 4 y comprás skins para tu
torre. Una partida dura entre 2 y 4 minutos.

## Cómo lo abro

```bash
python -m http.server 5700 --directory juego
```

Después entrá a **http://localhost:5700**. No necesita instalar nada.

## Cómo se juega

El oro sube solo durante la partida. Tocás una carta y esa tropa sale de tu
castillo y avanza sola. Vos no manejás a nadie: elegís **qué** mandar y
**cuándo**. Gana el que tira abajo el castillo del otro.

En la compu: teclas **1-4** para las tropas y **E** para mejorar la economía.

### Arenas y copas

| | Arena | Copas | Suma |
|---|---|---|---|
| 1 | Campo de Entrenamiento | 0 | Piquero, Ballestero, Guardia de Hierro, Jauría |
| 2 | Valle de Ceniza | 120 | Hechicero, Hermana Vela |
| 3 | Puente Quebrado | 300 | Bombarda, Furia del Norte |
| 4 | Bosque Colgante | 550 | Sombra |
| 5 | Fortaleza del Trueno | 850 | Rompeportones |
| 6 | Trono de Hierro | 1250 | — |

Ganar suma **30 copas**, perder resta **18**. Cuanto más alta la arena, más
gemas te llevás por partida… y más brava juega la IA.

### Las tropas

| | Tropa | Oro | Rol |
|---|---|---|---|
| 🔱 | Piquero | 35 | Barato y ligero. Frena en seco a la caballería. |
| 🏹 | Ballestero | 45 | Castiga de lejos, se muere enseguida si lo alcanzan. |
| 🛡️ | Guardia de Hierro | 60 | El muro. Camina sobre los tiradores. |
| 🐺 | Jauría | 40 | **Salen tres.** Rapidísimos y de papel. |
| 🔮 | Hechicero | 110 | Bola que estalla en área. |
| ✨ | Hermana Vela | 80 | No pelea: **cura** al aliado más herido. |
| 💣 | Bombarda | 140 | Alcance enorme y un pepinazo de 75, pero **recarga 4,5 s**. |
| 🪓 | Furia del Norte | 90 | Pega como un camión, sin armadura. |
| 🗡️ | Sombra | 70 | La más rápida del juego. |
| 🐏 | Rompeportones | 160 | Lentísimo y durísimo. **x3,5 de daño al castillo.** |

Pegarle con la tropa correcta multiplica el daño (de x1,5 a x2,2) y lo ves en
pantalla: sale el número del golpe en amarillo. La tabla completa está en la
pestaña **Equipo**.

### Asalto final

Desde los **2:10**, todo el daño se va multiplicando hasta x2,6. Sin esto las
arenas altas se empantanaban: dos líneas parejas se trababan en el medio y la
partida no terminaba nunca. Si igual se llega a **4:20**, gana el que tenga el
castillo más entero — no hay empates.

## La tienda

Las **gemas** se ganan jugando (más en arenas altas, más si ganás) y compran
skins para tu torre: Torre del Bosque, Marfil y Obsidiana.

### Cobrar con dinero real

Los dos packs pagos (Fortaleza Real y Ciudadela Ígnea) **están armados pero no
conectados**, y el juego lo dice en pantalla. No hay ningún checkout falso ni
se pide un solo dato de tarjeta.

Cobrar plata de verdad no se resuelve con JavaScript en el navegador. Para
activarlo hace falta:

1. **Una cuenta de cobro a tu nombre** — Mercado Pago (lo más directo en
   Argentina) o Stripe. Con tus datos fiscales; la plata cae a tu cuenta.
2. **Un servidor.** La clave secreta de Mercado Pago **no puede** viajar al
   navegador: cualquiera la lee. El servidor crea la preferencia de pago y
   recibe el webhook de confirmación.
3. **Guardar la compra del lado del servidor.** Si la skin se entrega desde el
   navegador, cualquiera abre la consola y se da todo gratis. Por eso
   `Progreso.otorgarSkin()` exige un comprobante y lo rechaza sin él.
4. **Cuentas de jugador**, para que la compra siga a la persona y no al
   navegador. Hoy el progreso vive en `localStorage`: si borrás los datos del
   sitio, se pierde.

El flujo completo está comentado paso a paso en
[js/pagos.js](js/pagos.js). Cuando tengas la cuenta y el backend, se activa
poniendo la URL en `Pagos.CONFIG.backend` — el resto del código ya está.

Ojo con una cosa más: si algún día lo publicás en la Play Store o la App Store,
las tiendas exigen usar **su** sistema de pagos para bienes digitales y se
quedan con una comisión (15-30%).

## Balance

Los números están medidos, no puestos a ojo. Hay un simulador incorporado:

```js
// en la consola del navegador
Juego.Batalla.avanzar(60)     // simula 60 segundos al instante
Juego.Batalla.estado()        // oro, tropas, castillos, bajas
Juego.Progreso.datos()        // copas, gemas, equipo, skins
```

Con eso se corrieron cientos de partidas automáticas por arena. Con la
configuración actual, jugando bien (counters + economía + tropas caras cuando
conviene) se gana alrededor del 65%, y jugando mal — spameando la tropa más
barata — se pierde el 100% en todas las arenas.

Todo el balance vive en [js/data.js](js/data.js). Para que sea más fácil, bajá
`ARENAS[].iaRenta`; más difícil, subilo.

## Archivos

```
juego/
├── index.html          menú, batalla y overlays
├── css/
│   ├── style.css       la batalla
│   └── menu.css        menú, equipo, tienda, ajustes
└── js/
    ├── data.js         TODO el contenido: tropas, arenas, skins, balance
    ├── progreso.js     copas, gemas, equipo y skins (localStorage)
    ├── render.js       dibujo en canvas: fondo, castillos, tropas, efectos
    ├── game.js         simulación, IA y bucle de la batalla
    ├── pagos.js        packs con dinero real (sin conectar, ver arriba)
    └── ui.js           menú, pestañas, tienda y resultado
```

En el celular conviene jugarlo **apaisado**: en vertical entra, pero las tropas
quedan chicas (el juego te avisa).

El progreso se guarda solo en ese navegador. Si borrás los datos del sitio o
entrás desde otro dispositivo, arrancás de cero.
