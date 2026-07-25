import 'dotenv/config'

/**
 * Centralno mesto za konfiguraciju. Sve tajne dolaze iz environment varijabli
 * (Coolify → Environment Variables). NIKAD ne hardkodovati ključeve — vidi
 * CLAUDE.md sekcija 9.
 */

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Nedostaje obavezna environment varijabla: ${name}. ` +
        `Dodaj je u Coolify → Environment Variables (ili u backend/.env lokalno).`
    )
  }
  return value
}

function optional(name, fallback) {
  return process.env[name] || fallback
}

function bool(name, fallback = false) {
  const value = process.env[name]
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
}

export const config = {
  port: Number(optional('PORT', '3000')),
  nodeEnv: optional('NODE_ENV', 'production'),

  // Javni URL sajta — koristi se za success/cancel/redirect adrese
  siteUrl: optional('SITE_URL', 'https://rimoteka.com'),

  stripe: {
    secretKey: required('STRIPE_SECRET_KEY'),
    webhookSecret: required('STRIPE_WEBHOOK_SECRET'),
    priceMonthly: required('STRIPE_PRICE_MONTHLY'),
    priceYearly: required('STRIPE_PRICE_YEARLY'),

    /**
     * KRITIČNO: Stripe Tax naplaćuje porez SAMO u jurisdikcijama gde postoji
     * aktivna registracija. Bez registracije `automatic_tax: true` NE vraća
     * grešku — tiho naplati 0 € PDV-a, a ti misliš da porez radi.
     *
     * Zato je podrazumevano ISKLJUČENO. Uključi (STRIPE_AUTOMATIC_TAX=true)
     * tek kad gestor potvrdi da su španska IVA registracija i Union OSS
     * aktivni i upisani u Stripe (/v1/tax/registrations).
     */
    automaticTax: bool('STRIPE_AUTOMATIC_TAX', false),
  },

  supabase: {
    url: required('SUPABASE_URL'),
    anonKey: required('SUPABASE_ANON_KEY'),
    serviceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },

  // Tajna kojom potpisujemo sopstveni sesijski kolačić (min 32 znaka)
  sessionSecret: required('SESSION_SECRET'),
  sessionDays: Number(optional('SESSION_DAYS', '30')),
}

// Dozvoljeni origini za CORS — backend i sajt su iza istog domena preko nginx
// proxy-ja, pa je CORS praktično suvišan, ali ostaje kao pojas i tregeri.
export const allowedOrigins = optional('ALLOWED_ORIGINS', config.siteUrl)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
