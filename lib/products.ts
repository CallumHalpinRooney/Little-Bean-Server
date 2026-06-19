import 'server-only';
import { supabaseAnon } from './supabase';
import { SEED_PRODUCTS } from './seed-data';
import type { Collection, Product, ProductVariant } from './types';

/**
 * Catalogue access layer.
 *
 * Reads from Supabase when configured, otherwise falls back to the seed
 * catalogue so the site renders identically in a fresh preview deploy. The
 * row → Product mapping is centralised here so the rest of the app only ever
 * sees the typed `Product` shape.
 */

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  collection: Collection;
  story: string;
  blurb: string;
  images: string[] | null;
  art_seed: string | null;
  variants: ProductVariant[] | null;
  featured: boolean | null;
}

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    collection: row.collection,
    story: row.story,
    blurb: row.blurb,
    images: row.images ?? [],
    artSeed: row.art_seed ?? row.slug,
    variants: row.variants ?? [],
    featured: row.featured ?? false,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const db = supabaseAnon();
  if (!db) return SEED_PRODUCTS;

  const { data, error } = await db
    .from('products')
    .select('*')
    .order('featured', { ascending: false });

  if (error || !data || data.length === 0) return SEED_PRODUCTS;
  return (data as ProductRow[]).map(mapRow);
}

export async function getProductsByCollection(collection: Collection): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.collection === collection);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await getAllProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  const all = await getAllProducts();
  const featured = all.filter((p) => p.featured);
  return (featured.length ? featured : all).slice(0, limit);
}
