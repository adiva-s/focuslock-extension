function checkAndBlock() {
  if(!chrome.runtime?.id) return

  //  don't block extension pages
  if(window.location.href.startsWith("chrome-extension://")){
    return
  }

  try {
    chrome.storage.local.get(["focusLock","endTime","blockedSites"], data => {

      if(chrome.runtime.lastError) return

      const { focusLock, endTime, blockedSites } = data

      if(!focusLock || !endTime || Date.now() > endTime) return

      const currentUrl = window.location.href

      const isBlocked = (blockedSites || []).some(site =>
        currentUrl.toLowerCase().includes(site.toLowerCase())
      )

      if(isBlocked){
        chrome.storage.local.set({ lastBlockedUrl: currentUrl })
        window.location.href = chrome.runtime.getURL("focus.html")
      }

    })
  } catch(e) {
    return
  }
}

// run when page first loads
checkAndBlock()

// run when user switches BACK to tab
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkAndBlock()
  }
})