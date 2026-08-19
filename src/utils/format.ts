export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const formatSeconds = formatDuration;

export function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return 'Calculating...';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return 'Unknown date';
  const date = new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getFileCategory(filename: string): 'video' | 'audio' | 'image' | 'archive' | 'document' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', 'ts'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus', 'wma'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'iso'].includes(ext)) return 'archive';
  if (['pdf', 'txt', 'srt', 'vtt', 'doc', 'docx', 'nfo'].includes(ext)) return 'document';
  return 'other';
}
