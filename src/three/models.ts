import * as THREE from 'three';
import { SiteEntry } from '../types/directory';
import { createNodeScreenTexture } from './textures';

export interface SharedNodeGeometries {
  internalPlinth: THREE.CylinderGeometry;
  internalRiser: THREE.CylinderGeometry;
  internalChassis: THREE.ExtrudeGeometry;
  internalScreen: THREE.PlaneGeometry;
  internalBezel: THREE.BoxGeometry;
  externalPad: THREE.CylinderGeometry;
  externalStrut: THREE.BoxGeometry;
  externalPrism: THREE.OctahedronGeometry;
  externalChassis: THREE.ExtrudeGeometry;
  externalScreen: THREE.PlaneGeometry;
  externalCrownRing: THREE.TorusGeometry;
  shadowPlane: THREE.PlaneGeometry;
  hitProxy: THREE.BoxGeometry;
}

export interface SharedMaterials {
  darkSlateMatte: THREE.MeshStandardMaterial;
  brushedTitanium: THREE.MeshStandardMaterial;
  anodizedAluminum: THREE.MeshStandardMaterial;
  copperAccent: THREE.MeshStandardMaterial;
  cyanAccent: THREE.MeshStandardMaterial;
  hubGlass: THREE.MeshPhysicalMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  hitProxyMat: THREE.MeshBasicMaterial;
  internalLinkMat: THREE.MeshStandardMaterial;
  externalLinkMat: THREE.MeshStandardMaterial;
  selectedLinkMat: THREE.MeshStandardMaterial;
}

export function createSharedMaterials(
  roughnessMap: THREE.Texture,
  contactShadowTex: THREE.Texture,
  isSoftwareGl: boolean
): SharedMaterials {
  return {
    darkSlateMatte: new THREE.MeshStandardMaterial({
      color: 0x162033,
      roughness: 0.78,
      metalness: 0.12,
    }),
    brushedTitanium: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.28,
      roughnessMap,
      metalness: 0.88,
    }),
    anodizedAluminum: new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.42,
      metalness: 0.72,
    }),
    copperAccent: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.24,
      metalness: 0.86,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
    }),
    cyanAccent: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.22,
      metalness: 0.84,
      emissive: 0x075985,
      emissiveIntensity: 0.35,
    }),
    hubGlass: new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      roughness: 0.08,
      metalness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.82,
      transparent: true,
      opacity: isSoftwareGl ? 0.42 : 1,
      ior: 1.52,
      thickness: 1.2,
      clearcoat: 1.0,
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
    hitProxyMat: new THREE.MeshBasicMaterial({
      visible: false,
    }),
    internalLinkMat: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    }),
    externalLinkMat: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
    }),
    selectedLinkMat: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
    }),
  };
}

function createBeveledPanelGeometry(
  width: number,
  height: number,
  depth: number
): THREE.ExtrudeGeometry {
  const hw = width / 2;
  const hh = height / 2;
  const r = 0.08;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

export function createSharedNodeGeometries(): SharedNodeGeometries {
  return {
    internalPlinth: new THREE.CylinderGeometry(0.95, 1.08, 0.22, 24),
    internalRiser: new THREE.CylinderGeometry(0.18, 0.26, 1.35, 16),
    internalChassis: createBeveledPanelGeometry(1.92, 1.24, 0.12),
    internalScreen: new THREE.PlaneGeometry(1.78, 1.12),
    internalBezel: new THREE.BoxGeometry(1.98, 0.06, 0.18),
    externalPad: new THREE.CylinderGeometry(1.02, 1.16, 0.24, 6),
    externalStrut: new THREE.BoxGeometry(0.14, 1.65, 0.16),
    externalPrism: new THREE.OctahedronGeometry(0.32, 0),
    externalChassis: createBeveledPanelGeometry(2.02, 1.28, 0.12),
    externalScreen: new THREE.PlaneGeometry(1.86, 1.16),
    externalCrownRing: new THREE.TorusGeometry(0.46, 0.045, 12, 32),
    shadowPlane: new THREE.PlaneGeometry(2.8, 2.8),
    hitProxy: new THREE.BoxGeometry(2.3, 2.8, 1.6),
  };
}

/**
 * 8-part composite Central Gateway Hub grounded at y = 0.
 */
export function createCentralHubGroup(materials: SharedMaterials): {
  group: THREE.Group;
  haloRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  disposables: THREE.BufferGeometry[];
} {
  const group = new THREE.Group();
  const disposables: THREE.BufferGeometry[] = [];

  // 1. Contact shadow at ground level
  const shadowGeo = new THREE.PlaneGeometry(6.8, 6.8);
  disposables.push(shadowGeo);
  const shadow = new THREE.Mesh(shadowGeo, materials.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  group.add(shadow);

  // 2. Stepped Octagonal Base Plinth (bottom-center flush with y=0)
  const baseGeo = new THREE.CylinderGeometry(2.05, 2.35, 0.36, 8);
  disposables.push(baseGeo);
  const base = new THREE.Mesh(baseGeo, materials.darkSlateMatte);
  base.position.y = 0.18;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 3. LatheGeometry Precision Collar
  const lathePts = [
    new THREE.Vector2(1.45, 0.0),
    new THREE.Vector2(1.62, 0.18),
    new THREE.Vector2(1.38, 0.42),
    new THREE.Vector2(0.86, 0.56),
    new THREE.Vector2(0.86, 0.72),
  ];
  const collarGeo = new THREE.LatheGeometry(lathePts, 24);
  disposables.push(collarGeo);
  const collar = new THREE.Mesh(collarGeo, materials.brushedTitanium);
  collar.position.y = 0.36;
  collar.castShadow = true;
  collar.receiveShadow = true;
  group.add(collar);

  // 4. Translucent Optical Core Column
  const coreGeo = new THREE.CylinderGeometry(0.68, 0.78, 3.1, 24);
  disposables.push(coreGeo);
  const core = new THREE.Mesh(coreGeo, materials.hubGlass);
  core.position.y = 2.45;
  core.renderOrder = 2;
  group.add(core);

  // 5. Inner Glowing Conduit Rod
  const rodGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.95, 16);
  disposables.push(rodGeo);
  const rod = new THREE.Mesh(rodGeo, materials.cyanAccent);
  rod.position.y = 2.45;
  group.add(rod);

  // 6. Four Radial Extruded Structural Fins (ExtrudeGeometry with bevels)
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.62, 0);
  finShape.lineTo(0.32, 3.05);
  finShape.lineTo(0, 3.25);
  finShape.closePath();

  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  finGeo.translate(0.75, 0.85, -0.07);
  disposables.push(finGeo);

  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, materials.anodizedAluminum);
    fin.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;
    fin.castShadow = true;
    fin.receiveShadow = true;
    group.add(fin);
  }

  // 7. Upper Crown Cap
  const capGeo = new THREE.CylinderGeometry(0.55, 0.92, 0.38, 8);
  disposables.push(capGeo);
  const cap = new THREE.Mesh(capGeo, materials.brushedTitanium);
  cap.position.y = 4.18;
  cap.castShadow = true;
  group.add(cap);

  // 8. Dual Rotating Orbital Data Rings
  const haloGeo = new THREE.TorusGeometry(1.65, 0.055, 14, 48);
  disposables.push(haloGeo);
  const haloRing = new THREE.Mesh(haloGeo, materials.copperAccent);
  haloRing.position.y = 2.65;
  haloRing.rotation.x = Math.PI / 2.4;
  group.add(haloRing);

  const innerRingGeo = new THREE.TorusGeometry(1.32, 0.045, 14, 48);
  disposables.push(innerRingGeo);
  const innerRing = new THREE.Mesh(innerRingGeo, materials.cyanAccent);
  innerRing.position.y = 2.65;
  innerRing.rotation.x = -Math.PI / 3;
  group.add(innerRing);

  return { group, haloRing, innerRing, disposables };
}

/**
 * 6-part composite Internal Terminal Kiosk Node pivoted at bottom-center (y = 0).
 */
export function createInternalTerminalNode(
  site: SiteEntry,
  geos: SharedNodeGeometries,
  materials: SharedMaterials,
  maxAnisotropy: number,
  isSelected: boolean
): {
  group: THREE.Group;
  screenTex: THREE.CanvasTexture;
  screenMat: THREE.MeshStandardMaterial;
  hitMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.userData.siteId = site.id;

  // 1. Contact shadow
  const shadow = new THREE.Mesh(geos.shadowPlane, materials.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // 2. Grounded matte slate plinth
  const plinth = new THREE.Mesh(geos.internalPlinth, materials.darkSlateMatte);
  plinth.position.y = 0.11;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 3. Brushed titanium riser column
  const riser = new THREE.Mesh(geos.internalRiser, materials.brushedTitanium);
  riser.position.set(0, 0.88, -0.15);
  riser.castShadow = true;
  group.add(riser);

  // 4. Angled beveled display chassis
  const displayPivot = new THREE.Group();
  displayPivot.position.set(0, 1.72, 0.02);
  displayPivot.rotation.x = -0.22;

  const chassis = new THREE.Mesh(geos.internalChassis, materials.anodizedAluminum);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  displayPivot.add(chassis);

  // 5. Metallic top & bottom trim bars (accent detail)
  const topBar = new THREE.Mesh(geos.internalBezel, materials.cyanAccent);
  topBar.position.set(0, 0.65, 0.02);
  displayPivot.add(topBar);

  // 6. Crisp CanvasTexture screen face
  const screenTex = createNodeScreenTexture(site, maxAnisotropy, isSelected);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissiveMap: screenTex,
    emissive: 0xffffff,
    emissiveIntensity: isSelected ? 0.62 : 0.36,
    roughness: 0.22,
    metalness: 0.05,
  });
  const screen = new THREE.Mesh(geos.internalScreen, screenMat);
  screen.position.set(0, 0, 0.098);
  displayPivot.add(screen);

  group.add(displayPivot);

  // Simplified collision proxy on layer 1 for fast raycasting
  const hitMesh = new THREE.Mesh(geos.hitProxy, materials.hitProxyMat);
  hitMesh.position.y = 1.4;
  hitMesh.layers.set(1);
  hitMesh.userData.siteId = site.id;
  group.add(hitMesh);

  return { group, screenTex, screenMat, hitMesh };
}

/**
 * 6-part composite External Gateway Pylon Node pivoted at bottom-center (y = 0).
 */
export function createExternalGatewayNode(
  site: SiteEntry,
  geos: SharedNodeGeometries,
  materials: SharedMaterials,
  maxAnisotropy: number,
  isSelected: boolean
): {
  group: THREE.Group;
  screenTex: THREE.CanvasTexture;
  screenMat: THREE.MeshStandardMaterial;
  hitMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.userData.siteId = site.id;

  // 1. Contact shadow
  const shadow = new THREE.Mesh(geos.shadowPlane, materials.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  // 2. Hexagonal anchor pad
  const pad = new THREE.Mesh(geos.externalPad, materials.darkSlateMatte);
  pad.position.y = 0.12;
  pad.castShadow = true;
  pad.receiveShadow = true;
  group.add(pad);

  // 3. Dual angled support struts
  const strutL = new THREE.Mesh(geos.externalStrut, materials.brushedTitanium);
  strutL.position.set(-0.56, 0.96, -0.18);
  strutL.rotation.z = -0.14;
  strutL.castShadow = true;
  group.add(strutL);

  const strutR = new THREE.Mesh(geos.externalStrut, materials.brushedTitanium);
  strutR.position.set(0.56, 0.96, -0.18);
  strutR.rotation.z = 0.14;
  strutR.castShadow = true;
  group.add(strutR);

  // 4. Upper transceiver prism & copper crown ring
  const prism = new THREE.Mesh(geos.externalPrism, materials.copperAccent);
  prism.position.set(0, 2.75, -0.12);
  group.add(prism);

  const crown = new THREE.Mesh(geos.externalCrownRing, materials.anodizedAluminum);
  crown.position.set(0, 2.75, -0.12);
  crown.rotation.x = Math.PI / 3;
  group.add(crown);

  // 5. Beveled placard housing
  const displayPivot = new THREE.Group();
  displayPivot.position.set(0, 1.66, 0.08);
  displayPivot.rotation.x = -0.18;

  const chassis = new THREE.Mesh(geos.externalChassis, materials.anodizedAluminum);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  displayPivot.add(chassis);

  // 6. Screen face
  const screenTex = createNodeScreenTexture(site, maxAnisotropy, isSelected);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissiveMap: screenTex,
    emissive: 0xffffff,
    emissiveIntensity: isSelected ? 0.62 : 0.36,
    roughness: 0.24,
    metalness: 0.06,
  });
  const screen = new THREE.Mesh(geos.externalScreen, screenMat);
  screen.position.set(0, 0, 0.098);
  displayPivot.add(screen);

  group.add(displayPivot);

  // Simplified collision proxy on layer 1
  const hitMesh = new THREE.Mesh(geos.hitProxy, materials.hitProxyMat);
  hitMesh.position.y = 1.5;
  hitMesh.layers.set(1);
  hitMesh.userData.siteId = site.id;
  group.add(hitMesh);

  return { group, screenTex, screenMat, hitMesh };
}

/**
 * Procedural TubeGeometry data-link arc connecting hub to node.
 */
export function createDataLinkTube(
  start: THREE.Vector3,
  end: THREE.Vector3,
  material: THREE.MeshStandardMaterial
): THREE.Mesh {
  const mid = start.clone().lerp(end, 0.5);
  mid.y = Math.max(start.y, end.y) + 0.55;
  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const geo = new THREE.TubeGeometry(curve, 24, 0.032, 8, false);
  return new THREE.Mesh(geo, material);
}

/**
 * InstancedMesh of >32 perimeter architectural bollards.
 */
export function createPerimeterBollardsInstanced(
  count: number,
  radius: number,
  material: THREE.MeshStandardMaterial
): { instancedMesh: THREE.InstancedMesh; geometry: THREE.CylinderGeometry } {
  const geometry = new THREE.CylinderGeometry(0.08, 0.13, 0.55, 8);
  geometry.translate(0, 0.275, 0);

  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.castShadow = false;
  instancedMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const baseColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = radius + (i % 2 === 0 ? 0 : 0.35);
    dummy.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    dummy.rotation.y = -angle;
    const s = 0.88 + (i % 3) * 0.12;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);

    baseColor.setHex(i % 4 === 0 ? 0x64748b : 0x334155);
    instancedMesh.setColorAt(i, baseColor);
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  instancedMesh.computeBoundingSphere();

  return { instancedMesh, geometry };
}
