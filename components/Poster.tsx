import Image from 'next/image';
import { cloudinaryUrl, cloudinaryBlur } from '@/lib/cloudinary';
import type { Collection } from '@/lib/types';
import { PosterArt } from './PosterArt';

/**
 * Poster — renders product artwork.
 *
 * Uses an optimised Cloudinary image when one is available (with a blurred
 * placeholder for the blur-up effect), and otherwise falls back to the
 * procedural <PosterArt /> so nothing ever renders a broken image.
 */
export function Poster({
  image,
  collection,
  seed,
  title,
  className = '',
  sizes = '(max-width: 768px) 90vw, 40vw',
  priority = false,
}: {
  image?: string;
  collection: Collection;
  seed: string;
  title?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const url = image ? cloudinaryUrl(image, { width: 1000, height: 1333, crop: 'fill' }) : null;
  const blur = image ? cloudinaryBlur(image) : null;

  if (url) {
    return (
      <Image
        src={url}
        alt={title ?? 'Poster artwork'}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={blur ? 'blur' : 'empty'}
        blurDataURL={blur ?? undefined}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <PosterArt
      collection={collection}
      seed={seed}
      title={title}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

/**
 * FramedPoster — the poster shown matted inside a wooden frame, for lifestyle
 * and hero contexts. Pure CSS so it reads as a real object under warm light.
 */
export function FramedPoster({
  image,
  collection,
  seed,
  title,
  frame = 'oak',
  className = '',
  priority = false,
}: {
  image?: string;
  collection: Collection;
  seed: string;
  title?: string;
  frame?: 'oak' | 'black' | 'walnut';
  className?: string;
  priority?: boolean;
}) {
  const frames = {
    oak: 'from-[#caa873] via-[#a9854d] to-[#7c5f33]',
    black: 'from-[#2a2622] via-[#161310] to-[#0c0a09]',
    walnut: 'from-[#6e4a30] via-[#4e3220] to-[#2e1d12]',
  } as const;

  return (
    <div className={`relative ${className}`}>
      {/* cast shadow on wall */}
      <div className="absolute -inset-6 -z-10 rounded-[2px] bg-black/40 blur-2xl" />
      <div
        className={`relative rounded-[3px] bg-gradient-to-br ${frames[frame]} p-[3.5%] shadow-2xl`}
      >
        <div className="relative bg-[#15110d] p-[5%] shadow-inner">
          <div className="relative aspect-[3/4] overflow-hidden">
            <Poster
              image={image}
              collection={collection}
              seed={seed}
              title={title}
              priority={priority}
              sizes="(max-width: 768px) 80vw, 40vw"
            />
            {/* glass sheen */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-white/[0.12]" />
          </div>
        </div>
      </div>
    </div>
  );
}
