import React, { useState } from 'react';
import {
  Snowflake,
  X,
  FileText,
  Car,
  Settings,
  Shield,
  ExternalLink,
  Check,
  Copy,
  Sliders,
  Wind
} from 'lucide-react';
import {
  WINTERV_VEHICLES,
  WINTERV_README,
  WINTERV_INI_CONTENT
} from '../data/winterVPack';

interface WinterVModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWinterVActive: boolean;
  onToggleWinterV: () => void;
}

export const WinterVModal: React.FC<WinterVModalProps> = ({
  isOpen,
  onClose,
  isWinterVActive,
  onToggleWinterV
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'readme' | 'ini'>('overview');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
              <Snowflake className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-white">WINTERV - BETA V0.4</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/40 rounded-full">
                  GTA V Story Mode & 3D Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gói đại tu mùa đông tuyết trắng, bão tuyết Blizzard, vệt bánh xe tuyết và đội xe cảnh sát North Yankton
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleWinterV}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                isWinterVActive
                  ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40'
              }`}
            >
              <Snowflake className={`w-4 h-4 ${isWinterVActive ? 'animate-spin' : ''}`} />
              {isWinterVActive ? 'ĐANG BẬT BÃO TUYẾT (Shift+S)' : 'KÍCH HOẠT TUYẾT (Shift+S)'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wind className="w-4 h-4" />
            Tổng quan tính năng
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'vehicles'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-4 h-4" />
            Dàn xe North Yankton & Dân sự ({WINTERV_VEHICLES.length})
          </button>
          <button
            onClick={() => setActiveTab('readme')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'readme'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Readmy WinterV.txt
          </button>
          <button
            onClick={() => setActiveTab('ini')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'ini'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Cấu hình WinterV.ini
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Highlight Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/30">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      Đặc tính cốt lõi của WinterV Beta V0.4
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      Hệ Thống Môi Trường Mùa Đông & Tuyết Rơi Toàn Diện
                    </h3>
                    <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                      WinterV biến toàn bộ môi trường GTA V Story Mode và engine đường đua 3D thành thế giới băng tuyết:
                      từ địa hình phủ tuyết trắng, bão tuyết Blizzard mịt mù, vệt bánh xe tuyết bám đường cho đến các xe tuần tra cảnh sát North Yankton chuyên dụng.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Phím kích hoạt nhanh</span>
                    <span className="text-lg font-black text-sky-300 bg-sky-900/60 px-3 py-1 rounded-lg border border-sky-500/40 inline-block mt-1">
                      Shift + S
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5">
                      <Snowflake className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Địa hình & Bão tuyết</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mặt đất phủ tuyết trắng, 4,500 bông tuyết bay trôi dạt theo hướng gió, sương mù Blizzard mờ ảo.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Xe tuyết North Yankton</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tự động chuyển đổi cảnh sát tuần tra tuyết (policeold1/2) và xe dân sự phủ tuyết (asea2, emperor3, mesa2, sadler2...).
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Vật lý trơn trượt & Vết bánh</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hệ số ma sát băng tuyết (Grip 0.52), vệt bánh xe tuyết màu trắng xốp in hằn trên mặt đường.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions steps */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hướng Dẫn Cài Đặt GTA V Story Mode (Bản Gốc PC)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-sky-400 font-bold">Bước 1: Tiền đề</span>
                    <p className="text-slate-400">Cài đặt ScriptHookV và ScriptHookVDotNet 3.x vào thư mục gốc GTA V.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-sky-400 font-bold">Bước 2: File ASI & INI</span>
                    <p className="text-slate-400">Copy WinterV.asi và WinterV.ini vào cùng thư mục với GTA5.exe.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-sky-400 font-bold">Bước 3: Script C#</span>
                    <p className="text-slate-400">Copy WinterV_V0_4.3.cs vào thư mục scripts/ của GTA V.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-sky-400 font-bold">Bước 4: Vào game</span>
                    <p className="text-slate-400">Vào Story Mode và nhấn phím <strong>Shift + S</strong> để tận hưởng mùa đông!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Danh mục 8 mẫu xe phủ tuyết của WinterV & North Yankton được tích hợp:
                </p>
                <span className="text-xs font-bold text-sky-400 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-500/30">
                  {WINTERV_VEHICLES.length} Models Được Nạp
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WINTERV_VEHICLES.map(v => (
                  <div
                    key={v.modelName}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-sky-500/40 transition group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition">
                            {v.name}
                          </h4>
                          {v.category === 'POLICE' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                              POLICE
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {v.brand} • Model ID: <code className="text-sky-400 font-mono">{v.modelName}</code>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-full">
                        {v.snowCoverage} SNOW
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'readme' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nội dung đầy đủ tập tin Readme WinterV Beta V0.4
                </span>
                <button
                  onClick={() => copyToClipboard(WINTERV_README, 'readme')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  {copiedText === 'readme' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText === 'readme' ? 'Đã sao chép' : 'Sao chép Readme'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-sky-200/90 whitespace-pre-wrap leading-relaxed max-h-[55vh] overflow-y-auto">
                {WINTERV_README}
              </div>
            </div>
          )}

          {activeTab === 'ini' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cấu hình WinterV.ini
                </span>
                <button
                  onClick={() => copyToClipboard(WINTERV_INI_CONTENT, 'ini')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  {copiedText === 'ini' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText === 'ini' ? 'Đã sao chép' : 'Sao chép WinterV.ini'}
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-200/90 whitespace-pre-wrap leading-relaxed">
                {WINTERV_INI_CONTENT}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            Đã liên kết phím tắt <kbd className="px-1.5 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700 font-mono">Shift + S</kbd> trên toàn bộ ứng dụng.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
