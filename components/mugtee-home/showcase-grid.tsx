'use client'

import { memo } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type ShowcaseItem = {
  title: string
  category: string
  imageUrl: string
  hook: string
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
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
]

export const ShowcaseGrid = memo(function ShowcaseGrid() {
  return (
    <section id="showcase" className="relative px-5 sm:px-6 py-20 sm:py-24 border-t border-white/[0.04]">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">
            Creator Examples
          </div>
          <h2 className="font-display text-3xl sm:text-4xl text-luxe">
            Stories that <span className="text-gold-gradient">feel filmed</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SHOWCASE_ITEMS.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="group rounded-2xl overflow-hidden border border-gold-soft bg-black/30 glass hover:shadow-gold-glow transition-shadow duration-500"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/60 text-[9px] tracking-[0.2em] uppercase text-gold-300/90">
                  {item.category}
                </span>
              </div>
              <div className="p-4 space-y-1.5">
                <h3 className="font-display text-lg text-luxe">{item.title}</h3>
                <p className="text-sm text-luxe/60 italic leading-relaxed">{item.hook}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
})
