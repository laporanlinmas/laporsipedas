'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon, { type IconName } from '@/components/Icon';

interface ServiceViewerProps {
  src: string;
  title: string;
  frameTitle: string;
  icon: IconName;
}

export default function ServiceViewer({ src, title, frameTitle, icon }: ServiceViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <main className="viewer">
      <div className="viewer-bar">
        <Link className="back-link solid" href="/">
          <Icon name="arrowLeft" /> Kembali
        </Link>
        <span className="viewer-title">
          <Icon name={icon} /> {title}
        </span>
        <a className="viewer-open" href={src} target="_blank" rel="noopener noreferrer">
          <Icon name="externalLink" />
          <span>Buka situs</span>
        </a>
      </div>
      <div className="viewer-frame">
        {loading && !error && (
          <div className="viewer-loading" role="status">
            <Icon name="loader" className="spin" />
            <span>Memuat {title}...</span>
          </div>
        )}
        {error && (
          <div className="viewer-error" role="alert">
            <Icon name="wifiOff" />
            <span>Situs tidak dapat dimuat di sini. Buka situs langsung untuk melanjutkan.</span>
            <a className="viewer-retry-link" href={src} target="_blank" rel="noopener noreferrer">
              Buka {title} <Icon name="externalLink" />
            </a>
          </div>
        )}
        <iframe
          src={src}
          title={frameTitle}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          style={{ display: loading || error ? 'none' : 'block' }}
        />
      </div>
    </main>
  );
}