import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🛡️ LISTA MAESTRA DE INVENTARIO (PRECIOS + STOCK + FOTOS)
const INVENTORY = {
  // MUJER
  'AC-W-TEE': { 
    price: 2200, 
    name: 'Essential Silent Tee',
    maxPerOrder: 5,  // ⬅️ Límite de compra
    active: true,    // ⬅️ camiar a false, nadie puede comprarla
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' //link de la foto real
  },
  'AC-W-HOODIE': { 
    price: 4500, 
    name: 'Structured Hoodie',
    maxPerOrder: 3,
    active: true,
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg' 
  },
  'AC-W-TROUSER': { 
    price: 4500, 
    name: 'Structured Trouser',
    maxPerOrder: 3,
    active: true,
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-W-COAT': { 
    price: 7800, 
    name: 'Structured Coat',
    maxPerOrder: 2,
    active: true,
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-W-DRESS': { 
    price: 6700, 
    name: 'Sovereign Line Dress',
    maxPerOrder: 3,
    active: true,
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  
  // HOMBRE
  'AC-M-TEE': { 
    price: 2200, 
    name: 'Essential Silent Tee',
    maxPerOrder: 5,
    active: true,
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-M-HOODIE': { 
    price: 4500, 
    name: 'Structured Hoodie',
    maxPerOrder: 3,
    active: true,
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-M-TROUSER': { 
    price: 4500, 
    name: 'Structured Trouser',
    maxPerOrder: 3,
    active: true,
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
  'AC-M-COAT': { 
    price: 7800, 
    name: 'Structured Coat',
    maxPerOrder: 2,
    active: true,
    image: 'https://andrewcaravel-web.vercel.app/img/ACN.jpeg'
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart } = req.body;

    // Validamos y construimos los items
    const line_items = cart.map((item) => {
      // 1. Buscamos el producto en la LISTA MAESTRA
      const originalProduct = INVENTORY[item.baseId];

      // AQUI VALIDAMOS EXISTENCIA Y SEGURIDAD
      if (!originalProduct) {
        throw new Error(`Producto no válido: ${item.name}`);
      }
      
      // 2. NUEVAS VALIDACIONES DE STOCK ⬅️
      if (!originalProduct.active) {
         throw new Error(`Lo sentimos, ${originalProduct.name} está Agotado temporalmente.`);
      }
      if (item.quantity > originalProduct.maxPerOrder) {
         throw new Error(`Solo puedes comprar máximo ${originalProduct.maxPerOrder} piezas de ${originalProduct.name}.`);
      }

      // 3. ARMAMOS EL PRODUCTO PARA STRIPE
      return {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: originalProduct.name, // NOMBRE OFICIAL
            description: `(x${item.quantity}) - ${item.variant}`, // DESCRIPCIÓN CON CANTIDAD
            images: [originalProduct.image], // ⬅️ FOTO EN EL CHECKOUT
          },
          unit_amount: originalProduct.price * 100, // PRECIO SEGURO
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
      success_url: `${req.headers.origin}/?checkout=success`,
      cancel_url: `${req.headers.origin}/`,
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("Intento de compra fallido:", err.message);
    res.status(400).json({ error: err.message });
  }
}