import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase clients.
 *
 * - The anon client is safe for read-only catalogue access from server
 *   components.
 * - The service client (server-only) is used by Netlify Functions to write
 *   the order log. Never import the service client into client components.
 *
 * Both return `null` when env vars are absent so the site can run entirely on
 * seed data during early development / preview deploys.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let _anon: SupabaseClient | null = null;
export function supabaseAnon(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!_anon) _anon = createClient(url, anonKey, { auth: { persistSession: false } });
  return _anon;
}

let _service: SupabaseClient | null = null;
export function supabaseService(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  if (!_service) _service = createClient(url, serviceKey, { auth: { persistSession: false } });
  return _service;
}
