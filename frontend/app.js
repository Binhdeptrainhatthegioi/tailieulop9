// Gọi qua Netlify Function - key được giấu trên server
const API_ENDPOINT = "/.netlify/functions/ask";

// DOM
const chat    = document.getElementById("chat");
const input   = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn= document.getElementById("clearChat");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const closeBtn= document.getElementById("closeSidebar");
const statusDot = document.getElementById("statusDot");

// Lịch sử gửi lên Gemini (không bao gồm tin nhắn hiện tại)
let history = [];

// ── Init ──
(function init() {
  setStatus("ready");

  const saved = localStorage.getItem("chat_history");
  if (saved) {
    try {
      const msgs = JSON.parse(saved);
      if (msgs.length) {
        document.getElementById("welcome")?.remove();
        msgs.forEach(m => renderBubble(m.text, m.role, false));
        msgs.forEach(m => {
          history.push({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }],
          });
        });
        scrollBottom();
      }
    } catch { /* ignore */ }
  }
})();

// ── Sidebar ──
menuBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
});

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

closeBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

// ── Clear ──
clearBtn.addEventListener("click", () => {
  if (!confirm("Xóa toàn bộ lịch sử chat?")) return;
  history = [];
  localStorage.removeItem("chat_history");
  chat.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-icon">🌏</div>
      <h3>Xin chào!</h3>
      <p>Hỏi tôi bất cứ điều gì về <strong>Địa lý lớp 9</strong>.</p>
      <div class="suggestions">
        <button class="chip" onclick="fillSuggestion(this)">Đặc điểm địa hình Việt Nam?</button>
        <button class="chip" onclick="fillSuggestion(this)">Các vùng kinh tế trọng điểm?</button>
        <button class="chip" onclick="fillSuggestion(this)">Khí hậu nhiệt đới gió mùa?</button>
        <button class="chip" onclick="fillSuggestion(this)">Tài nguyên thiên nhiên nước ta?</button>
      </div>
    </div>`;
  closeSidebar();
});

// ── Status ──
function setStatus(s) {
  statusDot.className = "status-dot " + s;
  statusDot.title = { ready: "Sẵn sàng", loading: "Đang xử lý...", error: "Lỗi" }[s] || "";
}

// ── Suggestions ──
function fillSuggestion(el) {
  input.value = el.textContent;
  input.dispatchEvent(new Event("input"));
  input.focus();
}

// ── Textarea resize ──
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
});

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// ── Render helpers ──
function renderBubble(text, role, animate = true) {
  const msg = document.createElement("div");
  msg.classList.add("message", role === "user" ? "user-message" : "bot-message");
  if (!animate) msg.style.animation = "none";

  const av = document.createElement("div");
  av.classList.add("avatar");
  av.textContent = role === "user" ? "🧑" : "🤖";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  msg.appendChild(av);
  msg.appendChild(bubble);
  chat.appendChild(msg);
  return bubble;
}

function showTyping() {
  const msg = document.createElement("div");
  msg.classList.add("message", "bot-message");
  msg.id = "typing";
  msg.innerHTML = `<div class="avatar">🤖</div>
    <div class="typing-bubble">
      <div class="dot"></div><div class="dot"></div><div class="dot"></div>
    </div>`;
  chat.appendChild(msg);
  scrollBottom();
}

function hideTyping() { document.getElementById("typing")?.remove(); }
function scrollBottom() { chat.scrollTop = chat.scrollHeight; }

function saveToStorage(role, text) {
  const all = JSON.parse(localStorage.getItem("chat_history") || "[]");
  all.push({ role, text });
  localStorage.setItem("chat_history", JSON.stringify(all));
}

// ── Send ──
async function sendMessage() {
  const question = input.value.trim();
  if (!question) return;

  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;
  setStatus("loading");

  document.getElementById("welcome")?.remove();
  renderBubble(question, "user");
  saveToStorage("user", question);
  scrollBottom();

  showTyping();

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
    });

    hideTyping();

    const data = await res.json();

    if (!res.ok) {
      const b = renderBubble("", "bot");
      b.classList.add("error");
      b.textContent = "⚠️ " + (data.error || `Lỗi ${res.status}`);
      setStatus("error");
    } else {
      renderBubble(data.answer, "bot");
      saveToStorage("bot", data.answer);
      // Cập nhật history cho lượt tiếp theo
      history.push({ role: "user",  parts: [{ text: question }] });
      history.push({ role: "model", parts: [{ text: data.answer }] });
      setStatus("ready");
    }

  } catch {
    hideTyping();
    const b = renderBubble("", "bot");
    b.classList.add("error");
    b.textContent = "⚠️ Không thể kết nối. Thử lại sau.";
    setStatus("error");
  } finally {
    sendBtn.disabled = false;
    scrollBottom();
    input.focus();
  }
}
