import React from 'react';
import { X, Download, Film, Volume2, Info, HardDrive, Clock, Maximize2 } from 'lucide-react';
import { StorageFile } from '../types';
import { formatBytes, formatSeconds } from '../utils/format';

interface MediaPlayerModalProps {
  file: StorageFile | null;
  onClose: () => void;
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const streamUrl = `/api/storage/stream/${file.filename}`;
  const downloadUrl = `/api/storage/download/${file.filename}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1A1D27] border border-[#2D3343] rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#11141D] border-b border-[#2D3343] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <div className="w-6 h-6 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              {file.is_video ? <Film className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#E2E8F0] font-mono truncate">
              {file.filename}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#2D3343] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Player Area */}
        <div className="bg-[#050505] relative flex items-center justify-center aspect-video max-h-[60vh]">
          {file.is_video ? (
            <video
              src={streamUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            >
              Your browser does not support HTML5 video streaming.
            </video>
          ) : file.is_audio ? (
            <div className="w-full p-8 flex flex-col items-center justify-center space-y-4">
              <Volume2 className="w-16 h-16 text-green-400 animate-pulse" />
              <audio src={streamUrl} controls autoPlay className="w-full max-w-md">
                Your browser does not support audio playback.
              </audio>
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-[#94A3B8]">
              Direct media playback is not supported for this file type.
            </div>
          )}
        </div>

        {/* Technical Specs & Footer */}
        <div className="p-4 bg-[#1A1D27] border-t border-[#2D3343] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto text-[#94A3B8]">
            <div>
              <span className="text-[10px] uppercase text-[#64748B] block">SIZE</span>
              <span className="text-[#E2E8F0] font-semibold">{formatBytes(file.size_bytes)}</span>
            </div>
            {file.resolution && (
              <div>
                <span className="text-[10px] uppercase text-[#64748B] block">RESOLUTION</span>
                <span className="text-blue-400 font-semibold">{file.resolution}</span>
              </div>
            )}
            {file.vcodec && (
              <div>
                <span className="text-[10px] uppercase text-[#64748B] block">CODEC</span>
                <span className="text-[#E2E8F0]">{file.vcodec}</span>
              </div>
            )}
            {file.duration > 0 && (
              <div>
                <span className="text-[10px] uppercase text-[#64748B] block">DURATION</span>
                <span className="text-[#E2E8F0]">{formatSeconds(file.duration)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a
              href={downloadUrl}
              download
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD FILE</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
