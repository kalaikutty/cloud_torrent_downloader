import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Film, 
  Volume2, 
  Sliders, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  FileVideo,
  FileCheck,
  Cpu,
  Layers
} from 'lucide-react';
import { ProcessJobStatus } from '../types';
import { formatBytes, formatSeconds } from '../utils/format';

interface Step3CompressorProps {
  onCompressionFinished: () => void;
  onProceedToStep4: () => void;
}

interface CacheFileInfo {
  name: string;
  relativePath: string;
  absolutePath: string;
  size: number;
  mtime: string;
}

export const Step3Compressor: React.FC<Step3CompressorProps> = ({
  onCompressionFinished,
  onProceedToStep4,
}) => {
  const [cachedFiles, setCachedFiles] = useState<CacheFileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<string>('');

  // Transcoding Configuration
  const [targetRes, setTargetRes] = useState<'original' | '720' | '480' | '360' | 'audio'>('original');
  const [customFilename, setCustomFilename] = useState<string>('');

  // Active Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ProcessJobStatus | null>(null);
  const [isStartingProcess, setIsStartingProcess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchCachedFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/torrent/cache-files');
      const data = await res.json();
      if (data.success) {
        setCachedFiles(data.files);
        if (data.files.length > 0 && !selectedFile) {
          setSelectedFile(data.files[0].relativePath);
        }
      }
    } catch (e) {
      console.error('Failed to fetch cache files', e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchCachedFiles();
  }, []);

  const handleStartTranscode = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file from the downloaded cache.');
      return;
    }

    setIsStartingProcess(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/process/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputRelativePath: selectedFile,
          targetRes,
          customFilename: customFilename.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start transcoding engine.');
      }

      setActiveJobId(data.jobId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Transcoder startup failed.');
    } finally {
      setIsStartingProcess(false);
    }
  };

  useEffect(() => {
    if (!activeJobId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sse = new EventSource(`/api/process/stream/${activeJobId}`);
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data: ProcessJobStatus = JSON.parse(event.data);
        setJobStatus(data);

        if (data.status === 'completed') {
          onCompressionFinished();
        }
      } catch (e) {
        console.error('Failed to parse process SSE event', e);
      }
    };

    return () => {
      sse.close();
    };
  }, [activeJobId]);

  return (
    <div className="space-y-4">
      {/* High Density Step Header */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold font-mono">
              STAGE 03 // FFMPEG HARDWARE TRANSCODE & COMPRESSION
            </span>
          </div>
          <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
            PRESETS: 720P / 480P / 360P / MP3
          </span>
        </div>
        <p className="text-xs text-[#94A3B8]">
          Execute streaming stream copy or full multi-pass FFmpeg compression. Processed files are persisted to <code className="text-blue-300 font-mono">/storage/videos</code>.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4 space-y-4">
        {/* 1. Input File Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold">
              1. Select Source Media from Cache
            </label>
            <button
              onClick={fetchCachedFiles}
              disabled={isLoadingFiles}
              className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>SYNC CACHE</span>
            </button>
          </div>

          {isLoadingFiles ? (
            <div className="p-3 bg-[#050505] border border-[#2D3343] rounded text-xs text-[#94A3B8] flex items-center gap-2 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning /storage/cache for input media...</span>
            </div>
          ) : cachedFiles.length === 0 ? (
            <div className="p-4 bg-[#050505] border border-orange-500/30 rounded text-xs text-orange-300 font-mono">
              No files currently found in /storage/cache. Please download a torrent in Stage 02 first.
            </div>
          ) : (
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              disabled={!!activeJobId && jobStatus?.status === 'processing'}
              className="w-full bg-[#050505] border border-[#2D3343] rounded p-2 text-xs text-[#E2E8F0] font-mono focus:border-blue-500 focus:outline-none transition-colors"
            >
              {cachedFiles.map((file) => (
                <option key={file.relativePath} value={file.relativePath}>
                  {file.name} ({formatBytes(file.size)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. Target Resolution Preset Selector */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold mb-2">
            2. Choose Transcode Preset
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* Original */}
            <button
              type="button"
              onClick={() => setTargetRes('original')}
              disabled={!!activeJobId && jobStatus?.status === 'processing'}
              className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                targetRes === 'original'
                  ? 'bg-[#0F1117] border-blue-500 text-white shadow-xs'
                  : 'bg-[#050505] border-[#2D3343] text-[#94A3B8] hover:border-[#3B82F6]/50'
              }`}
            >
              <div className="text-xs font-bold text-blue-400 font-mono">Original</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">Stream Copy (Instant)</div>
            </button>

            {/* 720p */}
            <button
              type="button"
              onClick={() => setTargetRes('720')}
              disabled={!!activeJobId && jobStatus?.status === 'processing'}
              className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                targetRes === '720'
                  ? 'bg-[#0F1117] border-blue-500 text-white shadow-xs'
                  : 'bg-[#050505] border-[#2D3343] text-[#94A3B8] hover:border-[#3B82F6]/50'
              }`}
            >
              <div className="text-xs font-bold text-[#E2E8F0] font-mono">720p HD</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">High Quality CRF 23</div>
            </button>

            {/* 480p */}
            <button
              type="button"
              onClick={() => setTargetRes('480')}
              disabled={!!activeJobId && jobStatus?.status === 'processing'}
              className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                targetRes === '480'
                  ? 'bg-[#0F1117] border-blue-500 text-white shadow-xs'
                  : 'bg-[#050505] border-[#2D3343] text-[#94A3B8] hover:border-[#3B82F6]/50'
              }`}
            >
              <div className="text-xs font-bold text-[#E2E8F0] font-mono">480p SD</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">Standard Balance</div>
            </button>

            {/* 360p */}
            <button
              type="button"
              onClick={() => setTargetRes('360')}
              disabled={!!activeJobId && jobStatus?.status === 'processing'}
              className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                targetRes === '360'
                  ? 'bg-[#0F1117] border-blue-500 text-white shadow-xs'
                  : 'bg-[#050505] border-[#2D3343] text-[#94A3B8] hover:border-[#3B82F6]/50'
              }`}
            >
              <div className="text-xs font-bold text-[#E2E8F0] font-mono">360p Small</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">Max Compression</div>
            </button>

            {/* Audio Only */}
            <button
              type="button"
              onClick={() => setTargetRes('audio')}
              disabled={!!activeJobId && jobStatus?.status === 'processing'}
              className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                targetRes === 'audio'
                  ? 'bg-[#0F1117] border-green-500 text-white shadow-xs'
                  : 'bg-[#050505] border-[#2D3343] text-[#94A3B8] hover:border-[#3B82F6]/50'
              }`}
            >
              <div className="text-xs font-bold text-green-400 font-mono">Audio MP3</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">MP3 192k Audio</div>
            </button>
          </div>
        </div>

        {/* 3. Output Custom Name & Trigger */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder="Custom output filename (optional, e.g., output_movie.mp4)"
            disabled={!!activeJobId && jobStatus?.status === 'processing'}
            className="flex-1 px-3 py-1.5 bg-[#050505] border border-[#2D3343] rounded text-xs text-[#E2E8F0] placeholder-[#64748B] font-mono focus:border-blue-500 focus:outline-none transition-colors"
          />

          <button
            onClick={handleStartTranscode}
            disabled={isStartingProcess || !selectedFile || (!!activeJobId && jobStatus?.status === 'processing')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
          >
            {isStartingProcess ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SPAWNING SUBPROCESS...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>START COMPRESSION</span>
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2.5 font-mono">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* High Density Live FFmpeg Telemetry Console */}
      {jobStatus && (
        <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#2D3343]">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  jobStatus.status === 'completed'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  MODE: {jobStatus.mode.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                  TARGET: {jobStatus.targetRes}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#E2E8F0] mt-1 font-mono">
                {jobStatus.outputFileName || jobStatus.inputFileName}
              </h3>
            </div>

            <span className="text-xs font-mono text-blue-400">
              {jobStatus.progress}% COMPLETED
            </span>
          </div>

          {/* Thin Progress Bar */}
          <div>
            <div className="w-full bg-[#0F1117] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  jobStatus.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.max(jobStatus.progress, 2)}%` }}
              />
            </div>
          </div>

          {/* Real-time FFmpeg Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#0F1117] border border-[#2D3343] rounded p-2.5 font-mono">
              <div className="text-[10px] text-[#94A3B8] uppercase font-bold">FRAME COUNT</div>
              <div className="text-xs font-bold text-[#E2E8F0] mt-0.5">{jobStatus.frame || '0'}</div>
            </div>
            <div className="bg-[#0F1117] border border-[#2D3343] rounded p-2.5 font-mono">
              <div className="text-[10px] text-[#94A3B8] uppercase font-bold">ENCODE FPS</div>
              <div className="text-xs font-bold text-[#E2E8F0] mt-0.5">{jobStatus.fps || '0'}</div>
            </div>
            <div className="bg-[#0F1117] border border-[#2D3343] rounded p-2.5 font-mono">
              <div className="text-[10px] text-[#94A3B8] uppercase font-bold">VELOCITY</div>
              <div className="text-xs font-bold text-green-400 mt-0.5">{jobStatus.speed || '1.0x'}</div>
            </div>
            <div className="bg-[#0F1117] border border-[#2D3343] rounded p-2.5 font-mono">
              <div className="text-[10px] text-[#94A3B8] uppercase font-bold">BITRATE</div>
              <div className="text-xs font-bold text-blue-400 mt-0.5">{jobStatus.bitrate || 'N/A'}</div>
            </div>
          </div>

          {/* Terminal Log Stream preview matching High Density Design */}
          {jobStatus.lastLog && (
            <div className="bg-[#050505] rounded border border-[#2D3343] p-2.5 font-mono text-[11px] text-gray-400 overflow-x-auto">
              <span className="text-blue-400">[FFmpeg Engine]</span> {jobStatus.lastLog}
            </div>
          )}

          {/* Completion Card */}
          {jobStatus.status === 'completed' && (
            <div className="bg-[#0F1117] border border-green-500/30 rounded p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-xs font-mono text-green-300">
                  Encoded {formatBytes(jobStatus.outputSize)} in {jobStatus.elapsedSec.toFixed(1)}s. Persisted to /storage/videos.
                </span>
              </div>
              <button
                onClick={onProceedToStep4}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>OPEN OUTPUTS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
