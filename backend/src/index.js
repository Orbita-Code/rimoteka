import express from 'express'
import cookieParser from 'cookie-parser'

import { config, allowedOrigins } from './config.js'
import { stripe } from './stripe.js'
import { stripeWebhookHandler } from './webhook.js'
import { getProUser, isActiveStatus, upsertProUser } from './db.js'
import {
  clearSessionCookie,
  getSessionEmail,
  requireAuth,
  sendMagicLink,
  setSessionCookie,
  verifySupabaseToken,
} from './auth.js'

const app = express()
app.set('trust proxy', 1) // iza nginx/Traefik proxy-ja

/* ------------------------------------------------------------------ *
 * 1. WEBHOOK — MORA biti pre express.json()
 *
 * Stripe potpisuje SIROV bajt-niz tela zahteva. Ako ga express.json()
 * parsira pre nas, potpis više ne odgovara i constructEvent uvek puca sa
 * "No signatures found matching the expected signature".
 * Ovo je najčešća greška u Stripe integracijama — zato stoji na vrhu.
 * ------------------------------------------------------------------ */
app.post(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
)

/* ------------------------------------------------------------------ *
 * 2. Standardni middleware za sve ostale rute
 * ------------------------------------------------------------------ */
app.use(express.json({ limit: '16kb' }))
app.use(cookieParser())

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Vary', 'Origin')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

/* ------------------------------------------------------------------ *
 * 3. Jednostavno ograničenje broja zahteva za slanje mejla
 *
 * Bez ovoga neko može da bombarduje tuđu adresu magic-link mejlovima
 * (i da potroši Supabase mejl kvotu).
 * ------------------------------------------------------------------ */
const magicLinkHits = new Map()
const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000
const MAGIC_LINK_MAX = 5

function rateLimitMagicLink(key) {
  const now = Date.now()
  const hits = (magicLinkHits.get(key) || []).filter(
    (t) => now - t < MAGIC_LINK_WINDOW_MS
  )
  if (hits.length >= MAGIC_LINK_MAX) return false
  hits.push(now)
  magicLinkHits.set(key, hits)
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [key, hits] of magicLinkHits) {
    const fresh = hits.filter((t) => now - t < MAGIC_LINK_WINDOW_MS)
    if (fresh.length) magicLinkHits.set(key, fresh)
    else magicLinkHits.delete(key)
  }
}, MAGIC_LINK_WINDOW_MS).unref()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/* ------------------------------------------------------------------ *
 * 4. Zdravlje servisa
 * ------------------------------------------------------------------ */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    automaticTax: config.stripe.automaticTax,
  })
})

/* ------------------------------------------------------------------ *
 * 5. Prijava (magic link)
 * ------------------------------------------------------------------ */
app.post('/api/auth/request', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Unesi ispravnu email adresu.' })
  }

  if (!rateLimitMagicLink(email) || !rateLimitMagicLink(req.ip)) {
    return res
      .status(429)
      .json({ error: 'Previše pokušaja. Probaj ponovo za 15 minuta.' })
  }

  try {
    await sendMagicLink(email)
  } catch (err) {
    console.error('[auth] Slanje magic linka nije uspelo:', err.message)
    return res
      .status(500)
      .json({ error: 'Slanje mejla trenutno ne radi. Probaj ponovo.' })
  }

  // Uvek isti odgovor — da se ne može saznati ko ima nalog.
  res.json({ ok: true })
})

app.post('/api/auth/session', async (req, res) => {
  const email = await verifySupabaseToken(req.body?.access_token)
  if (!email) {
    return res.status(401).json({ error: 'Link je istekao ili nije ispravan.' })
  }

  setSessionCookie(res, email)
  res.json({ ok: true, email })
})

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

/* ------------------------------------------------------------------ *
 * 6. Pro status — JEDINI izvor istine
 *
 * Frontend sme da kešira ovo u localStorage radi brzine, ali localStorage
 * NIKAD ne odlučuje da li je neko Pro — svako može da ga izmeni u DevTools.
 * ------------------------------------------------------------------ */
app.get('/api/status', async (req, res) => {
  const email = getSessionEmail(req)
  if (!email) return res.json({ authenticated: false, pro: false })

  try {
    const user = await getProUser(email)
    const pro = Boolean(user && isActiveStatus(user.status))

    res.json({
      authenticated: true,
      email,
      pro,
      plan: user?.plan ?? null,
      status: user?.status ?? 'inactive',
      currentPeriodEnd: user?.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(user?.cancel_at_period_end),
    })
  } catch (err) {
    console.error('[status] Greška:', err)
    res.status(500).json({ error: 'Greška pri proveri statusa.' })
  }
})

/* ------------------------------------------------------------------ *
 * 7. Checkout
 * ------------------------------------------------------------------ */
async function findOrCreateCustomer(email) {
  const user = await getProUser(email)
  if (user?.stripe_customer_id) {
    return user.stripe_customer_id
  }

  const existing = await stripe.customers.list({ email, limit: 1 })
  const customer =
    existing.data[0] ||
    (await stripe.customers.create({
      email,
      metadata: { site: 'rimoteka' },
    }))

  await upsertProUser(email, { stripe_customer_id: customer.id })
  return customer.id
}

app.post('/api/checkout', requireAuth, async (req, res) => {
  const plan = req.body?.plan === 'yearly' ? 'yearly' : 'monthly'
  const price =
    plan === 'yearly' ? config.stripe.priceYearly : config.stripe.priceMonthly

  try {
    const existing = await getProUser(req.userEmail)
    if (existing && isActiveStatus(existing.status)) {
      return res
        .status(409)
        .json({ error: 'Već imaš aktivan Pro nalog.', pro: true })
    }

    const customer = await findOrCreateCustomer(req.userEmail)

    const params = {
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${config.siteUrl}/?pro=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.siteUrl}/?pro=cancel`,
      client_reference_id: req.userEmail,
      metadata: { rimoteka_email: req.userEmail, site: 'rimoteka' },
      subscription_data: {
        metadata: { rimoteka_email: req.userEmail, site: 'rimoteka' },
      },
      allow_promotion_codes: true,
      integration_identifier: 'rimoteka_pro_ktbwqzrs',
    }

    // Porez uključujemo samo kad postoji aktivna registracija (vidi config.js).
    if (config.stripe.automaticTax) {
      params.automatic_tax = { enabled: true }
      params.customer_update = { address: 'auto', name: 'auto' }
      params.tax_id_collection = { enabled: true } // EU B2B reverse charge
    }

    const session = await stripe.checkout.sessions.create(params)
    res.json({ url: session.url })
  } catch (err) {
    console.error('[checkout] Greška:', err)
    res.status(500).json({ error: 'Ne mogu da otvorim plaćanje. Probaj ponovo.' })
  }
})

/* ------------------------------------------------------------------ *
 * 8. Customer Portal — otkazivanje, promena kartice, fakture
 * ------------------------------------------------------------------ */
app.post('/api/portal', requireAuth, async (req, res) => {
  try {
    const user = await getProUser(req.userEmail)
    if (!user?.stripe_customer_id) {
      return res.status(404).json({ error: 'Nemaš pretplatu.' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: config.siteUrl,
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('[portal] Greška:', err)
    res.status(500).json({ error: 'Ne mogu da otvorim upravljanje pretplatom.' })
  }
})

/* ------------------------------------------------------------------ *
 * 9. Start
 * ------------------------------------------------------------------ */
app.listen(config.port, () => {
  console.log(`Rimoteka backend sluša na portu ${config.port}`)
  if (!config.stripe.automaticTax) {
    console.warn(
      '[PAŽNJA] STRIPE_AUTOMATIC_TAX je isključen — PDV se NE naplaćuje. ' +
        'Uključi ga tek kad su IVA i OSS registracije aktivne i upisane u Stripe.'
    )
  }
})
