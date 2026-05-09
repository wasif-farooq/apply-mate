chrome.runtime.onInstalled.addListener(() => {
  console.log('ApplyBuddy extension installed')

  chrome.storage.local.set({
    backend_url: 'http://localhost:8000',
  })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH') {
    chrome.storage.local.get(['auth_token', 'user_email']).then((result) => {
      sendResponse({
        isAuthenticated: !!result.auth_token,
        email: result.user_email,
      })
    })
    return true
  }

  if (message.type === 'LOGOUT') {
    chrome.storage.local.remove(['auth_token', 'user_email']).then(() => {
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'GET_TOKEN') {
    chrome.storage.local.get(['auth_token']).then((result) => {
      sendResponse({ token: result.auth_token || null })
    })
    return true
  }

  if (message.type === 'SET_TOKEN') {
    const storageData = { auth_token: message.token }
    if (message.email) {
      storageData.user_email = message.email
    }
    chrome.storage.local.set(storageData).then(() => {
      sendResponse({ success: true })
    })
    return true
  }
})