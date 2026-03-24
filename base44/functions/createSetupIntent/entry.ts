import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: { base44_user_id: user.id, base44_app_id: Deno.env.get('BASE44_APP_ID') }
      });
      customerId = customer.id;

      // Save to LawyerProfile
      const profiles = await base44.asServiceRole.entities.LawyerProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        await base44.asServiceRole.entities.LawyerProfile.update(profiles[0].id, { stripe_customer_id: customerId });
      }
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { base44_app_id: Deno.env.get('BASE44_APP_ID'), user_id: user.id }
    });

    return Response.json({
      client_secret: setupIntent.client_secret,
      publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      customer_id: customerId
    });
  } catch (error) {
    console.error('createSetupIntent error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});