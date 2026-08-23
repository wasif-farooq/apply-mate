import type { CapturedPost, ScanProgress } from '../types/messages'
import { capturePostElement } from './postExtractor'
import * as S from './selectors'

/**
 * Walks the feed, collecting posts.
 *
 * Paced deliberately. Scrolling a feed as fast as the browser allows is both
 * the fastest way to get an account flagged and a good way to outrun
 * LinkedIn's lazy rendering and collect empty nodes.
 */

const MIN_DELAY_MS = 2000
const MAX_DELAY_MS = 5000
const NO_GROWTH_LIMIT = 3

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface ScanOptions {
  maxPosts: number
  onProgress?: (progress: ScanProgress) => void
  signal?: { aborted: boolean }
}

export async function scanFeed(options: ScanOptions): Promise<CapturedPost[]> {
  const { maxPosts, onProgress, signal } = options
  const collected = new Map<string, CapturedPost>()
  let noGrowthRounds = 0

  while (collected.size < maxPosts && noGrowthRounds < NO_GROWTH_LIMIT) {
    if (signal?.aborted) break

    const before = collected.size
    const elements = document.querySelectorAll<HTMLElement>(S.FEED_POST.join(', '))

    for (const el of elements) {
      if (collected.size >= maxPosts) break
      const post = capturePostElement(el)
      if (post && !collected.has(post.post_url)) {
        collected.set(post.post_url, post)
      }
    }

    onProgress?.({
      scanned: collected.size,
      jobs: [...collected.values()].filter((p) => p.post_type === 'job').length,
      done: false,
    })

    // No new posts after a scroll means the feed stopped producing them --
    // end of content, a render stall, or an interstitial. Give it a couple of
    // rounds before concluding rather than one.
    noGrowthRounds = collected.size === before ? noGrowthRounds + 1 : 0

    if (collected.size >= maxPosts) break

    window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' })
    await sleep(randomDelay())
  }

  const posts = [...collected.values()]
  onProgress?.({
    scanned: posts.length,
    jobs: posts.filter((p) => p.post_type === 'job').length,
    done: true,
  })
  return posts
}
