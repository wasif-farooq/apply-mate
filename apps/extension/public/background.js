/**
 * Service worker: the extension's only path to the backend.
 *
 * Content scripts run in linkedin.com's origin, so their fetches are subject
 * to CORS and the backend's allow-list does not include LinkedIn. Requests
 * made here run under the extension's host_permissions, where CORS does not
 * apply. That is the whole reason this file exists.
 *
 * Plain JS on purpose: it is copied verbatim from public/ by Vite and never
 * bundled, so it must not import anything.
 */

const DEFAULT_BACKEND_URL = 'http://localhost:8000'

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get('backend_url')
  if (!stored.backend_url) {
    await chrome.storage.local.set({ backend_url: DEFAULT_BACKEND_URL })
  }
})

async function apiFetch({ path, method = 'GET', body }) {
  const stored = await chrome.storage.local.get(['backend_url', 'auth_token'])
  const baseUrl = stored.backend_url || DEFAULT_BACKEND_URL
  const token = stored.auth_token

  if (!token) {
    return { ok: false, status: 401, error: 'Not signed in.' }
  }

  const headers = { Authorization: `Bearer ${token}` }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const text = await response.text()
    let data
    try {
      data = text ? JSON.parse(text) : undefined
    } catch {
      data = undefined
    }

    if (!response.ok) {
      // Surface the server's message. The backend now distinguishes "this
      // post is unreadable" (422) from "the AI service is down" (503), and
      // collapsing them back into one string would undo that.
      const detail =
        data && typeof data.detail === 'string'
          ? data.detail
          : `Request failed (${response.status})`
      return { ok: false, status: response.status, error: detail }
    }

    return { ok: true, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, error: error?.message || 'Network error' }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'API_FETCH') {
    apiFetch(message).then(sendResponse)
    return true // keep the channel open for the async reply
  }
  return false
})
