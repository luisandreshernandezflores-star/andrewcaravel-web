const Stripe = require('stripe');

module.exports = async (req, res) => {
  // 🔒 Primero validar método (CRÍTICO)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔒 Validar env vars
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
  }

  if (!process.env.DOMAIN) {
    return res.status(500).json({ error: 'Missing DOMAIN env' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Andrew Caravel Test Product'
            },
            unit_amount: 1000
          },
          quantity: 1
        }
      ],
      success_url: ${process.env.DOMAIN}/?success=true,
      cancel_url: ${process.env.DOMAIN}
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('STRIPE ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
};
