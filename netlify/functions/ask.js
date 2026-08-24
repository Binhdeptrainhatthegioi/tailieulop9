const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_PROMPT =
  "Bạn là trợ lý ảo môn Địa lý lớp 9 thân thiện và thông minh. " +
  "Trả lời các câu hỏi về địa lý tự nhiên, kinh tế, vùng miền Việt Nam và thế giới. " +
  "Luôn trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu.";

exports.handler = async (event) => {
  // Chỉ cho phép POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GEMINI_API_KEY chưa được cấu hình trên Netlify." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Body không hợp lệ." }) };
  }

  const { question, history = [] } = body;
  if (!question) {
    return { statusCode: 400, body: JSON.stringify({ error: "Thiếu trường question." }) };
  }

  // Ghép history + câu hỏi mới
  const contents = [
    ...history,
    { role: "user", parts: [{ text: question }] },
  ];

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data?.error?.message || "Lỗi từ Gemini API." }),
      };
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Lỗi kết nối đến Gemini: " + err.message }),
    };
  }
};
