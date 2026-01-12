import { kv } from '@vercel/kv'; // 👈 IMPORTANTE: Conexión a la base de datos
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🛡️ LISTA MAESTRA (Solo para precios, fotos y límites por persona)
const INVENTORY = {
  // MUJER
  'AC-W-TEE': { 
    price: 2200, name: 'Essential Silent Tee', maxPerOrder: 5, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' 
  },
  'AC-W-HOODIE': { 
    price: 4500, name: 'Structured Hoodie', maxPerOrder: 3, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' 
  },
  'AC-W-TROUSER': { 
    price: 4500, name: 'Structured Trouser', maxPerOrder: 3, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-W-COAT': { 
    price: 7800, name: 'Structured Coat', maxPerOrder: 2, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-W-DRESS': { 
    price: 6700, name: 'Sovereign Line Dress', maxPerOrder: 3, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  
  // HOMBRE
  'AC-M-TEE': { 
    price: 2200, name: 'Essential Silent Tee', maxPerOrder: 5, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-M-HOODIE': { 
    price: 4500, name: 'Structured Hoodie', maxPerOrder: 3, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-M-TROUSER': { 
    price: 4500, name: 'Structured Trouser', maxPerOrder: 3, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-M-COAT': { 
    price: 7800, name: 'Structured Coat', maxPerOrder: 2, active: true, 
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart } = req.body;

    // ---------------------------------------------------------
    // PASO 1: VERIFICACIÓN DE STOCK EN LA NUBE (KV) ☁️
    // ---------------------------------------------------------
    for (const item of cart) {
      const productInfo = INVENTORY[item.baseId];

      // 1. Validar que el producto exista en tu lista
      if (!productInfo) throw new Error(`Producto inválido: ${item.name}`);
      
      // 2. Validar límites por persona
      if (item.quantity > productInfo.maxPerOrder) {
         throw new Error(`Máximo ${productInfo.maxPerOrder} unidades de ${productInfo.name}`);
      }

      // 3. CONSULTAR STOCK REAL EN VERCEL KV 🔍
      const stockReal = await kv.get(item.baseId); // Leemos la base de datos
      
      // Si devuelve null (no existe) o 0, es que no hay.
      if (stockReal === null || stockReal < item.quantity) {
        throw new Error(`Lo sentimos, ${productInfo.name} se acaba de agotar (Quedan: ${stockReal || 0})`);
      }
    }

    // ---------------------------------------------------------
    // PASO 2: RESTA INMEDIATA (CANDADO DE SEGURIDAD) 🔒
    // ---------------------------------------------------------
    // Si llegamos aquí, hay stock para todos. Ahora lo restamos.
    for (const item of cart) {
      await kv.decr(item.baseId, item.quantity); 
    }

    // ---------------------------------------------------------
    // PASO 3: CREAR SESIÓN DE PAGO EN STRIPE 💳
    // ---------------------------------------------------------
    const line_items = cart.map((item) => {
      const originalProduct = INVENTORY[item.baseId];
      return {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: originalProduct.name,
            description: `(x${item.quantity}) - ${item.variant || 'Standard'}`,
            images: [originalProduct.image],
          },
          unit_amount: originalProduct.price * 100,
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['MX'] },
      success_url: `${req.headers.origin}/success.html`, // Asegúrate que success.html exista
      cancel_url: `${req.headers.origin}/`,
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Error en checkout:", err.message);
    // Si falló por stock, devolvemos el error al usuario para que le salga la alerta
    res.status(400).json({ error: err.message });
  }
}