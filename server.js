const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.post('/create-checkout', async (req, res) => {
  try {
    const { cart, pickupTime, customerName, customerPhone, discounts, orderRef } = req.body;
    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://littlebean.ie/success',
      cancel_url: 'https://littlebean.ie/cancel',
      metadata: { orderRef, customerName, customerPhone, pickupTime },
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 8080);
