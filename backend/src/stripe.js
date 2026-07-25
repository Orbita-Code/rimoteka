import Stripe from 'stripe'
import { config } from './config.js'

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2026-06-24.dahlia',
  appInfo: {
    name: 'Rimoteka Pro',
    url: 'https://rimoteka.com',
  },
})
