import { useEffect, useRef, useState } from 'react';
import { CameraPreset, ScopeFilter, SiteEntry } from '../types/directory';
import { PortalSceneController } from '../three/PortalSceneController';

interface ThreeViewportProps {
  sites: SiteEntry[];
  scopeFilter: ScopeFilter;
  selectedSiteId: string | null;
  cameraPresetRequest: { preset: CameraPreset; seq: number } | null;
  focusSiteRequest: { siteId: string; seq: number } | null;
  onSelectSite: (siteId: string | null) => void;
}

export function ThreeViewport({
  sites,
  scopeFilter,
  selectedSiteId,
  cameraPresetRequest,
  focusSiteRequest,
  onSelectSite,
}: ThreeViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PortalSceneController | null>(null);
  const onSelectSiteRef = useRef(onSelectSite);
  onSelectSiteRef.current = onSelectSite;

  const [hoveredInfo, setHoveredInfo] = useState<{
    site: SiteEntry;
    x: number;
    y: number;
  } | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Mount Three.js controller once inside dedicated stable ref container
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = new PortalSceneController(container, {
      onSelectSite: (id) => onSelectSiteRef.current(id),
      onHoverSite: (site, pos) => {
        if (site && pos) {
          setHoveredInfo({ site, x: pos.x, y: pos.y });
        } else {
          setHoveredInfo(null);
        }
      },
      onContextLost: (lost) => setContextLost(lost),
    });

    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Sync directory entries and active selection into 3D nodes without recreating WebGL context
  useEffect(() => {
    controllerRef.current?.syncSites(sites, scopeFilter, selectedSiteId);
  }, [sites, scopeFilter, selectedSiteId]);

  // Handle camera preset transitions
  useEffect(() => {
    if (!cameraPresetRequest) return;
    controllerRef.current?.focusPreset(cameraPresetRequest.preset);
  }, [cameraPresetRequest]);

  // Handle camera focus to specific site node
  useEffect(() => {
    if (!focusSiteRequest) return;
    controllerRef.current?.focusSite(focusSiteRequest.siteId);
  }, [focusSiteRequest]);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#090F1B]">
      {/* Dedicated WebGL Mount Container outside React HUD overlays */}
      <div
        ref={mountRef}
        className="h-full w-full"
        aria-label="Visualisasi Peta Jaringan Website Internal dan Eksternal 3D"
      />

      {/* Lightweight Pointer Hover Tooltip (solid dark slate, zero backdrop-filter) */}
      {hoveredInfo && (
        <div
          className="pointer-events-none fixed z-20 max-w-[260px] rounded-lg border border-slate-700/80 bg-[#0F172A]/95 px-3 py-2 shadow-xl"
          style={{
            left: Math.min(hoveredInfo.x + 14, window.innerWidth - 280),
            top: Math.max(hoveredInfo.y - 64, 68),
          }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span
              className={
                hoveredInfo.site.scope === 'internal'
                  ? 'text-sky-400'
                  : 'text-amber-400'
              }
            >
              {hoveredInfo.site.scope === 'internal' ? 'Internal' : 'Eksternal'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{hoveredInfo.site.category}</span>
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-100">
            {hoveredInfo.site.name}
          </div>
          <div className="truncate font-mono text-[11px] text-slate-400">
            Klik untuk fokus &amp; buka
          </div>
        </div>
      )}

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0B111E] p-6 text-center">
          <p className="text-base font-semibold text-slate-100">
            Konteks grafis 3D sedang dijeda oleh peramban
          </p>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            Anda tetap dapat mencari dan membuka seluruh situs melalui menu Daftar Direktori di bagian atas.
          </p>
        </div>
      )}
    </div>
  );
}
