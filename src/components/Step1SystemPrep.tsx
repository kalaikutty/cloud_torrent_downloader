import React from 'react';
import { 
  CheckCircle2, 
  FolderCheck, 
  Terminal, 
  Cpu, 
  Film, 
  ArrowRight, 
  Info,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { SystemInfo } from '../types';

interface Step1SystemPrepProps {
  systemInfo: SystemInfo | null;
  onProceedToStep2: () => void;
}

export const Step1SystemPrep: React.FC<Step1SystemPrepProps> = ({
  systemInfo,
  onProceedToStep2,
}) => {
  return (
    <div className="space-y-4">
      {/* High Density Header Banner */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#0F1117] border border-[#2D3343] flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold font-mono">
                STAGE 01 // KERNEL & ENVIRONMENT SETUP
              </span>
              <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-mono font-semibold">
                SYSTEM VERIFIED
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-[#E2E8F0] tracking-tight">
              Storage Architecture & Python Subprocess Initializer
            </h2>
          </div>
        </div>

        <button
          onClick={onProceedToStep2}
          className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors shadow-xs cursor-pointer"
        >
          <span>PROCEED TO STEP 2</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Code / Configuration Preview matching High Density Design */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-[#94A3B8]">In [01]: engine_setup.py</span>
          <span className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-mono">
            Mounted & Ready
          </span>
        </div>
        <div className="bg-[#050505] rounded border border-[#2D3343] p-3 font-mono text-xs leading-relaxed text-blue-300 overflow-x-auto">
          <p><span className="text-purple-400">import</span> os, sys, shutil, subprocess</p>
          <p><span className="text-purple-400">import</span> torrent_stream, ffmpeg</p>
          <br />
          <p className="text-gray-500"># Allocating high-throughput storage partitions</p>
          <p>CACHE_DIR = <span className="text-orange-300">"{systemInfo?.storage?.cache_path || '/storage/cache'}"</span></p>
          <p>OUTPUT_DIR = <span className="text-orange-300">"{systemInfo?.storage?.output_path || '/storage/videos'}"</span></p>
          <br />
          <p className="text-gray-500"># Verification of runtime binaries</p>
          <p><span className="text-purple-400">print</span>(<span className="text-orange-300">f"Python: &#123;sys.version&#125; | FFmpeg: 4.4.2 | Storage: {systemInfo?.storage?.free_bytes ? Math.round(systemInfo.storage.free_bytes / 1073741824) : 500}GB Free"</span>)</p>
        </div>
      </div>

      {/* Grid of System Resource Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Storage Paths Card */}
        <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderCheck className="w-4 h-4 text-blue-400" />
              <h3 className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold">Storage Mounts</h3>
            </div>
            <span className="text-[10px] text-green-400 font-mono">MOUNTED</span>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 rounded bg-[#0F1117] border border-[#2D3343] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#E2E8F0]">Cache Buffer Partition</div>
                <div className="text-[11px] font-mono text-[#94A3B8]">{systemInfo?.storage?.cache_path || '/storage/cache'}</div>
              </div>
              <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">READY</span>
            </div>

            <div className="p-2.5 rounded bg-[#0F1117] border border-[#2D3343] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#E2E8F0]">Output Video Storage</div>
                <div className="text-[11px] font-mono text-[#94A3B8]">{systemInfo?.storage?.output_path || '/storage/videos'}</div>
              </div>
              <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">PERSISTENT</span>
            </div>
          </div>
        </div>

        {/* Engine Diagnostics Card */}
        <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <h3 className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold">Engine Diagnostics</h3>
            </div>
            <span className="text-[10px] text-blue-400 font-mono">ONLINE</span>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 rounded bg-[#0F1117] border border-[#2D3343] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#E2E8F0]">Python Runtime Subprocess</div>
                <div className="text-[11px] font-mono text-[#94A3B8]">Version {systemInfo?.python_version || '3.10.12'}</div>
              </div>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">ACTIVE</span>
            </div>

            <div className="p-2.5 rounded bg-[#0F1117] border border-[#2D3343] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[#E2E8F0]">FFmpeg Transcode Pipeline</div>
                <div className="text-[11px] font-mono text-[#94A3B8] truncate max-w-[200px]">libx264 • libmp3lame • scale</div>
              </div>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">LOADED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Step Forward */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Stage 01 complete. Paste your magnet link in Stage 02 to stream directly to cloud cache.</span>
        </div>
        <button
          onClick={onProceedToStep2}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span>CONTINUE TO STEP 02</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
