export type SiteScope = 'internal' | 'external';

export type ScopeFilter = 'all' | SiteScope | 'favorites';

export type SiteCategory =
  | 'Operasional'
  | 'SDM & Kantor'
  | 'Keuangan'
  | 'Engineering'
  | 'Dokumentasi'
  | 'Analitik'
  | 'Layanan Publik'
  | 'Cloud & Mitra';

export type CameraPreset = 'overview' | 'internal' | 'external' | 'focused';

export interface SiteEntry {
  id: string;
  name: string;
  url: string;
  scope: SiteScope;
  category: SiteCategory;
  description: string;
  owner: string;
  favorite: boolean;
  createdAt: string;
}

export const SITE_CATEGORIES: SiteCategory[] = [
  'Operasional',
  'SDM & Kantor',
  'Keuangan',
  'Engineering',
  'Dokumentasi',
  'Analitik',
  'Layanan Publik',
  'Cloud & Mitra',
];

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || url;
  }
}

export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
