import { X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  SITE_CATEGORIES,
  SiteCategory,
  SiteEntry,
  SiteScope,
  normalizeUrl,
} from '../types/directory';

interface SiteFormModalProps {
  initialSite: SiteEntry | null;
  onClose: () => void;
  onSave: (data: Omit<SiteEntry, 'id' | 'createdAt'>, existingId?: string) => void;
}

export function SiteFormModal({
  initialSite,
  onClose,
  onSave,
}: SiteFormModalProps) {
  const [name, setName] = useState(initialSite?.name ?? '');
  const [url, setUrl] = useState(initialSite?.url ?? '');
  const [scope, setScope] = useState<SiteScope>(initialSite?.scope ?? 'internal');
  const [category, setCategory] = useState<SiteCategory>(
    initialSite?.category ?? 'Operasional'
  );
  const [owner, setOwner] = useState(initialSite?.owner ?? '');
  const [description, setDescription] = useState(initialSite?.description ?? '');
  const [favorite, setFavorite] = useState(initialSite?.favorite ?? false);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const normalized = normalizeUrl(url);

    if (!cleanName) {
      setError('Nama website wajib diisi.');
      return;
    }
    if (!normalized) {
      setError('Alamat URL website wajib diisi.');
      return;
    }

    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname.includes('.')) {
        setError('Masukkan domain URL yang valid (contoh: https://portal.perusahaan.co.id).');
        return;
      }
    } catch {
      setError('Format URL tidak valid.');
      return;
    }

    onSave(
      {
        name: cleanName,
        url: normalized,
        scope,
        category,
        owner: owner.trim(),
        description: description.trim(),
        favorite,
      },
      initialSite?.id
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initialSite ? 'Edit Situs Direktori' : 'Tambah Situs Baru'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060A13]/88 p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0B111E] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-slate-50">
            {initialSite ? 'Edit Data Website' : 'Tambah Website Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-xs font-medium text-rose-200"
            >
              {error}
            </div>
          )}

          {/* Tipe Jaringan: Internal vs Eksternal */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-300">
              Tipe Akses Website
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setScope('internal')}
                className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                  scope === 'internal'
                    ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Internal (Intranet / Privat)
              </button>
              <button
                type="button"
                onClick={() => setScope('external')}
                className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                  scope === 'external'
                    ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Eksternal (Publik / Mitra)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="site-name"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Nama Website
              </label>
              <input
                id="site-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="Contoh: Portal HRIS"
                className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="site-category"
                className="mb-1.5 block text-xs font-medium text-slate-300"
              >
                Kategori
              </label>
              <select
                id="site-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as SiteCategory)}
                className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                {SITE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="site-url"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Alamat URL
            </label>
            <input
              id="site-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              placeholder="https://portal.internal.corp"
              className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="site-owner"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Tim Pengelola / Instansi
            </label>
            <input
              id="site-owner"
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Contoh: Platform Engineering atau Ditjen Pajak"
              className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="site-desc"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Deskripsi Singkat
            </label>
            <textarea
              id="site-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fungsi utama website ini..."
              className="w-full rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-300">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-400"
            />
            <span>Tandai sebagai situs favorit</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-4 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-sky-500 px-5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
            >
              {initialSite ? 'Simpan Perubahan' : 'Tambahkan ke Direktori'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
