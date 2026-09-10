import * as THREE from 'three';
import { AICarState } from '../types';
import { safeGetPointAt, safeGetTangentAt, getSafeCurveU } from './curveUtils';
import { GTAGraphicsEngine, GTAParticleSystem, GTASkidmarkSystem } from './gtaGraphicsEngine';
import { FiveMCar } from '../data/fivemCarPack';

export interface Car3DObject {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  wheels: THREE.Mesh[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  exhaustPuffs?: THREE.Points;
  // Dual Exhaust Nitro Backfire Jet System
  exhaustFlameGroup: THREE.Group;
  exhaustOuterMeshes: THREE.Mesh[];
  exhaustCoreMeshes: THREE.Mesh[];
  exhaustLight?: THREE.PointLight;
  // Real LED Taillights & Dynamic Brake Light System
  taillightMeshGroup: THREE.Group;
  taillightLEDs: THREE.Mesh[];
  taillightHalos: THREE.Mesh[];
  brakeLight?: THREE.PointLight;
  // Dynamic Driving Physics & Weaving (Đánh võng) States
  bodyRoll: number;
  pitchAngle: number;
  weavePhase: number;
  weaveAmplitude: number;
  weaveSpeed: number;
  actualVelocityDir: THREE.Vector3;
  state: AICarState;
}

export class VehiclePhysicsSystem {
  /**
   * Builds a high-fidelity 3D racing car model utilizing the 13 Xe Đẹp Mod models
   */
  static createCarMesh(state: AICarState): Car3DObject {
    let gtaVisuals;
    if (state.usdzModelUrl) {
      const customCar: FiveMCar = {
        id: state.id,
        spawnCode: state.id,
        name: state.name,
        brand: 'Apex Studio',
        category: 'SUPER',
        author: '3D Modding Team',
        fiveModsUrl: '#',
        imageUrl: '',
        bodyType: 'SUPER',
        drivetrain: 'AWD',
        topSpeedKmh: state.maxSpeed,
        acceleration: 9.8,
        handling: 9.6,
        driftRating: 9.2,
        defaultColor: state.color,
        engineSound: 'v12_scream',
        description: 'Mẫu xe độ 3D đỉnh cao từ bộ sưu tập Xe Đẹp Mod.',
        usdzModelUrl: state.usdzModelUrl,
        isCustomMod: true
      };
      gtaVisuals = GTAGraphicsEngine.createFiveMCar(customCar, state.hexColor, false);
    } else {
      gtaVisuals = GTAGraphicsEngine.createGTASupercar(state.hexColor, false);
    }

    // 1. Dual Exhaust Nitro Backfire Jet Plume System (Tăng tốc Phun lửa)
    const exhaustFlameGroup = new THREE.Group();
    exhaustFlameGroup.name = 'EXHAUST_FLAME_GROUP';
    const exhaustOuterMeshes: THREE.Mesh[] = [];
    const exhaustCoreMeshes: THREE.Mesh[] = [];

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
      exhaustOuterMeshes.push(outerMesh);

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
      exhaustCoreMeshes.push(coreMesh);

      exhaustFlameGroup.add(jetGroup);
    });

    const exhaustLight = new THREE.PointLight(0xff5500, 0, 8.0, 2.0);
    exhaustLight.position.set(0, 0.36, -2.35);
    exhaustFlameGroup.add(exhaustLight);
    gtaVisuals.group.add(exhaustFlameGroup);

    // 2. Real LED Taillights & Dynamic Brake Light System (Đèn đuôi xe & Đèn phanh thể thao)
    const taillightMeshGroup = new THREE.Group();
    taillightMeshGroup.name = 'TAILLIGHT_MESH_GROUP';
    const taillightLEDs: THREE.Mesh[] = [];
    const taillightHalos: THREE.Mesh[] = [];

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
      taillightMeshGroup.add(ledMesh);
      taillightLEDs.push(ledMesh);

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
      taillightMeshGroup.add(haloMesh);
      taillightHalos.push(haloMesh);
    });

    const brakeLight = new THREE.PointLight(0xff0022, 1.8, 7.5, 2.0);
    brakeLight.position.set(0, 0.63, -2.35);
    taillightMeshGroup.add(brakeLight);
    gtaVisuals.group.add(taillightMeshGroup);

    // Ensure all car meshes are never frustum-culled (xe không bao giờ bị ẩn)
    gtaVisuals.group.traverse(child => {
      if ((child as any).isMesh) {
        child.frustumCulled = false;
      }
    });

    return {
      group: gtaVisuals.group,
      bodyMesh: gtaVisuals.bodyMesh,
      wheels: gtaVisuals.wheels,
      headlights: gtaVisuals.headlights,
      taillights: gtaVisuals.taillights,
      exhaustFlameGroup,
      exhaustOuterMeshes,
      exhaustCoreMeshes,
      exhaustLight,
      taillightMeshGroup,
      taillightLEDs,
      taillightHalos,
      brakeLight,
      bodyRoll: 0,
      pitchAngle: 0,
      weavePhase: Math.random() * Math.PI * 2,
      weaveAmplitude: 0.32 + Math.random() * 0.18,
      weaveSpeed: 2.1 + Math.random() * 0.8,
      actualVelocityDir: new THREE.Vector3(0, 0, 1),
      state
    };
  }

  /**
   * Updates AI Vehicle steering, throttle, weaving (đánh võng), cornering, and drifting logic
   */
  static updateVehicles(
    cars: Car3DObject[],
    curve: THREE.CatmullRomCurve3,
    totalLength: number,
    delta: number,
    globalAggression: number,
    gtaParticles?: GTAParticleSystem,
    gtaSkidmarks?: GTASkidmarkSystem
  ): { activeOvertakeCarId: string | null; collisionCarId: string | null } {
    let activeOvertakeCarId: string | null = null;
    let collisionCarId: string | null = null;

    const trackWidth = 12.0;

    // Step 1: Update AI decisions, racing line, weaving, and speed for each car
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const s = car.state;

      // Ensure s.lapProgress is valid finite number
      if (typeof s.lapProgress !== 'number' || isNaN(s.lapProgress) || !isFinite(s.lapProgress)) {
        s.lapProgress = 0;
      }
      s.lapProgress = ((s.lapProgress % 1.0) + 1.0) % 1.0;

      // Track curvature and bend direction calculation ahead
      const aheadLookT = getSafeCurveU(s.lapProgress + 18.0 / totalLength);
      const currentTangent = safeGetTangentAt(curve, s.lapProgress);
      const aheadTangent = safeGetTangentAt(curve, aheadLookT);

      // turnCurl: Cross product Y component. Negative = curves Left, Positive = curves Right
      const turnCurl = currentTangent.x * aheadTangent.z - currentTangent.z * aheadTangent.x;
      const turnSharpness = Math.abs(turnCurl);
      const isStraight = turnSharpness < 0.055;

      // Desired speed based on turn sharpness and vehicle max speed
      const turnPenalty = Math.max(0.66, 1.0 - turnSharpness * 2.2);
      s.targetSpeed = s.maxSpeed * turnPenalty;

      // Check proximity to car ahead
      let carAheadDist = 9999;
      let carAheadLateral = 0;
      let carAheadId = '';

      for (let j = 0; j < cars.length; j++) {
        if (i === j) continue;
        const other = cars[j].state;
        let distAlong = other.lapProgress - s.lapProgress;
        if (distAlong < -0.5) distAlong += 1.0; // wraparound
        if (distAlong > 0 && distAlong < 0.20) {
          const worldDist = distAlong * totalLength;
          if (worldDist < carAheadDist) {
            carAheadDist = worldDist;
            carAheadLateral = other.lateralOffset;
            carAheadId = other.id;
          }
        }
      }

      // Driving Technique: Weaving (Đánh võng) on Straights, Overtaking, or Apex in Corners
      if (carAheadDist < 26) {
        // In slipstream drafting zone! Boost speed slightly
        if (carAheadDist > 8 && Math.abs(carAheadLateral - s.lateralOffset) < 0.35) {
          s.targetSpeed = Math.min(s.maxSpeed + 28, s.targetSpeed + 18);
        }

        if (carAheadDist < 8) {
          // Close quarters battle - match speed with aggressive attempt
          s.targetSpeed = Math.min(s.targetSpeed, cars.find(c => c.state.id === carAheadId)?.state.speed || 320);
        }

        // Steer laterally to execute high-speed overtake weave (đánh võng vượt xe)
        const overtakeSide = carAheadLateral > 0 ? -0.62 : 0.62;
        s.targetLateralOffset = overtakeSide * (s.aggression * globalAggression + 0.35);

        // Mark overtake action
        if (s.speed > (cars.find(c => c.state.id === carAheadId)?.state.speed || 0) + 10) {
          activeOvertakeCarId = s.id;
        }
      } else if (isStraight) {
        // ĐƯỜNG ĐANG THẲNG: XE ĐÁNH VÕNG (SMOOTH WEAVING / SLALOM MANEUVER)
        // Thay vì đánh lái giật cục trái phải, xe lướt đánh võng nhịp nhàng hình sin uốn lượn
        car.weavePhase += delta * car.weaveSpeed;
        const weaveSway = Math.sin(car.weavePhase) * car.weaveAmplitude;
        s.targetLateralOffset = weaveSway;
      } else {
        // ĐOẠN ĐƯỜNG CUA: BÁM DÂY ĐUA ÔM CUA (APEX CORNERING RACING LINE)
        // Khi cua trái (turnCurl < 0) bám lề trong bên trái (-), cua phải bám lề trong bên phải (+)
        const turnSign = turnCurl < 0 ? -1 : 1;
        const apexSide = turnSign * -0.55;
        s.targetLateralOffset = apexSide;
      }

      // Smooth lateral offset movement
      const lateralSpeed = isStraight ? 2.4 : 3.4 * (s.aggression + 0.3);
      const lateralDiff = s.targetLateralOffset - s.lateralOffset;
      s.lateralOffset += lateralDiff * Math.min(1.0, delta * lateralSpeed);
      s.lateralOffset = Math.max(-0.85, Math.min(0.85, s.lateralOffset));

      // Hyper-Speed Acceleration / Braking
      if (s.speed < s.targetSpeed) {
        s.speed += s.acceleration * delta * 14.0;
        if (s.speed > s.targetSpeed) s.speed = s.targetSpeed;
      } else if (s.speed > s.targetSpeed) {
        s.speed -= 42 * delta;
        if (s.speed < s.targetSpeed) s.speed = s.targetSpeed;
      }

      // High-speed track progression along circuit
      const speedUnitsPerSec = (s.speed * 1000 / 3600) * 1.25;
      const progressDelta = (speedUnitsPerSec * delta) / totalLength;

      s.lapProgress += progressDelta;
      if (s.lapProgress >= 1.0) {
        s.lapProgress -= 1.0;
        s.lap += 1;
      }

      // Realistic Cornering Drift Physics (Drift ôm cua có hướng chuẩn xác)
      // Drift chỉ xảy ra ở khúc cua có lực quán tính ly tâm lớn, KHÔNG bao giờ xoay bậy trên đường thẳng
      const lateralG = (s.speed / 280) * (turnSharpness * 4.5);
      if (!isStraight && lateralG > 0.40 && s.speed > 170) {
        s.isDrifting = true;
        // Đầu xe hướng vào trong góc cua (apex), đuôi xe trượt văng ra ngoài
        // turnCurl < 0 (cua trái) -> driftAngle dương (quay sang trái); turnCurl > 0 -> driftAngle âm (quay sang phải)
        const turnSign = turnCurl < 0 ? -1 : 1;
        const targetDrift = -turnSign * THREE.MathUtils.clamp(lateralG * 0.28, 0.08, 0.42);
        s.driftAngle = THREE.MathUtils.lerp(s.driftAngle, targetDrift, delta * 8);
      } else {
        s.isDrifting = false;
        s.driftAngle = THREE.MathUtils.lerp(s.driftAngle, 0, delta * 12);
      }

      // Update collision cooldown
      if (s.collisionCooldown > 0) {
        s.collisionCooldown -= delta;
      }
    }

    // Step 2: Car-to-car collision resolution
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const c1 = cars[i];
        const c2 = cars[j];

        const p1Dist = c1.state.lap * totalLength + c1.state.lapProgress * totalLength;
        const p2Dist = c2.state.lap * totalLength + c2.state.lapProgress * totalLength;

        const longitudinalDist = Math.abs(p1Dist - p2Dist);
        const lateralDist = Math.abs(c1.state.lateralOffset - c2.state.lateralOffset) * (trackWidth / 2);

        if (longitudinalDist < 4.2 && lateralDist < 2.0) {
          // Collision occurred!
          collisionCarId = c1.state.id;

          if (c1.state.collisionCooldown <= 0 && c2.state.collisionCooldown <= 0) {
            c1.state.collisionCooldown = 1.5;
            c2.state.collisionCooldown = 1.5;

            // Bump apart laterally
            const pushDir = c1.state.lateralOffset > c2.state.lateralOffset ? 1 : -1;
            c1.state.lateralOffset = Math.max(-0.85, Math.min(0.85, c1.state.lateralOffset + pushDir * 0.25));
            c2.state.lateralOffset = Math.max(-0.85, Math.min(0.85, c2.state.lateralOffset - pushDir * 0.25));

            // Momentary speed loss
            c1.state.speed *= 0.88;
            c2.state.speed *= 0.88;
          }
        }
      }
    }

    // Step 3: Update 3D Positions, Orientations, Body Roll, and Visual Effects
    cars.forEach(car => {
      const s = car.state;
      const t = getSafeCurveU(s.lapProgress);

      const centerPoint = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Current 3D Position with lateral offset
      const lateralDist = s.lateralOffset * (trackWidth / 2);
      const finalPos = centerPoint.clone().addScaledVector(normal, lateralDist);
      car.group.position.copy(finalPos);

      // SỬA LỖI ĐIỀU HƯỚNG VÀ VẬN TỐC:
      // Tính toán hướng di chuyển THỰC TẾ (Velocity Vector) bằng cách dự báo vị trí tiếp theo trên đường đua
      // Kết hợp độ cong của đường và tốc độ đánh võng (lateral offset)
      const lookAheadDeltaT = 1.2 / totalLength;
      const lookAheadT = getSafeCurveU(s.lapProgress + lookAheadDeltaT);
      const aheadCenter = safeGetPointAt(curve, lookAheadT);
      const aheadTangent = safeGetTangentAt(curve, lookAheadT);
      const aheadNormal = new THREE.Vector3().crossVectors(aheadTangent, up).normalize();

      // Vị trí dự kiến kế tiếp (tiếp điểm quỹ đạo chuyển động thực)
      const aheadLateralDist = s.targetLateralOffset * (trackWidth / 2);
      const nextForecastPos = aheadCenter.clone().addScaledVector(
        aheadNormal,
        lateralDist + (aheadLateralDist - lateralDist) * 0.08
      );

      // Vector hướng chuyển động thực tế (Motion Direction)
      const motionDir = new THREE.Vector3().subVectors(nextForecastPos, finalPos).normalize();
      car.actualVelocityDir.copy(motionDir);

      // KHẮC PHỤC TRIỆT ĐỂ LỖI LẬT BÁNH LÊN TRÊN / LẬT NGỬA XE:
      // Sử dụng ma trận cơ sở trực giao (Orthonormal Basis) và Quaternion thay cho Euler angles.
      // 1. Trục tiến (forward): Bám sát vector vận tốc thực tế
      const forward = motionDir.clone().normalize();
      const worldUp = new THREE.Vector3(0, 1, 0);

      // 2. Góc drift: Xoay đầu xe quanh trục Y thế giới
      if (s.isDrifting && Math.abs(s.driftAngle) > 0.001) {
        forward.applyAxisAngle(worldUp, s.driftAngle);
      }

      // 3. Tính toán các trục trực giao: right và carUp
      const right = new THREE.Vector3().crossVectors(worldUp, forward).normalize();
      const carUp = new THREE.Vector3().crossVectors(forward, right).normalize();

      // 4. KỸ THUẬT ĐÁNH VÕNG & NGHIÊNG THÂN XE THEO LỰC QUÁN TÍNH LY TÂM (CHASSIS BODY ROLL):
      // Giới hạn biên độ nghiêng an toàn tối đa ±4.5 độ (0.08 rad)
      const turnCurl = tangent.x * aheadTangent.z - tangent.z * aheadTangent.x;
      const isStraight = Math.abs(turnCurl) < 0.055;
      const weaveLateralSpeed = isStraight
        ? Math.cos(car.weavePhase) * car.weaveAmplitude * car.weaveSpeed
        : -turnCurl * 2.8;

      const targetRoll = Math.max(-0.08, Math.min(0.08, -weaveLateralSpeed * 0.06));
      car.bodyRoll = THREE.MathUtils.lerp(car.bodyRoll, targetRoll, delta * 8);

      // Nghiêng quanh trục dọc xe (forward), đảm bảo carUp.y luôn > 0.99 (xe luôn luôn ngửa lên trên, không bao giờ bị lật)
      right.applyAxisAngle(forward, car.bodyRoll);
      carUp.applyAxisAngle(forward, car.bodyRoll);

      // Gán định hướng bằng ma trận cơ sở trực giao hoàn chỉnh
      const basisMatrix = new THREE.Matrix4().makeBasis(right, carUp, forward);
      car.group.quaternion.setFromRotationMatrix(basisMatrix);

      // Góc lái bánh trước:
      // - Khi đánh võng: bánh trước liệng theo chu kỳ hình sin
      // - Khi ôm cua drift: bánh trước ĐÁNH LÁI NGƯỢC (Counter-steering) để ghìm xe lại
      let targetWheelAngle = 0;
      if (s.isDrifting) {
        targetWheelAngle = -s.driftAngle * 0.85; // Đánh lái ngược khi drift
      } else if (isStraight) {
        targetWheelAngle = Math.cos(car.weavePhase) * 0.38; // Đánh võng lượn sóng
      } else {
        targetWheelAngle = (turnCurl < 0 ? 0.32 : -0.32); // Cua thường
      }
      s.steerAngle = THREE.MathUtils.lerp(s.steerAngle, targetWheelAngle, delta * 12);

      // Quay bánh xe và bẻ lái 2 bánh trước
      const wheelRotSpeed = ((s.speed * 1000 / 3600) / 0.42) * delta;
      car.wheels.forEach((w, wIdx) => {
        w.rotation.x += wheelRotSpeed;
        if (wIdx < 2) {
          w.rotation.y = s.steerAngle;
        }
      });

      // 1. HIỆU ỨNG TĂNG TỐC PHUN LỬA (DUAL EXHAUST NITRO BACKFIRE JETS)
      const isAccelerating = s.speed < s.targetSpeed - 2;
      const isNitroBoost = (s.speed > 240 && isAccelerating) || activeOvertakeCarId === s.id;

      if (isNitroBoost) {
        // Lửa Nitro xanh/cam phun dài cuồn cuộn phía sau xe
        const flameTurbulence = 1.0 + Math.random() * 0.45;
        car.exhaustOuterMeshes.forEach(mesh => {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
          mesh.scale.set(1.15 + Math.random() * 0.3, 1.15 + Math.random() * 0.3, flameTurbulence * 1.6);
        });
        car.exhaustCoreMeshes.forEach(mesh => {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
          mesh.scale.set(1.0 + Math.random() * 0.2, 1.0 + Math.random() * 0.2, flameTurbulence * 1.2);
        });
        if (car.exhaustLight) {
          car.exhaustLight.intensity = 5.5 + Math.random() * 2.5;
          car.exhaustLight.color.setHex(Math.random() > 0.35 ? 0xff4500 : 0x00f0ff);
        }
      } else if (isAccelerating) {
        // Lửa bốc từng đợt theo nhịp tăng tốc
        const flicker = Math.random() > 0.25 ? 0.8 : 0.35;
        car.exhaustOuterMeshes.forEach(mesh => {
          (mesh.material as THREE.MeshBasicMaterial).opacity = flicker;
          mesh.scale.set(0.95, 0.95, 0.9 + Math.random() * 0.3);
        });
        car.exhaustCoreMeshes.forEach(mesh => {
          (mesh.material as THREE.MeshBasicMaterial).opacity = flicker * 0.9;
          mesh.scale.set(0.9, 0.9, 0.75 + Math.random() * 0.25);
        });
        if (car.exhaustLight) {
          car.exhaustLight.intensity = 2.4 + Math.random() * 1.5;
          car.exhaustLight.color.setHex(0xff5500);
        }
      } else {
        // Tắt lửa khi nhả ga / phanh
        car.exhaustOuterMeshes.forEach(mesh => {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
        });
        car.exhaustCoreMeshes.forEach(mesh => {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
        });
        if (car.exhaustLight) {
          car.exhaustLight.intensity = 0;
        }
      }

      // 2. HIỆU ỨNG ĐÈN ĐUÔI XE & ĐÈN PHANH (LED TAILLIGHTS & DYNAMIC BRAKE LIGHTS)
      const isBraking = s.speed > s.targetSpeed + 4 || s.collisionCooldown > 0.6;
      if (isBraking) {
        // Đèn phanh bừng sáng rực rỡ + vầng hào quang halo lan tỏa
        car.taillightLEDs.forEach(mesh => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0xff0025);
          mat.emissiveIntensity = 6.5;
        });
        car.taillightHalos.forEach(halo => {
          (halo.material as THREE.MeshBasicMaterial).opacity = 0.95;
          halo.scale.set(1.85, 1.85, 1.85);
        });
        if (car.brakeLight) {
          car.brakeLight.color.setHex(0xff0025);
          car.brakeLight.intensity = 7.5;
        }
      } else {
        // Đèn hậu viền LED thể thao phát quang trang nhã
        car.taillightLEDs.forEach(mesh => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0xdc2626);
          mat.emissiveIntensity = 2.4;
        });
        car.taillightHalos.forEach(halo => {
          (halo.material as THREE.MeshBasicMaterial).opacity = 0.55;
          halo.scale.set(1.0, 1.0, 1.0);
        });
        if (car.brakeLight) {
          car.brakeLight.color.setHex(0xdc2626);
          car.brakeLight.intensity = 1.8;
        }
      }

      // 3. HIỆU ỨNG KHÓI LỐP DRIFT, TIA LỬA MA SÁT & VẾT LỐP CAO SU
      if (s.isDrifting || (isBraking && s.speed > 160)) {
        if (gtaParticles) {
          const driftIntensity = Math.min(1.0, Math.abs(s.driftAngle) * 2.2 + 0.35);
          gtaParticles.emitDriftParticles(car.group.position, car.group.quaternion, s.driftAngle, driftIntensity);
        }
        if (gtaSkidmarks) {
          const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(car.group.quaternion);
          gtaSkidmarks.addDualMarks(car.group.position, car.group.quaternion, fwd);
        }
      }
    });

    // Step 4: Re-calculate leaderboard ranks based on (lap * 1000 + lapProgress)
    const sorted = [...cars].sort((a, b) => {
      const scoreA = a.state.lap + a.state.lapProgress;
      const scoreB = b.state.lap + b.state.lapProgress;
      return scoreB - scoreA;
    });

    sorted.forEach((car, index) => {
      car.state.rank = index + 1;
    });

    return { activeOvertakeCarId, collisionCarId };
  }
}
