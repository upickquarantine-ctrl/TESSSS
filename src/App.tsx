import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomControlDock } from './components/BottomControlDock';
import { DirectoryModal } from './components/DirectoryModal';
import { SiteFormModal } from './components/SiteFormModal';
import { ThreeViewport } from './components/ThreeViewport';
import { TopBar } from './components/TopBar';
import { DEFAULT_SITES } from './data/defaultSites';
import {
  CameraPreset,
  ScopeFilter,
  SiteEntry,
} from './types/directory';

const STORAGE_KEY = 'portal_direktori_sites_v1';

function loadInitialSites(): SiteEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_SITES;
  } catch {
    return DEFAULT_SITES;
  }
}

export default function App() {
  const [sites, setSites] = useState<SiteEntry[]>(loadInitialSites);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteEntry | null | 'new'>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [cameraPresetRequest, setCameraPresetRequest] = useState<{
    preset: CameraPreset;
    seq: number;
  } | null>(null);
  const [focusSiteRequest, setFocusSiteRequest] = useState<{
    siteId: string;
    seq: number;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
    } catch {
      // Storage quota fallback ignored
    }
  }, [sites]);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  const filteredSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sites.filter((site) => {
      if (scopeFilter === 'internal' && site.scope !== 'internal') return false;
      if (scopeFilter === 'external' && site.scope !== 'external') return false;
      if (scopeFilter === 'favorites' && !site.favorite) return false;
      if (!q) return true;
      return (
        site.name.toLowerCase().includes(q) ||
        site.url.toLowerCase().includes(q) ||
        site.category.toLowerCase().includes(q) ||
        site.owner.toLowerCase().includes(q)
      );
    });
  }, [sites, scopeFilter, searchQuery]);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) ?? null,
    [sites, selectedSiteId]
  );

  const triggerCameraPreset = useCallback((preset: CameraPreset) => {
    setCameraPresetRequest((prev) => ({
      preset,
      seq: (prev?.seq ?? 0) + 1,
    }));
  }, []);

  const handleSelectSite = useCallback(
    (siteId: string | null) => {
      setSelectedSiteId(siteId);
      if (siteId) {
        setDockCollapsed(false);
        setFocusSiteRequest((prev) => ({
          siteId,
          seq: (prev?.seq ?? 0) + 1,
        }));
      }
    },
    []
  );

  const handleSelectMapScope = useCallback(
    (scope: ScopeFilter) => {
      setDirectoryOpen(false);
      setScopeFilter(scope);
      setSelectedSiteId(null);
      if (scope === 'internal') triggerCameraPreset('internal');
      else if (scope === 'external') triggerCameraPreset('external');
      else triggerCameraPreset('overview');
    },
    [triggerCameraPreset]
  );

  const handleToggleFavorite = useCallback((siteId: string) => {
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? { ...s, favorite: !s.favorite } : s))
    );
  }, []);

  const handleSaveSite = useCallback(
    (data: Omit<SiteEntry, 'id' | 'createdAt'>, existingId?: string) => {
      if (existingId) {
        setSites((prev) =>
          prev.map((s) => (s.id === existingId ? { ...s, ...data } : s))
        );
        notify(`"${data.name}" berhasil diperbarui.`);
      } else {
        const newEntry: SiteEntry = {
          ...data,
          id: `${data.scope === 'internal' ? 'int' : 'ext'}-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setSites((prev) => [newEntry, ...prev]);
        setSelectedSiteId(newEntry.id);
        setDirectoryOpen(false);
        setFocusSiteRequest((prev) => ({
          siteId: newEntry.id,
          seq: (prev?.seq ?? 0) + 1,
        }));
        notify(`"${newEntry.name}" ditambahkan ke direktori.`);
      }
      setEditingSite(null);
    },
    [notify]
  );

  const handleDeleteSite = useCallback(
    (siteId: string) => {
      setSites((prev) => {
        const target = prev.find((s) => s.id === siteId);
        if (target) notify(`"${target.name}" dihapus dari direktori.`);
        return prev.filter((s) => s.id !== siteId);
      });
      if (selectedSiteId === siteId) {
        setSelectedSiteId(null);
        triggerCameraPreset('overview');
      }
    },
    [notify, selectedSiteId, triggerCameraPreset]
  );

  const handleImportSites = useCallback((imported: SiteEntry[]) => {
    setSites((prev) => {
      const map = new Map(prev.map((s) => [s.url.toLowerCase(), s]));
      for (const item of imported) {
        map.set(item.url.toLowerCase(), item);
      }
      return Array.from(map.values());
    });
  }, []);

  // Global keyboard shortcuts (H to collapse/expand dock, / to search, Escape to close)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (e.key === 'Escape') {
        if (editingSite !== null) {
          setEditingSite(null);
        } else if (directoryOpen) {
          setDirectoryOpen(false);
        } else if (selectedSiteId) {
          setSelectedSiteId(null);
          triggerCameraPreset('overview');
        }
        return;
      }

      if (isTyping) return;

      if (e.key === 'h' || e.key === 'H') {
        if (!directoryOpen && editingSite === null) {
          setDockCollapsed((c) => !c);
        }
      } else if (e.key === '/') {
        e.preventDefault();
        if (!directoryOpen && editingSite === null) {
          setDockCollapsed(false);
          setSelectedSiteId(null);
          window.setTimeout(() => searchInputRef.current?.focus(), 40);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [directoryOpen, editingSite, selectedSiteId, triggerCameraPreset]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#090F1B]">
      {/* Full-Bleed Three.js 3D Spatial Directory Viewport */}
      <ThreeViewport
        sites={filteredSites}
        scopeFilter={scopeFilter}
        selectedSiteId={selectedSiteId}
        cameraPresetRequest={cameraPresetRequest}
        focusSiteRequest={focusSiteRequest}
        onSelectSite={handleSelectSite}
      />

      {/* Strict 3-Zone Top Bar */}
      <TopBar
        activeView={directoryOpen ? 'directory' : 'map'}
        scopeFilter={scopeFilter}
        onSelectMapScope={handleSelectMapScope}
        onOpenDirectory={() => setDirectoryOpen(true)}
        onOpenAddModal={() => setEditingSite('new')}
      />

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-slate-700 bg-[#0F172A]/95 px-4 py-2 text-xs font-medium text-slate-100 shadow-lg"
        >
          {toastMessage}
        </div>
      )}

      {/* Compact Collapsible Bottom Control Dock (hidden when Directory Modal is open) */}
      {!directoryOpen && (
        <BottomControlDock
          collapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed((c) => !c)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchInputRef}
          scopeFilter={scopeFilter}
          onScopeChange={(scope) => {
            setScopeFilter(scope);
            setSelectedSiteId(null);
            if (scope === 'internal') triggerCameraPreset('internal');
            else if (scope === 'external') triggerCameraPreset('external');
            else triggerCameraPreset('overview');
          }}
          filteredSites={filteredSites}
          selectedSite={selectedSite}
          onSelectSite={handleSelectSite}
          onCameraPreset={triggerCameraPreset}
          onOpenDirectory={() => setDirectoryOpen(true)}
          onToggleFavorite={handleToggleFavorite}
          onEditSite={(site) => setEditingSite(site)}
        />
      )}

      {/* Full Directory Catalog Overlay */}
      {directoryOpen && (
        <DirectoryModal
          sites={sites}
          scopeFilter={scopeFilter}
          searchQuery={searchQuery}
          onScopeChange={setScopeFilter}
          onSearchChange={setSearchQuery}
          onClose={() => setDirectoryOpen(false)}
          onFocusIn3D={(siteId) => {
            setDirectoryOpen(false);
            handleSelectSite(siteId);
          }}
          onToggleFavorite={handleToggleFavorite}
          onOpenAdd={() => setEditingSite('new')}
          onOpenEdit={(site) => setEditingSite(site)}
          onDeleteSite={handleDeleteSite}
          onImportSites={handleImportSites}
          onNotify={notify}
        />
      )}

      {/* Add / Edit Website Modal */}
      {editingSite !== null && (
        <SiteFormModal
          initialSite={editingSite === 'new' ? null : editingSite}
          onClose={() => setEditingSite(null)}
          onSave={handleSaveSite}
        />
      )}
    </main>
  );
}
