import ServiceViewer from '@/components/ServiceViewer';

export const dynamic = 'force-dynamic';

function resolveCctvUrl(): string {
  const raw = process.env.CCTV_URL || 'https://sipedasview.vercel.app/';
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : 'https://sipedasview.vercel.app/';
  } catch {
    return 'https://sipedasview.vercel.app/';
  }
}

export default function CctvPage() {
  return <ServiceViewer src={resolveCctvUrl()} title="SIPEDAS VIEW" frameTitle="SIPEDAS VIEW CCTV" icon="video" />;
}
