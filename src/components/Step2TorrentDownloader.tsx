import React, { useState, useEffect, useRef } from 'react';
import { 
  Magnet, 
  ListOrdered, 
  Download, 
  CheckSquare, 
  Square, 
  FileVideo, 
  FileAudio, 
  FileText, 
  FileArchive, 
  File, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Loader2, 
  ArrowRight,
  Upload,
  AlertCircle
} from 'lucide-react';
import { TorrentMetadata, TorrentFile, DownloadJobStatus } from '../types';
import { formatBytes, formatSpeed, formatEta, getFileCategory } from '../utils/format';

interface Step2TorrentDownloaderProps {
  onDownloadFinished: (downloadedFiles: string[]) => void;
  onProceedToStep3: () => void;
}

export const Step2TorrentDownloader: React.FC<Step2TorrentDownloaderProps> = ({
  onDownloadFinished,
  onProceedToStep3,
}) => {
  const [magnetInput, setMagnetInput] = useState<string>('');
  const [isFetchingMeta, setIsFetchingMeta] = useState<boolean>(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<TorrentMetadata | null>(null);

  // Selected files map (path -> boolean)
  const [selectedPaths, setSelectedPaths] = useState<Record<string, boolean>>({});

  // Active Download Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<DownloadJobStatus | null>(null);
  const [isStartingDownload, setIsStartingDownload] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleGetFileList = async (fileOverride?: File) => {
    setMetaError(null);
    setMetadata(null);
    setSelectedPaths({});

    if (!magnetInput.trim() && !fileOverride) {
      setMetaError('Please enter a valid Magnet Link or upload a .torrent file.');
      return;
    }

    setIsFetchingMeta(true);
    try {
      let res;
      if (fileOverride) {
        const formData = new FormData();
        formData.append('torrentFile', fileOverride);
        res = await fetch('/api/torrent/info', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/torrent/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ magnetUri: magnetInput.trim() }),
        });
      }

      let data: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server error (HTTP ${res.status})`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch torrent metadata.');
      }

      setMetadata(data);

      const initialSelection: Record<string, boolean> = {};
      data.files.forEach((f: TorrentFile) => {
        const cat = getFileCategory(f.name);
        initialSelection[f.path] = cat === 'video' || cat === 'audio' || data.files.length === 1;
      });
      if (Object.values(initialSelection).filter(Boolean).length === 0) {
        data.files.forEach((f: TorrentFile) => {
          initialSelection[f.path] = true;
        });
      }
      setSelectedPaths(initialSelection);
    } catch (err: any) {
      setMetaError(err.message || 'Error connecting to peers. Please verify your link.');
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const toggleFile = (filePath: string) => {
    setSelectedPaths((prev) => ({
      ...prev,
      [filePath]: !prev[filePath],
    }));
  };

  const selectAll = (select: boolean) => {
    if (!metadata) return;
    const next: Record<string, boolean> = {};
    metadata.files.forEach((f) => {
      next[f.path] = select;
    });
    setSelectedPaths(next);
  };

  const handleStartDownload = async () => {
    if (!metadata) return;
    const selectedList = Object.entries(selectedPaths)
      .filter(([_, isSelected]) => isSelected)
      .map(([path]) => path);

    if (selectedList.length === 0) {
      setMetaError('Please select at least one file from the list to download.');
      return;
    }

    setIsStartingDownload(true);
    setMetaError(null);

    try {
      const res = await fetch('/api/torrent/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infoHash: metadata.infoHash,
          magnetUri: magnetInput,
          selectedFilePaths: selectedList,
        }),
      });

      let data: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server error (HTTP ${res.status})`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start download.');
      }

      setActiveJobId(data.jobId);
    } catch (err: any) {
      setMetaError(err.message || 'Failed to start download.');
    } finally {
      setIsStartingDownload(false);
    }
  };

  useEffect(() => {
    if (!activeJobId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sse = new EventSource(`/api/torrent/stream/${activeJobId}`);
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data: DownloadJobStatus = JSON.parse(event.data);
        setJobStatus(data);

        if (data.status === 'completed') {
          onDownloadFinished(data.selectedFiles || []);
        }
      } catch (e) {
        console.error('Failed to parse download SSE event', e);
      }
    };

    return () => {
      sse.close();
    };
  }, [activeJobId]);

  const handleCancelDownload = async () => {
    if (!activeJobId) return;
    try {
      await fetch(`/api/torrent/cancel/${activeJobId}`, { method: 'POST' });
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setActiveJobId(null);
      setJobStatus(null);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedCount = Object.values(selectedPaths).filter(Boolean).length;
  const selectedTotalBytes = metadata
    ? metadata.files
        .filter((f) => selectedPaths[f.path])
        .reduce((sum, f) => sum + f.length, 0)
    : 0;

  const renderFileIcon = (filename: string) => {
    const cat = getFileCategory(filename);
    if (cat === 'video') return <FileVideo className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    if (cat === 'audio') return <FileAudio className="w-3.5 h-3.5 text-green-400 shrink-0" />;
    if (cat === 'document') return <FileText className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    if (cat === 'archive') return <FileArchive className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    return <File className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* High Density Header & Input Box */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold font-mono">
              STAGE 02 // TORRENT CLIENT INGESTION
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#94A3B8]">
            SWARM PROTOCOL: TCP (HTTP/S Trackers)
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                <Magnet className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={magnetInput}
                onChange={(e) => setMagnetInput(e.target.value)}
                placeholder="Paste magnet link (magnet:?xt=urn:btih:...)"
                disabled={isFetchingMeta || !!activeJobId}
                className="w-full pl-9 pr-3 py-1.5 bg-[#050505] border border-[#2D3343] rounded text-xs text-[#E2E8F0] placeholder-[#64748B] focus:outline-none focus:border-blue-500 font-mono transition-colors"
              />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".torrent"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleGetFileList(f);
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isFetchingMeta || !!activeJobId}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0F1117] hover:bg-[#1A1D27] text-[#94A3B8] hover:text-white border border-[#2D3343] rounded text-xs font-mono transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>.TORRENT</span>
            </button>

            <button
              onClick={() => handleGetFileList()}
              disabled={isFetchingMeta || !magnetInput.trim() || !!activeJobId}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer whitespace-nowrap"
            >
              {isFetchingMeta ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>FETCHING METADATA...</span>
                </>
              ) : (
                <>
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>1. GET FILE LIST</span>
                </>
              )}
            </button>
          </div>

          {metaError && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2.5 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{metaError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Metadata & File Selection Box */}
      {metadata && !activeJobId && (
        <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2D3343] gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  INFO HASH: {metadata.infoHash.substring(0, 12)}...
                </span>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                  {formatBytes(metadata.totalSize)} • {metadata.files.length} file(s)
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#E2E8F0] mt-1 font-mono">
                {metadata.name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => selectAll(true)}
                className="px-2.5 py-1 rounded bg-[#0F1117] hover:bg-[#2D3343] text-[#94A3B8] hover:text-white text-xs font-mono border border-[#2D3343] transition-colors"
              >
                SELECT ALL
              </button>
              <button
                onClick={() => selectAll(false)}
                className="px-2.5 py-1 rounded bg-[#0F1117] hover:bg-[#2D3343] text-[#94A3B8] hover:text-white text-xs font-mono border border-[#2D3343] transition-colors"
              >
                DESELECT ALL
              </button>
            </div>
          </div>

          {/* High Density File List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {metadata.files.map((file) => {
              const isSelected = !!selectedPaths[file.path];
              return (
                <div
                  key={file.path}
                  onClick={() => toggleFile(file.path)}
                  className={`flex items-center justify-between p-2 rounded border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F1117] border-blue-500/40 text-[#E2E8F0]'
                      : 'bg-[#050505] border-[#2D3343]/60 text-[#94A3B8] hover:border-[#2D3343]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="shrink-0 text-blue-400">
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-[#64748B]" />}
                    </div>
                    {renderFileIcon(file.name)}
                    <div className="truncate text-xs font-mono text-[#E2E8F0]">
                      {file.path}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-[#94A3B8] shrink-0">
                    {formatBytes(file.length)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Trigger */}
          <div className="flex items-center justify-between pt-3 border-t border-[#2D3343]">
            <div className="text-xs font-mono text-[#94A3B8]">
              SELECTED: <span className="text-white font-bold">{selectedCount}</span> file(s) ({formatBytes(selectedTotalBytes)})
            </div>

            <button
              onClick={handleStartDownload}
              disabled={isStartingDownload || selectedCount === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isStartingDownload ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>STARTING DOWNLOAD ENGINE...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>2. START DOWNLOAD SELECTED</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Active Download Progress Telemetry Box */}
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
                  STATUS: {jobStatus.status.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono text-[#94A3B8]">
                  {jobStatus.selectedFiles.length} file(s) selected
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#E2E8F0] mt-1 font-mono truncate max-w-lg">
                {jobStatus.torrentName}
              </h3>
            </div>

            {jobStatus.status !== 'completed' && (
              <button
                onClick={handleCancelDownload}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-mono border border-red-500/30 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>ABORT</span>
              </button>
            )}
          </div>

          {/* Thin High Density Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-[#E2E8F0] font-semibold">
                {jobStatus.status === 'connecting' ? 'DISCOVERING SWARM PEERS...' : `${jobStatus.progress}% DOWNLOADED`}
              </span>
              <span className="text-[#94A3B8]">
                {formatBytes(jobStatus.downloaded)} / {formatBytes(jobStatus.total || 1)}
              </span>
            </div>
            <div className="w-full bg-[#0F1117] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  jobStatus.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.max(jobStatus.progress, 2)}%` }}
              />
            </div>
          </div>

          {/* Telemetry Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-[#0F1117] border border-[#2D3343] rounded p-2.5">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#94A3B8]">
                <ArrowDownRight className="w-3 h-3 text-green-400" />
                <span>DOWN SPEED</span>
              </div>
              <div className="text-xs font-bold text-[#E2E8F0] font-mono mt-0.5">
                {formatSpeed(jobStatus.downloadSpeed)}
              </div>
            </div>

            <div className="bg-[#0F1117] border border-[#2D3343] rounded p-2.5">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#94A3B8]">
                <ArrowUpRight className="w-3 h-3 text-blue-400" />
                <span>UP SPEED</span>
              </div>
              <div className="text-xs font-bold text-[#E2E8F0] font-mono mt-0.5">
                {formatSpeed(jobStatus.uploadSpeed)}
              </div>
            </div>

            <div className="bg-[#0F1117] border border-[#2D3343] rounded p-2.5">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#94A3B8]">
                <Users className="w-3 h-3 text-purple-400" />
                <span>WIRES / PEERS</span>
              </div>
              <div className="text-xs font-bold text-[#E2E8F0] font-mono mt-0.5">
                {jobStatus.numPeers} active
              </div>
            </div>

            <div className="bg-[#0F1117] border border-[#2D3343] rounded p-2.5">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#94A3B8]">
                <Clock className="w-3 h-3 text-orange-400" />
                <span>ETA</span>
              </div>
              <div className="text-xs font-bold text-[#E2E8F0] font-mono mt-0.5">
                {jobStatus.status === 'completed' ? '0s' : formatEta(jobStatus.eta)}
              </div>
            </div>
          </div>

          {/* Completion Banner */}
          {jobStatus.warning && jobStatus.status !== 'completed' && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2.5 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{jobStatus.warning}</span>
            </div>
          )}

          {jobStatus.status === 'completed' && (
            <div className="bg-[#0F1117] border border-green-500/30 rounded p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs font-mono text-green-300">
                  Files cached successfully at /storage/cache. Ready for Stage 03.
                </span>
              </div>
              <button
                onClick={onProceedToStep3}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>RUN COMPRESSOR</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
