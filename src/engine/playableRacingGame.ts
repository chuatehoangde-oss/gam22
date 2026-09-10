import * as THREE from 'three';
import { safeGetPointAt, safeGetTangentAt, getSafeCurveU } from './curveUtils';
import { audioEngine } from './audioEngine';
import {
  GTAGraphicsEngine,
  GTAGraphicsPreset,
  GTACarVisuals,
  GTAParticleSystem,
  GTASkidmarkSystem
} from './gtaGraphicsEngine';
import { FiveMCar, getCarById, FIVEM_LORE_FRIENDLY_CAR_PACK } from '../data/fivemCarPack';

export type DrivingAssistMode = 'BEGINNER' | 'SPORT' | 'SIMULATION';
export type PlayerCameraType = 'CHASE' | 'COCKPIT' | 'HOOD' | 'BUMPER' | 'CINEMATIC';
export type WeatherType = 'SUNNY' | 'RAIN' | 'SUNSET' | 'NIGHT' | 'WINTERV';

export interface PerformanceStats {
  fps: number;
  avgFrameTimeMs: number;
  gameThreadMs: number;
  renderThreadMs: number;
  gpuTimeMs: number;
  onePercentLowFps: number;
  zeroPointOnePercentLowFps: number;
  bottleneck: 'BALANCED' | 'GPU BOUND' | 'CPU GAME THREAD' | 'RENDER THREAD';
  drawCalls: number;
  triangles: number;
}

export interface PlayerCarTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number; // 0 = R, 1..6
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  isDrifting: boolean;
  driftAngle: number;
  isAbsActive: boolean;
  isTcsActive: boolean;
  gForceLat: number;
  gForceLong: number;
  lap: number;
  rank: number;
  lapProgress: number; // 0..1
  currentLapTime: number;
  bestLapTime: number;
  lastLapTime: number;
  isWrongWay: boolean;
  damagePct: number;
  carId: string;
  carName: string;
  carBrand: string;
}

export interface AICarRival {
  id: string;
  name: string;
  color: number;
  lapProgress: number;
  lateralOffset: number;
  speed: number;
  targetSpeed: number;
  maxSpeed: number;
  lap: number;
  rank: number;
  meshGroup: THREE.Group;
  wheels: THREE.Mesh[];
  meshIndex: number;
  isDrifting: boolean;
}

export class PlayableRacingGame {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Track & Spline
  public trackCurve!: THREE.CatmullRomCurve3;
  public totalTrackLength: number = 1000;
  public trackMeshGroup: THREE.Group = new THREE.Group();
  public citySceneryGroup?: THREE.Group;
  public currentGTAMap: string = 'san_andreas_los_santos';
  public trackWidth: number = 14.0;
  public roadMesh?: THREE.Mesh;
  public groundMesh?: THREE.Mesh;

  // Weather & Lighting
  public currentWeather: WeatherType = 'SUNSET';
  public previousWeather: WeatherType = 'SUNSET';
  public dirLight!: THREE.DirectionalLight;
  public ambientLight!: THREE.AmbientLight;
  public rainParticles?: THREE.Points;

  // GTA Graphics & Visual Systems
  public playerVisuals?: GTACarVisuals;
  public gtaParticles?: GTAParticleSystem;
  public gtaSkidmarks?: GTASkidmarkSystem;
  public graphicsPreset: GTAGraphicsPreset = 'ULTRA';
  public underglowEnabled: boolean = true;
  public underglowColor: number = 0x00f0ff;
  public tireSmokeEnabled: boolean = true;
  public skidmarksEnabled: boolean = true;

  // Player Vehicle
  public currentCar: FiveMCar = getCarById('xedep_mod_04') || FIVEM_LORE_FRIENDLY_CAR_PACK[0];
  public currentPaintColorHex: number = 0x00f2fe;
  public playerGroup: THREE.Group = new THREE.Group();
  public playerWheels: THREE.Mesh[] = [];
  public playerHeadlights: THREE.SpotLight[] = [];
  public playerTaillights: THREE.Mesh[] = [];

  // Nitro Flame Exhaust System
  public exhaustFlameGroup: THREE.Group = new THREE.Group();
  public exhaustFlameOuterMeshes: THREE.Mesh[] = [];
  public exhaustFlameCoreMeshes: THREE.Mesh[] = [];
  public exhaustFlameLight?: THREE.PointLight;

  // Real LED Taillights & Dynamic Brake Light System
  public taillightMeshGroup: THREE.Group = new THREE.Group();
  public taillightLEDMeshes: THREE.Mesh[] = [];
  public taillightBloomHalos: THREE.Mesh[] = [];
  public brakeLightPointLight?: THREE.PointLight;

  // Vehicle Mechanics
  public playerSpeed: number = 0; // km/h
  public playerRpm: number = 900;
  public playerGear: number = 1;
  public playerLapProgress: number = 0.02;
  public playerLateralOffset: number = -0.2; // -1 to 1
  public playerSteerAngle: number = 0;
  public playerLap: number = 1;
  public playerTotalScore: number = 0;
  public isDrifting: boolean = false;
  public driftAngle: number = 0;
  public damagePct: number = 0;

  // Assists
  public assistMode: DrivingAssistMode = 'SPORT';
  public isAbsActive: boolean = false;
  public isTcsActive: boolean = false;

  // Camera settings
  public cameraMode: PlayerCameraType = 'CHASE';
  private smoothedCamPos = new THREE.Vector3();
  private smoothedCamLookAt = new THREE.Vector3();
  private camBaseFov = 60;
  private camCurrentFov = 60;

  // AI Rivals
  public aiRivals: AICarRival[] = [];

  // Controls input state
  public input = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false
  };

  // Timing & Laps
  public raceState: 'COUNTDOWN' | 'RACING' | 'FINISHED' = 'COUNTDOWN';
  public countdownTimer: number = 3.9;
  public currentLapTime: number = 0;
  public bestLapTime: number = 0;
  public lastLapTime: number = 0;
  public isWrongWay: boolean = false;
  public totalLaps: number = 3;

  // Performance Profiler (F3)
  public frameTimes: number[] = [];
  public perfStats: PerformanceStats = {
    fps: 60,
    avgFrameTimeMs: 16.6,
    gameThreadMs: 2.1,
    renderThreadMs: 4.2,
    gpuTimeMs: 8.5,
    onePercentLowFps: 58,
    zeroPointOnePercentLowFps: 54,
    bottleneck: 'BALANCED',
    drawCalls: 45,
    triangles: 12500
  };
  public fpsCap: number = 0; // 0 = unlimited / VSync
  public vsyncEnabled: boolean = true;

  // Internal loop
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private isDestroyed: boolean = false;
  private isRunning: boolean = false;

  // Callbacks
  public onTelemetryUpdate?: (t: PlayerCarTelemetry) => void;
  public onPerfUpdate?: (p: PerformanceStats) => void;
  public onCountdownTick?: (n: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // WebGL Renderer with Anti-Aliasing and proper tone mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.camBaseFov,
      canvas.clientWidth / canvas.clientHeight,
      0.2,
      1200
    );

    this.initScene();
    this.gtaParticles = new GTAParticleSystem(this.scene);
    this.gtaSkidmarks = new GTASkidmarkSystem(this.scene);
    this.buildTrack();
    this.buildPlayerCar();
    this.buildAIRivals();
    this.setupWeather(this.currentWeather);

    // Bind window resize
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (!this.canvas || this.isDestroyed) return;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private initScene() {
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 1.2);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.dirLight.position.set(120, 180, 80);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 500;
    this.dirLight.shadow.camera.left = -150;
    this.dirLight.shadow.camera.right = 150;
    this.dirLight.shadow.camera.top = 150;
    this.dirLight.shadow.camera.bottom = -150;
    this.scene.add(this.dirLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x18241b,
      roughness: 0.95,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.groundMesh = ground;
    this.scene.add(ground);
  }

  private buildTrack(mapType = this.currentGTAMap) {
    this.currentGTAMap = mapType;
    let points: THREE.Vector3[] = [];

    if (mapType === 'san_andreas_san_fierro') {
      // San Fierro & Gant Bridge: Long bridge straightaway over water and steep hillside twists
      points = [
        new THREE.Vector3(0, 0, -160),
        new THREE.Vector3(70, 0, -160),
        new THREE.Vector3(150, 4, -100),
        new THREE.Vector3(180, 14, -20),
        new THREE.Vector3(140, 18, 60),
        new THREE.Vector3(60, 8, 120),
        new THREE.Vector3(-40, 2, 110),
        new THREE.Vector3(-120, 10, 40),
        new THREE.Vector3(-150, 6, -50),
        new THREE.Vector3(-80, 0, -130)
      ];
    } else if (mapType === 'san_andreas_las_venturas') {
      // Las Venturas The Strip: Ultra-fast desert diamond boulevard, smooth flowing curves
      points = [
        new THREE.Vector3(0, 0, -140),
        new THREE.Vector3(120, 1, -120),
        new THREE.Vector3(190, 2, -30),
        new THREE.Vector3(170, 3, 70),
        new THREE.Vector3(80, 2, 140),
        new THREE.Vector3(-50, 1, 130),
        new THREE.Vector3(-150, 2, 60),
        new THREE.Vector3(-180, 1, -40),
        new THREE.Vector3(-100, 0, -110)
      ];
    } else if (mapType === 'vice_city_ocean_drive') {
      // Vice City Ocean Drive: Oceanfront sweeping coastal boulevard with palm beach straight
      points = [
        new THREE.Vector3(-80, 0, -150),
        new THREE.Vector3(20, 1, -130),
        new THREE.Vector3(110, 1, -60),
        new THREE.Vector3(140, 2, 20),
        new THREE.Vector3(120, 1, 100),
        new THREE.Vector3(30, 0, 140),
        new THREE.Vector3(-70, 0, 120),
        new THREE.Vector3(-130, 1, 40),
        new THREE.Vector3(-140, 0, -60)
      ];
    } else {
      // Default: Los Santos Downtown & Vinewood Highway
      points = [
        new THREE.Vector3(0, 0, -120),
        new THREE.Vector3(90, 4, -130),
        new THREE.Vector3(160, 2, -60),
        new THREE.Vector3(180, 8, 40),
        new THREE.Vector3(120, 10, 110),
        new THREE.Vector3(40, 5, 140),
        new THREE.Vector3(-60, 1, 120),
        new THREE.Vector3(-140, 6, 60),
        new THREE.Vector3(-170, 3, -40),
        new THREE.Vector3(-110, 0, -100)
      ];
    }

    this.trackCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    this.totalTrackLength = this.trackCurve.getLength();

    // Road Ribbon Mesh
    const segments = 240;
    const roadHalfWidth = this.trackWidth / 2;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const pt = safeGetPointAt(this.trackCurve, u);
      const tg = safeGetTangentAt(this.trackCurve, u);
      const normal = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize();

      const left = pt.clone().addScaledVector(normal, -roadHalfWidth);
      const right = pt.clone().addScaledVector(normal, roadHalfWidth);

      positions.push(left.x, left.y + 0.05, left.z);
      positions.push(right.x, right.y + 0.05, right.z);

      uvs.push(0, (i / segments) * 40);
      uvs.push(1, (i / segments) * 40);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      map: GTAGraphicsEngine.getAsphaltTexture(),
      bumpMap: GTAGraphicsEngine.getAsphaltBumpTexture(),
      bumpScale: 0.05,
      roughness: 0.65,
      metalness: 0.2
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.roadMesh = roadMesh;
    this.trackMeshGroup.add(roadMesh);

    // Red/White Curbs
    const curbSegments = 240;
    for (let i = 0; i < curbSegments; i += 2) {
      const u = i / curbSegments;
      const pt = safeGetPointAt(this.trackCurve, u);
      const tg = safeGetTangentAt(this.trackCurve, u);
      const normal = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 1, 0)).normalize();

      const isWhite = (i / 2) % 2 === 0;
      const curbMat = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xffffff : 0xef4444,
        roughness: 0.5
      });

      const curbGeo = new THREE.BoxGeometry(0.8, 0.2, 2.5);
      const curbL = new THREE.Mesh(curbGeo, curbMat);
      curbL.position.copy(pt).addScaledVector(normal, -roadHalfWidth - 0.4);
      curbL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg);
      this.trackMeshGroup.add(curbL);

      const curbR = new THREE.Mesh(curbGeo, curbMat);
      curbR.position.copy(pt).addScaledVector(normal, roadHalfWidth + 0.4);
      curbR.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg);
      this.trackMeshGroup.add(curbR);
    }

    // Start / Finish Arch Gantry
    const startPt = safeGetPointAt(this.trackCurve, 0);
    const startTg = safeGetTangentAt(this.trackCurve, 0);
    const startNorm = new THREE.Vector3().crossVectors(startTg, new THREE.Vector3(0, 1, 0)).normalize();

    const archGroup = new THREE.Group();
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.4, 7, 12);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    const pLeft = new THREE.Mesh(pillarGeo, metalMat);
    pLeft.position.copy(startPt).addScaledVector(startNorm, -roadHalfWidth - 1.2);
    pLeft.position.y += 3.5;
    archGroup.add(pLeft);

    const pRight = new THREE.Mesh(pillarGeo, metalMat);
    pRight.position.copy(startPt).addScaledVector(startNorm, roadHalfWidth + 1.2);
    pRight.position.y += 3.5;
    archGroup.add(pRight);

    const beamGeo = new THREE.BoxGeometry(this.trackWidth + 3, 1.2, 1.2);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.5, roughness: 0.4 }));
    beam.position.copy(startPt);
    beam.position.y += 7.0;
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), startNorm);
    archGroup.add(beam);

    this.trackMeshGroup.add(archGroup);
    this.scene.add(this.trackMeshGroup);

    // Build GTA Authentic Map Scenery & Landmarks
    this.citySceneryGroup = GTAGraphicsEngine.buildGTAMapScenery(
      this.trackCurve,
      this.trackWidth,
      this.scene,
      mapType
    );
  }

  public setGTAMap(mapId: string) {
    this.currentGTAMap = mapId;

    // Remove old track mesh & scenery
    if (this.trackMeshGroup) {
      this.scene.remove(this.trackMeshGroup);
      this.trackMeshGroup = new THREE.Group();
    }
    if (this.citySceneryGroup) {
      this.scene.remove(this.citySceneryGroup);
      this.citySceneryGroup = undefined;
    }

    // Rebuild track & scenery
    this.buildTrack(mapId);

    // Reset cars
    this.resetCar();
    this.playerLap = 1;
    this.playerLapProgress = 0.02;
    this.playerSpeed = 0;
    this.raceState = 'COUNTDOWN';
    this.countdownTimer = 3.9;

    // Reset AI rivals
    this.aiRivals.forEach((ai, idx) => {
      ai.lapProgress = 0.045 - idx * 0.01;
      ai.speed = 0;
      ai.lap = 1;
      ai.rank = idx + 2;
    });
  }

  private buildPlayerCar() {
    this.currentPaintColorHex = parseInt(this.currentCar.defaultColor.replace('#', '0x'), 16);
    this.playerVisuals = GTAGraphicsEngine.createFiveMCar(this.currentCar, this.currentPaintColorHex, true);
    this.playerGroup = this.playerVisuals.group;
    this.playerWheels = this.playerVisuals.wheels;
    this.playerHeadlights = this.playerVisuals.headlightBeams;
    this.playerTaillights = this.playerVisuals.taillights;
    this.scene.add(this.playerGroup);
    this.setupPlayerVehicleEffects();
  }

  public setFiveMCar(carId: string) {
    const newCar = getCarById(carId);
    if (!newCar) return;
    this.currentCar = newCar;

    const currentPos = this.playerGroup.position.clone();
    const currentQuat = this.playerGroup.quaternion.clone();

    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
    }

    this.currentPaintColorHex = parseInt(newCar.defaultColor.replace('#', '0x'), 16);
    this.playerVisuals = GTAGraphicsEngine.createFiveMCar(newCar, this.currentPaintColorHex, true);
    this.playerGroup = this.playerVisuals.group;
    this.playerWheels = this.playerVisuals.wheels;
    this.playerHeadlights = this.playerVisuals.headlightBeams;
    this.playerTaillights = this.playerVisuals.taillights;

    this.playerGroup.position.copy(currentPos);
    this.playerGroup.quaternion.copy(currentQuat);

    this.scene.add(this.playerGroup);
    this.setupPlayerVehicleEffects();
  }

  private setupPlayerVehicleEffects() {
    // 1. Dual Exhaust Nitro Backfire Flame System
    this.exhaustFlameGroup = new THREE.Group();
    this.exhaustFlameGroup.name = 'EXHAUST_FLAME_GROUP';
    this.exhaustFlameOuterMeshes = [];
    this.exhaustFlameCoreMeshes = [];

    const pipeOffsets = [-0.38, 0.38];
    pipeOffsets.forEach(xOffset => {
      const jetGroup = new THREE.Group();
      jetGroup.position.set(xOffset, 0.36, -2.18);

      // Outer fire plume cone pointing backwards
      const outerGeo = new THREE.ConeGeometry(0.13, 0.85, 12);
      outerGeo.rotateX(-Math.PI / 2);
      outerGeo.translate(0, 0, -0.42);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xff3b00,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const outerMesh = new THREE.Mesh(outerGeo, outerMat);
      jetGroup.add(outerMesh);
      this.exhaustFlameOuterMeshes.push(outerMesh);

      // Inner hot cyan core cone
      const coreGeo = new THREE.ConeGeometry(0.065, 0.52, 12);
      coreGeo.rotateX(-Math.PI / 2);
      coreGeo.translate(0, 0, -0.26);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      jetGroup.add(coreMesh);
      this.exhaustFlameCoreMeshes.push(coreMesh);

      this.exhaustFlameGroup.add(jetGroup);
    });

    // Flickering fire PointLight situated at exhaust
    this.exhaustFlameLight = new THREE.PointLight(0xff5500, 0, 8.0, 2.0);
    this.exhaustFlameLight.position.set(0, 0.36, -2.35);
    this.exhaustFlameGroup.add(this.exhaustFlameLight);

    this.playerGroup.add(this.exhaustFlameGroup);

    // 2. Real LED Taillights & Dynamic Brake Lights
    this.taillightMeshGroup = new THREE.Group();
    this.taillightMeshGroup.name = 'TAILLIGHT_MESH_GROUP';
    this.taillightLEDMeshes = [];
    this.taillightBloomHalos = [];

    // Red lens flare halo texture
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 64;
    haloCanvas.height = 64;
    const hCtx = haloCanvas.getContext('2d')!;
    const hGrad = hCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    hGrad.addColorStop(0, 'rgba(255, 40, 70, 0.95)');
    hGrad.addColorStop(0.35, 'rgba(239, 68, 68, 0.55)');
    hGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.15)');
    hGrad.addColorStop(1, 'rgba(180, 0, 0, 0)');
    hCtx.fillStyle = hGrad;
    hCtx.fillRect(0, 0, 64, 64);
    const haloTex = new THREE.CanvasTexture(haloCanvas);

    const tailConfigs = [
      { x: -0.56, y: 0.62, z: -2.18, w: 0.36, h: 0.08 },
      { x: 0.56, y: 0.62, z: -2.18, w: 0.36, h: 0.08 },
      { x: 0.0, y: 0.63, z: -2.16, w: 0.54, h: 0.05 }
    ];

    tailConfigs.forEach(cfg => {
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0xff0020,
        emissive: 0xdc2626,
        emissiveIntensity: 2.2,
        roughness: 0.1,
        metalness: 0.8
      });
      const ledMesh = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, 0.04), ledMat);
      ledMesh.position.set(cfg.x, cfg.y, cfg.z);
      this.taillightMeshGroup.add(ledMesh);
      this.taillightLEDMeshes.push(ledMesh);

      const haloMat = new THREE.MeshBasicMaterial({
        map: haloTex,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), haloMat);
      haloMesh.position.set(cfg.x, cfg.y, cfg.z - 0.03);
      haloMesh.rotation.y = Math.PI;
      this.taillightMeshGroup.add(haloMesh);
      this.taillightBloomHalos.push(haloMesh);
    });

    this.brakeLightPointLight = new THREE.PointLight(0xff0022, 1.8, 7.5, 2.0);
    this.brakeLightPointLight.position.set(0, 0.63, -2.35);
    this.taillightMeshGroup.add(this.brakeLightPointLight);

    this.playerGroup.add(this.taillightMeshGroup);
  }

  private buildAIRivals() {
    const aiConfigs = [
      { id: 'ai_1', carId: 'xedep_mod_01', name: 'Xe Đẹp Mod #1 Apex (USDZ)', color: 0xef4444, offset: 0.3, progress: 0.045 },
      { id: 'ai_2', carId: 'xedep_mod_02', name: 'Xe Đẹp Mod #2 GT (USDZ)', color: 0xf59e0b, offset: -0.4, progress: 0.035 },
      { id: 'ai_3', carId: 'xedep_mod_03', name: 'Xe Đẹp Mod #3 Track (USDZ)', color: 0x10b981, offset: 0.2, progress: 0.025 },
      { id: 'ai_4', carId: 'xedep_mod_05', name: 'Xe Đẹp Mod #5 Spyder (USDZ)', color: 0x8b5cf6, offset: -0.3, progress: 0.015 }
    ];

    this.aiRivals = [];

    aiConfigs.forEach((cfg, idx) => {
      const carData = getCarById(cfg.carId) || FIVEM_LORE_FRIENDLY_CAR_PACK[idx % FIVEM_LORE_FRIENDLY_CAR_PACK.length];
      const visuals = GTAGraphicsEngine.createFiveMCar(carData, cfg.color, false);
      visuals.headlightBeams.forEach(b => (b.intensity = 0));
      this.scene.add(visuals.group);

      this.aiRivals.push({
        id: cfg.id,
        name: cfg.name,
        color: cfg.color,
        lapProgress: cfg.progress,
        lateralOffset: cfg.offset,
        speed: 0,
        targetSpeed: carData.topSpeedKmh * 0.72,
        maxSpeed: carData.topSpeedKmh * 0.85,
        lap: 1,
        rank: idx + 2,
        meshGroup: visuals.group,
        wheels: visuals.wheels,
        meshIndex: idx,
        isDrifting: false
      });
    });
  }

  public setupWeather(weather: WeatherType) {
    this.currentWeather = weather;

    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainParticles = undefined;
    }

    // Dynamic Asphalt Wetness & Pavement Reflection
    if (this.roadMesh) {
      const roadMat = this.roadMesh.material as THREE.MeshStandardMaterial;
      if (weather === 'RAIN') {
        roadMat.roughness = 0.22;
        roadMat.metalness = 0.55;
        roadMat.color.setHex(0x222226);
      } else if (weather === 'NIGHT') {
        roadMat.roughness = 0.55;
        roadMat.metalness = 0.25;
        roadMat.color.setHex(0x222226);
      } else if (weather === 'WINTERV') {
        roadMat.roughness = 0.28;
        roadMat.metalness = 0.45;
        roadMat.color.setHex(0x718096); // Frosted snowy road surface
      } else {
        roadMat.roughness = 0.65;
        roadMat.metalness = 0.18;
        roadMat.color.setHex(0x222226);
      }
      roadMat.needsUpdate = true;
    }

    // Ground plane terrain: snow-covered white terrain in WinterV
    if (this.groundMesh) {
      const gMat = this.groundMesh.material as THREE.MeshStandardMaterial;
      if (weather === 'WINTERV') {
        gMat.color.setHex(0xf1f5f9); // Pure white snow terrain
      } else {
        gMat.color.setHex(0x18241b); // Normal terrain
      }
      gMat.needsUpdate = true;
    }

    // Skidmarks: white snow tracks in WinterV vs black rubber
    if (this.gtaSkidmarks) {
      if (weather === 'WINTERV') {
        this.gtaSkidmarks.setColor(0xe2e8f0, 0.85); // Snow tire tracks
      } else {
        this.gtaSkidmarks.setColor(0x09090b, 0.65); // Asphalt rubber marks
      }
    }

    if (weather === 'SUNNY') {
      // GTA Pacific Bluffs High Noon
      this.scene.background = new THREE.Color(0x38bdf8);
      this.scene.fog = new THREE.FogExp2(0xbbe4fb, 0.0012);
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 1.4;
      this.dirLight.color.setHex(0xfffae0);
      this.dirLight.intensity = 2.6;
      this.renderer.toneMappingExposure = 1.1;
      this.playerHeadlights.forEach(h => (h.intensity = 0));
    } else if (weather === 'SUNSET') {
      // GTA Vinewood Hills Golden Hour
      this.scene.background = new THREE.Color(0xf95738);
      this.scene.fog = new THREE.FogExp2(0xf43f5e, 0.0018);
      this.ambientLight.color.setHex(0xffcaa2);
      this.ambientLight.intensity = 1.2;
      this.dirLight.color.setHex(0xffa834);
      this.dirLight.intensity = 2.2;
      this.renderer.toneMappingExposure = 1.15;
      this.playerHeadlights.forEach(h => (h.intensity = 25));
    } else if (weather === 'NIGHT') {
      // GTA Downtown Los Santos Neon Midnight
      this.scene.background = new THREE.Color(0x050814);
      this.scene.fog = new THREE.FogExp2(0x0c1428, 0.0028);
      this.ambientLight.color.setHex(0x1e293b);
      this.ambientLight.intensity = 0.6;
      this.dirLight.color.setHex(0x60a5fa);
      this.dirLight.intensity = 0.8;
      this.renderer.toneMappingExposure = 1.25;
      this.playerHeadlights.forEach(h => (h.intensity = 95));
    } else if (weather === 'RAIN') {
      // GTA Stormy Wet Asphalt Look
      this.scene.background = new THREE.Color(0x1e293b);
      this.scene.fog = new THREE.FogExp2(0x334155, 0.0035);
      this.ambientLight.color.setHex(0x94a3b8);
      this.ambientLight.intensity = 0.9;
      this.dirLight.color.setHex(0xcbd5e1);
      this.dirLight.intensity = 1.3;
      this.renderer.toneMappingExposure = 1.05;
      this.playerHeadlights.forEach(h => (h.intensity = 60));

      // Build Rain Particle System
      const rainCount = 3200;
      const rainGeo = new THREE.BufferGeometry();
      const rainPos: number[] = [];
      for (let i = 0; i < rainCount; i++) {
        rainPos.push(
          Math.random() * 320 - 160,
          Math.random() * 60 + 5,
          Math.random() * 320 - 160
        );
      }
      rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
      const rainMat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.28,
        transparent: true,
        opacity: 0.7
      });
      this.rainParticles = new THREE.Points(rainGeo, rainMat);
      this.scene.add(this.rainParticles);
    } else if (weather === 'WINTERV') {
      // WinterV - Beta V0.4 Blizzard Snow Overhaul
      this.scene.background = new THREE.Color(0xb8c9dc);
      this.scene.fog = new THREE.FogExp2(0xdfe8f0, 0.0052);
      this.ambientLight.color.setHex(0xdbeafe);
      this.ambientLight.intensity = 1.35;
      this.dirLight.color.setHex(0xf8fafc);
      this.dirLight.intensity = 1.6;
      this.renderer.toneMappingExposure = 1.15;
      this.playerHeadlights.forEach(h => (h.intensity = 85));

      // Build Blizzard Snow Particle System (4,500 drifting snowflakes)
      const snowCount = 4500;
      const snowGeo = new THREE.BufferGeometry();
      const snowPos: number[] = [];
      for (let i = 0; i < snowCount; i++) {
        snowPos.push(
          Math.random() * 360 - 180,
          Math.random() * 65 + 5,
          Math.random() * 360 - 180
        );
      }
      snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPos, 3));
      const snowMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.38,
        transparent: true,
        opacity: 0.85
      });
      this.rainParticles = new THREE.Points(snowGeo, snowMat);
      this.scene.add(this.rainParticles);
    }
  }

  public toggleWinterV(): boolean {
    if (this.currentWeather === 'WINTERV') {
      this.setupWeather(this.previousWeather !== 'WINTERV' ? this.previousWeather : 'SUNSET');
      return false;
    } else {
      this.previousWeather = this.currentWeather;
      this.setupWeather('WINTERV');
      return true;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private animate = (timestamp: number) => {
    if (!this.isRunning || this.isDestroyed) return;

    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(0.06, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    const gameThreadStart = performance.now();

    // 1. Race Flow & Countdown
    if (this.raceState === 'COUNTDOWN') {
      this.countdownTimer -= delta;
      if (this.onCountdownTick) {
        this.onCountdownTick(Math.max(0, Math.ceil(this.countdownTimer)));
      }
      if (this.countdownTimer <= 0) {
        this.raceState = 'RACING';
        audioEngine.playCountdownBeep(true);
      }
    } else if (this.raceState === 'RACING') {
      this.currentLapTime += delta;
    }

    // 2. Physics & Player Car Update
    this.updatePlayerPhysics(delta);

    // 3. AI Opponents Update
    this.updateAIOpponents(delta);

    // 4. Update Race Standings & Checkpoints
    this.updateLeaderboard();

    // 5. Camera Director Update
    this.updateCamera(delta);

    // 6. Weather Particles Animation (Rain / Snow Blizzard)
    if (this.rainParticles) {
      const posAttr = this.rainParticles.geometry.attributes.position;
      const isWinterV = this.currentWeather === 'WINTERV';
      const fallSpeed = isWinterV ? delta * 18 : delta * 45;
      const driftSpeed = isWinterV ? delta * 8 : 0;

      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - fallSpeed;
        if (y < 0) y = 60;
        posAttr.setY(i, y);

        if (isWinterV) {
          let x = posAttr.getX(i) + driftSpeed;
          if (x > 180) x = -180;
          posAttr.setX(i, x);
        }
      }
      posAttr.needsUpdate = true;
    }

    // 1. GTA Drift Effects: Billowing Dual-Tire Smoke, Friction Sparks & Dual Skidmarks
    if (this.gtaParticles) {
      this.gtaParticles.update(delta);
    }
    const isDriftingNow =
      this.isDrifting ||
      (this.input.handbrake && this.playerSpeed > 15) ||
      (Math.abs(this.playerSteerAngle) > 0.22 && this.playerSpeed > 35) ||
      (this.input.brake > 0.45 && this.playerSpeed > 40);

    if (isDriftingNow) {
      const driftIntensity = Math.min(
        1.0,
        Math.abs(this.driftAngle) * 1.6 + (this.input.handbrake ? 0.65 : 0.35)
      );
      if (this.gtaParticles && this.tireSmokeEnabled) {
        this.gtaParticles.emitDriftParticles(
          this.playerGroup.position,
          this.playerGroup.quaternion,
          this.driftAngle,
          driftIntensity
        );
      }
      if (this.gtaSkidmarks && this.skidmarksEnabled) {
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerGroup.quaternion);
        this.gtaSkidmarks.addDualMarks(this.playerGroup.position, this.playerGroup.quaternion, fwd);
      }
    }

    // 2. Tăng tốc Phun lửa (Acceleration / Nitro Exhaust Backfire Flames)
    const isAccelerating =
      this.input.throttle > 0.28 ||
      (this.input.handbrake && this.input.throttle > 0.2);
    const isNitroBoost =
      (this.input.throttle > 0.68 && this.playerRpm > 3600) ||
      (this.playerSpeed > 150 && this.input.throttle > 0.45);

    if (isNitroBoost) {
      // Roaring Nitro flames shooting backward with turbulence
      const flameTurbulence = 1.0 + Math.random() * 0.45;
      this.exhaustFlameOuterMeshes.forEach(mesh => {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
        mesh.scale.set(1.15 + Math.random() * 0.3, 1.15 + Math.random() * 0.3, flameTurbulence * 1.6);
      });
      this.exhaustFlameCoreMeshes.forEach(mesh => {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
        mesh.scale.set(1.0 + Math.random() * 0.2, 1.0 + Math.random() * 0.2, flameTurbulence * 1.2);
      });
      if (this.exhaustFlameLight) {
        this.exhaustFlameLight.intensity = 5.5 + Math.random() * 2.5;
        this.exhaustFlameLight.color.setHex(Math.random() > 0.35 ? 0xff4500 : 0x00f0ff);
      }
    } else if (isAccelerating) {
      // Normal acceleration throttle flame flicker
      const throttleFlame = 0.7 + this.input.throttle * 0.7 + Math.random() * 0.25;
      const flicker = Math.random() > 0.25 ? 0.8 : 0.35;
      this.exhaustFlameOuterMeshes.forEach(mesh => {
        (mesh.material as THREE.MeshBasicMaterial).opacity = flicker;
        mesh.scale.set(0.95, 0.95, throttleFlame);
      });
      this.exhaustFlameCoreMeshes.forEach(mesh => {
        (mesh.material as THREE.MeshBasicMaterial).opacity = flicker * 0.9;
        mesh.scale.set(0.9, 0.9, throttleFlame * 0.8);
      });
      if (this.exhaustFlameLight) {
        this.exhaustFlameLight.intensity = (2.2 + Math.random() * 1.5) * this.input.throttle;
        this.exhaustFlameLight.color.setHex(0xff5500);
      }
    } else {
      // Idle / coasting - flames off
      this.exhaustFlameOuterMeshes.forEach(mesh => {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      });
      this.exhaustFlameCoreMeshes.forEach(mesh => {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      });
      if (this.exhaustFlameLight) {
        this.exhaustFlameLight.intensity = 0;
      }
    }

    // 3. Đèn đuôi xe (Real LED Taillights & Dynamic Brake Lights)
    const isBraking = this.input.brake > 0.05 || this.input.handbrake;
    if (isBraking) {
      // Hyper-bright incandescent red brake lights + halo flare expansion
      this.taillightLEDMeshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0xff0025);
        mat.emissiveIntensity = 6.5;
      });
      this.taillightBloomHalos.forEach(halo => {
        (halo.material as THREE.MeshBasicMaterial).opacity = 0.95;
        halo.scale.set(1.85, 1.85, 1.85);
      });
      if (this.brakeLightPointLight) {
        this.brakeLightPointLight.color.setHex(0xff0025);
        this.brakeLightPointLight.intensity = 7.5;
      }
    } else {
      // Running taillights (sleek red LED glow)
      this.taillightLEDMeshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0xdc2626);
        mat.emissiveIntensity = 2.4;
      });
      this.taillightBloomHalos.forEach(halo => {
        (halo.material as THREE.MeshBasicMaterial).opacity = 0.55;
        halo.scale.set(1.0, 1.0, 1.0);
      });
      if (this.brakeLightPointLight) {
        this.brakeLightPointLight.color.setHex(0xdc2626);
        this.brakeLightPointLight.intensity =
          this.currentWeather === 'NIGHT' || this.currentWeather === 'SUNSET' ? 2.5 : 1.2;
      }
    }

    // Underglow sync
    if (this.playerVisuals && this.playerVisuals.underglowMesh) {
      this.playerVisuals.underglowMesh.visible = this.underglowEnabled;
      if (this.underglowEnabled) {
        (this.playerVisuals.underglowMesh.material as THREE.MeshBasicMaterial).color.setHex(this.underglowColor);
        if (this.playerVisuals.underglowLight) {
          this.playerVisuals.underglowLight.color.setHex(this.underglowColor);
          this.playerVisuals.underglowLight.intensity =
            this.currentWeather === 'NIGHT' || this.currentWeather === 'SUNSET' ? 2.5 : 1.2;
        }
      }
    }

    const gameThreadTime = performance.now() - gameThreadStart;

    // 7. Render Pass
    const renderThreadStart = performance.now();
    this.renderer.render(this.scene, this.camera);
    const renderThreadTime = performance.now() - renderThreadStart;

    // 8. Profiler & Frame Pacing Calculation
    this.updatePerformanceMetrics(delta, gameThreadTime, renderThreadTime);

    // 9. Sound Engine Synchronization
    audioEngine.update(
      this.playerRpm,
      this.input.throttle,
      this.isDrifting,
      this.input.brake > 0.4,
      this.playerSpeed
    );

    // 10. Emit Telemetry
    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate({
        speedKmh: Math.round(this.playerSpeed),
        rpm: Math.round(this.playerRpm),
        gear: this.playerGear,
        throttle: this.input.throttle,
        brake: this.input.brake,
        steer: this.input.steer,
        handbrake: this.input.handbrake,
        isDrifting: this.isDrifting,
        driftAngle: this.driftAngle,
        isAbsActive: this.isAbsActive,
        isTcsActive: this.isTcsActive,
        gForceLat: (this.playerSpeed / 100) * this.playerSteerAngle * 1.6,
        gForceLong: (this.input.throttle - this.input.brake) * 1.2,
        lap: this.playerLap,
        rank: this.getPlayerRank(),
        lapProgress: this.playerLapProgress,
        currentLapTime: this.currentLapTime,
        bestLapTime: this.bestLapTime,
        lastLapTime: this.lastLapTime,
        isWrongWay: this.isWrongWay,
        damagePct: Math.round(this.damagePct),
        carId: this.currentCar.id,
        carName: this.currentCar.name,
        carBrand: this.currentCar.brand
      });
    }
  };

  private updatePlayerPhysics(delta: number) {
    if (this.raceState === 'COUNTDOWN') {
      // Pre-race revving
      if (this.input.throttle > 0) {
        this.playerRpm = Math.min(6500, this.playerRpm + this.input.throttle * 3000 * delta);
      } else {
        this.playerRpm = Math.max(900, this.playerRpm - 1500 * delta);
      }
      return;
    }

    // Drivetrain Gearbox Simulation tailored to vehicle specs
    const topSpeed = this.currentCar.topSpeedKmh;
    const maxSpeedsPerGear = [
      Math.round(topSpeed * 0.22),
      Math.round(topSpeed * 0.38),
      Math.round(topSpeed * 0.54),
      Math.round(topSpeed * 0.70),
      Math.round(topSpeed * 0.85),
      topSpeed
    ];

    // Throttle & Braking calculation
    let effectiveThrottle = this.input.throttle;
    let effectiveBrake = this.input.brake;

    // Driving Assist: Traction Control (TCS)
    this.isTcsActive = false;
    if (this.assistMode !== 'SIMULATION' && this.isDrifting && effectiveThrottle > 0.6) {
      effectiveThrottle *= this.assistMode === 'BEGINNER' ? 0.4 : 0.7;
      this.isTcsActive = true;
    }

    // Driving Assist: ABS
    this.isAbsActive = false;
    if (this.assistMode !== 'SIMULATION' && effectiveBrake > 0.7 && this.playerSpeed > 30) {
      this.isAbsActive = true;
      effectiveBrake = 0.8;
    }

    // Acceleration & Drag scaled to car power
    const basePower = 380 + (this.currentCar.acceleration - 8.0) * 80;
    const maxEnginePower = basePower * (1 - this.damagePct * 0.005);
    if (effectiveThrottle > 0) {
      const accelRate = (maxEnginePower / 1350) * 8.8 * (1.1 - this.playerSpeed / (topSpeed + 15));
      this.playerSpeed += accelRate * effectiveThrottle * delta * 60;
    } else {
      // Engine braking & rolling resistance
      this.playerSpeed = Math.max(0, this.playerSpeed - 18 * delta);
    }

    // Braking
    if (effectiveBrake > 0) {
      const brakeForce = (90 + this.currentCar.handling * 2.5) * effectiveBrake;
      this.playerSpeed = Math.max(0, this.playerSpeed - brakeForce * delta);
    }

    // Handbrake
    if (this.input.handbrake) {
      this.playerSpeed = Math.max(0, this.playerSpeed - 45 * delta);
      this.isDrifting = this.playerSpeed > 35;
    }

    // Surface friction adjustment (Rain and WinterV snow reduce grip)
    const weatherGrip = this.currentWeather === 'WINTERV' ? 0.52 : (this.currentWeather === 'RAIN' ? 0.65 : 1.0);
    const surfaceGrip = weatherGrip * (this.currentCar.handling / 9.2);

    // Steering & Lateral Slip
    const maxSteerSpeedFactor = Math.max(0.25, 1.0 - (this.playerSpeed / (topSpeed + 20)) * 0.75);
    const targetSteerAngle = this.input.steer * maxSteerSpeedFactor;
    this.playerSteerAngle = THREE.MathUtils.lerp(this.playerSteerAngle, targetSteerAngle, delta * 12);

    // Calculate lateral shift along track width
    const lateralSpeed = (this.playerSpeed / 120) * this.playerSteerAngle * 0.45 * surfaceGrip;
    this.playerLateralOffset = Math.max(-0.85, Math.min(0.85, this.playerLateralOffset + lateralSpeed * delta));

    // Drift Detection (Influenced by car drift rating)
    const driftThreshold = 0.45 - (this.currentCar.driftRating - 8.0) * 0.05;
    if (Math.abs(this.playerSteerAngle) > driftThreshold && this.playerSpeed > 70) {
      this.isDrifting = true;
      this.driftAngle = this.playerSteerAngle * (0.35 + (this.currentCar.driftRating / 20));
    } else if (!this.input.handbrake) {
      this.isDrifting = false;
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, 0, delta * 5);
    }

    // Gear & RPM Update
    for (let g = 0; g < maxSpeedsPerGear.length; g++) {
      if (this.playerSpeed <= maxSpeedsPerGear[g]) {
        this.playerGear = g + 1;
        break;
      }
    }
    const currentGearMaxSpeed = maxSpeedsPerGear[this.playerGear - 1];
    const prevGearMaxSpeed = this.playerGear > 1 ? maxSpeedsPerGear[this.playerGear - 2] : 0;
    const gearFraction = (this.playerSpeed - prevGearMaxSpeed) / (currentGearMaxSpeed - prevGearMaxSpeed + 1e-4);
    this.playerRpm = Math.max(900, Math.min(8200, 1800 + gearFraction * 6000));

    // Progress along spline track
    const speedUnitsPerSec = (this.playerSpeed * 1000) / 3600;
    const progressDelta = (speedUnitsPerSec * delta) / this.totalTrackLength;
    this.playerLapProgress += progressDelta;

    // Lap Completion
    if (this.playerLapProgress >= 1.0) {
      this.playerLapProgress -= 1.0;
      this.playerLap++;
      this.lastLapTime = this.currentLapTime;
      if (this.bestLapTime === 0 || this.currentLapTime < this.bestLapTime) {
        this.bestLapTime = this.currentLapTime;
      }
      this.currentLapTime = 0;

      if (this.playerLap > this.totalLaps) {
        this.raceState = 'FINISHED';
      }
    }

    // Update 3D Transform on Curve
    const safeT = getSafeCurveU(this.playerLapProgress);
    const centerPoint = safeGetPointAt(this.trackCurve, safeT);
    const tangent = safeGetTangentAt(this.trackCurve, safeT);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Lateral displacement
    const roadWidthOffset = this.playerLateralOffset * (this.trackWidth * 0.45);
    const carPos = centerPoint.clone().addScaledVector(normal, roadWidthOffset);
    this.playerGroup.position.copy(carPos);

    // Orientation
    this.playerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    this.playerGroup.rotateY(-this.playerSteerAngle * 0.25 - this.driftAngle);

    // Rotate Wheels
    const wheelRotSpeed = (speedUnitsPerSec / 0.38) * delta;
    this.playerWheels.forEach((w, idx) => {
      w.rotation.x += wheelRotSpeed;
      if (idx < 2) {
        w.rotation.y = this.playerSteerAngle * 0.5; // Steer front wheels
      }
    });

    // Wrong way detection
    const carForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerGroup.quaternion);
    this.isWrongWay = carForward.dot(tangent) < -0.3;
  }

  private updateAIOpponents(delta: number) {
    this.aiRivals.forEach(ai => {
      // AI Speed acceleration
      if (this.raceState === 'RACING') {
        if (ai.speed < ai.targetSpeed) {
          ai.speed += 22 * delta;
        }

        // Avoid Player Car
        const distToPlayer = Math.abs(ai.lapProgress - this.playerLapProgress);
        if (distToPlayer < 0.015) {
          if (Math.abs(ai.lateralOffset - this.playerLateralOffset) < 0.3) {
            ai.lateralOffset += (ai.lateralOffset > 0 ? 0.3 : -0.3) * delta;
          }
        }

        const speedUnitsPerSec = (ai.speed * 1000) / 3600;
        ai.lapProgress += (speedUnitsPerSec * delta) / this.totalTrackLength;

        if (ai.lapProgress >= 1.0) {
          ai.lapProgress -= 1.0;
          ai.lap++;
        }
      }

      // 3D placement
      const safeT = getSafeCurveU(ai.lapProgress);
      const centerPoint = safeGetPointAt(this.trackCurve, safeT);
      const tangent = safeGetTangentAt(this.trackCurve, safeT);
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const offsetDist = ai.lateralOffset * (this.trackWidth * 0.45);
      ai.meshGroup.position.copy(centerPoint).addScaledVector(normal, offsetDist);
      ai.meshGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      // Rotate AI wheels
      const wRot = ((ai.speed * 1000) / 3600 / 0.38) * delta;
      ai.wheels.forEach(w => (w.rotation.x += wRot));
    });
  }

  private updateLeaderboard() {
    this.playerTotalScore = this.playerLap * 100000 + this.playerLapProgress * 10000;

    const scores = [
      { id: 'player', score: this.playerTotalScore },
      ...this.aiRivals.map(ai => ({
        id: ai.id,
        score: ai.lap * 100000 + ai.lapProgress * 10000
      }))
    ];

    scores.sort((a, b) => b.score - a.score);

    scores.forEach((s, idx) => {
      if (s.id !== 'player') {
        const ai = this.aiRivals.find(c => c.id === s.id);
        if (ai) ai.rank = idx + 1;
      }
    });
  }

  public getPlayerRank(): number {
    const scores = [
      { id: 'player', score: this.playerTotalScore },
      ...this.aiRivals.map(ai => ({
        id: ai.id,
        score: ai.lap * 100000 + ai.lapProgress * 10000
      }))
    ];
    scores.sort((a, b) => b.score - a.score);
    return scores.findIndex(s => s.id === 'player') + 1;
  }

  private updateCamera(delta: number) {
    const carPos = this.playerGroup.position;
    const carQuat = this.playerGroup.quaternion;
    const carForward = new THREE.Vector3(0, 0, 1).applyQuaternion(carQuat);
    const carUp = new THREE.Vector3(0, 1, 0);

    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    if (this.cameraMode === 'CHASE') {
      // Dynamic Chase with spring-damper lag and anti-jitter
      const chaseDist = 7.5 + (this.playerSpeed / 300) * 1.5;
      const chaseHeight = 2.4;
      targetCamPos = carPos.clone().addScaledVector(carForward, -chaseDist).addScaledVector(carUp, chaseHeight);
      targetLookAt = carPos.clone().addScaledVector(carForward, 8.0).addScaledVector(carUp, 0.8);

      // Speed FOV expansion (60 -> 78 at 300 km/h)
      const targetFov = this.camBaseFov + (this.playerSpeed / 300) * 18;
      this.camCurrentFov = THREE.MathUtils.lerp(this.camCurrentFov, targetFov, delta * 4);
      this.camera.fov = this.camCurrentFov;
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'COCKPIT') {
      targetCamPos = carPos.clone().addScaledVector(carForward, 0.2).addScaledVector(carUp, 1.15);
      targetLookAt = carPos.clone().addScaledVector(carForward, 40.0).addScaledVector(carUp, 1.0);
      this.camera.fov = 72;
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'HOOD') {
      targetCamPos = carPos.clone().addScaledVector(carForward, 1.6).addScaledVector(carUp, 0.95);
      targetLookAt = carPos.clone().addScaledVector(carForward, 50.0).addScaledVector(carUp, 0.9);
      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'BUMPER') {
      targetCamPos = carPos.clone().addScaledVector(carForward, 2.2).addScaledVector(carUp, 0.4);
      targetLookAt = carPos.clone().addScaledVector(carForward, 50.0).addScaledVector(carUp, 0.4);
      this.camera.fov = 75;
      this.camera.updateProjectionMatrix();
    } else if (this.cameraMode === 'CINEMATIC') {
      // Drone chase orbit
      const time = performance.now() * 0.001;
      const orbitX = Math.sin(time * 0.8) * 9;
      const orbitZ = Math.cos(time * 0.8) * 9;
      targetCamPos = carPos.clone().add(new THREE.Vector3(orbitX, 3.5, orbitZ));
      targetLookAt = carPos.clone().addScaledVector(carUp, 0.8);
      this.camera.fov = 55;
      this.camera.updateProjectionMatrix();
    }

    // Exponential smoothing for zero-jitter
    const smoothSpeed = this.cameraMode === 'COCKPIT' || this.cameraMode === 'BUMPER' ? 24 : 14;
    this.smoothedCamPos.lerp(targetCamPos, 1.0 - Math.exp(-smoothSpeed * delta));
    this.smoothedCamLookAt.lerp(targetLookAt, 1.0 - Math.exp(-smoothSpeed * delta));

    this.camera.position.copy(this.smoothedCamPos);
    this.camera.lookAt(this.smoothedCamLookAt);
  }

  private updatePerformanceMetrics(delta: number, gameThreadTime: number, renderThreadTime: number) {
    const frameTimeMs = delta * 1000;
    this.frameTimes.push(frameTimeMs);
    if (this.frameTimes.length > 240) {
      this.frameTimes.shift();
    }

    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 16.6;
    const p999 = sorted[Math.floor(sorted.length * 0.999)] || 16.6;

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = Math.round(1000 / Math.max(1, avg));

    let bottleneck: PerformanceStats['bottleneck'] = 'BALANCED';
    if (renderThreadTime > 12) bottleneck = 'RENDER THREAD';
    else if (gameThreadTime > 12) bottleneck = 'CPU GAME THREAD';
    else if (frameTimeMs > 20) bottleneck = 'GPU BOUND';

    this.perfStats = {
      fps,
      avgFrameTimeMs: parseFloat(avg.toFixed(2)),
      gameThreadMs: parseFloat(gameThreadTime.toFixed(2)),
      renderThreadMs: parseFloat(renderThreadTime.toFixed(2)),
      gpuTimeMs: parseFloat((frameTimeMs - gameThreadTime).toFixed(2)),
      onePercentLowFps: Math.round(1000 / p99),
      zeroPointOnePercentLowFps: Math.round(1000 / p999),
      bottleneck,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles
    };

    if (this.onPerfUpdate) {
      this.onPerfUpdate(this.perfStats);
    }
  }

  public resetCar() {
    this.playerSpeed = 0;
    this.playerLateralOffset = 0;
    this.playerSteerAngle = 0;
    this.isDrifting = false;
    this.driftAngle = 0;
    this.damagePct = 0;
  }

  public cycleCamera(): PlayerCameraType {
    const modes: PlayerCameraType[] = ['CHASE', 'COCKPIT', 'HOOD', 'BUMPER', 'CINEMATIC'];
    const idx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(idx + 1) % modes.length];
    return this.cameraMode;
  }

  public setGraphicsPreset(preset: GTAGraphicsPreset) {
    this.graphicsPreset = preset;
    GTAGraphicsEngine.applyPreset(this.renderer, this.scene, preset);
    if (preset === 'PERFORMANCE') {
      this.underglowEnabled = false;
    } else {
      this.underglowEnabled = true;
    }
  }

  public setUnderglowColor(colorHex: number) {
    this.underglowColor = colorHex;
  }

  public setUnderglowEnabled(enabled: boolean) {
    this.underglowEnabled = enabled;
  }

  public setTireSmokeEnabled(enabled: boolean) {
    this.tireSmokeEnabled = enabled;
  }

  public setSkidmarksEnabled(enabled: boolean) {
    this.skidmarksEnabled = enabled;
  }

  public setCarPaintColor(colorHex: number) {
    if (this.playerVisuals && this.playerVisuals.paintMaterial) {
      this.playerVisuals.paintMaterial.color.setHex(colorHex);
    }
    // Dynamically update the custom USDZ car body panels in real time
    if (this.playerGroup) {
      this.playerGroup.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => {
            if (
              child.name === 'Object_27' ||
              child.name === 'Object_28' ||
              child.name === 'Object_29' ||
              (m.color && m.color.getHexString().toLowerCase() === 'ce8a07') ||
              (child.name && /paint|body|carpaint/i.test(child.name))
            ) {
              m.color.setHex(colorHex);
            }
          });
        }
      });
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
