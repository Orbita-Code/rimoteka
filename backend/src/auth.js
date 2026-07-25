import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { anon } from './db.js'

const COOKIE_NAME = 'rimoteka_session'

/**
 * Tok prijave (magic link):
 *
 *  1. POST /api/auth/request  { email }
 *     → Supabase pošalje mejl sa linkom
 *  2. Korisnik klikne link → Supabase ga vrati na rimoteka.com sa
 *     #access_token=... u fragmentu
 *  3. POST /api/auth/session  { access_token }
 *     → backend proveri token kod Supabase-a i postavi httpOnly kolačić
 *  4. Sve dalje: kolačić nosi identitet, frontend ne drži nikakav token
 *
 * Zašto sopstveni kolačić a ne Supabase token u localStorage:
 * httpOnly kolačić nije dostupan JavaScript-u, pa ga XSS ne može pokupiti.
 */

/** Šalje magic-link mejl. Vraća { ok } — nikad ne otkriva da li email postoji. */
export async function sendMagicLink(email) {
  const { error } = await anon.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${config.siteUrl}/?auth=1`,
      shouldCreateUser: true,
    },
  })
  if (error) throw error
}

/** Proverava Supabase access token i vraća email, ili null ako je nevažeći. */
export async function verifySupabaseToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null

  const { data, error } = await anon.auth.getUser(accessToken)
  if (error || !data?.user?.email) return null

  return data.user.email.trim().toLowerCase()
}

/** Postavlja potpisan httpOnly sesijski kolačić. */
export function setSessionCookie(res, email) {
  const maxAgeMs = config.sessionDays * 24 * 60 * 60 * 1000

  const token = jwt.sign({ email }, config.sessionSecret, {
    expiresIn: `${config.sessionDays}d`,
  })

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

/** Čita email iz sesijskog kolačića, ili null. */
export function getSessionEmail(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null

  try {
    const payload = jwt.verify(token, config.sessionSecret)
    return payload?.email || null
  } catch {
    return null
  }
}

/** Express middleware — odbija zahtev ako korisnik nije prijavljen. */
export function requireAuth(req, res, next) {
  const email = getSessionEmail(req)
  if (!email) {
    return res.status(401).json({ error: 'Niste prijavljeni.' })
  }
  req.userEmail = email
  next()
}
