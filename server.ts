import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import multer from 'multer';
import cors from 'cors';
import { createRequire } from 'module';

const dynamicRequire = typeof require !== 'undefined' ? require : createRequire(import.meta.url);
const archiver = dynamicRequire('archiver');
const torrentStream = dynamicRequire('torrent-stream');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage Paths
const BASE_DIR = process.cwd();
const STORAGE_DIR = path.join(BASE_DIR, 'storage');
const CACHE_DIR = path.join(STORAGE_DIR, 'cache');
const OUTPUT_DIR = path.join(STORAGE_DIR, 'videos');
const THUMBS_DIR = path.join(STORAGE_DIR, 'thumbnails');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');

// Ensure directories exist
[STORAGE_DIR, CACHE_DIR, OUTPUT_DIR, THUMBS_DIR, UPLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer for torrent file uploads
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 500 * 1024 * 1024 }
});

// NOTE: Hosting environments such as Cloud Run do not support UDP egress, so
// UDP trackers/DHT can never connect there. HTTP(S) trackers are listed first
// and are what actually work for peer discovery in that environment; the UDP
// entries are kept for local/VM use where UDP is available.
const DEFAULT_TRACKERS = [
  'http://tracker.opentrackr.org:1337/announce',
  'http://tracker.openbittorrent.com:80/announce',
  'https://tracker.gbitt.info:443/announce',
  'http://tracker.gbitt.info:80/announce',
  'http://tracker.files.fm:6969/announce',
  'http://open.acgnxtracker.com:80/announce',
  'http://tracker.bt4g.com:2095/announce',
  'https://tracker.tamersunion.org:443/announce',
  'http://tracker.dler.org:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.tracker.cl:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://tracker.coppersurfer.tk:6969/announce',
  'udp://tracker.leechers-paradise.org:6969/announce',
  'udp://tracker.zer0day.to:1337/announce',
  'udp://p4p.arenabg.com:1337/announce',
  'udp://tracker.tiny-vps.com:6969/announce'
];

function parseMagnetUri(magnetUri: string) {
  const xtMatch = magnetUri.match(/xt=urn:btih:([a-zA-Z0-9]+)/i);
  const dnMatch = magnetUri.match(/dn=([^&]+)/i);

  const trackers: string[] = [];
  const trMatches = magnetUri.matchAll(/tr=([^&]+)/gi);
  for (const match of trMatches) {
    try {
      trackers.push(decodeURIComponent(match[1]));
    } catch (e) {
      trackers.push(match[1]);
    }
  }

  return {
    infoHash: xtMatch ? xtMatch[1].toLowerCase() : '',
    name: dnMatch ? decodeURIComponent(dnMatch[1].replace(/\+/g, ' ')) : 'Torrent Media',
    trackers: Array.from(new Set([...trackers, ...DEFAULT_TRACKERS]))
  };
}

// In-Memory Job Registries
interface DownloadJob {
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
  allFiles: { name: string; path: string; length: number; selected: boolean }[];
  errorMessage?: string;
  engine?: any;
  listeners: Set<(data: any) => void>;
}

interface ProcessJob {
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
  logs: string[];
  listeners: Set<(data: any) => void>;
}

const downloadJobs = new Map<string, DownloadJob>();
const processJobs = new Map<string, ProcessJob>();

// Helper to execute Python engine commands
function runPythonEngine(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonProc = spawn('python3', [path.join(BASE_DIR, 'engine.py'), ...args]);
    let stdout = '';
    let stderr = '';

    pythonProc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProc.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          resolve({ raw: stdout });
        }
      } else {
        reject(new Error(stderr || stdout || `Process exited with code ${code}`));
      }
    });
  });
}

// ----------------------------------------------------
// 1. SYSTEM & STORAGE ENDPOINTS
// ----------------------------------------------------

app.get('/api/system/info', async (req, res) => {
  try {
    const info = await runPythonEngine(['--action', 'info']);
    res.json({
      success: true,
      ...info,
      activeDownloads: Array.from(downloadJobs.values()).filter((j) => j.status === 'downloading' || j.status === 'connecting').length,
      activeProcesses: Array.from(processJobs.values()).filter((j) => j.status === 'processing').length
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/storage/files', async (req, res) => {
  try {
    const files = await runPythonEngine(['--action', 'list']);
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/torrent/cache-files', (req, res) => {
  try {
    const getFilesRecursively = (dir: string, baseDir: string = dir): any[] => {
      let results: any[] = [];
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFilesRecursively(filePath, baseDir));
        } else if (!file.startsWith('.')) {
          results.push({
            name: file,
            relativePath: path.relative(baseDir, filePath),
            absolutePath: filePath,
            size: stat.size,
            mtime: stat.mtime
          });
        }
      });
      return results;
    };

    const files = getFilesRecursively(CACHE_DIR);
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/storage/delete/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const result = await runPythonEngine(['--action', 'delete-file', '--file', filename]);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/storage/clear-cache', async (req, res) => {
  try {
    const result = await runPythonEngine(['--action', 'clear-cache']);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/storage/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(OUTPUT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.download(filePath, filename);
});

app.get('/api/storage/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(OUTPUT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filename).toLowerCase();
  let contentType = 'video/mp4';
  if (ext === '.mp3') contentType = 'audio/mpeg';
  else if (ext === '.mkv') contentType = 'video/x-matroska';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.wav') contentType = 'audio/wav';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

app.get('/api/storage/thumbnail/:filename', (req, res) => {
  const filename = req.params.filename;
  const thumbPath = path.join(THUMBS_DIR, `${filename}.jpg`);

  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(thumbPath).pipe(res);
  } else {
    res.status(404).send('Thumbnail not found');
  }
});

app.get('/api/storage/download-all', (req, res) => {
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => !f.startsWith('.'));
  if (files.length === 0) {
    return res.status(400).json({ error: 'No files to download' });
  }

  const archive = archiver('zip', { zlib: { level: 6 } });
  res.attachment(`media_bundle_${Date.now()}.zip`);

  archive.pipe(res);
  files.forEach((file) => {
    const filePath = path.join(OUTPUT_DIR, file);
    if (fs.statSync(filePath).isFile()) {
      archive.file(filePath, { name: file });
    }
  });
  archive.finalize();
});

// ----------------------------------------------------
// 2. TORRENT METADATA & DOWNLOAD ENGINE
// ----------------------------------------------------

app.post('/api/torrent/info', upload.single('torrentFile'), async (req, res) => {
  const { magnetUri } = req.body;
  let torrentSource: any = magnetUri;

  if (req.file) {
    try {
      torrentSource = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);
    } catch (e: any) {
      return res.status(400).json({ error: `Failed to read uploaded torrent file: ${e.message}` });
    }
  }

  if (!torrentSource) {
    return res.status(400).json({ error: 'Please provide a magnet link or upload a .torrent file.' });
  }

  try {
    const parsedMagnet = typeof torrentSource === 'string'
      ? parseMagnetUri(torrentSource)
      : { infoHash: '', name: 'Torrent', trackers: DEFAULT_TRACKERS };

    // Spin up torrent-stream engine to fetch metadata and files list from trackers.
    // DHT is disabled: it relies on UDP, which is unsupported on hosts like Cloud Run
    // and would otherwise emit unhandled 'error' events that crash the server.
    const engine = torrentStream(torrentSource, {
      path: CACHE_DIR,
      trackers: parsedMagnet.trackers || DEFAULT_TRACKERS,
      dht: false
    });

    let responded = false;
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        engine.destroy();
        res.status(408).json({
          error: 'Metadata timeout: Could not connect to peers within 45 seconds. Ensure the torrent has active seeders.'
        });
      }
    }, 45000);

    engine.on('error', (err: any) => {
      if (responded) return;
      responded = true;
      clearTimeout(timeout);
      engine.destroy();
      res.status(500).json({ error: `Torrent engine error: ${err?.message || err}` });
    });

    engine.on('ready', () => {
      if (responded) return;
      responded = true;
      clearTimeout(timeout);

      const files = engine.files.map((f: any, index: number) => ({
        index,
        name: f.name,
        path: f.path,
        length: f.length
      }));

      const totalSize = files.reduce((sum: number, f: any) => sum + f.length, 0);
      const name = engine.torrent ? engine.torrent.name : (parsedMagnet.name || 'Torrent');
      const infoHash = engine.infoHash || parsedMagnet.infoHash;

      engine.destroy();

      res.json({
        success: true,
        infoHash,
        name,
        totalSize,
        files
      });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/torrent/download', (req, res) => {
  const { infoHash, magnetUri, selectedFilePaths } = req.body;

  if (!infoHash && !magnetUri) {
    return res.status(400).json({ error: 'Missing infoHash or magnetUri' });
  }

  const torrentIdentifier = magnetUri || infoHash;
  const parsedMagnet = typeof torrentIdentifier === 'string' && torrentIdentifier.startsWith('magnet:') ? parseMagnetUri(torrentIdentifier) : null;
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let engine: any;
  try {
    engine = torrentStream(torrentIdentifier, {
      path: CACHE_DIR,
      trackers: (parsedMagnet && parsedMagnet.trackers && parsedMagnet.trackers.length > 0) ? parsedMagnet.trackers : DEFAULT_TRACKERS,
      // DHT needs UDP, which hosts like Cloud Run don't support; leaving it on
      // only produces unhandled 'error' events that can crash the process.
      dht: false
    });
  } catch (e: any) {
    return res.status(500).json({ error: `Failed to initialize torrent engine: ${e.message}` });
  }

  const job: DownloadJob = {
    id: jobId,
    torrentName: 'Connecting to peers...',
    infoHash: engine.infoHash || infoHash || '',
    status: 'connecting',
    progress: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    downloaded: 0,
    total: 0,
    numPeers: 0,
    eta: 0,
    selectedFiles: selectedFilePaths || [],
    allFiles: [],
    engine,
    listeners: new Set()
  };

  downloadJobs.set(jobId, job);

  engine.on('error', (err: any) => {
    job.status = 'error';
    job.errorMessage = `Torrent engine error: ${err?.message || err}`;
    clearInterval(downloadInterval);
    emitDownloadProgress(job);
  });

  engine.on('ready', () => {
    job.torrentName = engine.torrent ? engine.torrent.name : 'Downloaded Media';
    job.allFiles = engine.files.map((f: any) => ({
      name: f.name,
      path: f.path,
      length: f.length,
      selected: !selectedFilePaths || selectedFilePaths.length === 0 || selectedFilePaths.includes(f.path)
    }));

    const selected = job.allFiles.filter((f) => f.selected);
    job.total = selected.reduce((sum, f) => sum + f.length, 0);

    // Select files in torrent-stream
    engine.files.forEach((file: any) => {
      if (!selectedFilePaths || selectedFilePaths.length === 0 || selectedFilePaths.includes(file.path)) {
        file.select();
        // Create read stream to force disk write
        const stream = file.createReadStream();
        stream.on('data', () => {});
      } else {
        file.deselect();
      }
    });

    job.status = 'downloading';
    emitDownloadProgress(job);
  });

  const downloadInterval = setInterval(() => {
    if (!engine || engine._destroyed) {
      clearInterval(downloadInterval);
      return;
    }

    if (engine.swarm) {
      job.downloadSpeed = engine.swarm.downloadSpeed();
      job.uploadSpeed = engine.swarm.uploadSpeed();
      job.downloaded = engine.swarm.downloaded;
      job.numPeers = engine.swarm.wires.length;

      if (job.total > 0) {
        job.progress = Math.min(100, Number(((job.downloaded / job.total) * 100).toFixed(2)));
        if (job.downloadSpeed > 0) {
          const remainingBytes = job.total - job.downloaded;
          job.eta = Math.round(remainingBytes / job.downloadSpeed);
        }
      }

      if (job.progress >= 100) {
        job.status = 'completed';
        job.progress = 100;
        clearInterval(downloadInterval);
      }

      emitDownloadProgress(job);
    }
  }, 1000);

  engine.on('idle', () => {
    job.status = 'completed';
    job.progress = 100;
    emitDownloadProgress(job);
    clearInterval(downloadInterval);
  });

  res.json({
    success: true,
    jobId,
    infoHash: engine.infoHash,
    status: job.status
  });
});

function emitDownloadProgress(job: DownloadJob) {
  const payload = {
    id: job.id,
    torrentName: job.torrentName,
    infoHash: job.infoHash,
    status: job.status,
    progress: job.progress,
    downloadSpeed: job.downloadSpeed,
    uploadSpeed: job.uploadSpeed,
    downloaded: job.downloaded,
    total: job.total,
    numPeers: job.numPeers,
    eta: job.eta,
    selectedFiles: job.selectedFiles,
    errorMessage: job.errorMessage
  };

  job.listeners.forEach((listener) => listener(payload));
}

app.get('/api/torrent/stream/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = downloadJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const listener = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  job.listeners.add(listener);
  listener({
    id: job.id,
    torrentName: job.torrentName,
    infoHash: job.infoHash,
    status: job.status,
    progress: job.progress,
    downloadSpeed: job.downloadSpeed,
    uploadSpeed: job.uploadSpeed,
    downloaded: job.downloaded,
    total: job.total,
    numPeers: job.numPeers,
    eta: job.eta,
    selectedFiles: job.selectedFiles,
    errorMessage: job.errorMessage
  });

  req.on('close', () => {
    job.listeners.delete(listener);
  });
});

app.post('/api/torrent/cancel/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = downloadJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.engine) {
    job.engine.destroy();
  }
  job.status = 'error';
  job.errorMessage = 'Download cancelled by user';
  emitDownloadProgress(job);
  downloadJobs.delete(jobId);

  res.json({ success: true, message: 'Download job cancelled' });
});

// ----------------------------------------------------
// 3. STEP 3: VIDEO COMPRESSION & AUDIO CONVERSION ENGINE
// ----------------------------------------------------

app.post('/api/process/compress', (req, res) => {
  const { inputRelativePath, targetRes, customFilename } = req.body;

  if (!inputRelativePath) {
    return res.status(400).json({ error: 'Missing input file path' });
  }

  const validTargets = ['original', '720', '480', '360', 'audio'];
  const resTarget = validTargets.includes(targetRes) ? targetRes : 'original';

  const fullInputPath = path.isAbsolute(inputRelativePath)
    ? inputRelativePath
    : path.join(CACHE_DIR, inputRelativePath);

  if (!fs.existsSync(fullInputPath)) {
    return res.status(404).json({ error: `File does not exist: ${fullInputPath}` });
  }

  const jobId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inputFileName = path.basename(fullInputPath);

  const processJob: ProcessJob = {
    id: jobId,
    inputFile: fullInputPath,
    inputFileName,
    outputFileName: '',
    targetRes: resTarget,
    mode: resTarget === 'original' ? 'Direct Copy' : 'FFmpeg Transcode',
    status: 'processing',
    progress: 0,
    frame: '0',
    fps: '0',
    bitrate: '',
    speed: '',
    elapsedSec: 0,
    totalDuration: 0,
    outputSize: 0,
    logs: [],
    listeners: new Set()
  };

  processJobs.set(jobId, processJob);

  const pyArgs = ['--action', 'compress', '--input', fullInputPath, '--target', resTarget];
  if (customFilename) {
    pyArgs.push('--output-filename', customFilename);
  }

  const pythonProc = spawn('python3', [path.join(BASE_DIR, 'engine.py'), ...pyArgs]);

  pythonProc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line.trim());
        if (msg.type === 'start') {
          processJob.outputFileName = msg.output_filename;
          processJob.mode = msg.mode;
          processJob.totalDuration = msg.total_duration;
        } else if (msg.type === 'progress') {
          processJob.progress = msg.percent;
          processJob.frame = msg.frame;
          processJob.fps = msg.fps;
          processJob.bitrate = msg.bitrate;
          processJob.speed = msg.speed;
        } else if (msg.type === 'complete') {
          processJob.status = 'completed';
          processJob.progress = 100;
          processJob.outputFileName = msg.output_filename;
          processJob.outputSize = msg.size_bytes;
          processJob.elapsedSec = msg.elapsed_sec;
          processJob.thumbnail = msg.thumbnail;
        } else if (msg.type === 'error') {
          processJob.status = 'error';
          processJob.errorMessage = msg.message;
        }
      } catch (e) {
        processJob.logs.push(line.trim());
      }
      emitProcessProgress(processJob);
    }
  });

  pythonProc.stderr.on('data', (data) => {
    const str = data.toString().trim();
    if (str) {
      processJob.logs.push(str);
      emitProcessProgress(processJob);
    }
  });

  pythonProc.on('close', (code) => {
    if (code !== 0 && processJob.status !== 'completed') {
      processJob.status = 'error';
      if (!processJob.errorMessage) {
        processJob.errorMessage = `Compression process failed with code ${code}`;
      }
    }
    emitProcessProgress(processJob);
  });

  res.json({
    success: true,
    jobId,
    inputFileName,
    targetRes: resTarget
  });
});

function emitProcessProgress(job: ProcessJob) {
  const payload = {
    id: job.id,
    inputFile: job.inputFile,
    inputFileName: job.inputFileName,
    outputFileName: job.outputFileName,
    targetRes: job.targetRes,
    mode: job.mode,
    status: job.status,
    progress: job.progress,
    frame: job.frame,
    fps: job.fps,
    bitrate: job.bitrate,
    speed: job.speed,
    elapsedSec: job.elapsedSec,
    totalDuration: job.totalDuration,
    outputSize: job.outputSize,
    thumbnail: job.thumbnail,
    errorMessage: job.errorMessage,
    lastLog: job.logs.length > 0 ? job.logs[job.logs.length - 1] : undefined
  };

  job.listeners.forEach((listener) => listener(payload));
}

app.get('/api/process/stream/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const job = processJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const listener = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  job.listeners.add(listener);
  emitProcessProgress(job);

  req.on('close', () => {
    job.listeners.delete(listener);
  });
});

// ----------------------------------------------------
// 4. SERVER & VITE INTEGRATION
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (0.0.0.0:${PORT}) [${process.env.NODE_ENV || 'development'}]`);
  });
}

startServer();
