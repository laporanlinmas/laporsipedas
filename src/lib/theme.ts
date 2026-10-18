'use client';

import { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

export const SETTINGS_KEY = 'sipedas:v5:settings';

/**
 * Tema yang datang dari halaman induk (dashboard SIPEDAS) atau query param
 * `?theme=`. Disimpan di modul — bukan di state — supaya SEMUA komponen
 * (`useTheme`, komponen yang memanggil `applyThemeToDOM` langsung, dan skrip
 * bootstrap di <head>) membaca sumber yang sama. Tanpa ini, komponen yang
 * memanggil `getStoredTheme()` akan menimpa tema induk dengan bawaan gelap.
 */
let frameThemeOverride: ThemeMode | null = null;

/** Baca tema dari query param `?theme=`. */
export function readThemeParam(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const t = new URLSearchParams(window.location.search).get('theme');
    return t === 'dark' || t === 'light' ? t : null;
  } catch {
    return null;
  }
}

/**
 * Tetapkan tema dari halaman induk (atau lepaskan override dengan `null`).
 * Dipanggil oleh ThemeFrameSync; langsung menerapkan ke DOM agar tampilan
 * tidak menunggu render berikutnya.
 */
export function setFrameThemeOverride(theme: ThemeMode | null): void {
  frameThemeOverride = theme;
  if (theme) applyThemeToDOM(theme);
}

/**
 * Membaca preferensi tema.
 * Urutan: override halaman induk → `?theme=` → localStorage → sistem.
 *
 * NOTE: dulu bawaannya mutlak 'dark'. Sekarang mengikuti `prefers-color-scheme`
 * supaya portal yang dibuka langsung di perangkat berTema terang tidak
 * tampak seperti error.
 */
export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  if (frameThemeOverride) return frameThemeOverride;

  const fromParam = readThemeParam();
  if (fromParam) return fromParam;

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.theme === 'light' || parsed?.theme === 'dark') return parsed.theme;
    }
  } catch {
    /* abaikan */
  }

  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  } catch {
    /* abaikan */
  }

  return 'dark';
}

/**
 * Menerapkan tema pada <html> (satu-satunya sumber kebenaran) serta
 * menyinkronkan meta theme-color pada browser.
 *
 * Class TIDAK lagi dipasang pada <body>: saat halaman dimuat penuh,
 * <body> belum ada ketika <head> dieksekusi, sehingga CSS berbasis
 * `body.light-mode` akan gagal match dan tema tampak berkedip saat transisi.
 */
export function applyThemeToDOM(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const isLight = theme === 'light';

  const root = document.documentElement;
  root.classList.toggle('light-mode', isLight);
  // Bersihkan class sisa bila versi lama sempat menempelkannya di <body>.
  document.body?.classList.remove('light-mode');
  root.style.colorScheme = isLight ? 'light' : 'dark';

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isLight ? '#f5f7fc' : '#080d18');
  }
}

/**
 * Menyimpan tema terpilih ke localStorage tanpa menghapus konfigurasi settings lain.
 */
export function saveStoredTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.theme = theme;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {
    /* Kuota penuh atau mode privat — abaikan */
  }
}

/**
 * Hook reaktif untuk komponen mandiri (seperti CategoryLanding & CCTV)
 * agar tema dapat diubah dan selalu tersinkronisasi otomatis antar halaman/tab.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = getStoredTheme();
    setTheme(current);
    applyThemeToDOM(current);
    setMounted(true);

    const handleSync = () => {
      const updated = getStoredTheme();
      setTheme(updated);
      applyThemeToDOM(updated);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('themechange', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('themechange', handleSync);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    // Pilihan manual pengguna menang: override dari halaman induk dilepas dan
    // tema disimpan permanen.
    setFrameThemeOverride(null);
    saveStoredTheme(nextTheme);
    applyThemeToDOM(nextTheme);
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  return { theme, toggleTheme, mounted };
}
