#!/usr/bin/env node
/**
 * App Store + Play Store screenshot generator.
 *
 * Requires: npx playwright install chromium
 * Usage:    node app-store/screenshots/generate.mjs
 *
 * Outputs PNGs to app-store/screenshots/out/{ios-6.9, ios-6.5, ipad-13, android-phone}/
 * at the exact pixel dimensions each store requires.
 *
 * Routes visited are stubs — edit the `SHOTS` array below to match your current
 * UX once the flow is stable. The intent is to capture:
 *   1. Landing + tagline
 *   2. Occasion picker
 *   3. Genre picker
 *   4. Questionnaire in progress
 *   5. Finished song page
 */

import { chromium, devices } from 'playwright'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'out')
const BASE = process.env.SCREENSHOT_BASE_URL || 'https://makeasongaboutyou.com'

const TARGETS = [
  { name: 'ios-6.9',      width: 1320, height: 2868, deviceScaleFactor: 3 },
  { name: 'ios-6.5',      width: 1284, height: 2778, deviceScaleFactor: 3 },
  { name: 'ipad-13',      width: 2064, height: 2752, deviceScaleFactor: 2 },
  { name: 'android-phone',width: 1080, height: 2400, deviceScaleFactor: 2.75 },
]

const SHOTS = [
  { slug: '01-hero',          url: '/',                                          wait: 'networkidle' },
  { slug: '02-occasion',      url: '/?step=occasion',                            wait: 'networkidle' },
  { slug: '03-genre',         url: '/?step=genre&occasion=birthday',             wait: 'networkidle' },
  { slug: '04-questionnaire', url: '/?step=questions&occasion=birthday&genre=pop_anthem', wait: 'networkidle' },
  { slug: '05-song',          url: '/song/demo-example-id?preview=1',            wait: 'networkidle' },
]

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const target of TARGETS) {
      const dir = path.join(OUT, target.name)
      mkdirSync(dir, { recursive: true })
      const ctx = await browser.newContext({
        viewport: { width: target.width / target.deviceScaleFactor, height: target.height / target.deviceScaleFactor },
        deviceScaleFactor: target.deviceScaleFactor,
        isMobile: true,
        hasTouch: true,
      })
      const page = await ctx.newPage()
      for (const shot of SHOTS) {
        await page.goto(BASE + shot.url, { waitUntil: shot.wait })
        await page.waitForTimeout(800) // settle animations
        const out = path.join(dir, `${shot.slug}.png`)
        await page.screenshot({ path: out, fullPage: false })
        console.log('✓', target.name, shot.slug)
      }
      await ctx.close()
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
