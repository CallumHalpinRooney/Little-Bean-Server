import type { Metadata } from 'next';
import { CollectionHeader } from '@/components/CollectionHeader';
import { CollectionView } from '@/components/CollectionView';
import { getProductsByCollection } from '@/lib/products';
import { COLLECTIONS } from '@/lib/types';

export const metadata: Metadata = {
  title: COLLECTIONS.motorsport.title,
  description: COLLECTIONS.motorsport.description,
};

export default async function MotorsportPage() {
  const products = await getProductsByCollection('motorsport');
  return (
    <>
      <CollectionHeader collection="motorsport" />
      <CollectionView products={products} />
    </>
  );
}
