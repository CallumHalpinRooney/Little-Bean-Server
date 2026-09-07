const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const path = require('path');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Apex Grand Prix — the Formula 1 racing game, served as a static site.
app.use('/f1', express.static(path.join(__dirname, 'public', 'f1'), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  },
}));
app.get('/', (req, res) => res.redirect('/f1/'));

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
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
