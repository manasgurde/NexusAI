import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY is not set. AI features will not work.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// gemini-2.5-flash — fast, low latency (chatbot, note summarizer)
export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 4096,
  },
}, { apiVersion: "v1beta" });

// gemini-2.5-pro — configured to use gemini-2.5-flash to avoid 429 free tier limits
export const geminiPro = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.8,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
}, { apiVersion: "v1beta" });

// gemini-embedding-001 — for RAG embeddings (requires specifying outputDimensionality: 768 in calls)
export const geminiEmbedding = genAI.getGenerativeModel({
  model: "gemini-embedding-001"
});

