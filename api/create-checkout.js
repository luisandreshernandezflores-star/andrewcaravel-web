import { kv } from '@vercel/kv';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Lista maestra (Datos generales, NO stock)
const INVENTORY = {
  'AC-W-TEE': { price: 2200, name: 'Essential Silent Tee', maxPerOrder: 5, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
  'AC-W-HOODIE': { price: 4500, name: 'Structured Hoodie', maxPerOrder: 3, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
  'AC-W-TROUSER': { price: 4500, name: 'Structured Trouser', maxPerOrder: 3, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
  'AC-W-COAT': { price: 7800, name: 'Structured Coat', maxPerOrder: 2, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
  'AC-W-DRESS': { price: 6700, name: 'Sovereign Line Dress', maxPerOrder: 3, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
  'AC-M-TEE': { price: 2200, name: 'Essential Silent Tee', maxPerOrder: 5, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
  'AC-M-HOODIE': { price: 4500, name: 'Structured Hoodie', maxPerOrder: 3, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
  'AC-M-TROUSER': { price: 4500, name: 'Structured Trouser', maxPerOrder: 3, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
  'AC-M-COAT': { price: 7800, name: 'Structured Coat', maxPerOrder: 2, active: true, image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart } = req.body;
    console.log("🛒 Checkout iniciado con variantes");

    // PASO 1: VERIFICAR STOCK POR COLOR
    for (const item of cart) {
      const productBase = INVENTORY[item.baseId];
      if (!productBase) throw new Error(`Producto inválido: ${item.name}`);

      // 🧠 Lógica inteligente de variantes
      let suffix = '';
      const variantName = (item.variant || '').toLowerCase(); // Convertimos a minúsculas
      
      if (variantName.includes('negro') || variantName.includes('black')) {
        suffix = '-BLK';
      } else if (variantName.includes('hueso') || variantName.includes('bone') || variantName.includes('white')) {
        suffix = '-HUE';
      } else {
        // Si no detectamos color, asumimos Negro por defecto o lanzamos error
        suffix = '-BLK'; 
      }

      // SKU FINAL (Ej: AC-W-TEE-BLK)
      const skuExacto = `${item.baseId}${suffix}`;
      
      console.log(`🔍 Revisando: ${skuExacto}, Pide: ${item.quantity}`);

      const stockActual = await kv.get(skuExacto);

      if (stockActual === null || stockActual < item.quantity) {
        throw new Error(`Lo sentimos, ${item.name} (${item.variant}) está Agotado. (Quedan: ${stockActual || 0})`);
      }
    }

    // PASO 2: RESTAR STOCK EXACTO
    for (const item of cart) {
      // Repetimos la lógica para obtener el SKU exacto
      let suffix = '';
      const variantName = (item.variant || '').toLowerCase();
      if (variantName.includes('negro') || variantName.includes('black')) suffix = '-BLK';
      else suffix = '-HUE'; // Asumimos hueso si no es negro

      const skuExacto = `${item.baseId}${suffix}`;
      await kv.decr(skuExacto, item.quantity);
    }

    // PASO 3: STRIPE
    const line_items = cart.map((item) => {
      const originalProduct = INVENTORY[item.baseId];
      return {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: originalProduct.name,
            description: `Color: ${item.variant} | Cantidad: ${item.quantity}`,
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
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/`,
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Error Checkout:", err.message);
    res.status(400).json({ error: err.message });
  }
}