import { config } from './config.js'
import { stripe } from './stripe.js'
import {
  markEventProcessed,
  updateByCustomer,
  upsertProUser,
} from './db.js'

/**
 * Prevodi Stripe price ID u naziv plana.
 */
function planFromPriceId(priceId) {
  if (priceId === config.stripe.priceMonthly) return 'monthly'
  if (priceId === config.stripe.priceYearly) return 'yearly'
  return null
}

/**
 * Kraj tekućeg perioda.
 *
 * ZAMKA: od API verzije 2025-03-31.basil `current_period_end` više NE stoji na
 * samom Subscription objektu nego na stavkama (subscription.items). Čitamo oba
 * mesta da integracija radi i na starijim i na novijim verzijama.
 */
function periodEndISO(subscription) {
  const raw =
    subscription.current_period_end ??
    subscription.items?.data?.[0]?.current_period_end ??
    null

  return raw ? new Date(raw * 1000).toISOString() : null
}

function emailFromSubscription(subscription, fallback) {
  return (
    subscription.metadata?.rimoteka_email ||
    fallback ||
    null
  )
}

/** Upisuje trenutno stanje pretplate u bazu. */
async function syncSubscription(subscription, emailHint) {
  const item = subscription.items?.data?.[0]
  const priceId = item?.price?.id
  const email = emailFromSubscription(subscription, emailHint)

  const patch = {
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan: planFromPriceId(priceId),
    current_period_end: periodEndISO(subscription),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  }

  // Email znamo → upsert po emailu (pokriva i prvu kupovinu).
  // Email ne znamo → update po customer ID-ju (red već postoji).
  if (email) {
    await upsertProUser(email, patch)
  } else {
    await updateByCustomer(subscription.customer, patch)
  }
}

/**
 * Obrada jednog Stripe eventa. Poziva se tek posle verifikacije potpisa.
 */
export async function handleStripeEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.mode !== 'subscription' || !session.subscription) break

      const subscription = await stripe.subscriptions.retrieve(session.subscription)
      const email =
        session.metadata?.rimoteka_email ||
        session.customer_details?.email ||
        session.customer_email

      await syncSubscription(subscription, email)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await syncSubscription(event.data.object, null)
      break
    }

    case 'invoice.payment_failed': {
      // Stripe Smart Retries automatski ponavlja naplatu i šalje mejlove.
      // Ovde samo beležimo — pristup se gasi tek kad pretplata pređe u
      // canceled/unpaid, što stiže kroz customer.subscription.updated.
      const invoice = event.data.object
      console.warn(
        `[webhook] Neuspela naplata za customer=${invoice.customer} invoice=${invoice.id}`
      )
      break
    }

    default:
      // Ostale evente svesno ignorišemo — Stripe ih šalje mnogo.
      break
  }
}

/**
 * Express handler. Zahteva SIROV (raw) body — vidi index.js.
 */
export async function stripeWebhookHandler(req, res) {
  const signature = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripe.webhookSecret
    )
  } catch (err) {
    console.error('[webhook] Neispravan potpis:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Idempotencija PRE obrade: ako smo ovaj event već videli, odmah 200.
  try {
    const isNew = await markEventProcessed(event.id, event.type)
    if (!isNew) {
      console.log(`[webhook] Duplikat ${event.id} (${event.type}) — preskačem.`)
      return res.json({ received: true, duplicate: true })
    }
  } catch (err) {
    console.error('[webhook] Greška pri proveri idempotencije:', err)
    // 500 → Stripe će pokušati ponovo. Bolje retry nego tiho izgubljen event.
    return res.status(500).send('Idempotency check failed')
  }

  try {
    await handleStripeEvent(event)
    return res.json({ received: true })
  } catch (err) {
    console.error(`[webhook] Greška u obradi ${event.type}:`, err)
    return res.status(500).send('Handler failed')
  }
}
