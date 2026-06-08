'use client'

import {
  ChevronDown,
  Copy,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Mic,
  Package,
  Share2,
  Subtitles,
  Video,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  useUnifiedExportActions,
  type UnifiedExportMenuOptions,
} from '@/lib/export/use-unified-export-actions.client'
import type { SceneImageExportSize } from '@/lib/quick-cut/download-scene-image'

const triggerClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-semibold tracking-[0.14em] uppercase transition-opacity touch-manipulation bg-gold-gradient text-black shadow-gold-glow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'

const menuContentClass =
  'min-w-[min(100vw-2rem,20rem)] max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-gold-500/20 bg-[#0a0a0a]/98 backdrop-blur-xl p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]'

const menuLabelClass =
  'px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.2em] uppercase text-gold-300/70'

const menuItemClass =
  'flex cursor-pointer flex-col items-start gap-0.5 rounded-lg px-2.5 py-2.5 text-left outline-none transition-colors focus:bg-gold-500/10 data-[disabled]:opacity-45 data-[disabled]:cursor-not-allowed min-h-[44px] touch-manipulation'

const menuItemTitleClass = 'inline-flex items-center gap-2 text-[11px] font-medium text-luxe/95 w-full'

const menuItemSubtitleClass = 'text-[10px] text-luxe/45 leading-snug pl-5'

function ExportMenuItem({
  icon,
  title,
  subtitle,
  disabled,
  loading,
  onSelect,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  disabled?: boolean
  loading?: boolean
  onSelect: () => void
}) {
  return (
    <DropdownMenuItem
      disabled={disabled || loading}
      className={menuItemClass}
      onSelect={(event) => {
        event.preventDefault()
        if (disabled || loading) return
        onSelect()
      }}
    >
      <span className={menuItemTitleClass}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden /> : icon}
        {title}
      </span>
      {subtitle ? <span className={menuItemSubtitleClass}>{subtitle}</span> : null}
    </DropdownMenuItem>
  )
}

export function UnifiedExportMenu({
  className,
  label = 'Download',
  align = 'end',
  ...options
}: UnifiedExportMenuOptions & {
  className?: string
  label?: string
  align?: 'start' | 'center' | 'end'
}) {
  const actions = useUnifiedExportActions(options)

  const {
    showVideoGroup,
    mp4Enabled,
    mp4Compiling,
    downloadingMp4,
    reelReadinessValidating,
    mp4Subtitle,
    mp4Label,
    handleDownloadMp4,
    hasImages,
    downloadingImagesFormat,
    sceneImagesSubtitle,
    handleDownloadImages,
    hasAnyCreatorPackAsset,
    creatorPackState,
    creatorPackSubtitle,
    handleExportCreatorPack,
    platformZipItems,
    platformExportState,
    handlePlatformZip,
    hasScript,
    hasNarration,
    scriptSubtitle,
    narrationSubtitle,
    downloadingMp3,
    handleDownloadTxt,
    handleDownloadDoc,
    handleDownloadMp3,
    hasThumbnail,
    hasCaptions,
    downloadingThumbnail,
    downloadingCaptions,
    handleDownloadThumbnail,
    handleDownloadCaptions,
    includeTextExports,
    hasTextContent,
    textExportSubtitle,
    textBusy,
    handleCopyAll,
    handleExportHubTxt,
    handleExportHubDoc,
  } = actions

  const creatorPackLoading = creatorPackState === 'preparing'
  const creatorPackEnabled =
    hasAnyCreatorPackAsset && creatorPackState !== 'preparing'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(triggerClass, className)}>
        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {label}
        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} sideOffset={6} className={menuContentClass}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className={menuLabelClass}>Creator pack</DropdownMenuLabel>
          <ExportMenuItem
            icon={<Package className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
            title={
              creatorPackLoading
                ? 'Generating Creator Pack…'
                : creatorPackState === 'error'
                  ? 'Retry Creator Pack'
                  : creatorPackState === 'ready'
                    ? 'Download Creator Pack'
                    : 'Export Creator Pack'
            }
            subtitle={creatorPackSubtitle}
            disabled={!creatorPackEnabled && creatorPackState !== 'error'}
            loading={creatorPackLoading}
            onSelect={() => void handleExportCreatorPack()}
          />
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-white/[0.06] my-1" />

        {showVideoGroup ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className={menuLabelClass}>Video</DropdownMenuLabel>
              <ExportMenuItem
                icon={<Video className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title={mp4Label}
                subtitle={mp4Subtitle}
                disabled={!mp4Enabled}
                loading={downloadingMp4 || mp4Compiling || reelReadinessValidating}
                onSelect={() => void handleDownloadMp4()}
              />
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
          </>
        ) : null}

        {showVideoGroup && (hasScript || hasNarration) ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className={menuLabelClass}>Script &amp; audio</DropdownMenuLabel>
              {hasScript ? (
                <>
                  <ExportMenuItem
                    icon={<FileText className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                    title="Export TXT"
                    subtitle={scriptSubtitle}
                    onSelect={() => void handleDownloadTxt()}
                  />
                  <ExportMenuItem
                    icon={<FileText className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                    title="Export DOC"
                    subtitle={scriptSubtitle}
                    onSelect={handleDownloadDoc}
                  />
                </>
              ) : null}
              <ExportMenuItem
                icon={<Mic className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title={downloadingMp3 ? 'Downloading…' : 'Download narration (.mp3)'}
                subtitle={narrationSubtitle}
                disabled={!hasNarration}
                loading={downloadingMp3}
                onSelect={() => void handleDownloadMp3()}
              />
              <ExportMenuItem
                icon={<Subtitles className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title={downloadingCaptions ? 'Downloading…' : 'Download captions (.srt)'}
                subtitle={hasCaptions ? 'Synced scene captions' : 'Captions not ready'}
                disabled={!hasCaptions}
                loading={downloadingCaptions}
                onSelect={() => void handleDownloadCaptions()}
              />
              <ExportMenuItem
                icon={<ImageIcon className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title={downloadingThumbnail ? 'Downloading…' : 'Download thumbnail (.jpg)'}
                subtitle={hasThumbnail ? '1080×1920 cover image' : 'Thumbnail not ready'}
                disabled={!hasThumbnail}
                loading={downloadingThumbnail}
                onSelect={() => void handleDownloadThumbnail()}
              />
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
          </>
        ) : null}

        <DropdownMenuGroup>
          <DropdownMenuLabel className={menuLabelClass}>Scene images</DropdownMenuLabel>
          {(['vertical', 'horizontal'] as const).map((exportSize) => {
            const { label: dimLabel } = actions.sceneImageDimensions[exportSize]
            const aspectLabel = exportSize === 'vertical' ? '9:16' : '16:9'
            const isDownloading = downloadingImagesFormat === exportSize
            return (
              <ExportMenuItem
                key={exportSize}
                icon={<ImageIcon className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title={isDownloading ? `Downloading ${aspectLabel}…` : `All ${aspectLabel}`}
                subtitle={
                  hasImages
                    ? `${dimLabel} · ${sceneImagesSubtitle}`
                    : sceneImagesSubtitle
                }
                disabled={!hasImages || (downloadingImagesFormat !== null && !isDownloading)}
                loading={isDownloading}
                onSelect={() => void handleDownloadImages(exportSize as SceneImageExportSize)}
              />
            )
          })}
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuLabel className={menuLabelClass}>Platform ZIPs</DropdownMenuLabel>
          {platformZipItems.map((item) => {
            const isLoading = platformExportState.id === item.id
            return (
              <ExportMenuItem
                key={item.id}
                icon={<Share2 className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title={
                  isLoading
                    ? `Preparing ${item.name}…`
                    : `${item.name} ZIP`
                }
                subtitle={
                  isLoading && platformExportState.progress > 0
                    ? `${platformExportState.progress}% · ${item.subtitle}`
                    : item.subtitle
                }
                disabled={!item.enabled || (platformExportState.id !== null && !isLoading)}
                loading={isLoading}
                onSelect={() => void handlePlatformZip(item.id)}
              />
            )
          })}
        </DropdownMenuGroup>

        {includeTextExports ? (
          <>
            <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className={menuLabelClass}>Text exports</DropdownMenuLabel>
              <ExportMenuItem
                icon={<Copy className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title={textBusy === 'copy' ? 'Copying…' : 'Copy all'}
                subtitle={textExportSubtitle}
                disabled={!hasTextContent || textBusy !== null}
                onSelect={() => void handleCopyAll()}
              />
              <ExportMenuItem
                icon={<Download className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title="Export TXT"
                subtitle={textExportSubtitle}
                disabled={!hasTextContent || textBusy !== null}
                onSelect={handleExportHubTxt}
              />
              <ExportMenuItem
                icon={<FileText className="w-3.5 h-3.5 shrink-0 text-gold-300/80" aria-hidden />}
                title="Export DOCX"
                subtitle={textExportSubtitle}
                disabled={!hasTextContent || textBusy !== null}
                onSelect={handleExportHubDoc}
              />
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
