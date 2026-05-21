// Digital Asset Links — TWA URL-bar suppression for Mugtee AI Studio Android app.
// Served at: https://mugtee.in/.well-known/assetlinks.json
//
// Replace the placeholder fingerprint(s) once you run `bubblewrap build` and after
// enabling Play App Signing in Play Console. See docs/PLAY_STORE_DEPLOYMENT.md.
import { NextResponse } from 'next/server'

export const dynamic = 'force-static'
export const revalidate = false

const ASSET_LINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.mugtee.aistudio',
      sha256_cert_fingerprints: [
        'REPLACE_WITH_YOUR_PLAY_APP_SIGNING_SHA256_FINGERPRINT',
      ],
    },
  },
]

export async function GET() {
  return NextResponse.json(ASSET_LINKS, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  })
}
