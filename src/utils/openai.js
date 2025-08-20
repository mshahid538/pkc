const axios = require("axios");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment");
}

async function getChatCompletion(messages, options = {}) {
  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: OPENAI_MODEL,
      messages,
      ...options,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data.choices[0].message.content;
}

async function extractKeywords(text) {
  const prompt = [
    {
      role: "system",
      content:
        "Extract 5-10 relevant keywords or entities from the following text. Return as a comma-separated list.",
    },
    { role: "user", content: text },
  ];
  const result = await getChatCompletion(prompt, { max_tokens: 60 });
  return result
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

module.exports = {
  getChatCompletion,
  extractKeywords,
};
