import 'server-only'



/** Resolve royalty-free background music URL for MVP exports. */

export function resolveMvpRoyaltyFreeMusicUrl(): string | null {

  return (

    process.env.MVP_ROYALTY_FREE_MUSIC_URL?.trim() ||

    process.env.V3_MUSIC_URL?.trim() ||

    null

  )

}


