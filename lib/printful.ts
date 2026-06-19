/**
 * Printful API client (server-only).
 *
 * Thin wrapper around the Printful REST API with a built-in retry on transient
 * failures. Used by:
 *   - printful-sync     → pull live variant pricing into Supabase
 *   - stripe-webhook    → create the fulfilment order after payment succeeds
 */

const BASE = 'https://api.printful.com';

export interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

export interface PrintfulOrderItem {
  variant_id: number;
  quantity: number;
  retail_price?: string; // e.g. "59.00"
  name?: string;
}

export class PrintfulError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'PrintfulError';
    this.status = status;
    this.body = body;
  }
}

function authHeader(): string {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error('PRINTFUL_API_KEY is not configured');
  return `Bearer ${key}`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  attempt = 1,
): Promise<T> {
  const storeId = process.env.PRINTFUL_STORE_ID;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(storeId ? { 'X-PF-Store-Id': storeId } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    // Retry on rate-limit / transient 5xx with exponential backoff.
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 4) {
      const wait = 2 ** attempt * 500;
      await new Promise((r) => setTimeout(r, wait));
      return request<T>(path, init, attempt + 1);
    }
    throw new PrintfulError(
      `Printful ${res.status} on ${path}`,
      res.status,
      json,
    );
  }

  return json as T;
}

/** Create a fulfilment order. By default it is created as a draft-confirmed
 *  order (confirm=true means Printful charges & fulfils automatically). */
export async function createPrintfulOrder(params: {
  externalId: string;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  confirm?: boolean;
}): Promise<{ id: number; status: string }> {
  const confirm = params.confirm ?? true;
  const data = await request<{ result: { id: number; status: string } }>(
    `/orders?confirm=${confirm ? '1' : '0'}`,
    {
      method: 'POST',
      body: JSON.stringify({
        external_id: params.externalId,
        recipient: params.recipient,
        items: params.items,
      }),
    },
  );
  return data.result;
}

export interface PrintfulSyncVariant {
  id: number;
  variant_id: number;
  name: string;
  retail_price: string;
  sku: string;
}

/** Pull all sync products + variants so the catalogue can mirror live pricing. */
export async function listSyncVariants(): Promise<PrintfulSyncVariant[]> {
  const list = await request<{ result: { id: number }[] }>(`/store/products`);
  const out: PrintfulSyncVariant[] = [];
  for (const p of list.result) {
    const detail = await request<{
      result: { sync_variants: PrintfulSyncVariant[] };
    }>(`/store/products/${p.id}`);
    out.push(...detail.result.sync_variants);
  }
  return out;
}
