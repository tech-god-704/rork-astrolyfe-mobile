/**
 * Backend client.
 *
 * The name is kept because seven files import from '@/lib/supabase', and the funnel's
 * move to PocketBase should not require touching each of them. What is exported is a
 * PocketBase client presenting the same surface this app used from supabase-js — see
 * lib/pocketbase.ts for the translation and its two deliberate differences.
 *
 * To go back to Supabase, restore this file's previous contents; nothing else changes.
 */

export { supabase, type PbUser, type PbSession } from './pocketbase';
export { supabase as default } from './pocketbase';
