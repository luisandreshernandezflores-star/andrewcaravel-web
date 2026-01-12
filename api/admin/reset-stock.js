import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.query.secret !== 'ANDREW_MASTER_KEY') {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    await kv.flushall(); // Borra todo lo viejo

    // Llenamos el inventario
    await kv.set('AC-W-TEE', 10);
    await kv.set('AC-W-HOODIE', 5);
    await kv.set('AC-W-TROUSER', 5);
    await kv.set('AC-W-COAT', 2);
    await kv.set('AC-W-DRESS', 3);
    
    await kv.set('AC-M-TEE', 10);
    await kv.set('AC-M-HOODIE', 5);
    await kv.set('AC-M-TROUSER', 5);
    await kv.set('AC-M-COAT', 2);

    return res.status(200).json({ message: '✅ Inventario cargado en la Nube' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}