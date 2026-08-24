// =====================================================
// ⚠️  Sau khi deploy backend lên Render, thay URL này
// =====================================================
const BACKEND_URL = "https://YOUR-APP.onrender.com";
// =====================================================

// ---------- DOM refs ----------
const chat        = document.getElementById("chat");
const userInput   = document.getElementById("userInput");
const sendBtn     = document.getElementById("sendBtn");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveKeyBtn  = document.getElementById("saveKey");
const clearBtn    = document.getElementById("clearChat");
const statusDot   = document.getElementById("statusDot");
const menuBtn     = document.getElementById("menuBtn");
const sidebar     = document.getElementById("sidebar");
const overlay     = document.getElementById("overlay");
const closeSidebar= document.getElementById("closeSidebar");
const toggleKey   = document.getElementById("toggleKey");

// ---------- State ----------
let messages = [];   // { role: "user"|"bot", text }

// ---------- Init ----------
(function init() {
  // Khôi phục API key đã lưu
  const saved = localStorage.getItem("openai_api_key");
  if (saved) {
    apiKeyInput.value = saved;
    setStatus("ready");
  }

  // Khôi phục lịch sử chat
  const savedMsgs = localStorage.getItem("chat_history");
  if (savedMsgs) {
    try {
      messages = JSON.parse(savedMsgs);
      if (messages.length) {
        removeWelcome();
        messages.forEach(m => renderMessage(m.text, m.role, false));
        scrollBottom();
      }
    } catch { messages = []; }
  }
})();

// ---------- Sidebar ----------
menuBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
});

function closeSidebarFn() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

closeSidebar.addEventListener("click", closeSidebarFn);
overlay.addEventListener("click", closeSidebarFn);

// ---------- API Key ----------
saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) { alert("Vui lòng nhập API Key."); return; }
  localStorage.setItem("openai_api_key", key);
  setStatus("ready");
  saveKeyBtn.textContent = "✅ Đã lưu!";
  setTimeout(() => saveKeyBtn.textContent = "Lưu key", 2000);
  closeSidebarFn();
});

toggleKey.addEventListener("click", () => {
  apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
});

function setStatus(state) {
  statusDot.className = "status-dot " + state;
  const labels = { ready: "Sẵn sàng", loading: "Đang xử lý...", error: "Lỗi", "": "Chưa có API Key" };
  statusDot.title = labels[state] || "";
}

// ---------- Clear chat ----------
clearBtn.addEventListener("click", () => {
  if (!confirm("Xóa toàn bộ lịch sử chat?")) return;
  messages = [];
  localStorage.removeItem("chat_history");
  chat.innerHTML = "";
  renderWelcome();
  closeSidebarFn();
});

// ---------- Suggestions ----------
function fillSuggestion(el) {
  userInput.value = el.textContent;
  userInput.dispatchEvent(new Event("input"));
  userInput.focus();
}

// ---------- Textarea auto-resize ----------
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ---------- Render helpers ----------
function removeWelcome() {
  const w = chat.querySelector(".welcome");
  if (w) w.remove();
}

function renderWelcome() {
  chat.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">🌏</div>
      <h3>Xin chào!</h3>
      <p>Hỏi tôi bất cứ điều gì về <strong>Địa lý lớp 9</strong> — địa lý tự nhiên, kinh tế, vùng miền Việt Nam và thế giới.</p>
      <div class="suggestions">
        <button class="chip" onclick="fillSuggestion(this)">Đặc điểm địa hình Việt Nam?</button>
        <button class="chip" onclick="fillSuggestion(this)">Các vùng kinh tế trọng điểm?</button>
        <button class="chip" onclick="fillSuggestion(this)">Khí hậu nhiệt đới gió mùa?</button>
        <button class="chip" onclick="fillSuggestion(this)">Tài nguyên thiên nhiên nước ta?</button>
      </div>
    </div>`;
}

function renderMessage(text, role, animate = true) {
  const msg = document.createElement("div");
  msg.classList.add("message", role === "user" ? "user-message" : "bot-message");
  if (!animate) msg.style.animation = "none";

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = role === "user" ? "🧑" : "🤖";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chat.appendChild(msg);
  return bubble;
}

function renderTyping() {
  const msg = document.createElement("div");
  msg.classList.add("message", "bot-message");
  msg.id = "typing";

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = "🤖";

  const bubble = document.createElement("div");
  bubble.classList.add("typing-bubble");
  bubble.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chat.appendChild(msg);
  scrollBottom();
}

function removeTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

function scrollBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function saveHistory() {
  localStorage.setItem("chat_history", JSON.stringify(messages));
}

// ---------- Send ----------
async function sendMessage() {
  const question = userInput.value.trim();
  if (!question) return;

  const apiKey = localStorage.getItem("openai_api_key") || apiKeyInput.value.trim();
  if (!apiKey) {
    alert("Vui lòng nhập và lưu OpenAI API Key ở menu bên trái trước.");
    return;
  }

  // Clear input
  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;
  setStatus("loading");

  removeWelcome();

  // Hiện tin user
  renderMessage(question, "user");
  messages.push({ role: "user", text: question });
  saveHistory();
  scrollBottom();

  renderTyping();

  try {
    const res = await fetch(`${BACKEND_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ question }),
    });

    removeTyping();

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const bubble = renderMessage("", "bot");
      bubble.classList.add("error");
      bubble.textContent = `⚠️ ${err.detail || "Lỗi không xác định"}`;
      setStatus("error");
    } else {
      const data = await res.json();
      renderMessage(data.answer, "bot");
      messages.push({ role: "bot", text: data.answer });
      saveHistory();
      setStatus("ready");
    }

  } catch {
    removeTyping();
    const bubble = renderMessage("", "bot");
    bubble.classList.add("error");
    bubble.textContent = "⚠️ Không thể kết nối đến server. Kiểm tra lại đường truyền hoặc thử lại sau.";
    setStatus("error");
  } finally {
    sendBtn.disabled = false;
    scrollBottom();
    userInput.focus();
  }
}
