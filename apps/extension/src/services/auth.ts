import { useAuthStorage } from '../hooks/useStorage'

interface GoogleUserInfo {
  email: string
  name?: string
  picture?: string
}

interface SessionData {
  access_token: string
}

export async function getGoogleAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else if (!token) {
        reject(new Error('Failed to get auth token'))
      } else {
        resolve(token)
      }
    })
  })
}

export async function getGoogleUserInfo(token: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  return response.json()
}

export async function createBackendSession(
  backendUrl: string,
  googleToken: string
): Promise<SessionData> {
  const response = await fetch(`${backendUrl}/auth/extension/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: googleToken })
  })

  if (!response.ok) {
    throw new Error('Failed to create session')
  }

  return response.json()
}

export async function loginWithGoogle(
  backendUrl: string,
  { setToken, setUserEmail }: ReturnType<typeof useAuthStorage>
): Promise<void> {
  const googleToken = await getGoogleAuthToken()
  const userInfo = await getGoogleUserInfo(googleToken)
  const sessionData = await createBackendSession(backendUrl, googleToken)

  await setToken(sessionData.access_token)
  await setUserEmail(userInfo.email)
}

export async function logout(clearAuth: () => Promise<void>): Promise<void> {
  try {
    const tokenResult = await chrome.identity.getAuthToken({ interactive: false })
    if (typeof tokenResult === 'string' && tokenResult) {
      await chrome.identity.removeCachedAuthToken({ token: tokenResult })
    }
  } catch {
    // Ignore errors when removing token
  }

  await clearAuth()
}