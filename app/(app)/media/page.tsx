'use client'
import { motion } from 'framer-motion'
import { Play, FileVideo, Image as ImgIcon, Music } from 'lucide-react'

const MEDIA = [
  { id: 'm1', type: 'video', title: 'Pasta_carbonara_master_v4.mp4',  size: '2.3 GB', img: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600' },
  { id: 'm2', type: 'image', title: 'Plating_aesthetic_07.png',        size: '8.4 MB', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600' },
  { id: 'm3', type: 'video', title: 'Espresso_pull_bts.mov',           size: '1.1 GB', img: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600' },
  { id: 'm4', type: 'image', title: 'Knife_skills_thumb.jpg',          size: '3.2 MB', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600' },
  { id: 'm5', type: 'audio', title: 'Ambient_score_loop.wav',          size: '46 MB',  img: '' },
  { id: 'm6', type: 'image', title: 'Sourdough_macro_02.jpg',          size: '5.7 MB', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600' },
  { id: 'm7', type: 'video', title: 'Tokyo_ramen_broll.mp4',           size: '4.8 GB', img: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=600' },
  { id: 'm8', type: 'image', title: 'Wine_pairing_carousel.png',       size: '12 MB',  img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600' },
]
const ICONS: any = { video: FileVideo, image: ImgIcon, audio: Music }

export default function MediaPage() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Media Library</div>
        <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Frames</span> & assets</h1>
      </motion.div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {MEDIA.map((m, i) => {
          const Icon = ICONS[m.type]
          return (
            <motion.div key={m.id}
              initial={{opacity:0, scale:0.96}} animate={{opacity:1, scale:1}} transition={{delay:i*0.04}}
              whileHover={{y:-3}}
              className="group glass rounded-2xl overflow-hidden hover:shadow-cinema"
            >
              <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                {m.img ? (
                  <img src={m.img} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-gold-500/50" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                {m.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold-glow opacity-0 group-hover:opacity-100 transition">
                      <Play className="w-5 h-5 text-black ml-0.5" />
                    </div>
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] tracking-wider uppercase flex items-center gap-1">
                  <Icon className="w-3 h-3 text-gold-300" /> {m.type}
                </div>
              </div>
              <div className="p-3">
                <div className="text-xs font-medium truncate">{m.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{m.size}</div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
