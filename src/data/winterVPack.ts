/**
 * WINTERV - BETA V0.4 Integration Module for GTA V & 3D Racing Engine
 * Transforms the environment into a full winter wonderland with snow terrain,
 * blizzard snowfall, snow tire tracks, North Yankton police cars and civilian vehicles.
 *
 * Based on WinterV by 0takusensei / MenyooSP SpSnow implementation.
 * Default Controls: Shift + S
 */

export interface WinterVVehicle {
  modelName: string;
  name: string;
  category: 'POLICE' | 'CIVILIAN' | 'PARKED';
  brand: string;
  hasSiren?: boolean;
  snowCoverage: 'HEAVY' | 'BLIZZARD' | 'EXTREME';
  description: string;
}

export const WINTERV_VEHICLES: WinterVVehicle[] = [
  // North Yankton Police Snow Vehicles
  {
    modelName: 'policeold1',
    name: 'North Yankton State Patrol Cruiser',
    category: 'POLICE',
    brand: 'Declasse',
    hasSiren: true,
    snowCoverage: 'HEAVY',
    description: 'Xe cảnh sát tuần tra tuyết North Yankton trang bị còi hú và xích bám băng tuyết.'
  },
  {
    modelName: 'policeold2',
    name: 'North Yankton Police Rancher 4x4',
    category: 'POLICE',
    brand: 'Declasse',
    hasSiren: true,
    snowCoverage: 'EXTREME',
    description: 'Xe SUV tuần tra chuyên dụng địa hình tuyết dày với hệ dẫn động 4 bánh toàn thời gian.'
  },
  // Civilian Snow-Covered Traffic
  {
    modelName: 'asea2',
    name: 'Asea Snow Edition',
    category: 'CIVILIAN',
    brand: 'Declasse',
    snowCoverage: 'HEAVY',
    description: 'Sedan gia đình phủ đầy lớp tuyết mui xe và lốp xe chống trơn trượt.'
  },
  {
    modelName: 'emperor3',
    name: 'Emperor North Yankton Beater',
    category: 'CIVILIAN',
    brand: 'Albany',
    snowCoverage: 'BLIZZARD',
    description: 'Mẫu xe cổ điển chịu tuyết rơi dày với kính chắn gió có vết gạt tuyết.'
  },
  {
    modelName: 'mesa2',
    name: 'Mesa Snow Crawler 4WD',
    category: 'CIVILIAN',
    brand: 'Canis',
    snowCoverage: 'HEAVY',
    description: 'Xe việt dã bánh to vượt bão tuyết và băng giá.'
  },
  {
    modelName: 'rancherxl2',
    name: 'Rancher XL Snow Spec',
    category: 'CIVILIAN',
    brand: 'Declasse',
    snowCoverage: 'EXTREME',
    description: 'SUV cỡ lớn phủ tuyết trắng với lốp gai địa hình mùa đông.'
  },
  {
    modelName: 'sadler2',
    name: 'Sadler Heavy Snow Pickup',
    category: 'CIVILIAN',
    brand: 'Vapid',
    snowCoverage: 'EXTREME',
    description: 'Bán tải công trường chở tuyết chuyên cào dọn đường mùa đông.'
  },
  {
    modelName: 'burrito5',
    name: 'Burrito North Yankton Van',
    category: 'CIVILIAN',
    brand: 'Declasse',
    snowCoverage: 'BLIZZARD',
    description: 'Xe van thương mại chở hàng qua đèo tuyết North Yankton.'
  }
];

export const WINTERV_README = `WINTERV - BETA V0.4

WinterV transforms GTA V Story Mode into a winter environment.

FEATURES

- Snow-covered terrain
- Blizzard weather and snowfall
- Snow tire tracks
- Footprints in the snow
- Snow-covered civilian traffic
- Snow-covered North Yankton police vehicles
- Armed recreated police officers
- Snow-covered parked vehicles along roadsides
- Long-range vehicle pre-conversion to reduce visible vehicle pop
- Safer handling of police roadblocks and special emergency vehicles
- Configurable activation key

DEFAULT CONTROL

Shift + S

You can change the key and modifier in WinterV.ini.

Example:

[Controls]
ToggleKey=S
Modifier=Shift

Supported modifiers:
- Shift
- Ctrl
- Alt
- None

INSTALLATION

1. Install ScriptHookV.
2. Install ScriptHookVDotNet 3.x.
3. Copy WinterV.asi to your main GTA V directory, next to GTA5.exe.
4. Copy WinterV.ini to your main GTA V directory.
5. Copy scripts/WinterV_V0_4.3.cs to your GTA V scripts folder.
6. Remove older WinterV or SnowOverhaul script versions.
7. Start GTA V Story Mode.
8. Press Shift + S to enable WinterV.

IMPORTANT

WinterV is intended for GTA V Story Mode.

Do not install multiple WinterV script versions at the same time.

WinterV is currently a Beta release. Compatibility with every GTA V build,
weather mod, traffic mod or world overhaul is not guaranteed.

The terrain snow component uses WinterV.asi. It safely scans the GTA V
executable for compatible snow-related patterns before applying the terrain
snow patch.

CREDITS

Snow terrain implementation is based on the general SpSnow approach used by
MenyooSP. Source attribution and applicable license information should remain
with distributions derived from that implementation.

VERSION

Public package: WinterV V0.4
Current tested code base: V0.4.6`;

export const WINTERV_INI_CONTENT = `[Controls]
; Phím bật/tắt WinterV (Mặc định: Shift + S)
ToggleKey=S
Modifier=Shift

[Settings]
; Tỉ lệ xuất hiện xe dân dụng phủ tuyết (68%)
CivilianSnowChance=68
; Tỉ lệ xe cảnh sát thành North Yankton (100%)
PoliceSnowChance=100
; Số lượng xe tuyết đậu ven đường tối đa
MaxParkedSnowVehicles=8
; Vệt bánh xe tuyết và dấu chân tuyết
EnableSnowTracks=true
`;
