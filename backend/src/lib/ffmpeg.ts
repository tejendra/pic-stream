import { spawn } from 'node:child_process'

/**
 * Run ffmpeg with a fixed argument array (no shell). Only app-generated paths and flags.
 */
export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-800)}`))
    })
  })
}

const previewWithAudioArgs = (inputPath: string, outputPath: string): string[] => [
  '-y',
  '-i',
  inputPath,
  '-vf',
  'scale=-2:720',
  '-c:v',
  'libx264',
  '-preset',
  'fast',
  '-crf',
  '23',
  '-movflags',
  '+faststart',
  '-map',
  '0:v:0',
  '-map',
  '0:a?',
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  outputPath,
]

const previewNoAudioArgs = (inputPath: string, outputPath: string): string[] => [
  '-y',
  '-i',
  inputPath,
  '-vf',
  'scale=-2:720',
  '-c:v',
  'libx264',
  '-preset',
  'fast',
  '-crf',
  '23',
  '-movflags',
  '+faststart',
  '-an',
  outputPath,
]

/** 720p H.264 MP4 with faststart; tries AAC audio, falls back to video-only if needed. */
export async function transcodePreview(inputPath: string, outputPath: string): Promise<void> {
  try {
    await runFfmpeg(previewWithAudioArgs(inputPath, outputPath))
  } catch {
    await runFfmpeg(previewNoAudioArgs(inputPath, outputPath))
  }
}

/** Single-frame JPEG thumbnail. */
export function buildThumbnailArgs(inputPath: string, outputPath: string): string[] {
  return ['-y', '-i', inputPath, '-vf', 'scale=-2:720', '-frames:v', '1', '-q:v', '2', outputPath]
}
