import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  List,
  Pencil,
  RotateCcw,
  Search,
  Star,
  X,
} from 'lucide-react';
import { RefObject, useState } from 'react';
import {
  CameraPreset,
  ScopeFilter,
  SiteEntry,
  extractDomain,
} from '../types/directory';

interface BottomControlDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  scopeFilter: ScopeFilter;
  onScopeChange: (scope: ScopeFilter) => void;
  filteredSites: SiteEntry[];
  selectedSite: SiteEntry | null;
  onSelectSite: (siteId: string | null) => void;
  onCameraPreset: (preset: CameraPreset) => void;
  onOpenDirectory: () => void;
  onToggleFavorite: (siteId: string) => void;
  onEditSite: (site: SiteEntry) => void;
}

export function BottomControlDock({
  collapsed,
  onToggleCollapse,
  searchQuery,
  onSearchChange,
  searchInputRef,
  scopeFilter,
  onScopeChange,
  filteredSites,
  selectedSite,
  onSelectSite,
  onCameraPreset,
  onOpenDirectory,
  onToggleFavorite,
  onEditSite,
}: BottomControlDockProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyUrl = async (site: SiteEntry) => {
    try {
      await navigator.clipboard.writeText(site.url);
      setCopiedId(site.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback ignored gracefully
    }
  };

  const scopeTabClass = (active: boolean) =>
    `whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      active
        ? 'bg-slate-800 text-slate-50 shadow-xs'
        : 'text-slate-400 hover:text-slate-100'
    }`;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-30 flex w-[min(940px,94vw)] -translate-x-1/2 flex-col items-center transition-transform duration-200 ease-out"
      style={{
        transform: collapsed
          ? 'translate(-50%, calc(100% - 34px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Collapse / Expand Drawer Handle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        title="Tekan H untuk menyembunyikan atau menampilkan panel"
        className="mb-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border border-b-0 border-slate-700/90 bg-[#0F172A]/95 px-3.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        {collapsed ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tampilkan Kontrol (H)</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sembunyikan Kontrol (H)</span>
          </>
        )}
      </button>

      {/* Main Solid/RGBA Dock Container (zero backdrop-filter over WebGL) */}
      <div className="w-full rounded-xl border border-slate-700/90 bg-[#0F172A]/95 px-3.5 py-2.5 shadow-2xl">
        {selectedSite ? (
          /* Focused Node Inspector Mode */
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span
                  className={
                    selectedSite.scope === 'internal'
                      ? 'font-semibold text-sky-400'
                      : 'font-semibold text-amber-400'
                  }
                >
                  {selectedSite.scope === 'internal' ? 'Internal' : 'Eksternal'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{selectedSite.category}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate font-mono text-slate-300">
                  {extractDomain(selectedSite.url)}
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2.5">
                <h2 className="truncate text-base font-semibold text-slate-50">
                  {selectedSite.name}
                </h2>
                <p className="hidden truncate text-xs text-slate-400 md:block">
                  {selectedSite.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onToggleFavorite(selectedSite.id)}
                aria-label={
                  selectedSite.favorite
                    ? 'Hapus dari favorit'
                    : 'Tambahkan ke favorit'
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-300 transition-colors hover:border-slate-600 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <Star
                  className={`h-4 w-4 ${
                    selectedSite.favorite
                      ? 'fill-amber-400 text-amber-400'
                      : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => handleCopyUrl(selectedSite)}
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/90 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                {copiedId === selectedSite.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin URL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onEditSite(selectedSite)}
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/90 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>

              <a
                href={selectedSite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-sky-500 px-3.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <span>Buka Situs</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={() => {
                  onSelectSite(null);
                  onCameraPreset('overview');
                }}
                aria-label="Kembali ke tampilan ikhtisar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Default Compact Dock Mode */
          <div className="flex flex-col gap-2">
            {/* Row 1: Search, Scope Filter, Camera Presets, Full Directory Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Cari situs atau domain (/)..."
                  aria-label="Cari situs internal atau eksternal"
                  className="h-8 w-full rounded-lg border border-slate-700/80 bg-slate-900/90 pr-7 pl-8 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Hapus pencarian"
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Scope Segmented Control */}
              <div
                role="group"
                aria-label="Filter tipe website"
                className="flex items-center gap-0.5 rounded-lg border border-slate-800 bg-slate-900/90 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => onScopeChange('all')}
                  className={scopeTabClass(scopeFilter === 'all')}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => onScopeChange('internal')}
                  className={scopeTabClass(scopeFilter === 'internal')}
                >
                  Internal
                </button>
                <button
                  type="button"
                  onClick={() => onScopeChange('external')}
                  className={scopeTabClass(scopeFilter === 'external')}
                >
                  Eksternal
                </button>
                <button
                  type="button"
                  onClick={() => onScopeChange('favorites')}
                  className={scopeTabClass(scopeFilter === 'favorites')}
                >
                  Favorit
                </button>
              </div>

              {/* Camera Presets & Catalog Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onCameraPreset('overview')}
                  title="Reset kamera ikhtisar"
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900/90 px-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ikhtisar</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenDirectory}
                  className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-800 px-3 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <List className="h-3.5 w-3.5" />
                  <span>Daftar ({filteredSites.length})</span>
                </button>
              </div>
            </div>

            {/* Row 2: Quick-Jump Horizontal Strip */}
            <div className="thin-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {filteredSites.length === 0 ? (
                <span className="py-1 text-xs text-slate-400">
                  Tidak ada situs yang cocok dengan filter saat ini.
                </span>
              ) : (
                filteredSites.map((site) => (
                  <div
                    key={site.id}
                    className="flex items-center shrink-0 rounded-md border border-slate-700/80 bg-slate-900/90 transition-colors hover:border-slate-500"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSite(site.id)}
                      className="flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white focus-visible:outline-none"
                    >
                      <span
                        className={`text-[10px] font-semibold ${
                          site.scope === 'internal'
                            ? 'text-sky-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {site.scope === 'internal' ? 'INT' : 'EXT'}
                      </span>
                      <span className="max-w-[140px] truncate">{site.name}</span>
                    </button>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buka ${site.name} di tab baru`}
                      className="border-l border-slate-800 px-1.5 py-1 text-slate-400 transition-colors hover:text-sky-400"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
