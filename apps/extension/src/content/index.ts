/**
 * Content script entry point.
 *
 * Listens for popup requests and answers with page content. It never talks to
 * the backend directly: a content script runs in linkedin.com's origin, so its
 * fetches are CORS-checked against a backend that does not allow that origin.
 * The service worker does the network calls instead.
 */
import type { ExtensionMessage, ScanProgress } from '../types/messages'
import { runEasyApply } from './applyAutomator'
import { scanFeed } from './feedScanner'
import { captureCurrent } from './postExtractor'

const scanState = { aborted: false }

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  switch (message.type) {
    case 'CAPTURE_CURRENT_POST': {
      try {
        sendResponse(captureCurrent())
      } catch (error) {
        sendResponse({
          ok: false,
          reason: error instanceof Error ? error.message : 'Capture failed.',
        })
      }
      return false
    }

    case 'SCAN_FEED': {
      scanState.aborted = false
      scanFeed({
        maxPosts: message.maxPosts,
        signal: scanState,
        onProgress: (progress: ScanProgress) => {
          // The popup may be closed by now; a dropped progress ping is fine.
          chrome.runtime.sendMessage({ type: 'SCAN_PROGRESS', progress }).catch(() => {})
        },
      })
        .then((posts) => sendResponse({ ok: true, posts }))
        .catch((error) =>
          sendResponse({
            ok: false,
            reason: error instanceof Error ? error.message : 'Scan failed.',
          })
        )
      return true // async response
    }

    case 'EASY_APPLY': {
      runEasyApply(message.autoSubmit)
        .then(sendResponse)
        .catch((error) =>
          sendResponse({
            ok: false,
            submitted: false,
            reason: error instanceof Error ? error.message : 'Easy Apply failed.',
          })
        )
      return true
    }

    default:
      return false
  }
})
