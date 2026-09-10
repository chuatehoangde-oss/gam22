import React, { useState } from 'react';
import {
  Map,
  X,
  ExternalLink,
  Maximize2,
  Minimize2,
  Compass,
  Navigation,
  Globe,
  Flag,
  Sparkles,
  Info
} from 'lucide-react';

export type GTACityId = 'sa' | 'vc' | 'iii';

interface GTAMapExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRaceTrack?: (trackId: string) => void;
}

interface CityInfo {
  id: GTACityId;
  name: string;
  game: string;
  year: string;
  url: string;
  trackId: string;
  trackName: string;
  description: string;
  landmarks: { name: string; desc: string }[];
  bgGradient: string;
  accentColor: string;
}

const CITIES: CityInfo[] = [
  {
    id: 'sa',
    name: 'San Andreas',
    game: 'Grand Theft Auto: San Andreas',
    year: '2004',
    url: 'https://gtamap.online/sa',
    trackId: 'san_andreas_los_santos',
    trackName: 'Los Santos & Vinewood Expressway',
    description: 'Toàn cảnh bang San Andreas rộng lớn gồm 3 đại đô thị: Los Santos, San Fierro, Las Venturas và vùng nông thôn Red County, đỉnh núi Mount Chiliad.',
    landmarks: [
      { name: 'Maze Bank Tower', desc: 'Tòa cao ốc biểu tượng cao nhất trung tâm Los Santos' },
      { name: 'Vinewood Sign', desc: 'Dòng chữ 3D khổng lồ trên sườn đồi Vinewood' },
      { name: 'Grove Street', desc: 'Khu phố quê hương của CJ và băng đảng Grove Street Families' },
      { name: 'Gant Bridge', desc: 'Cầu treo màu đỏ cam nối San Fierro bắc qua eo biển' },
      { name: 'The Strip & Casinos', desc: 'Đại lộ sòng bạc neon rực rỡ tại Las Venturas' }
    ],
    bgGradient: 'from-amber-600/30 to-yellow-600/20',
    accentColor: '#f59e0b'
  },
  {
    id: 'vc',
    name: 'Vice City',
    game: 'Grand Theft Auto: Vice City',
    year: '2002',
    url: 'https://gtamap.online/vc',
    trackId: 'vice_city_ocean_drive',
    trackName: 'Vice City Ocean Beach & Starfish Island',
    description: 'Bờ biển Miami thập niên 80 ngập tràn ánh đèn neon, dãy khách sạn Art Deco rực rỡ bên hàng dừa, bán đảo Starfish Island và bãi cát vàng Ocean Beach.',
    landmarks: [
      { name: 'Ocean Beach & Hotels', desc: 'Dãy khách sạn phong cách Art Deco pastel ven biển' },
      { name: 'Starfish Island', desc: 'Khu biệt thự xa hoa của ông trùm Ricardo Diaz / Tommy Vercetti' },
      { name: 'Malibu Club', desc: 'Hộp đêm phong cách thập niên 80 biểu tượng của Vice City' },
      { name: 'Escobar International', desc: 'Sân bay quốc tế lớn với các đường băng dài ven biển' }
    ],
    bgGradient: 'from-pink-600/30 to-cyan-600/20',
    accentColor: '#ec4899'
  },
  {
    id: 'iii',
    name: 'Liberty City',
    game: 'Grand Theft Auto III',
    year: '2001',
    url: 'https://gtamap.online/iii',
    trackId: 'san_andreas_san_fierro',
    trackName: 'Liberty City Downtown Circuit',
    description: 'Thành phố New York ảo của thế hệ 3D đầu tiên gồm 3 quận đặc trưng: Portland công nghiệp, Staunton Island hiện đại và Shoreside Vale đồi dốc.',
    landmarks: [
      { name: 'Callahan Bridge', desc: 'Cây cầu nối Portland và Staunton Island' },
      { name: 'Staunton Island Downtown', desc: 'Khu tài chính trung tâm với các tòa nhà chọc trời' },
      { name: 'Portland Harbor', desc: 'Khu cảng công nghiệp của mafia Leone Family' }
    ],
    bgGradient: 'from-blue-600/30 to-slate-600/20',
    accentColor: '#3b82f6'
  }
];

export const GTAMapExplorerModal: React.FC<GTAMapExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelectRaceTrack
}) => {
  const [selectedCityId, setSelectedCityId] = useState<GTACityId>('sa');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentCity = CITIES.find((c) => c.id === selectedCityId) || CITIES[0];

  const handleLaunchTrack = (trackId: string) => {
    if (onSelectRaceTrack) {
      onSelectRaceTrack(trackId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 md:p-6 animate-in fade-in duration-200">
      <div
        className={`relative w-full flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'h-full w-full rounded-none border-none p-0' : 'h-[92vh] max-w-7xl'
        }`}
      >
        {/* TOP BAR */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-black text-white tracking-wide uppercase flex items-center gap-2">
                  BẢN ĐỒ 3D GTA • GRAND THEFT AUTO FOR UNITY
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    mukaschultze
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Tải trực tiếp bản đồ 3D tương tác của các thành phố GTA (San Andreas, Vice City, GTA III)
              </p>
            </div>
          </div>

          {/* CITY TABS */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {CITIES.map((city) => (
              <button
                key={city.id}
                onClick={() => setSelectedCityId(city.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedCityId === city.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{city.name}</span>
                <span className="text-[10px] opacity-70 hidden md:inline">({city.year})</span>
              </button>
            ))}
          </div>

          {/* ACTION CONTROLS */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/mukaschultze/grand-theft-auto-for-unity"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
              title="Xem mã nguồn mở trên GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline">GitHub Repo</span>
            </a>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-white border border-rose-500/30 transition"
              title="Đóng bản đồ (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAP CONTAINER & SIDE DRAWER */}
        <div className="relative flex-1 bg-black flex overflow-hidden">
          {/* Real WebGL Map Iframe from mukaschultze/grand-theft-auto-for-unity (gtamap.online) */}
          <div className="relative flex-1 h-full w-full bg-slate-950">
            <iframe
              src={currentCity.url}
              className="w-full h-full border-none"
              title={`GTA 3D Map - ${currentCity.name}`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              loading="eager"
            />

            {/* Quick Navigation / Help Pill */}
            <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-slate-200 text-xs flex items-center gap-2 shadow-lg pointer-events-none">
              <Navigation className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>
                <strong>Điều khiển 3D:</strong> Chuột trái để xoay camera • Chuột phải để kéo bản đồ • Lăn chuột phóng to
              </span>
            </div>

            {/* Bottom Race CTA Bar */}
            <div className="absolute bottom-4 left-4 right-4 md:right-auto z-10 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleLaunchTrack(currentCity.trackId)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs tracking-wider uppercase flex items-center gap-2 shadow-xl shadow-amber-500/30 transition transform hover:scale-[1.02]"
              >
                <Flag className="w-4 h-4" />
                <span>CHẠY CHẶNG ĐUA TẠI {currentCity.name.toUpperCase()}</span>
              </button>

              <button
                onClick={() => setShowInfoDrawer(!showInfoDrawer)}
                className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 transition"
              >
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>{showInfoDrawer ? 'Ẩn địa danh' : 'Xem địa danh'}</span>
              </button>
            </div>
          </div>

          {/* LANDMARK & INFO DRAWER */}
          {showInfoDrawer && (
            <div className="w-80 md:w-96 bg-slate-900/95 border-l border-slate-800 p-4 flex flex-col shrink-0 overflow-y-auto backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-white uppercase">{currentCity.game}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">3D MAP LOADER</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {currentCity.description}
              </p>

              {/* Source Project Credits */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dự án mã nguồn mở:</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Phát triển bởi <strong className="text-slate-200">Muka Schultze</strong> (GitHub: grand-theft-auto-for-unity).
                  Trích xuất và kết xuất chuẩn xác toàn bộ hình học 3D, địa hình, mạng lưới đường sá và công trình từ file nguyên bản của GTA.
                </p>
                <div className="mt-2 flex gap-2">
                  <a
                    href="https://github.com/mukaschultze/grand-theft-auto-for-unity"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    github.com/mukaschultze/grand-theft-auto-for-unity &rarr;
                  </a>
                </div>
              </div>

              {/* Iconic Landmarks */}
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                ĐỊA DANH NỔI TIẾNG TRÊN BẢN ĐỒ
              </h4>
              <div className="space-y-2 mb-4">
                {currentCity.landmarks.map((lm, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="text-xs font-bold text-amber-300 mb-0.5">{lm.name}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{lm.desc}</div>
                  </div>
                ))}
              </div>

              {/* Race Track Action Card */}
              <div className="mt-auto pt-3 border-t border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Chặng đua mô phỏng tích hợp:
                </div>
                <div className="text-xs font-bold text-white mb-2">{currentCity.trackName}</div>
                <button
                  onClick={() => handleLaunchTrack(currentCity.trackId)}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Vào Chặng Đua Này Ngay</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
