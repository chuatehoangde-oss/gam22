import * as THREE from 'three';
import { safeGetPointAt, safeGetTangentAt } from './curveUtils';
import { FiveMCar } from '../data/fivemCarPack';

export type GTAGraphicsPreset = 'ULTRA' | 'HIGH' | 'PERFORMANCE';

export interface GTACarVisuals {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  paintMaterial: THREE.MeshStandardMaterial;
  wheels: THREE.Mesh[];
  rims: THREE.Mesh[];
  calipers: THREE.Mesh[];
  headlights: THREE.Mesh[];
  headlightBeams: THREE.SpotLight[];
  taillights: THREE.Mesh[];
  taillightMaterials: THREE.MeshBasicMaterial[];
  exhaustPipes: THREE.Mesh[];
  exhaustFlames: THREE.Mesh[];
  underglowMesh: THREE.Mesh;
  underglowLight: THREE.PointLight;
  shadowPlane: THREE.Mesh;
}

export class GTAGraphicsEngine {
  private static asphaltTexture: THREE.CanvasTexture | null = null;
  private static asphaltBumpTexture: THREE.CanvasTexture | null = null;
  private static envCubeMap: THREE.Texture | null = null;
  private static windowTexture: THREE.CanvasTexture | null = null;
  private static billboardTextures: THREE.CanvasTexture[] = [];
  private static carbonFiberTexture: THREE.CanvasTexture | null = null;
  private static honeycombTexture: THREE.CanvasTexture | null = null;

  /**
   * Generates a realistic woven carbon fiber texture for supercar aero components
   */
  public static getCarbonFiberTexture(): THREE.CanvasTexture {
    if (this.carbonFiberTexture) return this.carbonFiberTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#141418';
    ctx.fillRect(0, 0, 128, 128);

    const size = 16;
    for (let y = 0; y < 128; y += size) {
      for (let x = 0; x < 128; x += size) {
        const isLight = ((x / size) + (y / size)) % 2 === 0;
        ctx.fillStyle = isLight ? '#282830' : '#0d0d12';
        ctx.fillRect(x, y, size, size);

        // Sub-weave micro lines
        ctx.strokeStyle = isLight ? '#383842' : '#1a1a20';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y + size);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.carbonFiberTexture = texture;
    return texture;
  }

  /**
   * Generates a dark hexagonal honeycomb grille mesh texture for bumper air intakes
   */
  public static getHoneycombTexture(): THREE.CanvasTexture {
    if (this.honeycombTexture) return this.honeycombTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#050608';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;

    const r = 8;
    const h = r * Math.sqrt(3);

    const drawHex = (cx: number, cy: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    for (let y = -h; y < 128 + h * 2; y += h) {
      for (let x = -r * 3; x < 128 + r * 3; x += 3 * r) {
        drawHex(x, y);
        drawHex(x + 1.5 * r, y + h / 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    this.honeycombTexture = texture;
    return texture;
  }

  /**
   * Generates a high-fidelity GTA-style procedural asphalt texture
   * with asphalt grain, lane markings, and tire rubber wear grooves
   */
  public static getAsphaltTexture(): THREE.CanvasTexture {
    if (this.asphaltTexture) return this.asphaltTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Base dark asphalt tone
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. High frequency asphalt aggregate noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 32;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Dark tire rubber wear tracks (two parallel lanes)
    ctx.fillStyle = 'rgba(10, 12, 14, 0.45)';
    ctx.fillRect(180, 0, 150, 1024);
    ctx.fillRect(694, 0, 150, 1024);

    // Subtle oil stains in center
    ctx.fillStyle = 'rgba(5, 6, 8, 0.35)';
    ctx.beginPath();
    ctx.ellipse(512, 300, 80, 200, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(512, 800, 60, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Crisp Road Markings (GTA Highway style - Ultra-sharp, high-contrast)
    // Left shoulder line (Solid White, crisp 28px)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 0, 26, 1024);

    // Right shoulder line (Solid White, crisp 28px)
    ctx.fillRect(958, 0, 26, 1024);

    // Center divider: Vibrant Double Yellow Highway Lines with border definition
    ctx.fillStyle = '#facc15';
    ctx.fillRect(492, 0, 16, 1024);
    ctx.fillRect(516, 0, 16, 1024);

    // Dashed White Lane divider lines (Crisp American Freeway style)
    ctx.fillStyle = '#ffffff';
    const dashLength = 220;
    const dashGap = 160;
    for (let y = 10; y < 1024; y += dashLength + dashGap) {
      ctx.fillRect(260, y, 20, dashLength);
      ctx.fillRect(744, y, 20, dashLength);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Repeat is 1,1 because UVs along track curve already repeat based on physical track distance
    texture.repeat.set(1, 1);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    this.asphaltTexture = texture;
    return texture;
  }

  /**
   * Generates high-res bump map for road grain
   */
  public static getAsphaltBumpTexture(): THREE.CanvasTexture {
    if (this.asphaltBumpTexture) return this.asphaltBumpTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 60;
      const val = Math.min(255, Math.max(0, 128 + grain));
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    this.asphaltBumpTexture = texture;
    return texture;
  }

  /**
   * Generates procedural skyscraper window texture for GTA skyline
   */
  public static getSkyscraperWindowTexture(): THREE.CanvasTexture {
    if (this.windowTexture) return this.windowTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 512);

    // Draw grid of lit and unlit office windows
    const cols = 12;
    const rows = 32;
    const w = 12;
    const h = 8;
    const gapX = 8;
    const gapY = 8;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 12 + c * (w + gapX);
        const y = 12 + r * (h + gapY);

        const isLit = Math.random() > 0.35;
        if (isLit) {
          const warmOrCool = Math.random();
          if (warmOrCool > 0.6) {
            ctx.fillStyle = 'rgba(254, 240, 138, 0.9)'; // Warm office glow
          } else if (warmOrCool > 0.3) {
            ctx.fillStyle = 'rgba(224, 242, 254, 0.85)'; // Cool white light
          } else {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.75)'; // Cyber blue light
          }
        } else {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.9)'; // Dark window
        }
        ctx.fillRect(x, y, w, h);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    this.windowTexture = texture;
    return texture;
  }

  /**
   * Generates authentic GTA-style neon sponsor billboards
   */
  public static getBillboardTextures(): THREE.CanvasTexture[] {
    if (this.billboardTextures.length > 0) return this.billboardTextures;

    const brands = [
      { name: 'PEGASSI GT', sub: 'SUPERCAR SUPREMACY', bg: '#dc2626', text: '#ffffff', accent: '#fef08a' },
      { name: 'LOS SANTOS CUSTOMS', sub: 'MOTORSPORTS DIVISION', bg: '#09090b', text: '#38bdf8', accent: '#f59e0b' },
      { name: 'BRAVADO RACING', sub: 'AMERICAN MUSCLE', bg: '#1e3a8a', text: '#ffffff', accent: '#ef4444' },
      { name: 'PRO LAPS SPEED', sub: 'WINNERS NEVER QUIT', bg: '#047857', text: '#ffffff', accent: '#a7f3d0' },
      { name: 'REDWOOD TOBACCO', sub: 'THE TASTE OF RACING', bg: '#b91c1c', text: '#fef08a', accent: '#ffffff' },
      { name: 'PFISTER TURBO', sub: 'PRECISION GERMAN ENGINEERING', bg: '#18181b', text: '#e2e8f0', accent: '#3b82f6' }
    ];

    brands.forEach(b => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 512, 256);
      grad.addColorStop(0, b.bg);
      grad.addColorStop(1, '#050505');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      // Border neon glow
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, 496, 240);

      // Brand Title
      ctx.fillStyle = b.text;
      ctx.font = 'bold 44px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, 256, 120);

      // Subtitle
      ctx.fillStyle = b.accent;
      ctx.font = 'bold 20px monospace';
      ctx.fillText(b.sub, 256, 175);

      const texture = new THREE.CanvasTexture(canvas);
      this.billboardTextures.push(texture);
    });

    return this.billboardTextures;
  }

  /**
   * Generates an environment reflection map for supercar metallic paint
   */
  public static getEnvironmentReflectionTexture(): THREE.Texture {
    if (this.envCubeMap) return this.envCubeMap;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Sky to sunset horizon gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1e3a8a');   // Deep blue sky
    grad.addColorStop(0.45, '#f97316'); // Golden sunset horizon
    grad.addColorStop(0.5, '#fb923c');  // Sun glow
    grad.addColorStop(0.55, '#334155'); // City skyline silhouette
    grad.addColorStop(1, '#090d16');    // Ground asphalt

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // City skyline highlights in horizon
    ctx.fillStyle = '#fef08a';
    for (let x = 0; x < 512; x += 16) {
      if (Math.random() > 0.4) {
        ctx.fillRect(x, 128, 12, 10);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.envCubeMap = texture;
    return texture;
  }

  /**
   * Creates a highly detailed GTA-style Supercar / GT Racecar 3D model
   * Styled directly after the Pegassi Zentorno / Sesto Elemento Hypercar
   */
  public static createGTASupercar(colorHex: number = 0xfacc15, isPlayer: boolean = false): GTACarVisuals {
    const group = new THREE.Group();

    const envMap = this.getEnvironmentReflectionTexture();
    const carbonTex = this.getCarbonFiberTexture();
    const honeycombTex = this.getHoneycombTexture();

    // 1. High-End Automotive Metallic Paint Material (Clearcoat reflection)
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.85,
      roughness: 0.16,
      envMap: envMap,
      envMapIntensity: 2.2
    });

    // 2. Real Woven Carbon Fiber Material
    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      map: carbonTex,
      metalness: 0.72,
      roughness: 0.32,
      envMap: envMap,
      envMapIntensity: 0.8
    });

    // 3. Dark Hexagonal Honeycomb Bumper Grille Material
    const honeycombMat = new THREE.MeshStandardMaterial({
      color: 0x07080a,
      map: honeycombTex,
      metalness: 0.3,
      roughness: 0.75
    });

    // 4. Sport Racing Red Accent Material (Tow Hook & Brembo Calipers)
    const accentRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.55,
      roughness: 0.28
    });

    // 5. Glossy Tinted Glass Material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050b14,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.65,
      transparent: true,
      opacity: 0.88,
      envMap: envMap,
      envMapIntensity: 2.4
    });

    // 6. Forged Black Alloy Material
    const blackAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      metalness: 0.92,
      roughness: 0.22,
      envMap: envMap,
      envMapIntensity: 1.4
    });

    // 7. Signature White Rim Lip Accent Material (Directly from reference photo!)
    const whiteRimLipMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.15,
      envMap: envMap,
      envMapIntensity: 1.6
    });

    // --- CAR CHASSIS & AERODYNAMICS ---
    // Lower Chassis
    const lowerBodyGeo = new THREE.BoxGeometry(2.14, 0.36, 4.45);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, paintMaterial);
    lowerBody.position.y = 0.42;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    group.add(lowerBody);

    // Aerodynamic Slanted Hood Base
    const hoodGeo = new THREE.BoxGeometry(1.98, 0.20, 1.65);
    const hood = new THREE.Mesh(hoodGeo, paintMaterial);
    hood.position.set(0, 0.58, 1.35);
    hood.rotation.x = 0.08;
    hood.castShadow = true;
    group.add(hood);

    // --- ZENTORNO SIGNATURE CARBON HOOD INLAY WITH DUAL AIR LOUVERS ---
    const hoodInlayGeo = new THREE.BoxGeometry(0.95, 0.03, 1.45);
    const hoodInlay = new THREE.Mesh(hoodInlayGeo, carbonMaterial);
    hoodInlay.position.set(0, 0.60, 1.35);
    hoodInlay.rotation.x = 0.08;
    group.add(hoodInlay);

    // Dual Air Extraction Louvers (Vents) on the carbon hood
    // Upper Vent Cluster (3 angled slats)
    for (let l = 0; l < 3; l++) {
      const louverGeo = new THREE.BoxGeometry(0.68, 0.02, 0.06);
      const upperLouver = new THREE.Mesh(louverGeo, carbonMaterial);
      upperLouver.position.set(0, 0.63 + l * 0.01, 1.66 - l * 0.09);
      upperLouver.rotation.x = -0.25;
      group.add(upperLouver);
    }
    // Lower Vent Cluster (3 angled slats)
    for (let l = 0; l < 3; l++) {
      const louverGeo = new THREE.BoxGeometry(0.58, 0.02, 0.06);
      const lowerLouver = new THREE.Mesh(louverGeo, carbonMaterial);
      lowerLouver.position.set(0, 0.60 + l * 0.01, 1.25 - l * 0.09);
      lowerLouver.rotation.x = -0.25;
      group.add(lowerLouver);
    }

    // --- FRONT NOSE BEAK & BUMPER INTAKES ---
    // Pointed Arrow Nose Beak
    const beakGeo = new THREE.ConeGeometry(0.38, 0.62, 4);
    beakGeo.rotateX(Math.PI / 2);
    beakGeo.rotateZ(Math.PI / 4);
    const beak = new THREE.Mesh(beakGeo, paintMaterial);
    beak.position.set(0, 0.44, 2.36);
    beak.scale.set(1.4, 0.65, 1.0);
    group.add(beak);

    // Carbon Front Splitter with Upturned Winglets
    const splitterGeo = new THREE.BoxGeometry(2.26, 0.06, 0.62);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.22, 2.34);
    group.add(splitter);

    const leftSplitterWinglet = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.35), carbonMaterial);
    leftSplitterWinglet.position.set(-1.14, 0.27, 2.34);
    const rightSplitterWinglet = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.35), carbonMaterial);
    rightSplitterWinglet.position.set(1.14, 0.27, 2.34);
    group.add(leftSplitterWinglet, rightSplitterWinglet);

    // Front Central Red Tow Accent (as seen in photo)
    const redTowAccent = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.12), accentRedMat);
    redTowAccent.position.set(0, 0.24, 2.45);
    group.add(redTowAccent);

    // Gaping Front Honeycomb Air Intakes (Radiator Ducts)
    const leftIntake = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 0.12), honeycombMat);
    leftIntake.position.set(-0.64, 0.38, 2.28);
    leftIntake.rotation.y = 0.12;
    const rightIntake = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 0.12), honeycombMat);
    rightIntake.position.set(0.64, 0.38, 2.28);
    rightIntake.rotation.y = -0.12;
    group.add(leftIntake, rightIntake);

    // --- DOUBLE DIVE PLANES / CANARDS (Signature detail from reference photo!) ---
    // Left Top Canard
    const leftCanardTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.38), carbonMaterial);
    leftCanardTop.position.set(-1.14, 0.52, 2.14);
    leftCanardTop.rotation.set(-0.15, 0.2, 0.2);
    // Left Bottom Canard
    const leftCanardBtm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.42), carbonMaterial);
    leftCanardBtm.position.set(-1.16, 0.38, 2.22);
    leftCanardBtm.rotation.set(-0.15, 0.22, 0.2);

    // Right Top Canard
    const rightCanardTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.38), carbonMaterial);
    rightCanardTop.position.set(1.14, 0.52, 2.14);
    rightCanardTop.rotation.set(-0.15, -0.2, -0.2);
    // Right Bottom Canard
    const rightCanardBtm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.42), carbonMaterial);
    rightCanardBtm.position.set(1.16, 0.38, 2.22);
    rightCanardBtm.rotation.set(-0.15, -0.22, -0.2);

    group.add(leftCanardTop, leftCanardBtm, rightCanardTop, rightCanardBtm);

    // Widebody Flared Front Fenders with Aero Vents
    const fenderGeo = new THREE.BoxGeometry(0.26, 0.42, 1.4);
    const leftFender = new THREE.Mesh(fenderGeo, paintMaterial);
    leftFender.position.set(-1.12, 0.48, 1.3);
    const rightFender = new THREE.Mesh(fenderGeo, paintMaterial);
    rightFender.position.set(1.12, 0.48, 1.3);
    group.add(leftFender, rightFender);

    // Widebody Flared Rear Fenders
    const rearFenderGeo = new THREE.BoxGeometry(0.28, 0.46, 1.55);
    const rearLeftFender = new THREE.Mesh(rearFenderGeo, paintMaterial);
    rearLeftFender.position.set(-1.14, 0.52, -1.3);
    const rearRightFender = new THREE.Mesh(rearFenderGeo, paintMaterial);
    rearRightFender.position.set(1.14, 0.52, -1.3);
    group.add(rearLeftFender, rearRightFender);

    // --- DEEP SCULPTED SIDE POD AIR INTAKES (Mid-Engine V12 Ducts) ---
    const sidePodGeo = new THREE.BoxGeometry(0.22, 0.35, 0.85);
    const leftSidePod = new THREE.Mesh(sidePodGeo, honeycombMat);
    leftSidePod.position.set(-1.08, 0.52, -0.35);
    leftSidePod.rotation.y = -0.15;
    const rightSidePod = new THREE.Mesh(sidePodGeo, honeycombMat);
    rightSidePod.position.set(1.08, 0.52, -0.35);
    rightSidePod.rotation.y = 0.15;
    group.add(leftSidePod, rightSidePod);

    // Sculpted Carbon Side Skirts with Rear Aero Fins
    const skirtGeo = new THREE.BoxGeometry(2.28, 0.08, 2.1);
    const skirts = new THREE.Mesh(skirtGeo, carbonMaterial);
    skirts.position.set(0, 0.25, 0);
    group.add(skirts);

    const leftSkirtFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.35), carbonMaterial);
    leftSkirtFin.position.set(-1.15, 0.32, -0.55);
    const rightSkirtFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.35), carbonMaterial);
    rightSkirtFin.position.set(1.15, 0.32, -0.55);
    group.add(leftSkirtFin, rightSkirtFin);

    // --- AERODYNAMIC CABIN & SPORTS COCKPIT ---
    const cabinGeo = new THREE.BoxGeometry(1.65, 0.52, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, 0.92, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Carbon Roof with Center Spine & Intake Scoop
    const roofGeo = new THREE.BoxGeometry(1.48, 0.08, 1.7);
    const roof = new THREE.Mesh(roofGeo, carbonMaterial);
    roof.position.set(0, 1.18, -0.2);
    roof.castShadow = true;
    group.add(roof);

    // Roof Air Scoop feeding mid-engine
    const scoopGeo = new THREE.BoxGeometry(0.5, 0.12, 0.6);
    const roofScoop = new THREE.Mesh(scoopGeo, carbonMaterial);
    roofScoop.position.set(0, 1.25, -0.1);
    roofScoop.rotation.x = -0.12;
    group.add(roofScoop);

    // Aerodynamic Wing Mirrors with Carbon Caps
    const leftMirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.15), carbonMaterial);
    leftMirror.position.set(-1.12, 0.86, 0.52);
    leftMirror.rotation.y = 0.2;
    const rightMirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.15), carbonMaterial);
    rightMirror.position.set(1.12, 0.86, 0.52);
    rightMirror.rotation.y = -0.2;
    group.add(leftMirror, rightMirror);

    // Rear Engine Decklid with Glass Louvers
    const deckGeo = new THREE.BoxGeometry(1.85, 0.2, 1.3);
    const deck = new THREE.Mesh(deckGeo, paintMaterial);
    deck.position.set(0, 0.65, -1.5);
    group.add(deck);

    // Rear Aerodynamic Carbon Diffuser
    const diffuserGeo = new THREE.BoxGeometry(2.1, 0.16, 0.4);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.28, -2.25);
    group.add(diffuser);

    // Rear GT Wing / Spoiler (Swan-neck pylon track look)
    const strutGeo = new THREE.BoxGeometry(0.08, 0.45, 0.15);
    const leftStrut = new THREE.Mesh(strutGeo, carbonMaterial);
    leftStrut.position.set(-0.7, 0.95, -1.9);
    const rightStrut = new THREE.Mesh(strutGeo, carbonMaterial);
    rightStrut.position.set(0.7, 0.95, -1.9);

    const wingBladeGeo = new THREE.BoxGeometry(2.2, 0.08, 0.45);
    const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMaterial);
    wingBlade.position.set(0, 1.18, -1.92);
    wingBlade.rotation.x = -0.06;

    // Wing Endplates
    const endplateGeo = new THREE.BoxGeometry(0.05, 0.25, 0.5);
    const leftEndplate = new THREE.Mesh(endplateGeo, carbonMaterial);
    leftEndplate.position.set(-1.1, 1.18, -1.92);
    const rightEndplate = new THREE.Mesh(endplateGeo, carbonMaterial);
    rightEndplate.position.set(1.1, 1.18, -1.92);

    group.add(leftStrut, rightStrut, wingBlade, leftEndplate, rightEndplate);

    // --- WHEELS: FORGED BLACK MULTI-SPOKE RIMS WITH SIGNATURE WHITE LIP ---
    const wheels: THREE.Mesh[] = [];
    const rims: THREE.Mesh[] = [];
    const calipers: THREE.Mesh[] = [];

    const tireGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.38, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x141418,
      roughness: 0.88,
      metalness: 0.12
    });

    // 1. Signature White Outer Rim Lip (As seen in the photo!)
    const whiteLipGeo = new THREE.CylinderGeometry(0.305, 0.305, 0.395, 24);
    whiteLipGeo.rotateZ(Math.PI / 2);

    // 2. Forged Deep Black Inner Rim
    const rimBarrelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.39, 16);
    rimBarrelGeo.rotateZ(Math.PI / 2);

    // 3. Spoke Assembly (10 Forged Spokes)
    const spokeGeo = new THREE.BoxGeometry(0.388, 0.04, 0.52);

    // 4. Perforated Steel Brake Rotor Disc
    const brakeRotorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 18);
    brakeRotorGeo.rotateZ(Math.PI / 2);
    const brakeRotorMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.22
    });

    // 5. Brembo Red Caliper Geometry
    const caliperGeo = new THREE.BoxGeometry(0.12, 0.18, 0.22);

    const wheelPositions = [
      { x: -1.08, y: 0.4, z: 1.38, isFront: true },
      { x: 1.08, y: 0.4, z: 1.38, isFront: true },
      { x: -1.1, y: 0.4, z: -1.35, isFront: false },
      { x: 1.1, y: 0.4, z: -1.35, isFront: false }
    ];

    wheelPositions.forEach(pos => {
      const wheelHub = new THREE.Mesh(tireGeo, tireMat);
      wheelHub.castShadow = true;

      // Outer White Lip Ring (High Contrast Accent)
      const whiteLip = new THREE.Mesh(whiteLipGeo, whiteRimLipMat);
      wheelHub.add(whiteLip);

      // Black Rim Barrel
      const rim = new THREE.Mesh(rimBarrelGeo, blackAlloyMat);
      wheelHub.add(rim);
      rims.push(rim);

      // Multi-Spoke Spider Pattern
      const spokeMesh1 = new THREE.Mesh(spokeGeo, blackAlloyMat);
      const spokeMesh2 = new THREE.Mesh(spokeGeo, blackAlloyMat);
      spokeMesh2.rotation.x = Math.PI / 4;
      const spokeMesh3 = new THREE.Mesh(spokeGeo, blackAlloyMat);
      spokeMesh3.rotation.x = Math.PI / 2;
      const spokeMesh4 = new THREE.Mesh(spokeGeo, blackAlloyMat);
      spokeMesh4.rotation.x = (3 * Math.PI) / 4;
      wheelHub.add(spokeMesh1, spokeMesh2, spokeMesh3, spokeMesh4);

      // Center Wheel Nut / Hub
      const hubNut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.40, 8), accentRedMat);
      hubNut.rotateZ(Math.PI / 2);
      wheelHub.add(hubNut);

      // Brake Rotor Disc
      const rotor = new THREE.Mesh(brakeRotorGeo, brakeRotorMat);
      wheelHub.add(rotor);

      // Sport Red Brembo Brake Caliper
      const caliper = new THREE.Mesh(caliperGeo, accentRedMat);
      caliper.position.set(pos.x > 0 ? 0.06 : -0.06, 0.12, 0.08);
      wheelHub.add(caliper);
      calipers.push(caliper);

      wheelHub.position.set(pos.x, pos.y, pos.z);
      group.add(wheelHub);
      wheels.push(wheelHub);
    });

    // --- LIGHTING: XENON HEADLIGHTS & LED LIGHT GUIDE ---
    const headlights: THREE.Mesh[] = [];
    const headlightBeams: THREE.SpotLight[] = [];

    // Aggressive angled LED DRL strip (Daytime Running Light)
    const drlMat = new THREE.MeshBasicMaterial({ color: 0xecfeff });
    const drlGeo = new THREE.BoxGeometry(0.42, 0.09, 0.06);

    const leftDrl = new THREE.Mesh(drlGeo, drlMat);
    leftDrl.position.set(-0.76, 0.58, 2.24);
    leftDrl.rotation.z = -0.15;
    const rightDrl = new THREE.Mesh(drlGeo, drlMat);
    rightDrl.position.set(0.76, 0.58, 2.24);
    rightDrl.rotation.z = 0.15;
    group.add(leftDrl, rightDrl);
    headlights.push(leftDrl, rightDrl);

    // Xenon Lens
    const xenonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const xenonGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const leftXenon = new THREE.Mesh(xenonGeo, xenonMat);
    leftXenon.position.set(-0.68, 0.58, 2.26);
    const rightXenon = new THREE.Mesh(xenonGeo, xenonMat);
    rightXenon.position.set(0.68, 0.58, 2.26);
    group.add(leftXenon, rightXenon);

    // Spotlights for night / tunnel / rain
    const spotL = new THREE.SpotLight(0xf0f9ff, 0, 90, Math.PI / 5, 0.35, 1.2);
    spotL.position.set(-0.75, 0.6, 2.3);
    const spotTargetL = new THREE.Object3D();
    spotTargetL.position.set(-0.75, 0.2, 35);
    group.add(spotL, spotTargetL);
    spotL.target = spotTargetL;
    headlightBeams.push(spotL);

    const spotR = new THREE.SpotLight(0xf0f9ff, 0, 90, Math.PI / 5, 0.35, 1.2);
    spotR.position.set(0.75, 0.6, 2.3);
    const spotTargetR = new THREE.Object3D();
    spotTargetR.position.set(0.75, 0.2, 35);
    group.add(spotR, spotTargetR);
    spotR.target = spotTargetR;
    headlightBeams.push(spotR);

    // --- TAILLIGHTS: FULL WIDTH MODERN LED BAR ---
    const taillights: THREE.Mesh[] = [];
    const taillightMaterials: THREE.MeshBasicMaterial[] = [];

    const tailBarMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
    taillightMaterials.push(tailBarMat);

    const tailBarGeo = new THREE.BoxGeometry(1.9, 0.08, 0.06);
    const tailBar = new THREE.Mesh(tailBarGeo, tailBarMat);
    tailBar.position.set(0, 0.64, -2.26);
    group.add(tailBar);
    taillights.push(tailBar);

    // Side C-shaped tail clusters
    const tailClusterGeo = new THREE.BoxGeometry(0.35, 0.16, 0.06);
    const leftCluster = new THREE.Mesh(tailClusterGeo, tailBarMat);
    leftCluster.position.set(-0.82, 0.64, -2.26);
    const rightCluster = new THREE.Mesh(tailClusterGeo, tailBarMat);
    rightCluster.position.set(0.82, 0.64, -2.26);
    group.add(leftCluster, rightCluster);
    taillights.push(leftCluster, rightCluster);

    // --- QUAD CHROME EXHAUSTS WITH NITRO FLAME MESH ---
    const exhaustPipes: THREE.Mesh[] = [];
    const exhaustFlames: THREE.Mesh[] = [];

    const exhaustPipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
    exhaustPipeGeo.rotateX(Math.PI / 2);
    const exhaustPipeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15
    });

    // Fire flame cone
    const flameGeo = new THREE.ConeGeometry(0.12, 0.6, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Electric blue / cyan turbo flame
      transparent: true,
      opacity: 0
    });

    [-0.55, -0.38, 0.38, 0.55].forEach(x => {
      const pipe = new THREE.Mesh(exhaustPipeGeo, exhaustPipeMat);
      pipe.position.set(x, 0.32, -2.28);
      group.add(pipe);
      exhaustPipes.push(pipe);

      const flame = new THREE.Mesh(flameGeo, flameMat.clone());
      flame.position.set(x, 0.32, -2.55);
      group.add(flame);
      exhaustFlames.push(flame);
    });

    // --- GTA TUNER UNDERGLOW NEON ---
    const underglowCanvas = document.createElement('canvas');
    underglowCanvas.width = 128;
    underglowCanvas.height = 128;
    const uCtx = underglowCanvas.getContext('2d')!;
    const uGrad = uCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
    uGrad.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
    uGrad.addColorStop(0.5, 'rgba(0, 160, 255, 0.4)');
    uGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    uCtx.fillStyle = uGrad;
    uCtx.fillRect(0, 0, 128, 128);

    const underglowTexture = new THREE.CanvasTexture(underglowCanvas);
    const underglowGeo = new THREE.PlaneGeometry(2.6, 4.4);
    const underglowMat = new THREE.MeshBasicMaterial({
      map: underglowTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const underglowMesh = new THREE.Mesh(underglowGeo, underglowMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.set(0, 0.06, 0);
    group.add(underglowMesh);

    const underglowLight = new THREE.PointLight(0x00f0ff, 1.2, 5, 2);
    underglowLight.position.set(0, 0.2, 0);
    group.add(underglowLight);

    // --- CONTACT AMBIENT OCCLUSION SHADOW PLANE (Keeps car grounded) ---
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 20, 64, 64, 60);
    sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    sGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(2.6, 4.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, 0.03, 0);
    group.add(shadowPlane);

    return {
      group,
      bodyMesh: lowerBody,
      paintMaterial,
      wheels,
      rims,
      calipers,
      headlights,
      headlightBeams,
      taillights,
      taillightMaterials,
      exhaustPipes,
      exhaustFlames,
      underglowMesh,
      underglowLight,
      shadowPlane
    };
  }

  /**
   * Creates a dedicated 3D vehicle model for cars from the FiveM Lore-Friendly Car Pack.
   * Handles distinctive body archetypes: TUNER_JDM, MUSCLE, GT, DRIFT_TRUCK, and SUPER.
   */
  public static createFiveMCar(
    car: FiveMCar,
    overrideColorHex?: number,
    isPlayer: boolean = false
  ): GTACarVisuals {
    const group = new THREE.Group();
    const envMap = this.getEnvironmentReflectionTexture();
    const carbonTex = this.getCarbonFiberTexture();
    const honeycombTex = this.getHoneycombTexture();

    const carColorHex =
      overrideColorHex !== undefined
        ? overrideColorHex
        : parseInt(car.defaultColor.replace('#', '0x'), 16);

    // 1. Automotive Paint Material
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: carColorHex,
      metalness: car.bodyType === 'MUSCLE' ? 0.72 : 0.86,
      roughness: car.bodyType === 'MUSCLE' ? 0.24 : 0.16,
      envMap: envMap,
      envMapIntensity: 2.2
    });

    // 2. Real Carbon Fiber Material
    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      map: carbonTex,
      metalness: 0.72,
      roughness: 0.32,
      envMap: envMap,
      envMapIntensity: 0.9
    });

    // 3. Honeycomb / Grille Mesh
    const honeycombMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b0e,
      map: honeycombTex,
      metalness: 0.35,
      roughness: 0.75
    });

    // 4. Polished Aluminum / Intercooler Material
    const intercoolerMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.95,
      roughness: 0.18,
      envMap: envMap,
      envMapIntensity: 1.5
    });

    // 5. Glossy Tinted Glass
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x050b14,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.65,
      transparent: true,
      opacity: 0.88,
      envMap: envMap,
      envMapIntensity: 2.4
    });

    // 6. Forged Alloy Wheels Material
    const blackAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d,
      metalness: 0.92,
      roughness: 0.22,
      envMap: envMap,
      envMapIntensity: 1.4
    });

    // 7. Sport Red Brembo Accent Material
    const accentRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.55,
      roughness: 0.28
    });

    // --- BODY ARCHITECTURE BASED ON FIVEM CAR PACK ---
    let mainBodyMesh: THREE.Mesh;
    const headlights: THREE.Mesh[] = [];
    const headlightBeams: THREE.SpotLight[] = [];
    const taillights: THREE.Mesh[] = [];
    const taillightMaterials: THREE.MeshBasicMaterial[] = [];
    const exhaustPipes: THREE.Mesh[] = [];
    const exhaustFlames: THREE.Mesh[] = [];

    if (car.bodyType === 'TUNER_JDM') {
      // ===== JDM TUNER BODY (Sultan RS V8, Elegy RH6, Futo GT, ZR390, Sunrise R) =====
      // Lower chassis
      const lowerGeo = new THREE.BoxGeometry(2.08, 0.38, 4.4);
      mainBodyMesh = new THREE.Mesh(lowerGeo, paintMaterial);
      mainBodyMesh.position.y = 0.44;
      mainBodyMesh.castShadow = true;
      group.add(mainBodyMesh);

      // Long aggressive hood with reverse rake
      const hoodGeo = new THREE.BoxGeometry(1.94, 0.18, 1.6);
      const hood = new THREE.Mesh(hoodGeo, paintMaterial);
      hood.position.set(0, 0.62, 1.25);
      hood.rotation.x = 0.06;
      group.add(hood);

      // Tuner Bonnet Scoop (Sultan WRX / Sunrise Evo style) or Carbon Vents
      const scoopGeo = new THREE.BoxGeometry(0.72, 0.1, 0.55);
      const hoodScoop = new THREE.Mesh(scoopGeo, carbonMaterial);
      hoodScoop.position.set(0, 0.74, 1.15);
      hoodScoop.rotation.x = -0.05;
      group.add(hoodScoop);

      // Exposed Massive Front Intercooler in front bumper opening
      const icGeo = new THREE.BoxGeometry(1.4, 0.32, 0.1);
      const intercooler = new THREE.Mesh(icGeo, intercoolerMat);
      intercooler.position.set(0, 0.36, 2.22);
      group.add(intercooler);

      // Front Carbon Splitter with Tie-Rods
      const splitterGeo = new THREE.BoxGeometry(2.18, 0.05, 0.55);
      const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
      splitter.position.set(0, 0.22, 2.28);
      group.add(splitter);

      // Widebody Overfenders (Bolt-on Rocket Bunny look)
      [-1.08, 1.08].forEach(x => {
        const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 1.3), paintMaterial);
        frontFender.position.set(x, 0.5, 1.3);
        const rearFender = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.44, 1.4), paintMaterial);
        rearFender.position.set(x, 0.52, -1.3);
        group.add(frontFender, rearFender);

        // Side Skirts
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 2.2), carbonMaterial);
        skirt.position.set(x > 0 ? 1.05 : -1.05, 0.24, 0);
        group.add(skirt);
      });

      // Compact Sport Coupe/Sedan Greenhouse Cabin
      const cabinGeo = new THREE.BoxGeometry(1.68, 0.58, 2.15);
      const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
      cabin.position.set(0, 0.98, -0.15);
      group.add(cabin);

      // High Aluminum / Carbon GT Wing (JDM style)
      const leftPylon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.12), carbonMaterial);
      leftPylon.position.set(-0.65, 0.95, -1.85);
      const rightPylon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.12), carbonMaterial);
      rightPylon.position.set(0.65, 0.95, -1.85);

      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.42), carbonMaterial);
      wingBlade.position.set(0, 1.22, -1.88);
      wingBlade.rotation.x = -0.08;

      const leftEnd = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.46), carbonMaterial);
      leftEnd.position.set(-1.05, 1.22, -1.88);
      const rightEnd = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.46), carbonMaterial);
      rightEnd.position.set(1.05, 1.22, -1.88);
      group.add(leftPylon, rightPylon, wingBlade, leftEnd, rightEnd);

      // Headlights: Sharp JDM Xenons with Projector Lenses
      [-0.72, 0.72].forEach(x => {
        const hlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xecfeff }));
        hlMesh.position.set(x, 0.62, 2.18);
        group.add(hlMesh);
        headlights.push(hlMesh);

        const spot = new THREE.SpotLight(0xf0fdf4, 0, 95, Math.PI / 4.8, 0.3, 1.2);
        spot.position.set(x, 0.62, 2.22);
        const target = new THREE.Object3D();
        target.position.set(x, 0.2, 35);
        group.add(spot, target);
        spot.target = target;
        headlightBeams.push(spot);
      });

      // Taillights: Skyline Twin Round lights (if Elegy) or Sleek Tuner Bars (Sultan)
      const isElegy = car.id.includes('elegy');
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
      taillightMaterials.push(tailMat);

      if (isElegy) {
        [-0.82, -0.62, 0.62, 0.82].forEach(x => {
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), tailMat);
          ring.rotateX(Math.PI / 2);
          ring.position.set(x, 0.66, -2.22);
          group.add(ring);
          taillights.push(ring);
        });
      } else {
        [-0.75, 0.75].forEach(x => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.05), tailMat);
          bar.position.set(x, 0.66, -2.22);
          group.add(bar);
          taillights.push(bar);
        });
      }

      // Angled Big-Bore Titanium Cannon Exhaust (JDM Cannon Tip)
      const cannonGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.45, 16);
      cannonGeo.rotateX(Math.PI / 2);
      const cannonMat = new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        metalness: 0.95,
        roughness: 0.15
      });
      const cannon = new THREE.Mesh(cannonGeo, cannonMat);
      cannon.position.set(0.68, 0.28, -2.22);
      cannon.rotation.y = -0.15;
      cannon.rotation.x = -0.05;
      group.add(cannon);
      exhaustPipes.push(cannon);

      // Flame cone
      const flameGeo = new THREE.ConeGeometry(0.14, 0.75, 8);
      flameGeo.rotateX(-Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(0.72, 0.27, -2.55);
      group.add(flame);
      exhaustFlames.push(flame);

    } else if (car.bodyType === 'MUSCLE') {
      // ===== AMERICAN MUSCLE (Buffalo Hellhound, Gauntlet 6STR, Dominator GT, Ruiner 450) =====
      const lowerGeo = new THREE.BoxGeometry(2.18, 0.44, 4.65);
      mainBodyMesh = new THREE.Mesh(lowerGeo, paintMaterial);
      mainBodyMesh.position.y = 0.46;
      mainBodyMesh.castShadow = true;
      group.add(mainBodyMesh);

      // Muscular long hood with Supercharger Cowl induction
      const hoodGeo = new THREE.BoxGeometry(2.02, 0.22, 1.85);
      const hood = new THREE.Mesh(hoodGeo, paintMaterial);
      hood.position.set(0, 0.68, 1.35);
      group.add(hood);

      // Aggressive Supercharger / Shaker Scoop
      const blowerGeo = new THREE.BoxGeometry(0.85, 0.18, 0.95);
      const blower = new THREE.Mesh(blowerGeo, carbonMaterial);
      blower.position.set(0, 0.82, 1.25);
      group.add(blower);

      // Deep Recessed Honeycomb Muscle Grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.32, 0.1), honeycombMat);
      grille.position.set(0, 0.52, 2.32);
      group.add(grille);

      // Chunky Front Chin Splitter
      const chin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.4), carbonMaterial);
      chin.position.set(0, 0.22, 2.36);
      group.add(chin);

      // Wide Muscle Greenhouse
      const cabinGeo = new THREE.BoxGeometry(1.75, 0.56, 2.1);
      const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
      cabin.position.set(0, 1.0, -0.1);
      group.add(cabin);

      // Rear Ducktail / Drag Wing
      const ducktailGeo = new THREE.BoxGeometry(2.06, 0.18, 0.35);
      const ducktail = new THREE.Mesh(ducktailGeo, carbonMaterial);
      ducktail.position.set(0, 0.78, -2.18);
      ducktail.rotation.x = -0.32;
      group.add(ducktail);

      // Headlights: Sinister Dual Round / Halo Lights
      [-0.78, 0.78].forEach(x => {
        const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        halo.rotateX(Math.PI / 2);
        halo.position.set(x, 0.58, 2.34);
        group.add(halo);
        headlights.push(halo);

        const spot = new THREE.SpotLight(0xffedd5, 0, 90, Math.PI / 5, 0.35, 1.2);
        spot.position.set(x, 0.58, 2.36);
        const target = new THREE.Object3D();
        target.position.set(x, 0.2, 35);
        group.add(spot, target);
        spot.target = target;
        headlightBeams.push(spot);
      });

      // Taillights: Full Width Muscle LED Lightbar
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
      taillightMaterials.push(tailMat);
      const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.12, 0.06), tailMat);
      tailBar.position.set(0, 0.68, -2.34);
      group.add(tailBar);
      taillights.push(tailBar);

      // Dual Massive Chrome Exhaust Tips
      const pipeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.25, 14);
      pipeGeo.rotateX(Math.PI / 2);
      const chromePipeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0 }); // fiery orange flame

      [-0.65, 0.65].forEach(x => {
        const pipe = new THREE.Mesh(pipeGeo, chromePipeMat);
        pipe.position.set(x, 0.32, -2.36);
        group.add(pipe);
        exhaustPipes.push(pipe);

        const flameGeo = new THREE.ConeGeometry(0.16, 0.8, 8);
        flameGeo.rotateX(-Math.PI / 2);
        const flame = new THREE.Mesh(flameGeo, flameMat.clone());
        flame.position.set(x, 0.32, -2.68);
        group.add(flame);
        exhaustFlames.push(flame);
      });

    } else if (car.bodyType === 'DRIFT_TRUCK') {
      // ===== DRIFT TRUCK (6STR Declasse Drift Yosemite) =====
      // Slammed truck frame
      const lowerGeo = new THREE.BoxGeometry(2.16, 0.42, 4.6);
      mainBodyMesh = new THREE.Mesh(lowerGeo, paintMaterial);
      mainBodyMesh.position.y = 0.42;
      group.add(mainBodyMesh);

      // Flat Truck Hood
      const hoodGeo = new THREE.BoxGeometry(2.0, 0.2, 1.7);
      const hood = new THREE.Mesh(hoodGeo, paintMaterial);
      hood.position.set(0, 0.64, 1.35);
      group.add(hood);

      // TWIN TURBOS POKING OUT OF HOOD! (Signature Yosemite Feature)
      [-0.4, 0.4].forEach(x => {
        const turboSnail = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.08, 12, 20), intercoolerMat);
        turboSnail.position.set(x, 0.82, 1.45);
        turboSnail.rotation.y = Math.PI / 2;
        group.add(turboSnail);
      });

      // Truck Single Cab
      const cabGeo = new THREE.BoxGeometry(1.85, 0.65, 1.4);
      const cab = new THREE.Mesh(cabGeo, glassMaterial);
      cab.position.set(0, 1.05, 0.2);
      group.add(cab);

      // Open Rear Pickup Bed
      const bedSidesGeo = new THREE.BoxGeometry(0.14, 0.42, 1.85);
      const leftBed = new THREE.Mesh(bedSidesGeo, paintMaterial);
      leftBed.position.set(-0.98, 0.68, -1.35);
      const rightBed = new THREE.Mesh(bedSidesGeo, paintMaterial);
      rightBed.position.set(0.98, 0.68, -1.35);
      group.add(leftBed, rightBed);

      // Tubular Steel Roll Cage in Bed
      const rollBarGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
      rollBarGeo.rotateZ(Math.PI / 2);
      const rollBar = new THREE.Mesh(rollBarGeo, carbonMaterial);
      rollBar.position.set(0, 1.15, -0.45);
      group.add(rollBar);

      // Tailgate with Drift Ducktail
      const tailgate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.12), paintMaterial);
      tailgate.position.set(0, 0.68, -2.3);
      group.add(tailgate);

      // Headlights & Taillights
      [-0.75, 0.75].forEach(x => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hl.position.set(x, 0.58, 2.32);
        group.add(hl);
        headlights.push(hl);

        const spot = new THREE.SpotLight(0xffffff, 0, 85, Math.PI / 4.8, 0.3, 1.2);
        spot.position.set(x, 0.58, 2.34);
        const target = new THREE.Object3D();
        target.position.set(x, 0.2, 35);
        group.add(spot, target);
        spot.target = target;
        headlightBeams.push(spot);
      });

      const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      taillightMaterials.push(tailMat);
      [-0.85, 0.85].forEach(x => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.06), tailMat);
        tl.position.set(x, 0.65, -2.36);
        group.add(tl);
        taillights.push(tl);
      });

      // Side-Exit Flame Spitting Exhausts (Under door sill)
      [-1.12, 1.12].forEach(x => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12), intercoolerMat);
        pipe.rotateZ(Math.PI / 2);
        pipe.position.set(x, 0.24, -0.2);
        group.add(pipe);
        exhaustPipes.push(pipe);

        const flameGeo = new THREE.ConeGeometry(0.14, 0.6, 8);
        flameGeo.rotateZ(x > 0 ? -Math.PI / 2 : Math.PI / 2);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(x > 0 ? x + 0.3 : x - 0.3, 0.24, -0.2);
        group.add(flame);
        exhaustFlames.push(flame);
      });

    } else if (car.bodyType === 'GT') {
      // ===== EUROPEAN GT / DTM (Schwartzer Aggressor, Sentinel Mk.4 GTR, SuperGTS, Comet Callista) =====
      const lowerGeo = new THREE.BoxGeometry(2.14, 0.38, 4.5);
      mainBodyMesh = new THREE.Mesh(lowerGeo, paintMaterial);
      mainBodyMesh.position.y = 0.44;
      group.add(mainBodyMesh);

      // Long sloping front hood
      const hoodGeo = new THREE.BoxGeometry(1.98, 0.2, 1.7);
      const hood = new THREE.Mesh(hoodGeo, paintMaterial);
      hood.position.set(0, 0.62, 1.3);
      group.add(hood);

      // Dual Carbon Bonnet Vents
      [-0.45, 0.45].forEach(x => {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.6), carbonMaterial);
        vent.position.set(x, 0.68, 1.25);
        vent.rotation.x = -0.15;
        group.add(vent);
      });

      // European Coupe Cockpit
      const cabinGeo = new THREE.BoxGeometry(1.68, 0.54, 2.1);
      const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
      cabin.position.set(0, 0.96, -0.18);
      group.add(cabin);

      // Swan-Neck Track GT Wing
      const leftSwan = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.22), carbonMaterial);
      leftSwan.position.set(-0.68, 1.05, -1.9);
      const rightSwan = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.22), carbonMaterial);
      rightSwan.position.set(0.68, 1.05, -1.9);

      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.06, 0.42), carbonMaterial);
      wingBlade.position.set(0, 1.22, -1.95);
      wingBlade.rotation.x = -0.06;
      group.add(leftSwan, rightSwan, wingBlade);

      // Front Angel Eye Headlights
      [-0.74, 0.74].forEach(x => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xecfeff }));
        hl.position.set(x, 0.6, 2.24);
        group.add(hl);
        headlights.push(hl);

        const spot = new THREE.SpotLight(0xf0f9ff, 0, 92, Math.PI / 4.8, 0.35, 1.2);
        spot.position.set(x, 0.6, 2.26);
        const target = new THREE.Object3D();
        target.position.set(x, 0.2, 35);
        group.add(spot, target);
        spot.target = target;
        headlightBeams.push(spot);
      });

      // Sleek European L-Shaped Taillights
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
      taillightMaterials.push(tailMat);
      [-0.78, 0.78].forEach(x => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.06), tailMat);
        tl.position.set(x, 0.66, -2.28);
        group.add(tl);
        taillights.push(tl);
      });

      // Quad Polished Exhausts
      const pipeGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.2, 12);
      pipeGeo.rotateX(Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 });

      [-0.58, -0.44, 0.44, 0.58].forEach(x => {
        const pipe = new THREE.Mesh(pipeGeo, intercoolerMat);
        pipe.position.set(x, 0.3, -2.3);
        group.add(pipe);
        exhaustPipes.push(pipe);

        const flameGeo = new THREE.ConeGeometry(0.1, 0.5, 8);
        flameGeo.rotateX(-Math.PI / 2);
        const flame = new THREE.Mesh(flameGeo, flameMat.clone());
        flame.position.set(x, 0.3, -2.52);
        group.add(flame);
        exhaustFlames.push(flame);
      });

    } else {
      // ===== SUPER / HYPERCAR (T20 GTR, Adder Sport, Krieger BPX, Infernus S, Tempesta 6STR, Matador) =====
      const lowerGeo = new THREE.BoxGeometry(2.14, 0.36, 4.45);
      mainBodyMesh = new THREE.Mesh(lowerGeo, paintMaterial);
      mainBodyMesh.position.y = 0.42;
      group.add(mainBodyMesh);

      // Low Wedge Nose
      const hoodGeo = new THREE.BoxGeometry(1.98, 0.20, 1.65);
      const hood = new THREE.Mesh(hoodGeo, paintMaterial);
      hood.position.set(0, 0.58, 1.35);
      hood.rotation.x = 0.08;
      group.add(hood);

      // Carbon Hood Inlay & Canards
      const hoodInlay = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 1.45), carbonMaterial);
      hoodInlay.position.set(0, 0.60, 1.35);
      hoodInlay.rotation.x = 0.08;
      group.add(hoodInlay);

      // Shark Fin or Roof Scoop (Krieger / T20)
      if (car.id === 'kriegerc') {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 1.6), carbonMaterial);
        fin.position.set(0, 1.25, -0.9);
        group.add(fin);
      } else {
        const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.6), carbonMaterial);
        scoop.position.set(0, 1.25, -0.1);
        scoop.rotation.x = -0.12;
        group.add(scoop);
      }

      // Aerodynamic Glass Cockpit
      const cabinGeo = new THREE.BoxGeometry(1.65, 0.52, 2.2);
      const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
      cabin.position.set(0, 0.92, -0.2);
      group.add(cabin);

      // High Supercar Track Wing
      const strutGeo = new THREE.BoxGeometry(0.08, 0.45, 0.15);
      const leftStrut = new THREE.Mesh(strutGeo, carbonMaterial);
      leftStrut.position.set(-0.7, 0.95, -1.9);
      const rightStrut = new THREE.Mesh(strutGeo, carbonMaterial);
      rightStrut.position.set(0.7, 0.95, -1.9);

      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.45), carbonMaterial);
      wingBlade.position.set(0, 1.18, -1.92);
      wingBlade.rotation.x = -0.06;
      group.add(leftStrut, rightStrut, wingBlade);

      // Headlights & Spotlights
      [-0.76, 0.76].forEach(x => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.06), new THREE.MeshBasicMaterial({ color: 0xecfeff }));
        hl.position.set(x, 0.58, 2.24);
        group.add(hl);
        headlights.push(hl);

        const spot = new THREE.SpotLight(0xf0f9ff, 0, 90, Math.PI / 5, 0.35, 1.2);
        spot.position.set(x, 0.6, 2.3);
        const target = new THREE.Object3D();
        target.position.set(x, 0.2, 35);
        group.add(spot, target);
        spot.target = target;
        headlightBeams.push(spot);
      });

      // Taillights
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
      taillightMaterials.push(tailMat);
      const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.06), tailMat);
      tailBar.position.set(0, 0.64, -2.26);
      group.add(tailBar);
      taillights.push(tailBar);

      // Quad Exhausts with Nitro Flames
      const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
      pipeGeo.rotateX(Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 });

      [-0.55, -0.38, 0.38, 0.55].forEach(x => {
        const pipe = new THREE.Mesh(pipeGeo, intercoolerMat);
        pipe.position.set(x, 0.32, -2.28);
        group.add(pipe);
        exhaustPipes.push(pipe);

        const flameGeo = new THREE.ConeGeometry(0.12, 0.6, 8);
        flameGeo.rotateX(-Math.PI / 2);
        const flame = new THREE.Mesh(flameGeo, flameMat.clone());
        flame.position.set(x, 0.32, -2.55);
        group.add(flame);
        exhaustFlames.push(flame);
      });
    }

    // --- WHEELS, BRAKES & CONTACT SHADOW ---
    const wheels: THREE.Mesh[] = [];
    const rims: THREE.Mesh[] = [];
    const calipers: THREE.Mesh[] = [];

    const isTruck = car.bodyType === 'DRIFT_TRUCK';
    const isMuscle = car.bodyType === 'MUSCLE';

    const tireRadius = isTruck ? 0.44 : 0.4;
    const tireWidth = isTruck ? 0.42 : isMuscle ? 0.42 : 0.38;

    const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x141418,
      roughness: 0.88,
      metalness: 0.12
    });

    const rimGeo = new THREE.CylinderGeometry(tireRadius * 0.72, tireRadius * 0.72, tireWidth + 0.01, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const spokeGeo = new THREE.BoxGeometry(tireRadius * 0.98, 0.04, tireRadius * 1.3);

    const brakeGeo = new THREE.CylinderGeometry(tireRadius * 0.6, tireRadius * 0.6, 0.05, 16);
    brakeGeo.rotateZ(Math.PI / 2);
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.22
    });

    const wheelPositions = [
      { x: -1.08, y: tireRadius, z: 1.38, isFront: true },
      { x: 1.08, y: tireRadius, z: 1.38, isFront: true },
      { x: -1.1, y: tireRadius, z: -1.35, isFront: false },
      { x: 1.1, y: tireRadius, z: -1.35, isFront: false }
    ];

    wheelPositions.forEach(pos => {
      const wheelHub = new THREE.Mesh(tireGeo, tireMat);
      wheelHub.castShadow = true;

      // Rim Barrel
      const rim = new THREE.Mesh(rimGeo, blackAlloyMat);
      wheelHub.add(rim);
      rims.push(rim);

      // Spokes
      const sp1 = new THREE.Mesh(spokeGeo, blackAlloyMat);
      const sp2 = new THREE.Mesh(spokeGeo, blackAlloyMat);
      sp2.rotation.x = Math.PI / 3;
      const sp3 = new THREE.Mesh(spokeGeo, blackAlloyMat);
      sp3.rotation.x = (2 * Math.PI) / 3;
      wheelHub.add(sp1, sp2, sp3);

      // Brake Rotor
      const rotor = new THREE.Mesh(brakeGeo, brakeMat);
      wheelHub.add(rotor);

      // Red Caliper
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), accentRedMat);
      caliper.position.set(pos.x > 0 ? 0.06 : -0.06, 0.12, 0.08);
      wheelHub.add(caliper);
      calipers.push(caliper);

      wheelHub.position.set(pos.x, pos.y, pos.z);
      group.add(wheelHub);
      wheels.push(wheelHub);
    });

    // --- GTA TUNER UNDERGLOW NEON ---
    const underglowCanvas = document.createElement('canvas');
    underglowCanvas.width = 128;
    underglowCanvas.height = 128;
    const uCtx = underglowCanvas.getContext('2d')!;
    const uGrad = uCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
    uGrad.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
    uGrad.addColorStop(0.5, 'rgba(0, 160, 255, 0.4)');
    uGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    uCtx.fillStyle = uGrad;
    uCtx.fillRect(0, 0, 128, 128);

    const underglowTexture = new THREE.CanvasTexture(underglowCanvas);
    const underglowGeo = new THREE.PlaneGeometry(2.6, 4.4);
    const underglowMat = new THREE.MeshBasicMaterial({
      map: underglowTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const underglowMesh = new THREE.Mesh(underglowGeo, underglowMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.set(0, 0.06, 0);
    group.add(underglowMesh);

    const underglowLight = new THREE.PointLight(0x00f0ff, 1.2, 5, 2);
    underglowLight.position.set(0, 0.2, 0);
    group.add(underglowLight);

    // Ground Contact Shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 20, 64, 64, 60);
    sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    sGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(2.6, 4.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.name = 'SHADOW_PLANE';
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, 0.03, 0);
    group.add(shadowPlane);

    if (car.usdzModelUrl && typeof window !== 'undefined') {
      GTAGraphicsEngine.loadUSDZCarModel(car.usdzModelUrl, group, mainBodyMesh, wheels, overrideColorHex);
    }

    return {
      group,
      bodyMesh: mainBodyMesh,
      paintMaterial,
      wheels,
      rims,
      calipers,
      headlights,
      headlightBeams,
      taillights,
      taillightMaterials,
      exhaustPipes,
      exhaustFlames,
      underglowMesh,
      underglowLight,
      shadowPlane
    };
  }

  private static usdzCache: Map<string, THREE.Group> = new Map();
  private static usdzLoadingPromises: Map<string, Promise<THREE.Group>> = new Map();

  /**
   * Asynchronously loads a USDZ 3D car model, normalizes dimensions and attaches to the car group.
   */
  public static async loadUSDZCarModel(
    url: string,
    targetGroup: THREE.Group,
    fallbackMesh: THREE.Mesh,
    wheels: THREE.Mesh[],
    overrideColorHex?: number
  ): Promise<THREE.Group | null> {
    if (typeof window === 'undefined') return null;

    try {
      const { USDLoader } = await import('three/examples/jsm/loaders/USDLoader.js');
      const loader = new USDLoader();

      let modelGroup: THREE.Group;
      if (this.usdzCache.has(url)) {
        modelGroup = this.usdzCache.get(url)!.clone(true);
      } else if (this.usdzLoadingPromises.has(url)) {
        const loaded = await this.usdzLoadingPromises.get(url)!;
        modelGroup = loaded.clone(true);
      } else {
        const loadPromise = loader.loadAsync(url);
        this.usdzLoadingPromises.set(url, loadPromise);
        const loaded = await loadPromise;
        this.usdzCache.set(url, loaded.clone(true));
        this.usdzLoadingPromises.delete(url);
        modelGroup = loaded.clone(true);
      }

      if (!modelGroup) return null;

      // Calculate initial bounding box to determine scale & orientation
      const box = new THREE.Box3().setFromObject(modelGroup);
      const size = new THREE.Vector3();
      box.getSize(size);

      // Supercars in the original game have length ~4.35m, width ~1.75 - 1.85m, height ~1.15m
      const isXLonger = size.x > size.z;
      const modelLength = isXLonger ? size.x : size.z;
      const targetLength = 4.35; // Exact size match with the original game cars
      const scaleFactor = targetLength / Math.max(modelLength, 0.01);

      const wrapper = new THREE.Group();
      wrapper.name = 'USDZ_CUSTOM_CAR';

      // Multiply existing scale so the internal unit multiplier (0.01) is correctly preserved
      modelGroup.scale.multiplyScalar(scaleFactor);
      if (isXLonger) {
        modelGroup.rotation.y = Math.PI / 2;
      }

      // Re-evaluate bounds after scale & rotation
      const scaledBox = new THREE.Box3().setFromObject(modelGroup);
      const scaledCenter = new THREE.Vector3();
      scaledBox.getCenter(scaledCenter);

      // Center model horizontally and position wheels/bottom flush with track surface
      modelGroup.position.x = -scaledCenter.x;
      modelGroup.position.z = -scaledCenter.z;
      modelGroup.position.y = -scaledBox.min.y;

      wrapper.add(modelGroup);

      // Apply environment reflections, shadows and optional custom paint tint
      const envMap = this.getEnvironmentReflectionTexture();
      modelGroup.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Prevent Three.js from culling sub-meshes (xe không bao giờ bị ẩn do góc camera)
          child.frustumCulled = false;

          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => {
            if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) {
              m.envMap = envMap;
              m.envMapIntensity = 2.2;
              m.needsUpdate = true;

              if (overrideColorHex !== undefined) {
                // Apply custom paint color to primary exterior body panels while preserving authentic lights, glass & carbon
                if (
                  child.name === 'Object_27' ||
                  child.name === 'Object_28' ||
                  child.name === 'Object_29' ||
                  (m.color && m.color.getHexString().toLowerCase() === 'ce8a07') ||
                  (child.name && /paint|body|carpaint/i.test(child.name))
                ) {
                  m.color = new THREE.Color(overrideColorHex);
                }
              }
            }
          });
        }
      });

      // Add the full 3D USDZ car model to the vehicle group
      targetGroup.add(wrapper);

      // Completely hide all legacy procedural elements (body, cabin, hood, spoiler, exhaust pipes, old light boxes, wheels)
      // leaving ONLY the authentic USDZ 3D model, realistic ground shadow, and functional headlight beams.
      targetGroup.children.forEach(child => {
        if (
          child !== wrapper &&
          child.name !== 'SHADOW_PLANE' &&
          child.name !== 'EXHAUST_FLAME_GROUP' &&
          child.name !== 'TAILLIGHT_MESH_GROUP' &&
          !(child as any).isLight
        ) {
          child.visible = false;
        }
      });

      fallbackMesh.visible = false;
      wheels.forEach(w => (w.visible = false));

      return wrapper;
    } catch (err) {
      console.warn('Could not load USDZ car model, keeping high-poly procedural visuals:', err);
      return null;
    }
  }

  /**
   * Generates GTA Highway and City Skyline Scenery around the track
   */
  public static buildGTACityScenery(
    trackCurve: THREE.CatmullRomCurve3,
    trackWidth: number,
    scene: THREE.Scene | THREE.Group
  ): THREE.Group {
    const sceneryGroup = new THREE.Group();
    const totalLength = trackCurve.getLength();
    const segments = 180;
    const roadHalf = trackWidth / 2;

    const windowTex = this.getSkyscraperWindowTexture();
    const billboards = this.getBillboardTextures();

    // 1. Galvanized Steel W-Beam Highway Guardrails
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.25
    });

    const railGeo = new THREE.BoxGeometry(0.12, 0.5, 3.2);
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);

    // 2. Skyscraper Materials (GTA Downtown skyline)
    const buildingMatDark = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.4,
      metalness: 0.85,
      map: windowTex
    });
    const buildingMatGlass = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.9,
      map: windowTex
    });

    // 3. Street Lights
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const lampLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Warm halogen / golden LED

    // Populate scenery along spline
    for (let i = 0; i < segments; i += 2) {
      const u = i / segments;
      const pt = safeGetPointAt(trackCurve, u);
      const tg = safeGetTangentAt(trackCurve, u);
      const normal = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize();

      // Guardrails on outer curves
      const railL = new THREE.Mesh(railGeo, railMat);
      railL.position.copy(pt).addScaledVector(normal, -roadHalf - 0.75);
      railL.position.y += 0.55;
      railL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg);
      sceneryGroup.add(railL);

      const postL = new THREE.Mesh(postGeo, railMat);
      postL.position.copy(pt).addScaledVector(normal, -roadHalf - 0.75);
      postL.position.y += 0.45;
      sceneryGroup.add(postL);

      const railR = new THREE.Mesh(railGeo, railMat);
      railR.position.copy(pt).addScaledVector(normal, roadHalf + 0.75);
      railR.position.y += 0.55;
      railR.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg);
      sceneryGroup.add(railR);

      const postR = new THREE.Mesh(postGeo, railMat);
      postR.position.copy(pt).addScaledVector(normal, roadHalf + 0.75);
      postR.position.y += 0.45;
      sceneryGroup.add(postR);

      // Overhead Freeway Signs / Billboards every 18 segments
      if (i % 24 === 0 && billboards.length > 0) {
        const bTex = billboards[(i / 24) % billboards.length];
        const gantryGroup = new THREE.Group();

        // Dual steel pillars
        const pL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 0.5), lampPoleMat);
        pL.position.copy(pt).addScaledVector(normal, -roadHalf - 2.4);
        pL.position.y += 6;
        gantryGroup.add(pL);

        const pR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 0.5), lampPoleMat);
        pR.position.copy(pt).addScaledVector(normal, roadHalf + 2.4);
        pR.position.y += 6;
        gantryGroup.add(pR);

        // Crossbar
        const cross = new THREE.Mesh(new THREE.BoxGeometry(trackWidth + 5.2, 0.6, 0.6), lampPoleMat);
        cross.position.copy(pt);
        cross.position.y += 11.5;
        cross.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), normal);
        gantryGroup.add(cross);

        // Illuminated Billboard Screen
        const screenMat = new THREE.MeshBasicMaterial({ map: bTex, side: THREE.DoubleSide });
        const screenGeo = new THREE.PlaneGeometry(trackWidth * 0.8, 3.8);
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.copy(pt);
        screen.position.y += 10.5;
        screen.lookAt(pt.clone().add(tg));
        gantryGroup.add(screen);

        sceneryGroup.add(gantryGroup);
      }

      // Highway Light Poles every 10 segments
      if (i % 12 === 0) {
        const side = (i / 12) % 2 === 0 ? 1 : -1;
        const poleGroup = new THREE.Group();

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 11, 8), lampPoleMat);
        const polePos = pt.clone().addScaledVector(normal, side * (roadHalf + 3.2));
        pole.position.set(polePos.x, polePos.y + 5.5, polePos.z);
        poleGroup.add(pole);

        // Arched arm extending over highway
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.0), lampPoleMat);
        arm.position.set(polePos.x, polePos.y + 11, polePos.z);
        arm.lookAt(pt.clone().setY(polePos.y + 11));
        poleGroup.add(arm);

        // Luminous lamp fixture
        const lampFixture = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.9), lampLightMat);
        const lampPos = polePos.clone().addScaledVector(normal, -side * 2.2);
        lampFixture.position.set(lampPos.x, polePos.y + 10.9, lampPos.z);
        poleGroup.add(lampFixture);

        sceneryGroup.add(poleGroup);
      }
    }

    scene.add(sceneryGroup);
    return sceneryGroup;
  }

  /**
   * Generates California Fan Palm Trees (Los Santos & Vice City streets)
   */
  public static createPalmTree(x: number, y: number, z: number, scale = 1.0): THREE.Group {
    const palm = new THREE.Group();
    palm.position.set(x, y, z);
    palm.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.9,
      metalness: 0.1
    });

    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    // Slender curved trunk segments
    const segments = 5;
    let currY = 0;
    let currX = 0;
    const curveAmount = (Math.random() - 0.5) * 0.4;

    for (let s = 0; s < segments; s++) {
      const segH = 2.4;
      const rBottom = 0.32 - s * 0.03;
      const rTop = 0.29 - s * 0.03;
      const trunkGeo = new THREE.CylinderGeometry(rTop, rBottom, segH, 8);
      const segMesh = new THREE.Mesh(trunkGeo, trunkMat);
      segMesh.position.set(currX, currY + segH / 2, 0);
      segMesh.rotation.z = curveAmount * s * 0.3;
      palm.add(segMesh);

      currY += segH;
      currX += curveAmount * 0.6;
    }

    // Crown of spreading palm fronds
    const frondCount = 9;
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2;
      const frondGeo = new THREE.PlaneGeometry(0.8, 3.4);
      const frondMesh = new THREE.Mesh(frondGeo, frondMat);

      frondMesh.position.set(currX, currY + 0.2, 0);
      frondMesh.rotation.y = angle;
      frondMesh.rotation.x = Math.PI / 3.5;
      palm.add(frondMesh);
    }

    return palm;
  }

  /**
   * Generates iconic Maze Bank Tower (Los Santos Tower - US Bank Tower)
   */
  public static createMazeBankTower(x: number, z: number): THREE.Group {
    const tower = new THREE.Group();
    tower.position.set(x, 0, z);

    const windowTex = this.getSkyscraperWindowTexture();
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.9,
      map: windowTex
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.3
    });

    // 1. Podium Base
    const baseGeo = new THREE.BoxGeometry(60, 25, 60);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 12.5;
    tower.add(base);

    // 2. Main Cylindrical Skyscraper Shaft (Tallest building in Los Santos)
    const shaftGeo = new THREE.CylinderGeometry(26, 28, 175, 32);
    const shaft = new THREE.Mesh(shaftGeo, glassMat);
    shaft.position.y = 25 + 87.5;
    tower.add(shaft);

    // 3. Step-Back Tier
    const tierGeo = new THREE.CylinderGeometry(21, 23, 30, 32);
    const tier = new THREE.Mesh(tierGeo, glassMat);
    tier.position.y = 200 + 15;
    tower.add(tier);

    // 4. Helipad Disk on Roof
    const helipadCanvas = document.createElement('canvas');
    helipadCanvas.width = 256;
    helipadCanvas.height = 256;
    const hCtx = helipadCanvas.getContext('2d')!;
    hCtx.fillStyle = '#334155';
    hCtx.fillRect(0, 0, 256, 256);
    // Yellow circle
    hCtx.strokeStyle = '#facc15';
    hCtx.lineWidth = 14;
    hCtx.beginPath();
    hCtx.arc(128, 128, 100, 0, Math.PI * 2);
    hCtx.stroke();
    // 'H' Logo
    hCtx.fillStyle = '#ffffff';
    hCtx.font = 'bold 120px Arial';
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'middle';
    hCtx.fillText('H', 128, 128);

    const helipadTex = new THREE.CanvasTexture(helipadCanvas);
    const helipadGeo = new THREE.CylinderGeometry(25, 25, 3, 32);
    const helipadMat = new THREE.MeshStandardMaterial({
      map: helipadTex,
      roughness: 0.6,
      metalness: 0.3
    });
    const helipad = new THREE.Mesh(helipadGeo, helipadMat);
    helipad.position.y = 231.5;
    tower.add(helipad);

    // 5. Communications Antenna with Red Warning Strobe Beacon
    const antennaGeo = new THREE.CylinderGeometry(0.2, 0.6, 36, 8);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = 233 + 18;
    tower.add(antenna);

    const beaconGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 233 + 36;
    tower.add(beacon);

    return tower;
  }

  /**
   * Generates iconic VINEWOOD Sign in the hills
   */
  public static createVinewoodSign(x: number, y: number, z: number, angle = 0): THREE.Group {
    const signGroup = new THREE.Group();
    signGroup.position.set(x, y, z);
    signGroup.rotation.y = angle;

    // Hillside Base Ridge
    const hillGeo = new THREE.BoxGeometry(110, 24, 30);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033, // Earthy brown hillside
      roughness: 0.95
    });
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.position.y = 10;
    signGroup.add(hill);

    const letterMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      metalness: 0.1
    });

    const strutMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.4
    });

    const letters = ['V', 'I', 'N', 'E', 'W', 'O', 'O', 'D'];
    const letterWidth = 8.5;
    const spacing = 11.5;
    const startX = -((letters.length - 1) * spacing) / 2;

    letters.forEach((l, idx) => {
      const posX = startX + idx * spacing;
      const letterH = 13;
      const letterZ = 12;

      // Two metal stilt posts
      [-2.5, 2.5].forEach(postX => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 6), strutMat);
        post.position.set(posX + postX, 22, letterZ);
        signGroup.add(post);
      });

      // Letter Billboard Face (Custom drawn crisp canvas)
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 192;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 192);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 150px Arial Black, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l, 64, 96);

      const tex = new THREE.CanvasTexture(canvas);
      const panelMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.4,
        metalness: 0.1
      });

      const panelGeo = new THREE.BoxGeometry(letterWidth, letterH, 0.6);
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(posX, 27, letterZ + 0.4);
      signGroup.add(panel);
    });

    return signGroup;
  }

  /**
   * Generates iconic Gant Bridge (San Fierro / Golden Gate suspension bridge)
   */
  public static createGantBridge(x: number, y: number, z: number, angle = 0): THREE.Group {
    const bridge = new THREE.Group();
    bridge.position.set(x, y, z);
    bridge.rotation.y = angle;

    const orangeMat = new THREE.MeshStandardMaterial({
      color: 0xd9480f, // International Orange
      roughness: 0.45,
      metalness: 0.65
    });

    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.3,
      metalness: 0.95
    });

    // Colossal Twin Suspension Towers
    const towerH = 75;
    const towerSpan = 26;

    [-towerSpan / 2, towerSpan / 2].forEach(pX => {
      const pylonGeo = new THREE.BoxGeometry(3.6, towerH, 4.2);
      const pylon = new THREE.Mesh(pylonGeo, orangeMat);
      pylon.position.set(pX, towerH / 2, 0);
      bridge.add(pylon);

      // Top decorative spire
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 7, 8), orangeMat);
      spire.position.set(pX, towerH + 3.5, 0);
      bridge.add(spire);
    });

    // Cross Beams & Diagonal Bracing between the two towers
    [25, 45, 65].forEach(h => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(towerSpan + 3.6, 2.2, 3.2), orangeMat);
      beam.position.set(0, h, 0);
      bridge.add(beam);
    });

    // Sweeping Suspension Cables from tower tops down to roadway
    [-towerSpan / 2, towerSpan / 2].forEach(pX => {
      // Main cable arc
      const cableGeo = new THREE.CylinderGeometry(0.35, 0.35, 95, 8);
      cableGeo.rotateZ(Math.PI / 4);
      const cableL = new THREE.Mesh(cableGeo, cableMat);
      cableL.position.set(pX, 38, -35);
      bridge.add(cableL);

      const cableR = new THREE.Mesh(cableGeo, cableMat);
      cableR.rotation.z = -Math.PI / 4;
      cableR.position.set(pX, 38, 35);
      bridge.add(cableR);
    });

    return bridge;
  }

  /**
   * Generates Las Venturas Casino Pyramid & Skyward Spotlight Beam
   */
  public static createCasinoPyramid(x: number, z: number): THREE.Group {
    const pyramid = new THREE.Group();
    pyramid.position.set(x, 0, z);

    const darkGlassMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.15,
      metalness: 0.95
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.9
    });

    // 4-sided Pyramid
    const pyrGeo = new THREE.ConeGeometry(55, 65, 4);
    pyrGeo.rotateY(Math.PI / 4);
    const pyrMesh = new THREE.Mesh(pyrGeo, darkGlassMat);
    pyrMesh.position.y = 32.5;
    pyramid.add(pyrMesh);

    // Golden Apex Capstone
    const capGeo = new THREE.ConeGeometry(9, 12, 4);
    capGeo.rotateY(Math.PI / 4);
    const capMesh = new THREE.Mesh(capGeo, goldMat);
    capMesh.position.y = 65 - 3;
    pyramid.add(capMesh);

    // Giant Skyward Luxor-style Cyan Spotlight Beam
    const beamGeo = new THREE.CylinderGeometry(1.2, 14, 250, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 180;
    pyramid.add(beam);

    return pyramid;
  }

  /**
   * Comprehensive GTA Map Scenery Builder (Los Santos, San Fierro, Las Venturas, Vice City)
   */
  public static buildGTAMapScenery(
    trackCurve: THREE.CatmullRomCurve3,
    trackWidth: number,
    scene: THREE.Scene | THREE.Group,
    mapType: string
  ): THREE.Group {
    const sceneryGroup = new THREE.Group();
    const segments = 180;
    const roadHalf = trackWidth / 2;

    // 1. Add Default Highway Infrastructure (Guardrails, Lamps, City Skyscrapers)
    this.buildGTACityScenery(trackCurve, trackWidth, sceneryGroup);

    // 2. Add Specific Landmarks based on GTA Map Type
    if (mapType === 'san_andreas_los_santos') {
      // Iconic Los Santos Maze Bank Tower at center
      const mazeBank = this.createMazeBankTower(0, 0);
      sceneryGroup.add(mazeBank);

      // Vinewood Hills with giant 3D VINEWOOD Letters overlooking northern loop
      const vinewood = this.createVinewoodSign(10, 12, 160, 0);
      sceneryGroup.add(vinewood);

      // California Palm Trees along straightaway (segments 10 to 40)
      for (let s = 10; s <= 50; s += 4) {
        const u = s / segments;
        const pt = safeGetPointAt(trackCurve, u);
        const tg = safeGetTangentAt(trackCurve, u);
        const norm = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize();

        const palmL = this.createPalmTree(pt.x - norm.x * (roadHalf + 3.5), pt.y, pt.z - norm.z * (roadHalf + 3.5), 1.1);
        const palmR = this.createPalmTree(pt.x + norm.x * (roadHalf + 3.5), pt.y, pt.z + norm.z * (roadHalf + 3.5), 1.05);
        sceneryGroup.add(palmL, palmR);
      }
    } else if (mapType === 'san_andreas_san_fierro') {
      // Gant Bridge (Golden Gate style) towering over the long straight
      const bridge = this.createGantBridge(0, 0, -110, 0);
      sceneryGroup.add(bridge);

      // Additional suspension tower
      const bridge2 = this.createGantBridge(80, 2, -120, 0.1);
      sceneryGroup.add(bridge2);
    } else if (mapType === 'san_andreas_las_venturas') {
      // Las Venturas The Strip Casino Pyramid
      const pyramid = this.createCasinoPyramid(30, -30);
      sceneryGroup.add(pyramid);

      // Neon Palm Trees
      for (let s = 0; s < segments; s += 8) {
        const u = s / segments;
        const pt = safeGetPointAt(trackCurve, u);
        const tg = safeGetTangentAt(trackCurve, u);
        const norm = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize();
        const palm = this.createPalmTree(pt.x + norm.x * (roadHalf + 4), pt.y, pt.z + norm.z * (roadHalf + 4), 1.2);
        sceneryGroup.add(palm);
      }
    } else if (mapType === 'vice_city_ocean_drive') {
      // Vice City Ocean Palms everywhere
      for (let s = 0; s < segments; s += 4) {
        const u = s / segments;
        const pt = safeGetPointAt(trackCurve, u);
        const tg = safeGetTangentAt(trackCurve, u);
        const norm = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize();

        const palm = this.createPalmTree(pt.x + norm.x * (roadHalf + 3.8), pt.y, pt.z + norm.z * (roadHalf + 3.8), 1.15);
        sceneryGroup.add(palm);
      }

      // Ocean Plane with Tropical Turquoise Water
      const waterGeo = new THREE.PlaneGeometry(800, 800);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Vibrant tropical sea
        roughness: 0.1,
        metalness: 0.85
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(-250, -0.4, 0);
      sceneryGroup.add(water);
    }

    scene.add(sceneryGroup);
    return sceneryGroup;
  }

  /**
   * Applies graphics fidelity preset to WebGL renderer and scene
   */
  public static applyPreset(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    preset: GTAGraphicsPreset
  ) {
    if (preset === 'ULTRA') {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    } else if (preset === 'HIGH') {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
    } else {
      // PERFORMANCE
      renderer.shadowMap.enabled = false;
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.0;
    }
  }
}

/**
 * High-performance GTA Tire Smoke & Exhaust Flame Particle Engine
 */
export class GTAParticleSystem {
  public smokeParticles: THREE.Points;
  private smokeCount = 240;
  private smokeGeo: THREE.BufferGeometry;
  private smokePositions: Float32Array;
  private smokeAlphas: Float32Array;
  private smokeSizes: Float32Array;
  private smokeIndex = 0;

  // Drift Friction Sparks
  public sparkParticles: THREE.Points;
  private sparkCount = 100;
  private sparkGeo: THREE.BufferGeometry;
  private sparkPositions: Float32Array;
  private sparkVelocities: Float32Array;
  private sparkAlphas: Float32Array;
  private sparkIndex = 0;

  constructor(scene: THREE.Scene) {
    this.smokePositions = new Float32Array(this.smokeCount * 3);
    this.smokeAlphas = new Float32Array(this.smokeCount);
    this.smokeSizes = new Float32Array(this.smokeCount);

    for (let i = 0; i < this.smokeCount; i++) {
      this.smokePositions[i * 3] = 0;
      this.smokePositions[i * 3 + 1] = -100; // hide off-screen
      this.smokePositions[i * 3 + 2] = 0;
      this.smokeAlphas[i] = 0;
      this.smokeSizes[i] = 0;
    }

    this.smokeGeo = new THREE.BufferGeometry();
    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    this.smokeGeo.setAttribute('alpha', new THREE.BufferAttribute(this.smokeAlphas, 1));
    this.smokeGeo.setAttribute('size', new THREE.BufferAttribute(this.smokeSizes, 1));

    // Custom smoke particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(230, 235, 245, 0.85)');
    grad.addColorStop(0.5, 'rgba(180, 190, 205, 0.4)');
    grad.addColorStop(1, 'rgba(120, 130, 150, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const smokeTex = new THREE.CanvasTexture(canvas);

    const smokeMat = new THREE.PointsMaterial({
      map: smokeTex,
      size: 3.2,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.smokeParticles = new THREE.Points(this.smokeGeo, smokeMat);
    scene.add(this.smokeParticles);

    // Friction Sparks System
    this.sparkPositions = new Float32Array(this.sparkCount * 3);
    this.sparkVelocities = new Float32Array(this.sparkCount * 3);
    this.sparkAlphas = new Float32Array(this.sparkCount);

    for (let i = 0; i < this.sparkCount; i++) {
      this.sparkPositions[i * 3 + 1] = -100;
      this.sparkAlphas[i] = 0;
    }

    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));

    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 32;
    sparkCanvas.height = 32;
    const sCtx = sparkCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(16, 16, 1, 16, 16, 15);
    sGrad.addColorStop(0, '#ffffff');
    sGrad.addColorStop(0.3, '#ffcc00');
    sGrad.addColorStop(0.7, '#ff4400');
    sGrad.addColorStop(1, 'rgba(255, 68, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 32, 32);

    const sparkTex = new THREE.CanvasTexture(sparkCanvas);
    const sparkMat = new THREE.PointsMaterial({
      map: sparkTex,
      size: 1.1,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.sparkParticles = new THREE.Points(this.sparkGeo, sparkMat);
    scene.add(this.sparkParticles);
  }

  /**
   * Spawns tire smoke puffs at wheels when drifting or braking
   */
  public emitTireSmoke(pos: THREE.Vector3, intensity: number = 1.0) {
    if (intensity <= 0.05) return;

    for (let i = 0; i < 2; i++) {
      const idx = this.smokeIndex;
      this.smokePositions[idx * 3] = pos.x + (Math.random() - 0.5) * 0.8;
      this.smokePositions[idx * 3 + 1] = pos.y + 0.15;
      this.smokePositions[idx * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.8;
      this.smokeAlphas[idx] = Math.min(0.85, intensity * 0.8);
      this.smokeSizes[idx] = 1.6 + Math.random() * 1.2;

      this.smokeIndex = (this.smokeIndex + 1) % this.smokeCount;
    }

    this.smokeGeo.attributes.position.needsUpdate = true;
  }

  /**
   * Spawns realistic billowing dual-tire smoke clouds and friction sparks along both rear wheels
   */
  public emitDriftParticles(
    carPos: THREE.Vector3,
    carQuat: THREE.Quaternion,
    driftAngle: number,
    intensity: number = 1.0
  ) {
    if (intensity <= 0.05) return;

    // Contact patches of left and right rear tires
    const leftTire = new THREE.Vector3(-0.85, 0.12, -1.35).applyQuaternion(carQuat).add(carPos);
    const rightTire = new THREE.Vector3(0.85, 0.12, -1.35).applyQuaternion(carQuat).add(carPos);

    const tires = [leftTire, rightTire];
    tires.forEach(tire => {
      // 2 billowy smoke puffs per tire
      for (let p = 0; p < 2; p++) {
        const sIdx = this.smokeIndex;
        this.smokePositions[sIdx * 3] = tire.x + (Math.random() - 0.5) * 0.5;
        this.smokePositions[sIdx * 3 + 1] = tire.y + 0.12 + Math.random() * 0.2;
        this.smokePositions[sIdx * 3 + 2] = tire.z + (Math.random() - 0.5) * 0.5;
        this.smokeAlphas[sIdx] = Math.min(0.9, intensity * 0.85);
        this.smokeSizes[sIdx] = 2.0 + Math.random() * 1.5;
        this.smokeIndex = (this.smokeIndex + 1) % this.smokeCount;
      }
    });
    this.smokeGeo.attributes.position.needsUpdate = true;

    // Emit bright friction sparks during intense drifts or slides
    if (Math.abs(driftAngle) > 0.2 || intensity > 0.55) {
      const sparkCountToSpawn = 3;
      for (let s = 0; s < sparkCountToSpawn; s++) {
        const spIdx = this.sparkIndex;
        const emitter = Math.random() > 0.5 ? leftTire : rightTire;
        this.sparkPositions[spIdx * 3] = emitter.x + (Math.random() - 0.5) * 0.3;
        this.sparkPositions[spIdx * 3 + 1] = emitter.y + 0.05;
        this.sparkPositions[spIdx * 3 + 2] = emitter.z + (Math.random() - 0.5) * 0.3;

        // Velocity spraying outward and backward
        const lateralSign = driftAngle > 0 ? -1 : 1;
        this.sparkVelocities[spIdx * 3] = (Math.random() - 0.5 + lateralSign * 0.6) * 4.0;
        this.sparkVelocities[spIdx * 3 + 1] = Math.random() * 2.5 + 0.6;
        this.sparkVelocities[spIdx * 3 + 2] = -Math.random() * 5.0 - 1.0;
        this.sparkAlphas[spIdx] = 1.0;

        this.sparkIndex = (this.sparkIndex + 1) % this.sparkCount;
      }
      this.sparkGeo.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Updates particle life cycle
   */
  public update(delta: number) {
    // 1. Update billowing tire smoke
    for (let i = 0; i < this.smokeCount; i++) {
      if (this.smokeAlphas[i] > 0) {
        this.smokePositions[i * 3 + 1] += delta * 2.2; // Drifts upward
        this.smokeAlphas[i] -= delta * 1.1;            // Fades out
        if (this.smokeAlphas[i] <= 0) {
          this.smokeAlphas[i] = 0;
          this.smokePositions[i * 3 + 1] = -100;
        }
      }
    }
    this.smokeGeo.attributes.position.needsUpdate = true;

    // 2. Update friction sparks
    for (let i = 0; i < this.sparkCount; i++) {
      if (this.sparkAlphas[i] > 0) {
        this.sparkPositions[i * 3] += this.sparkVelocities[i * 3] * delta;
        this.sparkPositions[i * 3 + 1] += this.sparkVelocities[i * 3 + 1] * delta;
        this.sparkPositions[i * 3 + 2] += this.sparkVelocities[i * 3 + 2] * delta;

        this.sparkVelocities[i * 3 + 1] -= 9.8 * delta; // Gravity
        this.sparkAlphas[i] -= delta * 2.8;             // Rapid burn out
        if (this.sparkAlphas[i] <= 0 || this.sparkPositions[i * 3 + 1] <= 0) {
          this.sparkAlphas[i] = 0;
          this.sparkPositions[i * 3 + 1] = -100;
        }
      }
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }
}

/**
 * Dynamic Asphalt Rubber Skidmark Ribbons System
 */
export class GTASkidmarkSystem {
  private maxMarks = 240;
  private markIndex = 0;
  private mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(0.38, 1.2);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.maxMarks);
    // Hide all initially
    for (let i = 0; i < this.maxMarks; i++) {
      this.dummy.position.set(0, -100, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    scene.add(this.mesh);
  }

  public addMark(pos: THREE.Vector3, dir: THREE.Vector3) {
    this.dummy.position.copy(pos);
    this.dummy.position.y += 0.08;
    this.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.dummy.updateMatrix();

    this.mesh.setMatrixAt(this.markIndex, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.markIndex = (this.markIndex + 1) % this.maxMarks;
  }

  /**
   * Adds dual parallel rubber marks under left and right rear tires
   */
  public addDualMarks(carPos: THREE.Vector3, carQuat: THREE.Quaternion, forwardDir: THREE.Vector3) {
    const leftMarkPos = new THREE.Vector3(-0.85, 0.02, -1.35).applyQuaternion(carQuat).add(carPos);
    const rightMarkPos = new THREE.Vector3(0.85, 0.02, -1.35).applyQuaternion(carQuat).add(carPos);

    this.addMark(leftMarkPos, forwardDir);
    this.addMark(rightMarkPos, forwardDir);
  }

  public setColor(colorHex: number, opacity: number = 0.65) {
    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = opacity;
    mat.needsUpdate = true;
  }
}
