/* ------------------------------------------------------------------
   pagos.js — packs de skins con dinero real.

   ESTADO: NO CONECTADO. Este archivo no cobra nada y no pide ningún
   dato de tarjeta. Cobrar plata de verdad no se puede resolver sólo
   con JavaScript en el navegador: hace falta una cuenta de cobro a tu
   nombre y un servidor que confirme el pago. Ver README, sección
   "Cobrar con dinero real".

   Regla que respeta este archivo: la skin se entrega SÓLO cuando un
   servidor confirmó el pago. Nunca desde el navegador, porque
   cualquiera puede abrir la consola y darse todo gratis.
-------------------------------------------------------------------*/
const Pagos = (() => {

  /* Cuando tengas la cuenta, poné acá la URL de tu backend y listo. */
  const CONFIG = {
    backend: null,               // ej: "https://api.tujuego.com"
    moneda:  "ARS"
  };

  const conectado = () => Boolean(CONFIG.backend);

  const estado = () => conectado()
    ? "Pagos activos."
    : "Los packs con dinero real todavía no están conectados. Falta la cuenta de cobro y el servidor que valide el pago — está todo explicado en el README.";

  /* ---------------------------------------------------------------
     Flujo real, para cuando CONFIG.backend exista:

     1. El navegador le pide al backend que cree una preferencia de
        pago (Mercado Pago Checkout Pro o Stripe Checkout).
     2. El backend la crea con SU clave secreta — que nunca viaja al
        navegador — y devuelve la URL de pago.
     3. El jugador paga en la página de Mercado Pago / Stripe. Los
        datos de la tarjeta los maneja ellos, nosotros no los vemos
        nunca.
     4. Mercado Pago le avisa al backend por webhook que el pago se
        aprobó. El backend lo guarda contra la cuenta del jugador.
     5. Al volver, el navegador consulta al backend qué skins tiene
        compradas y recién ahí se entregan.
  ----------------------------------------------------------------*/
  async function intentarComprar(skin){
    if(!conectado()){
      Batalla.toast("Los packs pagos todavía no están habilitados", true);
      return { ok:false, motivo:"sin-backend" };
    }

    try{
      const r = await fetch(CONFIG.backend + "/crear-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skin: skin.id, moneda: CONFIG.moneda })
      });
      const { urlDePago } = await r.json();
      location.href = urlDePago;               // se sigue en Mercado Pago
      return { ok:true };
    }catch{
      Batalla.toast("No se pudo iniciar el pago", true);
      return { ok:false, motivo:"error" };
    }
  }

  /* Se llama al volver del checkout: le pregunta al servidor qué compró
     de verdad este jugador. El navegador nunca decide esto por su cuenta. */
  async function sincronizarCompras(){
    if(!conectado()) return;
    try{
      const r = await fetch(CONFIG.backend + "/mis-compras", { credentials: "include" });
      const { skins } = await r.json();
      for(const s of skins || []) Progreso.otorgarSkin(s.id, s.comprobante);
    }catch{}
  }

  return { conectado, estado, intentarComprar, sincronizarCompras, CONFIG };
})();
