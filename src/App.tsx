import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StorageStatsBar } from './components/StorageStatsBar';
import { Step1SystemPrep } from './components/Step1SystemPrep';
import { Step2TorrentDownloader } from './components/Step2TorrentDownloader';
import { Step3Compressor } from './components/Step3Compressor';
import { Step4StorageManager } from './components/Step4StorageManager';
import { MediaPlayerModal } from './components/MediaPlayerModal';
import { SystemInfo, StorageFile } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'step1' | 'step2' | 'step3' | 'step4'>('step1');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);
  const [selectedPlaybackFile, setSelectedPlaybackFile] = useState<StorageFile | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);

  // Fetch live system and storage information
  const fetchSystemData = async () => {
    setIsLoading(true);
    try {
      const [sysRes, filesRes] = await Promise.all([
        fetch('/api/system/info').catch(() => null),
        fetch('/api/storage/files').catch(() => null),
      ]);

      if (sysRes && sysRes.ok) {
        const contentType = sysRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const sysData = await sysRes.json();
          if (sysData.success) {
            setSystemInfo(sysData);
          }
        }
      }

      if (filesRes && filesRes.ok) {
        const contentType = filesRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const filesData = await filesRes.json();
          if (filesData.success) {
            setFiles(filesData.files);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load system stats', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Uptime ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Clear temporary torrent cache (/storage/cache)? Processed videos will be kept.')) {
      return;
    }
    setIsClearingCache(true);
    try {
      const res = await fetch('/api/storage/clear-cache', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchSystemData();
      }
    } catch (e) {
      console.error('Failed to clear cache', e);
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (!confirm(`Delete "${filename}" permanently from storage?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/storage/delete/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchSystemData();
      }
    } catch (e) {
      console.error('Failed to delete file', e);
    }
  };

  const formatRuntime = (secs: number) => {
    const hrs = Math.floor(secs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${s}`;
  };

  const freeBytes = systemInfo?.storage?.free_bytes ?? (systemInfo ? 0 : 500 * 1024 * 1024 * 1024);
  const totalBytes = systemInfo?.storage?.total_bytes ?? 500 * 1024 * 1024 * 1024;
  const usedPercent = totalBytes > 0 ? Math.min(100, Math.max(0, Math.round(((totalBytes - freeBytes) / totalBytes) * 100))) : 0;

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#E2E8F0] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* High Density Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemInfo={systemInfo}
        filesCount={files.length}
        onRefresh={fetchSystemData}
        isLoading={isLoading}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Storage Stats Bar */}
        <StorageStatsBar
          systemInfo={systemInfo}
          onClearCache={handleClearCache}
          isClearingCache={isClearingCache}
        />

        {/* Step Views */}
        <div className="flex-1">
          {activeTab === 'step1' && (
            <Step1SystemPrep
              systemInfo={systemInfo}
              onProceedToStep2={() => setActiveTab('step2')}
            />
          )}

          {activeTab === 'step2' && (
            <Step2TorrentDownloader
              onDownloadFinished={() => fetchSystemData()}
              onProceedToStep3={() => setActiveTab('step3')}
            />
          )}

          {activeTab === 'step3' && (
            <Step3Compressor
              onCompressionFinished={() => fetchSystemData()}
              onProceedToStep4={() => setActiveTab('step4')}
            />
          )}

          {activeTab === 'step4' && (
            <Step4StorageManager
              files={files}
              isLoading={isLoading}
              onRefresh={fetchSystemData}
              onDeleteFile={handleDeleteFile}
              onPlayFile={(file) => setSelectedPlaybackFile(file)}
            />
          )}
        </div>
      </main>

      {/* High Density Footer Status Bar */}
      <footer className="h-6 border-t border-[#2D3343] bg-[#1A1D27] flex items-center justify-between px-4 text-[10px] text-[#64748B] font-mono select-none">
        <div className="flex items-center gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          <span className="truncate">Ready to process media streams • Python 3.10 Kernel Active</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span>Storage: {usedPercent}% Used</span>
          <span>Runtime: {formatRuntime(uptimeSeconds)}</span>
          <span className="hidden sm:inline">UTF-8</span>
        </div>
      </footer>

      {/* In-Browser Media Player Modal */}
      {selectedPlaybackFile && (
        <MediaPlayerModal
          file={selectedPlaybackFile}
          onClose={() => setSelectedPlaybackFile(null)}
        />
      )}
    </div>
  );
}

export default App;
