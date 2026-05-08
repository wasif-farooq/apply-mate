chrome.runtime.onInstalled.addListener(() => {
  console.log('ApplyMate extension installed')

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
})