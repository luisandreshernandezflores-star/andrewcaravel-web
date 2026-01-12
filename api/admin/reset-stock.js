import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.query.secret !== 'ANDREW_MASTER_KEY') {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // 👇 AQUÍ DEFINES TU STOCK POR COLOR
  // Nomenclatura: -BLK (Negro) | -HUE (Hueso)
  const STOCK = {
    // --- MUJER ---
    'AC-W-TEE-BLK': 500,     // 5 Playeras Negras
    'AC-W-TEE-HUE': 500,     // 5 Playeras Hueso
    
    'AC-W-HOODIE-BLK': 500,
    'AC-W-HOODIE-HUE': 500,  // Menos stock en hueso
    
    'AC-W-TROUSER-BLK': 500,
    'AC-W-TROUSER-HUE': 500,

    'AC-W-COAT-BLK': 200,    // Muy exclusivo negro
    'AC-W-COAT-HUE': 200,    // Muy exclusivo hueso

    'AC-W-DRESS-BLK': 250,
    'AC-W-DRESS-HUE': 250,

    // --- HOMBRE ---
    'AC-M-TEE-BLK': 500,
    'AC-M-TEE-HUE': 500,

    'AC-M-HOODIE-BLK': 500,
    'AC-M-HOODIE-HUE': 500,

    'AC-M-TROUSER-BLK': 500,
    'AC-M-TROUSER-HUE': 500,

    'AC-M-COAT-BLK': 200,
    'AC-M-COAT-HUE': 200,
  };

  try {
    await kv.flushall(); // Limpieza total
    
    // Carga masiva
    for (const [sku, cantidad] of Object.entries(STOCK)) {
      await kv.set(sku, cantidad);
    }

    return res.status(200).json({ 
      message: '✅ Inventario por Colores Cargado', 
      stock: STOCK 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}