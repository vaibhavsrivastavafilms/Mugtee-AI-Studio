'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

const SHOWCASE_ITEMS = [
  {
    title: 'The Last Glacier',
    category: 'Documentary',
    imageUrl:
      'https://images.pexels.com/photos/33645190/pexels-photo-33645190.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=400',
    hook: '"Some truths melt before we learn their name."',
  },
  {
    title: 'Rise Before Dawn',
    category: 'Motivation',
    imageUrl:
      'https://images.unsplash.com/photo-1670324382035-f9cfacc3b59b?crop=entropy&cs=srgb&fm=jpg&q=85&w=400&h=600&fit=crop',
    hook: '"Discipline is the only romance that pays you back."',
  },
  {
    title: 'The Dopamine Trap',
    category: 'Psychology Short',
    imageUrl:
      'https://images.pexels.com/photos/29202430/pexels-photo-29202430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=400',
    hook: '"Your brain treats novelty like survival."',
  },
] as const

export function CreatorShowcase() {
  return (
    <section className="space-y-4">
      <div className="text-center sm:text-left">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-2">
          Creator Showcase
        </div>
        <h2 className="font-display text-xl sm:text-2xl text-luxe">
          Stories that <span className="text-gold-gradient">feel filmed</span>
        </h2>
        <p className="mt-1 text-sm text-luxe/50">
          Inspiration from cinematic faceless formats — documentary, motivation, psychology.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHOWCASE_ITEMS.map((item, i) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/30 hover:border-gold-500/25 transition-colors"
          >
            <div className="relative aspect-[3/4]">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-[9px] tracking-[0.22em] uppercase text-gold-300/90">
                {item.category}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 space-y-1">
                <h3 className="font-display text-base text-[#F4E7C1]">{item.title}</h3>
                <p className="text-xs text-luxe/55 italic line-clamp-2">{item.hook}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
