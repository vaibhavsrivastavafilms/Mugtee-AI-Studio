export type HomepagePoster = {
  slug: string
  title: string
  imageUrl: string
  href: string
}

export const HOMEPAGE_POSTERS: HomepagePoster[] = [
  {
    slug: 'lessons-that-stay',
    title: 'The Lessons That Stay',
    imageUrl:
      'https://images.pexels.com/photos/33645190/pexels-photo-33645190.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=640',
    href: '/cinematic/examples/psychology-attention',
  },
  {
    slug: 'beyond-horizons',
    title: 'Beyond Horizons',
    imageUrl:
      'https://images.unsplash.com/photo-1670324382035-f9cfacc3b59b?crop=entropy&cs=srgb&fm=jpg&q=85&w=640&h=900&fit=crop',
    href: '/cinematic/examples/luxury-is-quiet',
  },
  {
    slug: 'drive-dream-repeat',
    title: 'Drive. Dream. Repeat.',
    imageUrl:
      'https://images.pexels.com/photos/29202430/pexels-photo-29202430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=640',
    href: '/cinematic/examples/faceless-discipline',
  },
]
