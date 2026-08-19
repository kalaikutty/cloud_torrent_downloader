#!/usr/bin/env python3
"""
Cloud Torrent Downloader & Video Processor Engine (Python 3 + FFmpeg)
Mirrors and extends the logic from the Jupyter Notebook.
Strictly executes real operations: no mock data or simulations.
"""

import os
import sys
import json
import time
import shutil
import argparse
import subprocess
import re
from pathlib import Path

# Paths configuration
BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
CACHE_DIR = STORAGE_DIR / "cache"
OUTPUT_DIR = STORAGE_DIR / "videos"
THUMBS_DIR = STORAGE_DIR / "thumbnails"

def ensure_directories():
    """Step 1: System Preparation - Ensure directories exist."""
    for d in [STORAGE_DIR, CACHE_DIR, OUTPUT_DIR, THUMBS_DIR]:
        d.mkdir(parents=True, exist_ok=True)

def check_gpu():
    """Detect if NVIDIA GPU / CUDA is available for nvenc acceleration."""
    try:
        res = subprocess.run(['nvidia-smi'], capture_output=True, text=True, timeout=3)
        return res.returncode == 0
    except Exception:
        return False

def get_system_info():
    """Returns system capabilities (Python, FFmpeg, GPU, Storage)."""
    ensure_directories()
    gpu_available = check_gpu()
    
    # FFmpeg version
    ffmpeg_version = "Not found"
    try:
        res = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True, timeout=3)
        if res.returncode == 0:
            first_line = res.stdout.splitlines()[0]
            ffmpeg_version = first_line
    except Exception as e:
        ffmpeg_version = str(e)
        
    # Disk usage
    total, used, free = shutil.disk_usage(STORAGE_DIR)
    
    cache_size = sum(f.stat().st_size for f in CACHE_DIR.rglob('*') if f.is_file())
    output_size = sum(f.stat().st_size for f in OUTPUT_DIR.rglob('*') if f.is_file())
    
    info = {
        "python_version": sys.version.split()[0],
        "ffmpeg_version": ffmpeg_version,
        "gpu_available": gpu_available,
        "storage": {
            "total_bytes": total,
            "used_bytes": used,
            "free_bytes": free,
            "cache_size_bytes": cache_size,
            "output_size_bytes": output_size,
            "cache_path": str(CACHE_DIR),
            "output_path": str(OUTPUT_DIR)
        }
    }
    return info

def probe_file(file_path: str):
    """Probe media file using ffprobe to get real technical specs."""
    path = Path(file_path)
    if not path.exists():
        return {"error": "File does not exist"}
        
    cmd = [
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        str(path)
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if res.returncode == 0:
            data = json.loads(res.stdout)
            
            # Extract high level summary
            duration = float(data.get('format', {}).get('duration', 0))
            bitrate = int(data.get('format', {}).get('bit_rate', 0))
            size = int(data.get('format', {}).get('size', path.stat().st_size))
            
            video_stream = next((s for s in data.get('streams', []) if s.get('codec_type') == 'video'), None)
            audio_stream = next((s for s in data.get('streams', []) if s.get('codec_type') == 'audio'), None)
            
            summary = {
                "filename": path.name,
                "size": size,
                "duration": duration,
                "bitrate": bitrate,
                "format_name": data.get('format', {}).get('format_long_name', data.get('format', {}).get('format_name', 'Unknown')),
                "has_video": video_stream is not None,
                "has_audio": audio_stream is not None,
                "video": {
                    "codec": video_stream.get('codec_name') if video_stream else None,
                    "width": video_stream.get('width') if video_stream else None,
                    "height": video_stream.get('height') if video_stream else None,
                    "fps": eval(video_stream.get('r_frame_rate', '0/1')) if video_stream and '/' in video_stream.get('r_frame_rate', '') else 0,
                } if video_stream else None,
                "audio": {
                    "codec": audio_stream.get('codec_name') if audio_stream else None,
                    "channels": audio_stream.get('channels') if audio_stream else None,
                    "sample_rate": audio_stream.get('sample_rate') if audio_stream else None,
                } if audio_stream else None,
            }
            return summary
        else:
            return {"error": f"ffprobe error: {res.stderr}"}
    except Exception as e:
        return {"error": str(e)}

def generate_thumbnail(input_video: str, output_thumb: str, time_sec: float = 5.0):
    """Generate a JPEG thumbnail image from video."""
    input_path = Path(input_video)
    if not input_path.exists():
        return False
    
    cmd = [
        'ffmpeg',
        '-ss', str(time_sec),
        '-i', str(input_path),
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=480:-1',
        '-y',
        str(output_thumb)
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, timeout=10)
        return res.returncode == 0 and Path(output_thumb).exists()
    except Exception:
        return False

def parse_time_str(time_str: str) -> float:
    """Convert HH:MM:SS.xx to seconds."""
    parts = time_str.strip().split(':')
    if len(parts) == 3:
        return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    elif len(parts) == 2:
        return float(parts[0]) * 60 + float(parts[1])
    return 0.0

def process_file(input_file: str, target_res: str, custom_filename: str = None):
    """
    Step 3: Compression or Direct Copy with real-time FFmpeg progress parsing.
    Mirrors notebook compression logic.
    """
    ensure_directories()
    input_path = Path(input_file)
    if not input_path.exists():
        print(json.dumps({"type": "error", "message": f"Input file not found: {input_file}"}), flush=True)
        sys.exit(1)
        
    file_name = input_path.name
    gpu_check = check_gpu()
    
    # Target filename and extension
    ext = ".mp3" if target_res == 'audio' else ".mp4"
    clean_base = re.sub(r'[^\w\-_.]', '_', input_path.stem)
    
    if custom_filename:
        out_name = custom_filename if custom_filename.endswith(ext) else f"{custom_filename}{ext}"
    else:
        out_name = f"RESULT_{target_res}_{clean_base}{ext}"
        
    output_final = OUTPUT_DIR / out_name
    
    # Get duration for calculating progress %
    media_info = probe_file(str(input_path))
    total_duration = media_info.get('duration', 0.0) if isinstance(media_info, dict) else 0.0
    
    bitrate_limits = {'720': '2.5M', '480': '1.2M', '360': '700k'}
    max_b = bitrate_limits.get(target_res, '1M')
    
    # Build ffmpeg command based on notebook specifications
    if target_res == 'original':
        # Direct stream copy
        ffmpeg_params = ["-c", "copy"]
        hw_accel = []
    elif target_res == 'audio':
        # Audio only MP3
        ffmpeg_params = ["-vn", "-c:a", "libmp3lame", "-q:a", "4"]
        hw_accel = []
    elif gpu_check:
        # GPU accelerated NVENC
        ffmpeg_params = [
            "-vf", f"scale_cuda=-2:{target_res}",
            "-c:v", "h264_nvenc",
            "-preset", "p4",
            "-rc", "vbr",
            "-cq", "28",
            "-maxrate", max_b,
            "-bufsize", "2M",
            "-c:a", "copy"
        ]
        hw_accel = ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"]
    else:
        # CPU standard H.264
        ffmpeg_params = [
            "-vf", f"scale=-2:{target_res}",
            "-c:v", "libx264",
            "-crf", "24",
            "-preset", "faster",
            "-maxrate", max_b,
            "-bufsize", "2M",
            "-c:a", "copy"
        ]
        hw_accel = []

    cmd = ['ffmpeg'] + hw_accel + ['-i', str(input_path)] + ffmpeg_params + ['-progress', 'pipe:1', '-y', str(output_final)]
    
    print(json.dumps({
        "type": "start",
        "input_file": str(input_path),
        "output_file": str(output_final),
        "output_filename": out_name,
        "target": target_res,
        "mode": "Direct Copy" if target_res == 'original' else ("GPU Boost" if gpu_check else "CPU Standard"),
        "total_duration": total_duration,
        "command": " ".join(cmd)
    }), flush=True)
    
    start_time = time.time()
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            universal_newlines=True
        )
        
        current_progress = {}
        
        for line in proc.stdout:
            line = line.strip()
            if '=' in line:
                key, val = line.split('=', 1)
                current_progress[key.strip()] = val.strip()
                
                if key.strip() == 'progress':
                    # Parse current state
                    out_time_us = int(current_progress.get('out_time_us', 0))
                    out_time_sec = out_time_us / 1000000.0
                    frame = current_progress.get('frame', '0')
                    fps = current_progress.get('fps', '0')
                    bitrate = current_progress.get('bitrate', 'N/A')
                    total_size = current_progress.get('total_size', '0')
                    speed = current_progress.get('speed', '0x')
                    
                    pct = 0.0
                    if total_duration > 0:
                        pct = min(100.0, round((out_time_sec / total_duration) * 100.0, 2))
                    
                    print(json.dumps({
                        "type": "progress",
                        "percent": pct,
                        "frame": frame,
                        "fps": fps,
                        "time_sec": round(out_time_sec, 2),
                        "bitrate": bitrate,
                        "size_bytes": int(total_size) if total_size.isdigit() else 0,
                        "speed": speed,
                        "status": val.strip()
                    }), flush=True)
                    
        proc.wait()
        
        if proc.returncode == 0 and output_final.exists():
            elapsed = time.time() - start_time
            final_size = output_final.stat().st_size
            
            # Generate thumbnail if video
            thumb_name = f"{out_name}.jpg"
            thumb_path = THUMBS_DIR / thumb_name
            if target_res != 'audio':
                generate_thumbnail(str(output_final), str(thumb_path), time_sec=min(5.0, total_duration / 2 if total_duration > 0 else 1.0))
            
            print(json.dumps({
                "type": "complete",
                "output_filename": out_name,
                "output_path": str(output_final),
                "size_bytes": final_size,
                "elapsed_sec": round(elapsed, 2),
                "thumbnail": thumb_name if thumb_path.exists() else None
            }), flush=True)
        else:
            _, stderr_data = proc.communicate()
            print(json.dumps({
                "type": "error",
                "message": f"FFmpeg failed with code {proc.returncode}",
                "stderr": stderr_data
            }), flush=True)
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"type": "error", "message": str(e)}), flush=True)
        sys.exit(1)

def list_files():
    """Step 4: List all stored processed files with full specs."""
    ensure_directories()
    results = []
    
    for f in OUTPUT_DIR.iterdir():
        if f.is_file() and not f.name.startswith('.'):
            stat = f.stat()
            # Probe metadata
            probe = probe_file(str(f))
            thumb_path = THUMBS_DIR / f"{f.name}.jpg"
            
            results.append({
                "filename": f.name,
                "path": str(f),
                "size": stat.st_size,
                "created_at": stat.st_ctime,
                "modified_at": stat.st_mtime,
                "has_thumbnail": thumb_path.exists(),
                "thumbnail_url": f"/api/storage/thumbnail/{f.name}" if thumb_path.exists() else None,
                "metadata": probe if isinstance(probe, dict) and "error" not in probe else None
            })
            
    # Sort newest first
    results.sort(key=lambda x: x["modified_at"], reverse=True)
    return results

def clear_cache():
    """Clear the /storage/cache directory."""
    ensure_directories()
    deleted_count = 0
    freed_bytes = 0
    for item in CACHE_DIR.iterdir():
        if item.is_file():
            freed_bytes += item.stat().st_size
            item.unlink()
            deleted_count += 1
        elif item.is_dir():
            freed_bytes += sum(f.stat().st_size for f in item.rglob('*') if f.is_file())
            shutil.rmtree(item)
            deleted_count += 1
    return {"deleted_count": deleted_count, "freed_bytes": freed_bytes}

def delete_file(filename: str):
    """Delete a single file from output storage."""
    f = OUTPUT_DIR / filename
    thumb = THUMBS_DIR / f"{filename}.jpg"
    if thumb.exists():
        thumb.unlink()
    if f.exists() and f.is_file():
        size = f.stat().st_size
        f.unlink()
        return {"deleted": True, "filename": filename, "freed_bytes": size}
    return {"deleted": False, "error": "File not found"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Torrent & Video Processing Engine")
    parser.add_argument("--action", required=True, choices=[
        "prepare", "info", "probe", "compress", "list", "clear-cache", "delete-file", "thumbnail"
    ])
    parser.add_argument("--input", help="Input file path")
    parser.add_argument("--target", default="original", choices=["original", "720", "480", "360", "audio"])
    parser.add_argument("--output-filename", help="Optional output filename")
    parser.add_argument("--file", help="Specific filename or path for probe / delete")
    
    args = parser.parse_args()
    
    if args.action == "prepare":
        ensure_directories()
        print(json.dumps({"status": "ready", "directories": [str(CACHE_DIR), str(OUTPUT_DIR)]}))
    elif args.action == "info":
        print(json.dumps(get_system_info(), indent=2))
    elif args.action == "probe":
        target_f = args.file or args.input
        print(json.dumps(probe_file(target_f), indent=2))
    elif args.action == "compress":
        process_file(args.input, args.target, args.output_filename)
    elif args.action == "list":
        print(json.dumps(list_files(), indent=2))
    elif args.action == "clear-cache":
        print(json.dumps(clear_cache()))
    elif args.action == "delete-file":
        print(json.dumps(delete_file(args.file)))
    elif args.action == "thumbnail":
        thumb_out = THUMBS_DIR / f"{Path(args.input).name}.jpg"
        ok = generate_thumbnail(args.input, str(thumb_out))
        print(json.dumps({"success": ok, "thumbnail": str(thumb_out)}))
