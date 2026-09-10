import React, { useState } from 'react';
import {
  FiveMCar,
  FIVEM_LORE_FRIENDLY_CAR_PACK,
  getCarById
} from '../data/fivemCarPack';
import {
  X,
  Search,
  Zap,
  Gauge,
  Compass,
  Flame,
  Check,
  Palette,
  Car,
  Award,
  Terminal,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface FiveMCarSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCarId: string;
  onSelectCar: (carId: string) => void;
  carPaintColor: string;
  onChangePaintColor: (hex: string) => void;
}

type FilterCategory = 'XE_DEP_MOD' | 'ALL' | 'SUPER' | 'TUNER_JDM' | 'MUSCLE' | 'GT' | 'DRIFT_TRUCK';

export const FiveMCarSelectorModal: React.FC<FiveMCarSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCarId,
  onSelectCar,
  carPaintColor,
  onChangePaintColor
}) => {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewCarId, setPreviewCarId] = useState<string>(selectedCarId);

  if (!isOpen) return null;

  const currentCar = getCarById(previewCarId) || FIVEM_LORE_FRIENDLY_CAR_PACK[0];

  const filteredCars = FIVEM_LORE_FRIENDLY_CAR_PACK.filter((car) => {
    const matchesCategory =
      activeCategory === 'ALL'
        ? true
        : activeCategory === 'XE_DEP_MOD'
        ? car.isCustomMod
        : car.bodyType === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      car.name.toLowerCase().includes(q) ||
      car.brand.toLowerCase().includes(q) ||
      car.spawnCode.toLowerCase().includes(q) ||
      (car.description && car.description.toLowerCase().includes(q)) ||
      (car.inspiration && car.inspiration.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const categories = [
    {
      id: 'ALL' as FilterCategory,
      label: '✨ Tất Cả 13 Mẫu Xe Đẹp Mod (USDZ)',
      count: FIVEM_LORE_FRIENDLY_CAR_PACK.length
    },
    {
      id: 'XE_DEP_MOD' as FilterCategory,
      label: '🏎️ Xe Đẹp Mod 3D',
      count: FIVEM_LORE_FRIENDLY_CAR_PACK.filter((c) => c.isCustomMod).length
    },
    {
      id: 'SUPER' as FilterCategory,
      label: '⚡ Hypercars & Supercars',
      count: FIVEM_LORE_FRIENDLY_CAR_PACK.filter((c) => c.bodyType === 'SUPER').length
    }
  ].filter(cat => cat.count > 0);

  const presetColors = [
    { name: 'Sultan Rally Blue', hex: '#2563eb' },
    { name: 'Championship White', hex: '#f8fafc' },
    { name: 'Midnight Black', hex: '#0f172a' },
    { name: 'Bayside Blue', hex: '#38bdf8' },
    { name: 'Hellcat Redline', hex: '#dc2626' },
    { name: 'Zentorno Racing Yellow', hex: '#facc15' },
    { name: 'Mantis Neon Lime', hex: '#22c55e' },
    { name: 'Ultraviolet Purple', hex: '#9333ea' },
    { name: 'Miami Cyan Glow', hex: '#06b6d4' },
    { name: 'Sunset Bronze Orange', hex: '#ea580c' }
  ];

  const handleSelectAndDrive = (car: FiveMCar) => {
    onSelectCar(car.id);
    setPreviewCarId(car.id);
    onClose();
  };

  return (
    <div
      id="fivem-car-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="fivem-car-modal-container"
        className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  FiveM Lore-Friendly Car Pack
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-full">
                  GitHub 0takusensei Pack
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Chọn và nâng cấp xe nguyên bản theo phong cách GTA Lore-Friendly với động cơ & khí động học thực tế
              </p>
            </div>
          </div>

          <button
            id="close-fivem-car-modal-btn"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
            title="Đóng (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-b border-zinc-800/60 bg-zinc-950/90">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`cat-filter-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              id="car-search-input"
              type="text"
              placeholder="Tìm kiếm xe, hãng, mã spawn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Content Body: Grid List + Live Detail Pane */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Grid List */}
          <div className="lg:col-span-7 overflow-y-auto p-5 space-y-3 border-r border-zinc-800/60 max-h-[58vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCars.map((car) => {
                const isSelected = selectedCarId === car.id;
                const isPreview = previewCarId === car.id;

                return (
                  <div
                    key={car.id}
                    id={`car-card-${car.id}`}
                    onClick={() => setPreviewCarId(car.id)}
                    className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isPreview
                        ? 'border-cyan-500/80 bg-zinc-900/90 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40'
                        : isSelected
                        ? 'border-emerald-500/60 bg-zinc-900/60'
                        : 'border-zinc-800/70 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div>
                      {/* Brand & Badge */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400">
                          {car.brand}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {car.isCustomMod && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> USDZ 3D
                            </span>
                          )}
                          {isSelected && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Đang Dùng
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 text-[9px] font-mono bg-zinc-800 text-zinc-400 rounded">
                            {car.bodyType}
                          </span>
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="text-sm font-bold text-white tracking-tight mb-1">
                        {car.name}
                      </h3>

                      {/* Inspiration & Description */}
                      <p className="text-[11px] text-zinc-400 mb-2.5 line-clamp-2">
                        {car.description || (car.inspiration ? `Cảm hứng từ: ${car.inspiration}` : 'Bản độ FiveM Lore-Friendly')}
                      </p>

                      {/* Mini Stats Bar */}
                      <div className="space-y-1.5 py-2 border-y border-zinc-800/60 mb-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Gauge className="w-3 h-3 text-cyan-400" /> Tốc độ
                          </span>
                          <span className="font-mono text-zinc-200 font-semibold">
                            {car.topSpeedKmh} km/h
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" /> Gia tốc
                          </span>
                          <span className="font-mono text-zinc-200 font-semibold">
                            0-100: {car.acceleration}s
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-rose-400" /> Drift
                          </span>
                          <span className="font-mono text-zinc-200 font-semibold">
                            {car.driftRating}/10
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-zinc-500">
                        /car {car.spawnCode}
                      </span>
                      <button
                        id={`btn-drive-${car.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAndDrive(car);
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-sm'
                        }`}
                      >
                        {isSelected ? 'Đang Lái' : 'Chọn Lái'}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detail & Customization Pane */}
          <div className="lg:col-span-5 p-5 bg-zinc-900/40 flex flex-col justify-between overflow-y-auto max-h-[58vh]">
            <div className="space-y-4">
              {/* Highlight Header */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    {currentCar.brand}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-mono font-medium bg-zinc-800 text-zinc-300 rounded">
                    Drivetrain: {currentCar.drivetrain}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {currentCar.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Động cơ: <span className="text-zinc-200 font-mono">{currentCar.engineSound.replace(/_/g, ' ').toUpperCase()}</span> • {currentCar.description}
                </p>

                {/* Spawn Command Box */}
                <div className="mt-3 p-2 rounded-lg bg-black/60 border border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    Spawn Code: <strong className="text-cyan-300">{currentCar.spawnCode}</strong>
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">
                    {currentCar.isCustomMod ? 'USDZ MOD' : 'FiveM Pack'}
                  </span>
                </div>

                {currentCar.isCustomMod && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center gap-2 text-xs text-cyan-200">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      <strong>Mẫu Xe 3D USDZ Mod:</strong> Sử dụng file mô hình <em>{currentCar.usdzModelUrl?.split('/').pop()}</em> (67 chi tiết sub-mesh 3D, hiệu ứng phản quang & lốp xe thể thao).
                    </span>
                  </div>
                )}
              </div>

              {/* Performance Radar Breakdown */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-cyan-400" />
                  Chỉ Số Hiệu Năng Xe (Performance Specs)
                </h4>

                {/* Top Speed Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Tốc độ tối đa</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {currentCar.topSpeedKmh} km/h
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (currentCar.topSpeedKmh / 370) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Acceleration Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Khả năng bức tốc</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {currentCar.acceleration}/10
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${currentCar.acceleration * 10}%` }}
                    />
                  </div>
                </div>

                {/* Handling Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Độ bám đường & Xử lý cua</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {currentCar.handling}/10
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${currentCar.handling * 10}%` }}
                    />
                  </div>
                </div>

                {/* Drift Rating Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">Góc Drift & Bẻ lái trượt</span>
                    <span className="font-mono text-rose-400 font-bold">
                      {currentCar.driftRating}/10
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full transition-all duration-300"
                      style={{ width: `${currentCar.driftRating * 10}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Paint Color Customization */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    Màu Sơn Ô Tô (Metallic Paint)
                  </h4>
                  <span className="text-xs font-mono text-zinc-400">{carPaintColor}</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {presetColors.map((color) => {
                    const isSelectedColor =
                      carPaintColor.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        id={`paint-color-${color.hex.replace('#', '')}`}
                        onClick={() => onChangePaintColor(color.hex)}
                        title={color.name}
                        className={`h-8 rounded-lg flex items-center justify-center border transition-all ${
                          isSelectedColor
                            ? 'border-white ring-2 ring-cyan-400 scale-105'
                            : 'border-zinc-700/80 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        {isSelectedColor && (
                          <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="pt-4 border-t border-zinc-800/80">
              <button
                id="spawn-and-drive-active-car-btn"
                onClick={() => handleSelectAndDrive(currentCar)}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-black hover:from-cyan-400 hover:to-blue-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
              >
                <Sparkles className="w-4 h-4" />
                LÁI XE NÀY NGAY: {currentCar.name} ({currentCar.topSpeedKmh} KM/H)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>Phím tắt: Bấm [ C ] hoặc [ V ] trong game để mở Garage FiveM</span>
          <span>Nguồn xe: FiveM-Lore-Friendly-Car-Pack (0takusensei)</span>
        </div>
      </div>
    </div>
  );
};
