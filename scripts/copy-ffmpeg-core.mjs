import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
const mtSrcDir = join(root, 'node_modules', '@ffmpeg', 'core-mt', 'dist', 'esm')
const destDir = join(root, 'public', 'ffmpeg')

const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm']
const mtFileMap = [
  { src: 'ffmpeg-core.js', dest: 'ffmpeg-core-mt.js' },
  { src: 'ffmpeg-core.wasm', dest: 'ffmpeg-core-mt.wasm' },
  { src: 'ffmpeg-core.worker.js', dest: 'ffmpeg-core.worker.js' },
]
const workerSrc = join(root, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm', 'worker.js')
const workerDest = join(destDir, 'ffmpeg-class-worker.js')

if (!existsSync(srcDir)) {
  console.error('Run npm install @ffmpeg/core first.')
  process.exit(1)
}

mkdirSync(destDir, { recursive: true })
for (const file of files) {
  copyFileSync(join(srcDir, file), join(destDir, file))
  console.log(`Copied ${file} -> public/ffmpeg/${file}`)
}

if (existsSync(mtSrcDir)) {
  for (const { src, dest } of mtFileMap) {
    copyFileSync(join(mtSrcDir, src), join(destDir, dest))
    console.log(`Copied ${src} -> public/ffmpeg/${dest}`)
  }
} else {
  console.warn('@ffmpeg/core-mt not installed — threaded FFmpeg.wasm assets skipped.')
}

if (existsSync(workerSrc)) {
  copyFileSync(workerSrc, workerDest)
  console.log('Copied ffmpeg-class-worker.js -> public/ffmpeg/ffmpeg-class-worker.js')
}
