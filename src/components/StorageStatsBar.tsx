import React from 'react';
import { HardDrive, Trash2, Video, Database, CheckCircle2, Layers } from 'lucide-react';
import { SystemInfo } from '../types';
import { formatBytes } from '../utils/format';

interface StorageStatsBarProps {
  systemInfo: SystemInfo | null;
  onClearCache: () => void;
  isClearingCache: boolean;
}

export const StorageStatsBar: React.FC<StorageStatsBarProps> = ({
  systemInfo,
  onClearCache,
  isClearingCache,
}) => {
  const storage = systemInfo?.storage;
  const freeBytes = storage?.free_bytes ?? (systemInfo ? 0 : 500 * 1024 * 1024 * 1024);
  const totalBytes = storage?.total_bytes ?? 500 * 1024 * 1024 * 1024;
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const cacheBytes = storage?.cache_size_bytes || 0;
  const outputBytes = storage?.output_size_bytes || 0;

  const usedPercent = totalBytes > 0 ? Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100))) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {/* 1. Main Storage Capacity */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold">Total Storage</span>
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="my-2">
          <div className="text-lg font-bold text-[#E2E8F0] font-mono">{formatBytes(freeBytes)} <span className="text-xs text-[#94A3B8] font-normal">free</span></div>
          <div className="text-[11px] text-[#64748B] font-mono">Volume capacity: {formatBytes(totalBytes)}</div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono mb-1">
            <span>USED CAPACITY</span>
            <span>{usedPercent}%</span>
          </div>
          <div className="h-1 bg-[#0F1117] rounded-full overflow-hidden">
            <div
              className={`h-full ${usedPercent > 85 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.max(usedPercent, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Processed Output Storage */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold">Outputs / Videos</span>
          <Video className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="my-2">
          <div className="text-lg font-bold text-[#E2E8F0] font-mono">{formatBytes(outputBytes)}</div>
          <div className="text-[11px] text-[#64748B] font-mono truncate">Mount: /storage/videos</div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono mb-1">
            <span>PERSISTENT VOLUME</span>
            <span className="text-green-400">ACTIVE</span>
          </div>
          <div className="h-1 bg-[#0F1117] rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 w-[18%]" />
          </div>
        </div>
      </div>

      {/* 3. Temp Torrent Cache Storage */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold">Torrent Cache</span>
          <Database className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div className="my-2 flex items-baseline justify-between">
          <div>
            <div className="text-lg font-bold text-[#E2E8F0] font-mono">{formatBytes(cacheBytes)}</div>
            <div className="text-[11px] text-[#64748B] font-mono truncate">Mount: /storage/cache</div>
          </div>
          <button
            onClick={onClearCache}
            disabled={isClearingCache || cacheBytes === 0}
            className="border border-red-500/40 text-red-400 hover:bg-red-500/10 py-1 px-2.5 rounded text-[10px] font-bold uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
            title="Clean torrent cache"
          >
            <Trash2 className="w-3 h-3" />
            <span>{isClearingCache ? '...' : 'Clear'}</span>
          </button>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono mb-1">
            <span>CACHE BUFFER</span>
            <span>{cacheBytes > 0 ? 'BUFFERING' : 'IDLE'}</span>
          </div>
          <div className="h-1 bg-[#0F1117] rounded-full overflow-hidden">
            <div className="h-full bg-orange-400 w-[12%]" />
          </div>
        </div>
      </div>

      {/* 4. Engine & Diagnostics */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold">Runtime Engine</span>
          <Layers className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="my-2">
          <div className="text-lg font-bold text-[#E2E8F0] font-mono flex items-center gap-1.5">
            {systemInfo?.gpu_available ? (
              <span className="text-green-400">NVIDIA CUDA</span>
            ) : (
              <span>CPU Multi-Thread</span>
            )}
          </div>
          <div className="text-[11px] text-[#64748B] font-mono">
            Tasks: {systemInfo?.activeProcesses || 0} active, {systemInfo?.activeDownloads || 0} queued
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono mb-1">
            <span>ENGINE STATUS</span>
            <span className="text-green-400">READY</span>
          </div>
          <div className="h-1 bg-[#0F1117] rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
