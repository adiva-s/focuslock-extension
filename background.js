let focusTabId = null

chrome.tabs.onActivated.addListener(async (activeInfo) => {

  let tab
  try {
    tab = await chrome.tabs.get(activeInfo.tabId)
  } catch(e) {
    return  
  }

  if(!tab || !tab.url) return  // guard 

  chrome.storage.local.get(["focusLock","endTime","blockedSites"], data => {

    const { focusLock, endTime, blockedSites } = data

    if(!focusLock || Date.now() > endTime) return

    const url = tab.url

    const isBlocked = (blockedSites || []).some(site =>
      url.toLowerCase().includes(site.toLowerCase())
    )

    if(isBlocked){
      const focusUrl = chrome.runtime.getURL("focus.html")
      chrome.tabs.update(activeInfo.tabId, { url: focusUrl }, () => {
        if(chrome.runtime.lastError) return  //  handles the "user dragging tab" error
      })
      focusTabId = activeInfo.tabId
    }

  })
})


// cleanup
chrome.tabs.onRemoved.addListener((tabId) => {
  if(tabId === focusTabId){
    focusTabId = null
  }
})