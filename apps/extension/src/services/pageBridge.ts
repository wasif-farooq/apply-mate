/**
 * Popup -> content script messaging.
 *
 * The content script is declared in the manifest for linkedin.com, but a tab
 * that was already open when the extension loaded (or reloaded) will not have
 * it. sendToActiveTab injects on demand rather than failing with the opaque
 * "Could not establish connection" error.
 */
import type { CaptureResult, CapturedPost, ScanProgress } from '../types'

export interface EasyApplyResult {
  ok: boolean
  submitted: boolean
  reason?: string
}

async function activeTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab ?? null
}

export function isLinkedInTab(tab: chrome.tabs.Tab | null): boolean {
  return !!tab?.url && /^https:\/\/www\.linkedin\.com\//.test(tab.url)
}

async function sendToActiveTab<T>(message: unknown): Promise<T> {
  const tab = await activeTab()
  if (!tab?.id) throw new Error('No active tab.')
  if (!isLinkedInTab(tab)) {
    throw new Error('Open a LinkedIn page first.')
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message)
  } catch {
    // Tab predates the content script. Inject and retry once.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    })
    return await chrome.tabs.sendMessage(tab.id, message)
  }
}

export function captureCurrentPost(): Promise<CaptureResult> {
  return sendToActiveTab<CaptureResult>({ type: 'CAPTURE_CURRENT_POST' })
}

export function scanFeed(maxPosts: number): Promise<{
  ok: boolean
  posts?: CapturedPost[]
  reason?: string
}> {
  return sendToActiveTab({ type: 'SCAN_FEED', maxPosts })
}

export function runEasyApply(autoSubmit: boolean): Promise<EasyApplyResult> {
  return sendToActiveTab<EasyApplyResult>({ type: 'EASY_APPLY', url: '', autoSubmit })
}

export function onScanProgress(handler: (progress: ScanProgress) => void): () => void {
  const listener = (message: { type?: string; progress?: ScanProgress }) => {
    if (message?.type === 'SCAN_PROGRESS' && message.progress) {
      handler(message.progress)
    }
  }
  chrome.runtime.onMessage.addListener(listener)
  return () => chrome.runtime.onMessage.removeListener(listener)
}
