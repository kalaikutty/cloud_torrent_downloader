import React from 'react';
import { 
  CloudDownload, 
  Cpu, 
  HardDrive, 
  FolderArchive, 
  Layers, 
  Film, 
  Terminal, 
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react';
import { SystemInfo } from '../types';
import { formatBytes } from '../utils/format';

interface NavbarProps {
  activeTab: 'step1' | 'step2' | 'step3' | 'step4';
  setActiveTab: (tab: 'step1' | 'step2' | 'step3' | 'step4') => void;
  systemInfo: SystemInfo | null;
  filesCount: number;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  systemInfo,
  filesCount,
  onRefresh,
  isLoading,
}) => {
  const freeSpace = systemInfo?.storage?.free_bytes ?? (systemInfo ? 0 : 500 * 1024 * 1024 * 1024);
  const totalSpace = systemInfo?.storage?.total_bytes ?? 500 * 1024 * 1024 * 1024;
  const usedPercent = totalSpace > 0 ? Math.min(100, Math.max(0, Math.round(((totalSpace - freeSpace) / totalSpace) * 100))) : 0;

  return (
    <header className="sticky top-0 z-40 bg-[#1A1D27] border-b border-[#2D3343] text-[#E2E8F0] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand & High Density System Tag */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-sm shadow-xs">
              P
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center">
                TorrentEngine
                <span className="text-[#94A3B8] font-normal text-xs sm:text-sm ml-2 font-mono">v2.4.0</span>
              </h1>
              <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#0F1117] text-blue-400 border border-blue-500/30">
                HIGH DENSITY RUNTIME
              </span>
            </div>
          </div>

          {/* Right side High Density System Status & Actions */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Kernel Status Badge */}
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
              <span className={`w-2 h-2 rounded-full ${systemInfo ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
              <span>KERNEL: PYTHON {systemInfo?.python_version || '3.10'} ({systemInfo?.activeProcesses ? 'BUSY' : (systemInfo ? 'IDLE' : 'CONNECTING')})</span>
            </div>

            {/* Storage Metric Pill */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0F1117] border border-[#2D3343] text-xs font-mono">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[#94A3B8] text-[11px]">STORAGE:</span>
              <span className="text-[#E2E8F0] font-semibold text-[11px]">{formatBytes(freeSpace)} FREE</span>
              <div className="w-10 h-1 bg-[#1A1D27] rounded-full overflow-hidden ml-1">
                <div 
                  className={`h-full ${usedPercent > 85 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.max(usedPercent, 4)}%` }}
                />
              </div>
            </div>

            {/* Refresh Action Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Sync Kernel & Storage State"
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">SYNC ENGINE</span>
            </button>
          </div>
        </div>

        {/* High Density Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-t border-[#2D3343] py-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('step1')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'step1'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#0F1117]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>01. System & Prep</span>
          </button>

          <button
            onClick={() => setActiveTab('step2')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'step2'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#0F1117]'
            }`}
          >
            <CloudDownload className="w-3.5 h-3.5" />
            <span>02. Download Torrent</span>
          </button>

          <button
            onClick={() => setActiveTab('step3')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'step3'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#0F1117]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>03. Compress & Transcode</span>
          </button>

          <button
            onClick={() => setActiveTab('step4')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'step4'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#0F1117]'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>04. Storage Outputs</span>
            {filesCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 bg-[#0F1117] text-blue-400 rounded text-[10px] font-mono font-bold border border-blue-500/30">
                {filesCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
