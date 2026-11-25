#!/usr/bin/env python3
"""Stream small waveform snapshots from the default PipeWire output monitor."""
import array
import subprocess
import sys
import signal

signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))

try:
    process = subprocess.Popen([
        'pw-record', '--target', '@DEFAULT_AUDIO_SINK@',
        '--properties', '{ stream.capture.sink = true }',
        '--rate', '48000', '--channels', '1', '--format', 's16',
        '--latency', '40ms', '--raw', '-'
    ], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    while True:
        data = process.stdout.read(4096)
        if len(data) < 4096:
            break
        samples = array.array('h', data)
        # Average short windows to preserve the shape while limiting UI updates.
        values = [sum(samples[i:i + 32]) / (32 * 32768) for i in range(0, len(samples), 32)]
        print(','.join(f'{max(-1, min(1, value * 3)):.3f}' for value in values), flush=True)
except (BrokenPipeError, FileNotFoundError):
    pass
finally:
    if 'process' in locals() and process.poll() is None:
        process.terminate()
