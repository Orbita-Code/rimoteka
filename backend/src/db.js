import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

/**
 * admin — service_role ključ, zaobilazi RLS. Koristi se za sve upise Pro
 * statusa. Ovaj klijent NIKAD ne sme da dođe do browsera.
 */
export const admin = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * anon — koristi se samo za slanje magic-link mejla i proveru pristiglog
 * tokena. Nema privilegija nad tabelama.
 */
export const anon = createClient(config.supabase.url, config.supabase.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const normalize = (email) => String(email || '').trim().toLowerCase()

/** Vraća red iz pro_users za dati email, ili null. */
export async function getProUser(email) {
  const { data, error } = await admin
    .from('pro_users')
    .select('*')
    .eq('email', normalize(email))
    .maybeSingle()

  if (error) throw error
  return data
}

/** Vraća red iz pro_users za dati Stripe customer, ili null. */
export async function getProUserByCustomer(customerId) {
  const { data, error } = await admin
    .from('pro_users')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) throw error
  return data
}

/** Upsert po emailu — email je jedinstveni ključ naloga. */
export async function upsertProUser(email, patch) {
  const { data, error } = await admin
    .from('pro_users')
    .upsert({ email: normalize(email), ...patch }, { onConflict: 'email' })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Update po Stripe customer ID-ju (koristi se iz webhook-a). */
export async function updateByCustomer(customerId, patch) {
  const { error } = await admin
    .from('pro_users')
    .update(patch)
    .eq('stripe_customer_id', customerId)

  if (error) throw error
}

/**
 * Idempotencija: pokušava da upiše event.id. Vraća true ako je ovo PRVI put
 * da vidimo taj event, false ako je već obrađen (duplikat → preskoči).
 */
export async function markEventProcessed(eventId, eventType) {
  const { error } = await admin
    .from('stripe_events')
    .insert({ id: eventId, type: eventType })

  // 23505 = unique_violation → event je već obrađen
  if (error && error.code === '23505') return false
  if (error) throw error
  return true
}

/** Da li je status iz Stripe-a onaj koji daje pristup Pro funkcijama. */
export function isActiveStatus(status) {
  return status === 'active' || status === 'trialing'
}
