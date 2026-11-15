import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraPreset, ScopeFilter, SiteEntry } from '../types/directory';
import {
  SharedMaterials,
  SharedNodeGeometries,
  createCentralHubGroup,
  createDataLinkTube,
  createExternalGatewayNode,
  createInternalTerminalNode,
  createPerimeterBollardsInstanced,
  createSharedMaterials,
  createSharedNodeGeometries,
} from './models';
import {
  createBrushedMetalRoughnessTexture,
  createContactShadowTexture,
  createFloorGridTexture,
} from './textures';

// Module-scope scratch math objects to prevent per-frame GC
const _camDesiredPos = new THREE.Vector3();
const _ctrlDesiredTarget = new THREE.Vector3();
const _nodeWorldPos = new THREE.Vector3();
const _radialDir = new THREE.Vector3();
const _tmpStart = new THREE.Vector3();
const _tmpEnd = new THREE.Vector3();

interface NodeRecord {
  site: SiteEntry;
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  screenTex: THREE.CanvasTexture;
  screenMat: THREE.MeshStandardMaterial;
  linkMesh: THREE.Mesh;
  basePos: THREE.Vector3;
  baseScale: number;
  targetScale: number;
}

export interface PortalSceneCallbacks {
  onSelectSite: (siteId: string | null) => void;
  onHoverSite: (site: SiteEntry | null, screenPos: { x: number; y: number } | null) => void;
  onContextLost: (lost: boolean) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class PortalSceneController {
  private container: HTMLElement;
  private callbacks: PortalSceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private sharedGeos: SharedNodeGeometries;
  private sharedMats: SharedMaterials;
  private floorTex: THREE.CanvasTexture;
  private contactShadowTex: THREE.CanvasTexture;
  private roughnessTex: THREE.CanvasTexture;
  private envTex: THREE.Texture;

  private hubGroup: THREE.Group;
  private hubHaloRing: THREE.Mesh;
  private hubInnerRing: THREE.Mesh;
  private hubDisposables: THREE.BufferGeometry[] = [];
  private floorGeo: THREE.PlaneGeometry;
  private floorMat: THREE.MeshStandardMaterial;
  private bollardsMesh: THREE.InstancedMesh;
  private bollardsGeo: THREE.CylinderGeometry;

  private nodesGroup = new THREE.Group();
  private linksGroup = new THREE.Group();
  private nodeRecords = new Map<string, NodeRecord>();
  private hitMeshes: THREE.Mesh[] = [];

  private hoveredSiteId: string | null = null;
  private selectedSiteId: string | null = null;
  private cameraTransitionActive = false;
  private targetCamPos = new THREE.Vector3(0, 12.5, 21.5);
  private targetCtrlPos = new THREE.Vector3(0, 1.4, 0);

  private frameId = 0;
  private isDisposed = false;
  private lastTime = performance.now();
  private lastHoverRaycast = 0;
  private pointerDownPos = { x: 0, y: 0 };
  private reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  constructor(container: HTMLElement, callbacks: PortalSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Renderer setup per Three.js directives
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // Scene + horizon-matched fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090f1b);
    this.scene.fog = new THREE.FogExp2(0x090f1b, 0.016);

    // Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;
    pmremGenerator.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.2, 160);
    this.camera.position.copy(this.targetCamPos);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 34;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.minPolarAngle = 0.15;
    this.controls.target.copy(this.targetCtrlPos);
    this.controls.update();

    this.controls.addEventListener('start', this.handleControlsStart);

    // Warm/Cool 3-Point Studio + Hemisphere Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.65);
    hemiLight.position.set(0, 25, 0);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1db, 1.85);
    keyLight.position.set(12, 20, 14);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 52;
    keyLight.shadow.camera.left = -17;
    keyLight.shadow.camera.right = 17;
    keyLight.shadow.camera.top = 17;
    keyLight.shadow.camera.bottom = -17;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.72);
    rimLight.position.set(-14, 10, -14);
    this.scene.add(rimLight);

    // Procedural Textures & Shared Materials
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.floorTex = createFloorGridTexture(maxAnisotropy);
    this.contactShadowTex = createContactShadowTexture();
    this.roughnessTex = createBrushedMetalRoughnessTexture();
    this.sharedGeos = createSharedNodeGeometries();
    this.sharedMats = createSharedMaterials(
      this.roughnessTex,
      this.contactShadowTex,
      this.isSoftwareGl
    );

    // Architectural Plaza Ground Plane
    this.floorGeo = new THREE.PlaneGeometry(40, 40);
    this.floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTex,
      roughness: 0.72,
      metalness: 0.18,
    });
    const floor = new THREE.Mesh(this.floorGeo, this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Central Gateway Monolith (8-part composite)
    const hub = createCentralHubGroup(this.sharedMats);
    this.hubGroup = hub.group;
    this.hubHaloRing = hub.haloRing;
    this.hubInnerRing = hub.innerRing;
    this.hubDisposables = hub.disposables;
    this.scene.add(this.hubGroup);

    // Instanced Perimeter Bollards (36 instances)
    const bollards = createPerimeterBollardsInstanced(
      36,
      16.5,
      this.sharedMats.anodizedAluminum
    );
    this.bollardsMesh = bollards.instancedMesh;
    this.bollardsGeo = bollards.geometry;
    this.scene.add(this.bollardsMesh);

    this.scene.add(this.linksGroup);
    this.scene.add(this.nodesGroup);

    // Raycaster strictly targets layer 1 hit proxy boxes
    this.raycaster.layers.set(1);

    // Events
    window.addEventListener('resize', this.handleResize);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('pointermove', this.handlePointerMove);
    dom.addEventListener('pointerleave', this.handlePointerLeave);
    dom.addEventListener('webglcontextlost', this.handleWebGLContextLost);
    dom.addEventListener('webglcontextrestored', this.handleWebGLContextRestored);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.startLoop();
  }

  private handleControlsStart = () => {
    this.cameraTransitionActive = false;
  };

  private handleResize = () => {
    if (this.isDisposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updatePointerCoords(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.pointerDownPos.x = event.clientX;
    this.pointerDownPos.y = event.clientY;
  };

  private handlePointerUp = (event: PointerEvent) => {
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    if (Math.hypot(dx, dy) > 6) return;

    this.updatePointerCoords(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);

    if (hits.length > 0) {
      const siteId = hits[0].object.userData.siteId as string | undefined;
      if (siteId) {
        this.callbacks.onSelectSite(siteId);
        return;
      }
    }
    this.callbacks.onSelectSite(null);
  };

  private handlePointerMove = (event: PointerEvent) => {
    const now = performance.now();
    if (now - this.lastHoverRaycast < 45) return;
    this.lastHoverRaycast = now;

    this.updatePointerCoords(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);

    if (hits.length > 0) {
      const siteId = hits[0].object.userData.siteId as string | undefined;
      if (siteId) {
        const rec = this.nodeRecords.get(siteId);
        if (rec) {
          this.setHoveredNode(siteId);
          this.renderer.domElement.style.cursor = 'pointer';
          this.callbacks.onHoverSite(rec.site, {
            x: event.clientX,
            y: event.clientY,
          });
          return;
        }
      }
    }

    if (this.hoveredSiteId !== null) {
      this.setHoveredNode(null);
      this.renderer.domElement.style.cursor = 'grab';
      this.callbacks.onHoverSite(null, null);
    }
  };

  private handlePointerLeave = () => {
    if (this.hoveredSiteId !== null) {
      this.setHoveredNode(null);
      this.renderer.domElement.style.cursor = 'default';
      this.callbacks.onHoverSite(null, null);
    }
  };

  private handleWebGLContextLost = (event: Event) => {
    event.preventDefault();
    this.callbacks.onContextLost(true);
  };

  private handleWebGLContextRestored = () => {
    this.callbacks.onContextLost(false);
  };

  private setHoveredNode(siteId: string | null) {
    this.hoveredSiteId = siteId;
    this.nodeRecords.forEach((rec, id) => {
      const isSelected = id === this.selectedSiteId;
      const isHovered = id === siteId;
      rec.targetScale = isSelected ? 1.1 : isHovered ? 1.06 : 1.0;
    });
  }

  public syncSites(
    sites: SiteEntry[],
    scopeFilter: ScopeFilter,
    selectedId: string | null
  ) {
    this.selectedSiteId = selectedId;

    // Clear previous node groups and dispose per-node screen textures/materials/tubes
    this.nodeRecords.forEach((rec) => {
      rec.screenTex.dispose();
      rec.screenMat.dispose();
      rec.linkMesh.geometry.dispose();
    });
    this.nodeRecords.clear();
    this.hitMeshes = [];
    while (this.nodesGroup.children.length > 0) {
      this.nodesGroup.remove(this.nodesGroup.children[0]);
    }
    while (this.linksGroup.children.length > 0) {
      this.linksGroup.remove(this.linksGroup.children[0]);
    }

    // Filter sites for display in 3D ring layout
    const visibleSites = sites.filter((s) => {
      if (scopeFilter === 'internal') return s.scope === 'internal';
      if (scopeFilter === 'external') return s.scope === 'external';
      if (scopeFilter === 'favorites') return s.favorite;
      return true;
    });

    const internalSites = visibleSites.filter((s) => s.scope === 'internal');
    const externalSites = visibleSites.filter((s) => s.scope === 'external');
    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const placeRing = (
      ringSites: SiteEntry[],
      radius: number,
      phaseOffset: number,
      isInternal: boolean
    ) => {
      const count = ringSites.length;
      if (count === 0) return;

      ringSites.forEach((site, idx) => {
        const angle = (idx / count) * Math.PI * 2 + phaseOffset;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const isSelected = site.id === selectedId;

        const built = isInternal
          ? createInternalTerminalNode(
              site,
              this.sharedGeos,
              this.sharedMats,
              maxAnisotropy,
              isSelected
            )
          : createExternalGatewayNode(
              site,
              this.sharedGeos,
              this.sharedMats,
              maxAnisotropy,
              isSelected
            );

        built.group.position.set(x, 0, z);
        // Face outward slightly away from center hub for effortless viewing from perimeter
        built.group.lookAt(x * 2, 0, z * 2);

        const baseScale = isSelected ? 1.1 : 1.0;
        built.group.scale.setScalar(baseScale);

        this.nodesGroup.add(built.group);
        this.hitMeshes.push(built.hitMesh);

        // Data-link arc tube from Central Hub to this node
        _tmpStart.set(Math.cos(angle) * 1.4, 0.32, Math.sin(angle) * 1.4);
        _tmpEnd.set(
          Math.cos(angle) * (radius - 0.9),
          0.18,
          Math.sin(angle) * (radius - 0.9)
        );
        const linkMat = isSelected
          ? this.sharedMats.selectedLinkMat
          : isInternal
            ? this.sharedMats.internalLinkMat
            : this.sharedMats.externalLinkMat;
        const linkMesh = createDataLinkTube(_tmpStart, _tmpEnd, linkMat);
        this.linksGroup.add(linkMesh);

        this.nodeRecords.set(site.id, {
          site,
          group: built.group,
          hitMesh: built.hitMesh,
          screenTex: built.screenTex,
          screenMat: built.screenMat,
          linkMesh,
          basePos: new THREE.Vector3(x, 0, z),
          baseScale,
          targetScale: baseScale,
        });
      });
    };

    placeRing(internalSites, 6.5, -Math.PI / 2, true);
    placeRing(externalSites, 11.5, -Math.PI / 2 + Math.PI / 8, false);
  }

  public focusPreset(preset: CameraPreset) {
    if (preset === 'overview') {
      this.targetCamPos.set(0, 12.5, 21.5);
      this.targetCtrlPos.set(0, 1.4, 0);
      this.cameraTransitionActive = true;
    } else if (preset === 'internal') {
      this.targetCamPos.set(0, 7.2, 12.2);
      this.targetCtrlPos.set(0, 1.4, 0);
      this.cameraTransitionActive = true;
    } else if (preset === 'external') {
      this.targetCamPos.set(0, 10.5, 22.8);
      this.targetCtrlPos.set(0, 1.5, 0);
      this.cameraTransitionActive = true;
    }
  }

  public focusSite(siteId: string) {
    const rec = this.nodeRecords.get(siteId);
    if (!rec) return;

    _nodeWorldPos.copy(rec.basePos);
    _radialDir.copy(_nodeWorldPos).setY(0);
    if (_radialDir.lengthSq() < 0.001) {
      _radialDir.set(0, 0, 1);
    } else {
      _radialDir.normalize();
    }

    // Frame the node cleanly from slightly outside and above its screen
    this.targetCamPos
      .copy(_nodeWorldPos)
      .addScaledVector(_radialDir, 5.2);
    this.targetCamPos.y = 3.2;

    this.targetCtrlPos.copy(_nodeWorldPos);
    this.targetCtrlPos.y = 1.55;
    this.cameraTransitionActive = true;
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    this.lastTime = performance.now();
    this.tick();
  }

  private tick = () => {
    if (this.isDisposed) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Gentle orbital rotation on Central Hub data rings
    if (!this.reducedMotion) {
      this.hubHaloRing.rotation.z += dt * 0.28;
      this.hubInnerRing.rotation.z -= dt * 0.36;
    }

    // Smooth exponential damping for node hover/selection scale
    this.nodeRecords.forEach((rec) => {
      const nextScale = THREE.MathUtils.damp(
        rec.group.scale.x,
        rec.targetScale,
        10,
        dt
      );
      rec.group.scale.setScalar(nextScale);
    });

    // Smooth exponential damping for camera presets & node focus
    if (this.cameraTransitionActive) {
      const lambda = this.reducedMotion ? 16 : 5.5;
      _camDesiredPos.copy(this.targetCamPos);
      _ctrlDesiredTarget.copy(this.targetCtrlPos);

      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        _camDesiredPos.x,
        lambda,
        dt
      );
      this.camera.position.y = THREE.MathUtils.damp(
        this.camera.position.y,
        _camDesiredPos.y,
        lambda,
        dt
      );
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        _camDesiredPos.z,
        lambda,
        dt
      );

      this.controls.target.x = THREE.MathUtils.damp(
        this.controls.target.x,
        _ctrlDesiredTarget.x,
        lambda,
        dt
      );
      this.controls.target.y = THREE.MathUtils.damp(
        this.controls.target.y,
        _ctrlDesiredTarget.y,
        lambda,
        dt
      );
      this.controls.target.z = THREE.MathUtils.damp(
        this.controls.target.z,
        _ctrlDesiredTarget.z,
        lambda,
        dt
      );

      const distCam = this.camera.position.distanceTo(_camDesiredPos);
      const distCtrl = this.controls.target.distanceTo(_ctrlDesiredTarget);
      if (distCam < 0.04 && distCtrl < 0.04) {
        this.camera.position.copy(_camDesiredPos);
        this.controls.target.copy(_ctrlDesiredTarget);
        this.cameraTransitionActive = false;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    this.controls.removeEventListener('start', this.handleControlsStart);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointerup', this.handlePointerUp);
    dom.removeEventListener('pointermove', this.handlePointerMove);
    dom.removeEventListener('pointerleave', this.handlePointerLeave);
    dom.removeEventListener('webglcontextlost', this.handleWebGLContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleWebGLContextRestored);

    this.nodeRecords.forEach((rec) => {
      rec.screenTex.dispose();
      rec.screenMat.dispose();
      rec.linkMesh.geometry.dispose();
    });
    this.nodeRecords.clear();

    Object.values(this.sharedGeos).forEach((g) => g.dispose());
    Object.values(this.sharedMats).forEach((m) => m.dispose());
    this.hubDisposables.forEach((g) => g.dispose());
    this.floorGeo.dispose();
    this.floorMat.dispose();
    this.bollardsGeo.dispose();

    this.floorTex.dispose();
    this.contactShadowTex.dispose();
    this.roughnessTex.dispose();
    this.envTex.dispose();

    this.controls.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
