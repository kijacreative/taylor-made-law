import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const PRICE_ID = 'price_1TCqcIBI0mAZLD5som54aFFB';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    // Get lawyer profile for stripe customer id
    const profiles = await base44.entities.LawyerProfile.filter({ user_id: user.id });
    const profile = profiles[0];

    let customerId = profile?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: { user_id: user.id, base44_app_id: Deno.env.get('BASE44_APP_ID') }
      });
      customerId = customer.id;

      // Save customer id to profile
      if (profile) {
        await base44.entities.LawyerProfile.update(profile.id, { stripe_customer_id: customerId });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      success_url: `${origin}/LawyerSettings?subscription=success`,
      cancel_url: `${origin}/LawyerSettings?subscription=cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        profile_id: profile?.id || ''
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});