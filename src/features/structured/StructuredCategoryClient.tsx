'use client';

import { AppProvider } from '@/features/core/AppContext';
import StructuredReportPage from '@/features/structured/StructuredReportPage';
import { getCategoryBySlug } from '@/lib/constants';

/** Wrapper klien: satu provider per kategori (scope penyimpanan terpisah). */
export default function StructuredCategory({ slug }: { slug: string }) {
  const category = getCategoryBySlug(slug);
  if (!category) return null;

  /* `key` memaksa provider dibuat ulang saat kategori berganti. Tanpa itu
     React bisa mempertahankan state kategori sebelumnya (isian form, foto,
     draft aktif) sehingga data Poskamling sempat muncul di halaman Posyandu. */
  return (
    <AppProvider key={category.slug} scope={category.slug}>
      <StructuredReportPage />
    </AppProvider>
  );
}
