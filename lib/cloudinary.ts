/**
 * Cloudinary URL builder.
 *
 * Products store either a bare Cloudinary public ID ("posters/apex-amber") or a
 * full https URL. This helper turns a public ID into an optimised, responsive
 * delivery URL (auto format, auto quality, dpr-aware). When the cloud name is
 * not configured, callers fall back to the procedural <PosterArt /> renderer.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME);

interface ImageOpts {
  width?: number;
  height?: number;
  /** crop mode — "fill" keeps aspect & crops, "fit" letterboxes */
  crop?: 'fill' | 'fit';
}

export function cloudinaryUrl(idOrUrl: string, opts: ImageOpts = {}): string | null {
  if (!idOrUrl) return null;
  if (idOrUrl.startsWith('http')) return idOrUrl;
  if (!CLOUD_NAME) return null;

  const t = ['f_auto', 'q_auto', 'dpr_auto'];
  if (opts.width) t.push(`w_${opts.width}`);
  if (opts.height) t.push(`h_${opts.height}`);
  if (opts.crop) t.push(`c_${opts.crop}`, 'g_auto');

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${t.join(',')}/${idOrUrl}`;
}

/** Low-quality blurred placeholder for the blur-up effect. */
export function cloudinaryBlur(idOrUrl: string): string | null {
  if (!idOrUrl || idOrUrl.startsWith('http') || !CLOUD_NAME) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_24,q_10,e_blur:1000,f_auto/${idOrUrl}`;
}
