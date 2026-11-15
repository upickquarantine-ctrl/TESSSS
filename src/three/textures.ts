import * as THREE from 'three';
import { SiteEntry, extractDomain } from '../types/directory';

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 2 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

export function createFloorGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // Deep architectural slate ground
  const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, size * 0.52);
  bg.addColorStop(0, '#131d31');
  bg.addColorStop(0.55, '#0e1626');
  bg.addColorStop(1, '#090f1b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Fine architectural Cartesian grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 1;
  const step = size / 32;
  for (let i = 0; i <= 32; i++) {
    const pos = i * step;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Concentric Zone Rings matching Internal (r~6.5) & External (r~11.5) over 40x40 plane
  // Plane is 40x40 units -> 1 unit = 1024 / 40 = 25.6 px
  const pxPerUnit = size / 40;

  // Inner Ring (Internal Zone)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 6.5 * pxPerUnit, 0, Math.PI * 2);
  ctx.stroke();

  // Outer Ring (External Zone)
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.32)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 11.5 * pxPerUnit, 0, Math.PI * 2);
  ctx.stroke();

  // Perimeter Boundary Ring
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.arc(cx, cy, 16.5 * pxPerUnit, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Radial degree ticks around outer ring
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1.5;
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const r1 = 15.9 * pxPerUnit;
    const r2 = (deg % 45 === 0 ? 17.0 : 16.4) * pxPerUnit;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
    ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    4,
    size / 2,
    size / 2,
    size / 2
  );
  grad.addColorStop(0, 'rgba(3, 7, 18, 0.85)');
  grad.addColorStop(0.55, 'rgba(3, 7, 18, 0.35)');
  grad.addColorStop(1, 'rgba(3, 7, 18, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createBrushedMetalRoughnessTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const v = 108 + Math.floor(Math.random() * 44);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, size, 1);
  }

  // Linear space for data map (no SRGBColorSpace)
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

export function createNodeScreenTexture(
  site: SiteEntry,
  maxAnisotropy: number,
  isSelected: boolean
): THREE.CanvasTexture {
  const w = 512;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const isInternal = site.scope === 'internal';
  const accentHex = isInternal ? '#38BDF8' : '#F59E0B';
  const accentSoft = isInternal ? 'rgba(56, 189, 248, 0.16)' : 'rgba(245, 158, 11, 0.16)';

  // Screen surface
  ctx.fillStyle = isSelected ? '#0f1c33' : '#0b1426';
  ctx.fillRect(0, 0, w, h);

  // Subtle top accent bar
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, w, 10);

  // Subtle soft glow area at top
  ctx.fillStyle = accentSoft;
  ctx.fillRect(0, 10, w, 64);

  // Scope & Category header text (unboxed clean editorial typography)
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = accentHex;
  const scopeLabel = isInternal ? 'INTERNAL' : 'EKSTERNAL';
  ctx.fillText(`${scopeLabel}  ·  ${site.category.toUpperCase()}`, 28, 50);

  // Favorite star marker if favorited
  if (site.favorite) {
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillStyle = '#FBBF24';
    ctx.fillText('★', w - 54, 52);
  }

  // Primary Site Name
  ctx.font = '700 40px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#F8FAFC';
  const fittedName = fitText(ctx, site.name, w - 56);
  ctx.fillText(fittedName, 28, 134);

  // Domain in monospace
  const domain = extractDomain(site.url);
  ctx.font = '500 24px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94A3B8';
  const fittedDomain = fitText(ctx, domain, w - 56);
  ctx.fillText(fittedDomain, 28, 184);

  // Hairline divider
  ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.fillRect(28, 214, w - 56, 2);

  // Owner / Divisi footer
  ctx.font = '500 20px "DM Sans", system-ui, sans-serif';
  ctx.fillStyle = '#CBD5E1';
  const fittedOwner = fitText(ctx, site.owner || 'Direktori Resmi', w - 56);
  ctx.fillText(fittedOwner, 28, 258);

  // Inner selection frame highlight
  if (isSelected) {
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}
