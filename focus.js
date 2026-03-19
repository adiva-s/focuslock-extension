document.addEventListener("DOMContentLoaded", () => {

  let intervalID

  const summaryInput = document.getElementById("summaryInput")

  // ✅ FIX: only add this ONCE (not inside click)
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

      // 🔥 PROGRESS BAR
      if(startTime && endTime){
        const total = endTime - startTime
        const elapsed = now - startTime

        let percent = (elapsed / total) * 100
        if(percent > 100) percent = 100
        if(percent < 0) percent = 0

        progressFill.style.width = percent + "%"
        progressText.textContent = Math.floor(percent) + "% completed"

        // optional color shift
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

  // done button
  document.getElementById("doneBtn").onclick = () => {
    document.getElementById("actions").style.display = "none"
    document.getElementById("summaryBox").style.display = "block"
  }

  // save summary
  document.getElementById("saveSummary").onclick = () => {

    clearInterval(intervalID)

    const summary = summaryInput.value.trim()

    // summary is required (anti-cheat)
    if(!summary){
      summaryInput.style.border = "2px solid red"
      summaryInput.placeholder = "You must write what you did 👀"
      return
    }

    chrome.storage.local.get(["sessions","task","startTime"], data => {

      const sessions = data.sessions || []

      const today = new Date().toISOString()
      const now = Date.now()
      const startTime = data.startTime
    
      let duration = 0
      if(startTime){
        duration = Math.round((now - startTime) / 60000) 
    }

      const newSession = {
        date: today,
        task: data.task || "No task",
        summary: summary,
        duration: duration
      }

      sessions.push(newSession)

      sessions.sort((a, b) => new Date(a.date) - new Date(b.date))

      // 🔥 CALCULATE STREAK
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

      chrome.storage.local.set({
        sessions: sessions,
        focusLock: false,
        startTime: null
      })

      // ✨ COMPLETION UI
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
            "
            >
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
            "
            >
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
            "
            >
            Return to Site
          </button>

        </div>
      `

      document.getElementById("summaryDisplay").textContent = "→ " + newSession.summary
      document.getElementById("taskDisplay").textContent = newSession.task  

      document.getElementById("continueBtn").addEventListener("click", () => {
        window.location.href = chrome.runtime.getURL("popup.html")
      })

        document.getElementById("historyBtn").addEventListener("click", () => {
            window.location.href = chrome.runtime.getURL("history.html")
        })
        document.getElementById("returnBtn").addEventListener("click", () => {

        chrome.storage.local.get(["lastBlockedUrl"], data => {

            if(data.lastBlockedUrl){
            window.location.href = data.lastBlockedUrl
            } else {
            window.location.href = "https://www.google.com"
            }

        })

        })

    })

  }

  // ✅ ADD MORE TIME
  document.getElementById("moreBtn").onclick = () => {
    document.getElementById("addTimeBox").style.display = "block"
  }

  document.getElementById("addBtn").onclick = () => {

    const extra = document.getElementById("extraMinutes").value

    const newEnd = Date.now() + extra * 60000

    chrome.storage.local.set({
      endTime: newEnd
    })

    location.reload()
  }

})

chrome.storage.onChanged.addListener((changes, area) => {

  if(area === "local" && changes.focusLock){

    const newValue = changes.focusLock.newValue

    // 🚫 session ended elsewhere
    if(newValue === false){

      // reload page to sync UI
      location.reload()
    }
  }

})