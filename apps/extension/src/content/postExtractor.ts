import type { CaptureResult, CapturedPost, PostType } from '../types/messages'
import * as S from './selectors'

const MIN_DESCRIPTION_CHARS = 200

function firstMatch(root: ParentNode, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = root.querySelector<HTMLElement>(selector)
    if (el) return el
  }
  return null
}

function textOf(root: ParentNode, selectors: string[]): string {
  const el = firstMatch(root, selectors)
  return el ? clean(el.innerText || el.textContent || '') : ''
}

export function clean(text: string): string {
  return text
    .replace(/ /g, ' ')
    .replace(/[​-‏﻿]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Copy a node and remove comments and page chrome before reading its text.
 *
 * Works on a clone so the live page is never mutated -- LinkedIn's own React
 * tree is still driving the real nodes.
 */
export function strippedText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement
  for (const selector of [...S.COMMENT_CONTAINERS, ...S.NOISE]) {
    clone.querySelectorAll(selector).forEach((n) => n.remove())
  }
  // Anything whose class merely mentions "comment" -- LinkedIn renames these
  // often enough that the explicit list above always lags.
  clone.querySelectorAll('[class*="comment" i]').forEach((n) => n.remove())
  return clean(clone.innerText || clone.textContent || '')
}

const JOB_KEYWORDS = [
  'hiring',
  'we are looking for',
  "we're looking for",
  'job opening',
  'now hiring',
  'apply now',
  'send your cv',
  'send your resume',
  'job description',
  'responsibilities',
  'qualifications',
  'years of experience',
]

const AD_MARKERS = ['promoted', 'sponsored']

export function classify(text: string, hasEasyApply: boolean): PostType {
  const lower = text.toLowerCase()
  if (AD_MARKERS.some((m) => lower.startsWith(m))) return 'ad'
  if (hasEasyApply) return 'job'

  const hits = JOB_KEYWORDS.filter((k) => lower.includes(k)).length
  if (hits >= 2) return 'job'
  if (hits === 1 && /@[\w.-]+\.\w{2,}/.test(text)) return 'job'
  if (text.length < 80) return 'unknown'
  return 'general'
}

function canonicalUrl(): string {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  return canonical?.href || window.location.href.split('?')[0]
}

export function isJobPage(): boolean {
  return (
    window.location.pathname.startsWith('/jobs/') ||
    firstMatch(document, S.DESCRIPTION) !== null
  )
}

/** Extract the job page currently open. */
function captureJobPage(): CaptureResult {
  const descriptionEl = firstMatch(document, S.DESCRIPTION)
  if (!descriptionEl) {
    return { ok: false, reason: 'No job description found on this page.' }
  }

  const description = strippedText(descriptionEl)
  if (description.length < MIN_DESCRIPTION_CHARS) {
    return {
      ok: false,
      reason: 'The job description looks empty. Try expanding "See more" first.',
    }
  }

  const title = textOf(document, S.JOB_TITLE)
  const company = textOf(document, S.COMPANY)
  const location = textOf(document, S.LOCATION)
  const hasEasyApply = firstMatch(document, S.EASY_APPLY_BUTTON) !== null

  const parts = [
    title && `Title: ${title}`,
    company && `Company: ${company}`,
    location && `Location: ${location}`,
    `Description:\n${description}`,
  ].filter(Boolean)

  return {
    ok: true,
    post: {
      post_url: canonicalUrl(),
      post_type: 'job',
      raw_content: parts.join('\n\n'),
      title: title || undefined,
      company: company || undefined,
      location: location || undefined,
      has_easy_apply: hasEasyApply,
    },
  }
}

/** Extract a single feed post element. */
export function capturePostElement(el: HTMLElement): CapturedPost | null {
  const body = firstMatch(el, S.FEED_POST_TEXT) ?? el
  const raw = strippedText(body)
  if (raw.length < 40) return null

  const activityId = el.getAttribute('data-id') || el.getAttribute('data-urn') || ''
  const permalink = el.querySelector<HTMLAnchorElement>('a[href*="/feed/update/"]')?.href
  const postUrl =
    permalink ||
    (activityId ? `https://www.linkedin.com/feed/update/${activityId}/` : '')
  if (!postUrl) return null

  const hasEasyApply = firstMatch(el, S.EASY_APPLY_BUTTON) !== null

  return {
    post_url: postUrl.split('?')[0],
    post_type: classify(raw, hasEasyApply),
    raw_content: raw,
    author_name: textOf(el, S.FEED_POST_AUTHOR) || undefined,
    author_url: firstMatch(el, S.FEED_POST_AUTHOR_LINK)
      ? (firstMatch(el, S.FEED_POST_AUTHOR_LINK) as HTMLAnchorElement).href.split('?')[0]
      : undefined,
    has_easy_apply: hasEasyApply,
  }
}

/** The post or job the user is currently looking at. */
export function captureCurrent(): CaptureResult {
  if (isJobPage()) {
    return captureJobPage()
  }

  // A single post permalink, or the post nearest the top of the viewport.
  const posts = Array.from(
    document.querySelectorAll<HTMLElement>(S.FEED_POST.join(', '))
  )
  if (posts.length === 0) {
    return {
      ok: false,
      reason: 'No LinkedIn post found here. Open a job or a post first.',
    }
  }

  const visible = posts.find((p) => {
    const rect = p.getBoundingClientRect()
    return rect.bottom > 80 && rect.top < window.innerHeight
  })

  const post = capturePostElement(visible ?? posts[0])
  if (!post) {
    return { ok: false, reason: 'Could not read the post content.' }
  }
  return { ok: true, post }
}
