import { NextResponse } from 'next/server'

// GET /api/version
// Returns the deployed git SHA + build timestamp. Public, no secrets.
// Purpose: verify which commit is live without opening the Vercel dashboard.
// Vercel injects VERCEL_GIT_COMMIT_SHA/REF and VERCEL_DEPLOYMENT_ID at build.
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    shortCommit: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),
    ref: process.env.VERCEL_GIT_COMMIT_REF || 'local',
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    env: process.env.VERCEL_ENV || 'local',
    builtAt: new Date().toISOString(),
  })
}
