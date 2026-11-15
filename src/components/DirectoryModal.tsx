import {
  Check,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  SITE_CATEGORIES,
  ScopeFilter,
  SiteCategory,
  SiteEntry,
  extractDomain,
} from '../types/directory';

type SortOption = 'name' | 'recent' | 'scope';

interface DirectoryModalProps {
  sites: SiteEntry[];
  scopeFilter: ScopeFilter;
  searchQuery: string;
  onScopeChange: (scope: ScopeFilter) => void;
  onSearchChange: (q: string) => void;
  onClose: () => void;
  onFocusIn3D: (siteId: string) => void;
  onToggleFavorite: (siteId: string) => void;
  onOpenAdd: () => void;
  onOpenEdit: (site: SiteEntry) => void;
  onDeleteSite: (siteId: string) => void;
  onImportSites: (imported: SiteEntry[]) => void;
  onNotify: (msg: string) => void;
}

export function DirectoryModal({
  sites,
  scopeFilter,
  searchQuery,
  onScopeChange,
  onSearchChange,
  onClose,
  onFocusIn3D,
  onToggleFavorite,
  onOpenAdd,
  onOpenEdit,
  onDeleteSite,
  onImportSites,
  onNotify,
}: DirectoryModalProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | SiteCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('scope');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const counts = useMemo(() => {
    let internal = 0;
    let external = 0;
    let favorites = 0;
    for (const s of sites) {
      if (s.scope === 'internal') internal++;
      else external++;
      if (s.favorite) favorites++;
    }
    return { total: sites.length, internal, external, favorites };
  }, [sites]);

  const displayedSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = sites.filter((site) => {
      if (scopeFilter === 'internal' && site.scope !== 'internal') return false;
      if (scopeFilter === 'external' && site.scope !== 'external') return false;
      if (scopeFilter === 'favorites' && !site.favorite) return false;
      if (categoryFilter !== 'all' && site.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        site.name.toLowerCase().includes(q) ||
        site.url.toLowerCase().includes(q) ||
        site.description.toLowerCase().includes(q) ||
        site.category.toLowerCase().includes(q) ||
        site.owner.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'id');
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a.scope !== b.scope) return a.scope === 'internal' ? -1 : 1;
      return a.name.localeCompare(b.name, 'id');
    });

    return list;
  }, [sites, scopeFilter, categoryFilter, searchQuery, sortBy]);

  const handleCopy = async (site: SiteEntry) => {
    try {
      await navigator.clipboard.writeText(site.url);
      setCopiedId(site.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      onNotify('Gagal menyalin URL ke papan klip.');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(sites, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `direktori-situs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Daftar direktori berhasil diekspor ke JSON.');
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) {
          onNotify('Format file JSON tidak valid.');
          return;
        }
        const valid: SiteEntry[] = parsed
          .filter(
            (item) =>
              item &&
              typeof item.name === 'string' &&
              typeof item.url === 'string' &&
              (item.scope === 'internal' || item.scope === 'external')
          )
          .map((item) => ({
            id:
              typeof item.id === 'string' && item.id
                ? item.id
                : `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: item.name.trim(),
            url: item.url.trim(),
            scope: item.scope,
            category: SITE_CATEGORIES.includes(item.category)
              ? item.category
              : 'Operasional',
            description:
              typeof item.description === 'string' ? item.description : '',
            owner: typeof item.owner === 'string' ? item.owner : '',
            favorite: Boolean(item.favorite),
            createdAt:
              typeof item.createdAt === 'string'
                ? item.createdAt
                : new Date().toISOString(),
          }));

        if (valid.length === 0) {
          onNotify('Tidak ada entri situs yang valid di dalam file.');
          return;
        }
        onImportSites(valid);
        onNotify(`${valid.length} situs berhasil diimpor ke direktori.`);
      } catch {
        onNotify('File JSON gagal dibaca.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const tabBtnClass = (active: boolean) =>
    `whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      active
        ? 'bg-slate-800 text-slate-50'
        : 'text-slate-400 hover:text-slate-100'
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Katalog Lengkap Direktori Website Internal dan Eksternal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#060A13]/88 p-4 pt-16 sm:p-6 sm:pt-18"
    >
      <div className="flex h-full max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0B111E] shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-50">
              Direktori Website Internal &amp; Eksternal
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 tabular-nums">
              <span>{counts.total} Total Situs</span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-400">{counts.internal} Internal</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-400">{counts.external} Eksternal</span>
              <span aria-hidden="true">·</span>
              <span>{counts.favorites} Favorit</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Impor JSON</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor JSON</span>
            </button>
            <button
              type="button"
              onClick={onOpenAdd}
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-sky-500 px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Situs</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup direktori"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-[#0F172A]/60 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64 max-w-full">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari nama, domain, divisi..."
                className="h-9 w-full rounded-lg border border-slate-700/80 bg-slate-900 pr-8 pl-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Hapus kata kunci"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filter cakupan situs"
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5"
            >
              <button
                type="button"
                onClick={() => onScopeChange('all')}
                className={tabBtnClass(scopeFilter === 'all')}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => onScopeChange('internal')}
                className={tabBtnClass(scopeFilter === 'internal')}
              >
                Internal
              </button>
              <button
                type="button"
                onClick={() => onScopeChange('external')}
                className={tabBtnClass(scopeFilter === 'external')}
              >
                Eksternal
              </button>
              <button
                type="button"
                onClick={() => onScopeChange('favorites')}
                className={tabBtnClass(scopeFilter === 'favorites')}
              >
                Favorit
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              aria-label="Filter kategori"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as 'all' | SiteCategory)
              }
              className="h-9 rounded-lg border border-slate-700/80 bg-slate-900 px-3 text-xs text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              {SITE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              aria-label="Urutkan situs"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 rounded-lg border border-slate-700/80 bg-slate-900 px-3 text-xs text-slate-200 focus:border-sky-400 focus:outline-none"
            >
              <option value="scope">Urutkan: Internal Dulu</option>
              <option value="name">Urutkan: Nama (A–Z)</option>
              <option value="recent">Urutkan: Terbaru</option>
            </select>
          </div>
        </div>

        {/* Directory Listing Grid */}
        <div className="thin-scrollbar flex-1 overflow-y-auto p-6">
          {displayedSites.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0F172A]/60 py-16 px-6 text-center">
              <p className="text-base font-semibold text-slate-100">
                Tidak ada website yang sesuai
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-400">
                Ubah kata kunci pencarian, pilih kategori lain, atau tambahkan entri website baru ke direktori.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    onScopeChange('all');
                    setCategoryFilter('all');
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  Reset Filter
                </button>
                <button
                  type="button"
                  onClick={onOpenAdd}
                  className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Tambah Situs Baru
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayedSites.map((site) => {
                const isInternal = site.scope === 'internal';
                const domain = extractDomain(site.url);
                const isConfirming = confirmDeleteId === site.id;

                return (
                  <article
                    key={site.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0F172A] p-4 transition-colors duration-150 hover:border-slate-700"
                  >
                    <div>
                      {/* Unboxed Metadata Row (Zero-Pill Discipline) */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
                          <span
                            className={`font-semibold ${
                              isInternal ? 'text-sky-400' : 'text-amber-400'
                            }`}
                          >
                            {isInternal ? 'Internal' : 'Eksternal'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{site.category}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onToggleFavorite(site.id)}
                          aria-label={
                            site.favorite
                              ? `Hapus ${site.name} dari favorit`
                              : `Tandai ${site.name} sebagai favorit`
                          }
                          className="rounded p-1 text-slate-400 transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              site.favorite
                                ? 'fill-amber-400 text-amber-400'
                                : ''
                            }`}
                          />
                        </button>
                      </div>

                      <h3 className="mt-2 truncate font-display text-base font-semibold text-slate-50">
                        {site.name}
                      </h3>

                      <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                        {domain}
                      </p>

                      <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-300">
                        {site.description || 'Tidak ada deskripsi singkat.'}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-slate-800/90 pt-3">
                      <div className="mb-2.5 truncate text-[11px] text-slate-400">
                        Pengelola: <span className="text-slate-300">{site.owner || '—'}</span>
                      </div>

                      {isConfirming ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-rose-400">
                            Hapus situs ini?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteSite(site.id);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500"
                            >
                              Ya, Hapus
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onFocusIn3D(site.id)}
                              title="Lihat lokasi di Peta 3D"
                              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-700/80 bg-slate-900 px-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                            >
                              <Compass className="h-3.5 w-3.5" />
                              <span>3D</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(site)}
                              title="Salin URL"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                            >
                              {copiedId === site.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenEdit(site)}
                              title="Edit situs"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(site.id)}
                              title="Hapus situs"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900 text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-950/50 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-100 px-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                          >
                            <span>Buka</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
