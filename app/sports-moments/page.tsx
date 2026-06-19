import type { Metadata } from 'next';
import { CollectionHeader } from '@/components/CollectionHeader';
import { CollectionView } from '@/components/CollectionView';
import { getProductsByCollection } from '@/lib/products';
import { COLLECTIONS } from '@/lib/types';

export const metadata: Metadata = {
  title: COLLECTIONS['sports-moments'].title,
  description: COLLECTIONS['sports-moments'].description,
};

export default async function SportsMomentsPage() {
  const products = await getProductsByCollection('sports-moments');
  return (
    <>
      <CollectionHeader collection="sports-moments" />
      <CollectionView products={products} />
    </>
  );
}
