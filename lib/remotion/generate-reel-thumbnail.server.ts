import 'server-only'

import fs from 'fs/promises'
import path from 'path'
import { renderStill, selectComposition } from '@remotion/renderer'
import {
  THUMBNAIL_COMPOSITION_ID,
  ThumbnailComposition,
  type ThumbnailCompositionProps,
} from '@/lib/remotion/compositions/ThumbnailComposition'
import { REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from '@/lib/remotion/compositions/constants'

export async function generateReelThumbnail(input: {
  serveUrl: string
  imageSrc: string
  title: string
  hook?: string
  outputPath: string
}): Promise<string> {
  const props: ThumbnailCompositionProps = {
    imageSrc: input.imageSrc,
    title: input.title,
    hook: input.hook,
  }

  const composition = await selectComposition({
    serveUrl: input.serveUrl,
    id: THUMBNAIL_COMPOSITION_ID,
    inputProps: props,
  })

  await renderStill({
    serveUrl: input.serveUrl,
    composition,
    output: input.outputPath,
    inputProps: props,
    imageFormat: 'jpeg',
    jpegQuality: 92,
    frame: 0,
  })

  await fs.access(input.outputPath)
  return input.outputPath
}

export async function ensureThumbnailCompositionRegistered(): Promise<void> {
  void ThumbnailComposition
  void THUMBNAIL_COMPOSITION_ID
  void REEL_WIDTH
  void REEL_HEIGHT
  void REEL_FPS
  void path.join(process.cwd(), 'lib', 'remotion', 'compositions', 'ThumbnailComposition.tsx')
}
