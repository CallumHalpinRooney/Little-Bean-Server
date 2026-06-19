import type { Metadata } from 'next';
import { CollectionHeader } from '@/components/CollectionHeader';
import { CollectionView } from '@/components/CollectionView';
import { getProductsByCollection } from '@/lib/products';
import { COLLECTIONS } from '@/lib/types';

export const metadata: Metadata = {
  title: COLLECTIONS.motivation.title,
  description: COLLECTIONS.motivation.description,
};

export default async function MotivationPage() {
  const products = await getProductsByCollection('motivation');
  return (
    <>
      <CollectionHeader collection="motivation" />
      <CollectionView products={products} />
    </>
  );
}
