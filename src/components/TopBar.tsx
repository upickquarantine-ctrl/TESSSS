import { Plus } from 'lucide-react';
import { ScopeFilter } from '../types/directory';

interface TopBarProps {
  activeView: 'map' | 'directory';
  scopeFilter: ScopeFilter;
  onSelectMapScope: (scope: ScopeFilter) => void;
  onOpenDirectory: () => void;
  onOpenAddModal: () => void;
}

export function TopBar({
  activeView,
  scopeFilter,
  onSelectMapScope,
  onOpenDirectory,
  onOpenAddModal,
}: TopBarProps) {
  const navBtnClass = (active: boolean) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors duration-150 py-1 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xs ${
      active
        ? 'border-sky-400 text-slate-50'
        : 'border-transparent text-slate-400 hover:text-slate-100'
    }`;

  return (
    <header className="fixed top-0 right-0 left-0 z-30 flex h-14 items-center justify-between gap-8 border-b border-slate-800/90 bg-[#0B111E]/95 px-6">
      {/* Zone 1: Single-line Brand Wordmark */}
      <button
        type="button"
        onClick={() => onSelectMapScope('all')}
        className="whitespace-nowrap shrink-0 text-left font-display text-lg font-bold tracking-tight text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xs"
      >
        Portal Direktori
      </button>

      {/* Zone 2: 4 Concise Single-Line Navigation Links */}
      <nav
        aria-label="Navigasi utama"
        className="hidden md:flex items-center gap-6"
      >
        <button
          type="button"
          onClick={() => onSelectMapScope('all')}
          className={navBtnClass(activeView === 'map' && scopeFilter === 'all')}
        >
          Peta 3D
        </button>
        <button
          type="button"
          onClick={onOpenDirectory}
          className={navBtnClass(activeView === 'directory')}
        >
          Direktori
        </button>
        <button
          type="button"
          onClick={() => onSelectMapScope('internal')}
          className={navBtnClass(
            activeView === 'map' && scopeFilter === 'internal'
          )}
        >
          Internal
        </button>
        <button
          type="button"
          onClick={() => onSelectMapScope('external')}
          className={navBtnClass(
            activeView === 'map' && scopeFilter === 'external'
          )}
        >
          Eksternal
        </button>
      </nav>

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors duration-150 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Tambah Situs</span>
        </button>
      </div>
    </header>
  );
}
