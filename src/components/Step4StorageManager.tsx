import React, { useState } from 'react';
import { 
  FolderArchive, 
  Download, 
  Play, 
  Trash2, 
  FileVideo, 
  FileAudio, 
  Archive, 
  Search, 
  RefreshCw, 
  Clock, 
  HardDrive, 
  ExternalLink, 
  Film,
  Sparkles,
  Zap,
  Info,
  CheckCircle2
} from 'lucide-react';
import { StorageFile } from '../types';
import { formatBytes, formatSeconds, formatDate } from '../utils/format';

interface Step4StorageManagerProps {
  files: StorageFile[];
  isLoading: boolean;
  onRefresh: () => void;
  onDeleteFile: (filename: string) => void;
  onPlayFile: (file: StorageFile) => void;
}

export const Step4StorageManager: React.FC<Step4StorageManagerProps> = ({
  files,
  isLoading,
  onRefresh,
  onDeleteFile,
  onPlayFile,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio'>('all');

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'video') return file.is_video;
    if (filterType === 'audio') return file.is_audio;
    return true;
  });

  const totalOutputBytes = files.reduce((sum, f) => sum + f.size_bytes, 0);

  return (
    <div className="space-y-4">
      {/* High Density Header Bar */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold font-mono">
              STAGE 04 // STORAGE OUTPUTS & STREAMING
            </span>
            <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded font-mono font-semibold">
              PERSISTENT STORAGE
            </span>
          </div>
          <h2 className="text-base font-semibold text-[#E2E8F0] tracking-tight mt-0.5">
            Cloud Media Vault & High-Speed Downloader
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <a
              href="/api/storage/download-all"
              className="px-3 py-1.5 bg-[#0F1117] hover:bg-[#2D3343] text-[#E2E8F0] text-xs font-mono rounded border border-[#2D3343] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-blue-400" />
              <span>DOWNLOAD ALL (.ZIP)</span>
            </a>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 bg-[#0F1117] hover:bg-[#2D3343] text-[#94A3B8] hover:text-white rounded border border-[#2D3343] transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search High Density Toolbar */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search processed media files..."
            className="w-full pl-8 pr-3 py-1 bg-[#050505] border border-[#2D3343] rounded text-xs text-[#E2E8F0] placeholder-[#64748B] font-mono focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-[#050505] p-0.5 rounded border border-[#2D3343]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              ALL ({files.length})
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                filterType === 'video'
                  ? 'bg-blue-600 text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              VIDEO ({files.filter((f) => f.is_video).length})
            </button>
            <button
              onClick={() => setFilterType('audio')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                filterType === 'audio'
                  ? 'bg-blue-600 text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              AUDIO ({files.filter((f) => f.is_audio).length})
            </button>
          </div>
        </div>
      </div>

      {/* Media Files High Density Grid */}
      {filteredFiles.length === 0 ? (
        <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-10 text-center">
          <FolderArchive className="w-10 h-10 text-[#64748B] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#E2E8F0]">No Media Files Available</h3>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-sm mx-auto">
            {files.length === 0
              ? 'Complete Stage 02 and Stage 03 to transcode videos into /storage/videos.'
              : 'No files match your current search and filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFiles.map((file) => (
            <div
              key={file.filename}
              className="bg-[#1A1D27] border border-[#2D3343] hover:border-blue-500/50 rounded-lg overflow-hidden flex flex-col justify-between transition-colors group shadow-xs"
            >
              {/* Media Thumbnail / Preview Area */}
              <div className="relative aspect-video bg-[#050505] flex items-center justify-center overflow-hidden border-b border-[#2D3343]">
                {file.thumbnail ? (
                  <img
                    src={`/api/storage/thumbnail/${file.filename}`}
                    alt={file.filename}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : file.is_video ? (
                  <FileVideo className="w-10 h-10 text-blue-400/60" />
                ) : (
                  <FileAudio className="w-10 h-10 text-green-400/60" />
                )}

                {/* Overlaid Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  {file.resolution && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-mono font-bold uppercase shadow-xs">
                      {file.resolution}
                    </span>
                  )}
                  {file.vcodec && (
                    <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[#94A3B8] text-[9px] font-mono">
                      {file.vcodec}
                    </span>
                  )}
                </div>

                {file.duration > 0 && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#94A3B8]" />
                    <span>{formatSeconds(file.duration)}</span>
                  </div>
                )}

                {/* Quick Play Trigger */}
                {(file.is_video || file.is_audio) && (
                  <button
                    onClick={() => onPlayFile(file)}
                    className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 group-hover:scale-110 shadow-lg cursor-pointer"
                    title="Play Media"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                )}
              </div>

              {/* File Info Area */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h4
                    className="text-xs font-semibold text-[#E2E8F0] font-mono truncate"
                    title={file.filename}
                  >
                    {file.filename}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] mt-1">
                    <span>{formatBytes(file.size_bytes)}</span>
                    <span>{formatDate(file.modified_at)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-[#2D3343] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onPlayFile(file)}
                      className="px-2.5 py-1 rounded bg-[#0F1117] hover:bg-[#2D3343] text-blue-400 text-xs font-mono border border-[#2D3343] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>PLAY</span>
                    </button>
                    <a
                      href={`/api/storage/download/${file.filename}`}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      download
                    >
                      <Download className="w-3 h-3" />
                      <span>DOWNLOAD</span>
                    </a>
                  </div>

                  <button
                    onClick={() => onDeleteFile(file.filename)}
                    className="p-1 text-[#64748B] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* IDM & HTTP 206 Partial Content Information Panel */}
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg p-3.5 text-xs text-[#94A3B8] font-mono space-y-1">
        <div className="flex items-center gap-2 text-[#E2E8F0] font-semibold">
          <Zap className="w-3.5 h-3.5 text-orange-400" />
          <span>ACCELERATED IDM & 32-THREAD DOWNLOAD COMPATIBILITY</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          The storage engine serves with standard <code className="text-blue-400">Accept-Ranges: bytes</code> and <code className="text-blue-400">Content-Range</code> headers. You can copy the download links directly into Internet Download Manager (IDM), Aria2, or FDM for multi-connection acceleration.
        </p>
      </div>
    </div>
  );
};
