import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🛡️ LISTA MAESTRA DE PRECIOS
// PRECIOS REALES
// CON ESTO EVITO CAMBIOS EN LOS PRECIOS EN EL HTML PROVOCADOS POR UN HACKER
const INVENTORY = {
  // MUJER
  'AC-W-TEE':     { price: 2200, name: 'Essential Silent Tee' },
  'AC-W-HOODIE':  { price: 4500, name: 'Structured Hoodie' },
  'AC-W-TROUSER': { price: 4500, name: 'Structured Trouser' },
  'AC-W-COAT':    { price: 7800, name: 'Structured Coat' },
  'AC-W-DRESS':   { price: 6700, name: 'Sovereign Line Dress' },
  
  // HOMBRE
  'AC-M-TEE':     { price: 2200, name: 'Essential Silent Tee' },
  'AC-M-HOODIE':  { price: 4500, name: 'Structured Hoodie' },
  'AC-M-TROUSER': { price: 4500, name: 'Structured Trouser' },
  'AC-M-COAT':    { price: 7800, name: 'Structured Coat' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart } = req.body;

    // Validamos y construimos los items en el servidor
    const line_items = cart.map((item) => {
      // 1. Busca el producto real en nuestra lista segura usando el ID base
      const originalProduct = INVENTORY[item.baseId];

      // AQUI LANZA UN ERROR EN CASO DE CAMBIO DE PRECIOS POR HACKER
      if (!originalProduct) {
        throw new Error(`Producto no válido: ${item.name}`);
      }

      // 2.EL PRECIO DE LA LISTA MAESTRA (No el del frontend)
      return {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: originalProduct.name, // NOMBRE OFICIAL
            description: `(x${item.quantity}) - ${item.variant}`,  //TALLA,COLOR Y CANTIDAD SOLICITADA POR USARIO
          },
          //centavos: $2200 => 220000
          unit_amount: originalProduct.price * 100, 
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      phone_number_collection: {enabled: true,},
      shipping_address_collection: {allowed_countries: ['MX'],},
      success_url: `${req.headers.origin}/?checkout=success`,
      cancel_url: `${req.headers.origin}/`,
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Intento de compra fallido:", err.message);
    res.status(400).json({ error: err.message });
  }
}
