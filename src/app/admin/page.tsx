import ServiceViewer from '@/components/ServiceViewer';

export const dynamic = 'force-dynamic';

function resolveAdminUrl(): string {
  const raw = process.env.SIPEDAS_ADMIN_URL || 'https://sipedasadmin.vercel.app/';
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : 'https://sipedasadmin.vercel.app/';
  } catch {
    return 'https://sipedasadmin.vercel.app/';
  }
}

export default function AdminPage() {
  return <ServiceViewer src={resolveAdminUrl()} title="SIPEDAS ADMIN" frameTitle="SIPEDAS ADMIN" icon="shield" />;
}