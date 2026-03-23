import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response('Webhook Error', { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const profileId = session.metadata?.profile_id;

      if (userId && session.mode === 'subscription') {
        const subscriptionId = session.subscription;

        if (profileId) {
          await base44.asServiceRole.entities.LawyerProfile.update(profileId, {
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active'
          });
          console.log(`Activated subscription for profile ${profileId}`);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Find profile by stripe_customer_id
      const profiles = await base44.asServiceRole.entities.LawyerProfile.filter({ stripe_customer_id: customerId });
      const profile = profiles[0];

      if (profile) {
        let status = 'none';
        if (subscription.status === 'active') status = 'active';
        else if (subscription.status === 'trialing') status = 'trial';
        else if (subscription.status === 'past_due') status = 'past_due';
        else if (subscription.status === 'canceled') status = 'cancelled';

        await base44.asServiceRole.entities.LawyerProfile.update(profile.id, {
          stripe_subscription_id: subscription.id,
          subscription_status: status
        });
        console.log(`Updated subscription status to ${status} for profile ${profile.id}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});