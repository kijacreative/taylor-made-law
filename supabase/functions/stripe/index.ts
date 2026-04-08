/**
 * Edge Function: stripe
 *
 * Replaces Base44 functions:
 *   - createSubscriptionCheckout  (create Stripe customer + checkout session)
 *   - createSetupIntent           (create Stripe customer + setup intent)
 *   - stripeWebhook               (verify signature, handle checkout.session.completed,
 *                                   customer.subscription.deleted, customer.subscription.updated)
 *
 * Routes:
 *   POST { action: 'create_checkout' }      -> returns { data: { url } } for Stripe checkout
 *   POST { action: 'create_setup_intent' }  -> returns { data: { clientSecret, publishableKey } }
 *   POST (raw body, Stripe signature header) -> webhook handler
 *
 * External services: Stripe SDK
 * Auth: User JWT for checkout/setup, Stripe signature for webhook
 *
 * Env vars needed:
 *   STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, APP_URL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient, getAuthUser, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const DEFAULT_PRICE_ID = 'price_1TJm06BI0mAZLD5sDnIDvVez'; // $99/month TML membership

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get or create a Stripe customer for the authenticated user.
 * Returns { customerId, profileId } or throws.
 */
async function getOrCreateStripeCustomer(
  req: Request
): Promise<{ customerId: string; profileId: string; userId: string }> {
  const auth = await getAuthUser(req);
  if (!auth) throw new Error('Unauthorized');

  const { user, profile } = auth;
  const sb = createAdminClient();

  // Fetch lawyer_profiles row for this user
  const { data: lawyerProfile, error: lpError } = await sb
    .from('lawyer_profiles')
    .select('id, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (lpError) throw new Error(`Failed to fetch lawyer profile: ${lpError.message}`);
  if (!lawyerProfile) throw new Error('Lawyer profile not found');

  let customerId = lawyerProfile.stripe_customer_id;

  if (!customerId) {
    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.full_name || profile.email,
      metadata: {
        user_id: user.id,
        profile_id: lawyerProfile.id,
      },
    });
    customerId = customer.id;

    // Persist the stripe_customer_id
    await sb
      .from('lawyer_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', lawyerProfile.id);
  }

  return { customerId, profileId: lawyerProfile.id, userId: user.id };
}

// ---------------------------------------------------------------------------
// createSubscriptionCheckout (action: 'create_checkout')
// ---------------------------------------------------------------------------

async function handleCreateCheckout(req: Request) {
  const { customerId, profileId, userId } = await getOrCreateStripeCustomer(req);

  const origin = Deno.env.get('APP_URL') || req.headers.get('origin') || 'https://app.taylormadelaw.com';
  const priceId = Deno.env.get('STRIPE_PRICE_ID') || DEFAULT_PRICE_ID;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/LawyerSettings?tab=billing&checkout=success`,
    cancel_url: `${origin}/LawyerSettings?tab=billing&checkout=cancel`,
    metadata: {
      user_id: userId,
      profile_id: profileId,
    },
  });

  return jsonResponse({ data: { url: session.url } });
}

// ---------------------------------------------------------------------------
// createSetupIntent (action: 'create_setup_intent')
// ---------------------------------------------------------------------------

async function handleCreateSetupIntent(req: Request) {
  const { customerId } = await getOrCreateStripeCustomer(req);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });

  return jsonResponse({
    data: {
      clientSecret: setupIntent.client_secret,
      publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? '',
    },
  });
}

// ---------------------------------------------------------------------------
// stripeWebhook (stripe-signature header present)
// ---------------------------------------------------------------------------

async function handleWebhook(req: Request) {
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return errorResponse('Webhook secret not configured', 500);
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return errorResponse('Missing stripe-signature header', 400);
  }

  // Verify the event signature
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', (err as Error).message);
    return errorResponse('Webhook signature verification failed', 400);
  }

  const sb = createAdminClient();

  // ---- checkout.session.completed ----
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const profileId = session.metadata?.profile_id;

    if (profileId && session.mode === 'subscription') {
      const subscriptionId = session.subscription as string;

      const { error } = await sb
        .from('lawyer_profiles')
        .update({
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
        })
        .eq('id', profileId);

      if (error) {
        console.error(`Failed to activate subscription for profile ${profileId}:`, error.message);
      } else {
        console.log(`Activated subscription for profile ${profileId}`);
      }
    }
  }

  // ---- customer.subscription.deleted ----
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const { data: profile, error: findErr } = await sb
      .from('lawyer_profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (findErr) {
      console.error(`Failed to find profile for customer ${customerId}:`, findErr.message);
    } else if (profile) {
      const { error } = await sb
        .from('lawyer_profiles')
        .update({
          subscription_status: 'cancelled',
        })
        .eq('id', profile.id);

      if (error) {
        console.error(`Failed to cancel subscription for profile ${profile.id}:`, error.message);
      } else {
        console.log(`Set subscription_status to cancelled for profile ${profile.id}`);
      }
    }
  }

  // ---- customer.subscription.updated ----
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const { data: profile, error: findErr } = await sb
      .from('lawyer_profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (findErr) {
      console.error(`Failed to find profile for customer ${customerId}:`, findErr.message);
    } else if (profile) {
      // Map Stripe subscription status to app status
      let appStatus = 'none';
      switch (subscription.status) {
        case 'active':
          appStatus = 'active';
          break;
        case 'trialing':
          appStatus = 'trial';
          break;
        case 'past_due':
          appStatus = 'past_due';
          break;
        case 'canceled':
          appStatus = 'cancelled';
          break;
        default:
          appStatus = 'none';
      }

      const { error } = await sb
        .from('lawyer_profiles')
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: appStatus,
        })
        .eq('id', profile.id);

      if (error) {
        console.error(`Failed to update subscription for profile ${profile.id}:`, error.message);
      } else {
        console.log(`Updated subscription status to ${appStatus} for profile ${profile.id}`);
      }
    }
  }

  return jsonResponse({ data: { received: true } });
}

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Webhook detection: if stripe-signature header is present, handle as webhook.
    // This must be checked BEFORE parsing the body as JSON.
    if (req.headers.get('stripe-signature')) {
      return await handleWebhook(req);
    }

    // All other requests are action-based JSON bodies
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create_checkout':
        return await handleCreateCheckout(req);

      case 'create_setup_intent':
        return await handleCreateSetupIntent(req);

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    const message = (err as Error).message;

    // Return appropriate status for auth errors
    if (message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    console.error('Stripe function error:', message);
    return errorResponse(message, 500);
  }
});
