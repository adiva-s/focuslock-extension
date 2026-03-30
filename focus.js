document.addEventListener("DOMContentLoaded", () => {

  let intervalID
  let isCompleting = false 

  const summaryInput = document.getElementById("summaryInput")

  summaryInput.addEventListener("input", () => {
    summaryInput.style.border = "1px solid #ccc"
  })

  chrome.storage.local.get(["task","endTime","sessions","startTime"], data => {

    const task = data.task
    let endTime = data.endTime
    const startTime = data.startTime

    document.getElementById("taskText").textContent =
      "Task: " + task

    const timerElement = document.getElementById("timer")
    const actions = document.getElementById("actions")
    const status = document.getElementById("statusText")
    const progressFill = document.getElementById("progressFill")
    const progressText = document.getElementById("progressText")

    function updateTimer(){

      const now = Date.now()
      const remaining = endTime - now

      if(startTime && endTime){
        const total = endTime - startTime
        const elapsed = now - startTime

        let percent = (elapsed / total) * 100
        percent = Math.max(0, Math.min(100, percent))

        progressFill.style.width = percent + "%"
        progressText.textContent = Math.floor(percent) + "% completed"

        if(percent > 95){
          progressFill.style.background = "#ef4444"
        } else if(percent > 80){
          progressFill.style.background = "#f59e0b"
        }
      }

      if(remaining <= 0){

        timerElement.textContent = "00:00"
        status.textContent = "Did you finish your task?"
        actions.style.display = "block"

        clearInterval(intervalID)

        // FIX: freeze the end time the moment the timer hits zero
        chrome.storage.local.set({ sessionEndTime: Date.now() })

        return
      }

      const minutes = Math.floor(remaining/60000)
      const seconds = Math.floor((remaining%60000)/1000)

      timerElement.textContent =
        minutes + ":" + seconds.toString().padStart(2,"0")
    }

    updateTimer()
    intervalID = setInterval(updateTimer,1000)

  })

  // DONE BUTTON
  document.getElementById("doneBtn").onclick = () => {
    document.getElementById("actions").style.display = "none"
    document.getElementById("summaryBox").style.display = "block"
  }

  // SAVE SUMMARY
  document.getElementById("saveSummary").onclick = () => {

    clearInterval(intervalID)

    const summary = summaryInput.value.trim()

    if(!summary){
      summaryInput.style.border = "2px solid red"
      summaryInput.placeholder = "You must write what you did 👀"
      return
    }

    // FIX: include sessionEndTime in the get call
    chrome.storage.local.get(["sessions","task","startTime","sessionEndTime"], data => {

      const sessions = data.sessions || []

      const today = new Date().toISOString()
      const startTime = data.startTime

      // FIX: use sessionEndTime (frozen at timer end) instead of Date.now()
      const sessionEndTime = data.sessionEndTime || Date.now()

      let duration = 0
      if(startTime){
        duration = Math.round((sessionEndTime - startTime) / 60000)
      }

      const newSession = {
        date: today,
        task: data.task || "No task",
        summary: summary,
        duration: duration
      }

      sessions.push(newSession)
      sessions.sort((a, b) => new Date(a.date) - new Date(b.date))

      function calculateStreak(sessions){
        if(sessions.length === 0) return 0

        const uniqueDates = [...new Set(sessions.map(s => {
          const d = new Date(s.date)
          d.setHours(0,0,0,0)
          return d.getTime()
        }))].sort((a,b) => a - b)

        let streak = 1

        for(let i = uniqueDates.length - 1; i > 0; i--){
          const diff = (uniqueDates[i] - uniqueDates[i-1]) / (1000*60*60*24)
          if(Math.round(diff) === 1){
            streak++
          } else {
            break
          }
        }

        return streak
      }

      const streak = calculateStreak(sessions)

      window.isCompleting = true 

      // FIX: also clear sessionEndTime on save
      chrome.storage.local.set({
        sessions: sessions,
        focusLock: false,
        startTime: null,
        sessionEndTime: null
      }, () => {

        document.querySelector(".card").innerHTML = `
          <div style="text-align:center; padding:10px;">

            <h1>✅ Mission Complete</h1>

            <p><strong id="taskDisplay"></strong></p>

            <div id="summaryDisplay"
              style="background:#f0f4ff; padding:12px; border-radius:8px; margin:10px 0;">
            </div>

            <div style="margin-top:15px; font-size:14px; color:#555;">
              🔥 ${streak} Day Streak<br>
              📊 Total Sessions: ${sessions.length}
            </div>

            <br>

            <button id="continueBtn"
              style="
                  background:#4f6df5;
                  color:white;
                  padding:10px 16px;
                  border:none;
                  border-radius:6px;
                  cursor:pointer;
              ">
              Start New Session
            </button>

            <button id="historyBtn"
              style="
                  background:#e5e7eb;
                  color:#111;
                  padding:10px 16px;
                  border:none;
                  border-radius:6px;
                  cursor:pointer;
                  margin-left:8px;
              ">
              View Progress
            </button>

            <button id="returnBtn"
              style="
                  background:#10b981;
                  color:white;
                  padding:10px 16px;
                  border:none;
                  border-radius:6px;
                  cursor:pointer;
                  margin-top:10px;
                  width:100%;
              ">
              Return to Site
            </button>

          </div>
        `

        document.getElementById("summaryDisplay").textContent = "→ " + newSession.summary
        document.getElementById("taskDisplay").textContent = newSession.task  

        document.getElementById("continueBtn").onclick = () => {
          window.location.href = chrome.runtime.getURL("popup.html")
        }

        document.getElementById("historyBtn").onclick = () => {
          window.location.href = chrome.runtime.getURL("history.html")
        }

        document.getElementById("returnBtn").onclick = () => {
          chrome.storage.local.get(["lastBlockedUrl"], data => {
            window.location.href = data.lastBlockedUrl || "https://www.google.com"
          })
        }

      })

    })

  }

  // ADD MORE TIME
  document.getElementById("moreBtn").onclick = () => {
    document.getElementById("addTimeBox").style.display = "block"
  }

  document.getElementById("addBtn").onclick = () => {

    const extra = document.getElementById("extraMinutes").value
    const newEnd = Date.now() + extra * 60000

    chrome.storage.local.set({ endTime: newEnd })

    location.reload()
  }

})

//  FIXED LISTENER
chrome.storage.onChanged.addListener((changes, area) => {

  if(area === "local" && changes.focusLock){

    const newValue = changes.focusLock.newValue

    //  DO NOT reload if we're completing session
    if(newValue === false && !window.isCompleting){
      location.reload()
    }
  }

})