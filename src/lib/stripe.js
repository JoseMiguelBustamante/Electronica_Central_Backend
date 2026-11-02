import Stripe from 'stripe';
import { env } from '../config/env.js';

let client = null;

/** Cliente Stripe; null si no hay clave (cobro en línea deshabilitado). */
export const getStripe = () => {
  if (!env.STRIPE_SECRET_KEY) return null;
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
};
