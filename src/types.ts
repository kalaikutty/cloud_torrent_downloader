export interface TorrentFile {
  index: number;
  name: string;
  path: string;
  length: number;
  selected?: boolean;
}

export interface TorrentMetadata {
  infoHash: string;
  name: string;
  totalSize: number;
  files: TorrentFile[];
}

export interface DownloadJobStatus {
  id: string;
  torrentName: string;
  infoHash: string;
  status: 'connecting' | 'downloading' | 'paused' | 'completed' | 'error';
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  downloaded: number;
  total: number;
  numPeers: number;
  eta: number;
  selectedFiles: string[];
  errorMessage?: string;
}

export interface CacheFile {
  name: string;
  relativePath: string;
  absolutePath: string;
  size: number;
  mtime: string;
}

export interface StorageFile {
  filename: string;
  path: string;
  size_bytes: number;
  modified_at: number;
  is_video: boolean;
  is_audio: boolean;
  duration: number;
  resolution?: string | null;
  vcodec?: string | null;
  acodec?: string | null;
  thumbnail?: string | null;
}

export interface ProcessedFile extends StorageFile {}

export interface ProcessJobStatus {
  id: string;
  inputFile: string;
  inputFileName: string;
  outputFileName: string;
  targetRes: string;
  mode: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  frame: string;
  fps: string;
  bitrate: string;
  speed: string;
  elapsedSec: number;
  totalDuration: number;
  outputSize: number;
  thumbnail?: string;
  errorMessage?: string;
  lastLog?: string;
}

export interface SystemInfo {
  python_version: string;
  ffmpeg_version: string;
  gpu_available: boolean;
  storage: {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    cache_size_bytes: number;
    output_size_bytes: number;
    cache_path: string;
    output_path: string;
  };
  activeDownloads: number;
  activeProcesses: number;
}
