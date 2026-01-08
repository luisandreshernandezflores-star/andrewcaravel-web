import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: { name: 'Andrew Caravel Test' },
            unit_amount: 1000
          },
          quantity: 1
        }
      ],
      success_url: ${process.env.DOMAIN}/?checkout=success,
      cancel_url: ${process.env.DOMAIN}
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
}
