import { Router, Response } from "express";
import { geminiFlash, geminiEmbedding } from "../../lib/gemini.js";
import { requireAuth } from "../../middlewares/auth.js";
import { checkQuota, QuotaRequest } from "../../middlewares/quota.js";
import { db } from "../../lib/db.js";
import { AIToolType } from "@nexusai/shared";

const router = Router();

router.post("/", requireAuth, checkQuota, async (req: QuotaRequest, res: Response) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || text.trim().length < 50) {
    res.status(400).json({ success: false, message: "text must be at least 50 characters" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  req.on("close", () => res.end());

  const prompt = `You are an expert at reading, understanding, and distilling information. Analyze the following text and produce a structured summary in Markdown format.

Use EXACTLY this structure (do not deviate or add extra sections):

## 📋 Summary
Write a clear, concise paragraph (3-5 sentences) capturing the core message and most important ideas.

## 🔑 Key Points
- List 5-8 of the most important facts, arguments, or takeaways as bullet points
- Each bullet should be one clear, standalone sentence
- Focus on actionable or memorable information

## 💡 Key Insights
- List 3-5 deeper insights, patterns, or implications that go beyond the surface content
- These should be thoughtful observations, not just restatements of facts

## ❓ Questions to Explore
- List 2-3 questions this content raises that are worth further investigation

---

**Text to analyze:**
${text}`;

  try {
    const result = await geminiFlash.generateContentStream(prompt);
    let fullResponse = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullResponse += chunkText;
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    const userId = req.user?.id;
    if (userId) {
      await db.aIHistory.create({
        data: {
          userId,
          toolId: AIToolType.NOTE_SUMMARIZER,
          prompt: text.substring(0, 100) + "...",
          response: fullResponse,
          tokensUsed: 0
        }
      });
    }

    res.write("data: [DONE]\n\n");
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "Summarization failed" })}\n\n`);
  } finally {
    res.end();
  }
});

// Q&A endpoint for uploaded documents (RAG)
router.post("/ask", requireAuth, checkQuota, async (req: QuotaRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { fileId, question } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  if (!fileId || !question || typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ success: false, message: "fileId and question are required" });
    return;
  }

  try {
    const file = await db.uploadedFile.findFirst({
      where: { id: fileId, userId }
    });

    if (!file) {
      res.status(404).json({ success: false, message: "Document not found or access denied." });
      return;
    }

    // 1. Generate embedding for user's question
    const embedResult = await geminiEmbedding.embedContent(question);
    const embedding = embedResult.embedding.values;
    const embeddingString = `[${embedding.join(",")}]`;

    // 2. Query document embeddings using pgvector cosine distance (<=>)
    const chunks = await db.$queryRawUnsafe<any[]>(
      `SELECT content FROM document_embeddings 
       WHERE file_id = $1 
       ORDER BY embedding <=> $2::vector 
       LIMIT 4`,
      fileId,
      embeddingString
    );

    const contextText = chunks && chunks.length > 0
      ? chunks.map((c) => c.content).join("\n\n")
      : "No relevant document text chunks found.";

    // 3. Set SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    req.on("close", () => res.end());

    const systemPrompt = `You are a helpful senior AI assistant. You are answering questions about an uploaded document.
Use the following extracted context chunks from the document to answer the user's question. 
If the context does not contain the answer or is not relevant, answer the question using your general knowledge, but clearly state that the information was not found in the uploaded document.

**Extracted Document Context:**
${contextText}

**User Question:**
${question}

Provide your answer in Markdown format.`;

    const result = await geminiFlash.generateContentStream(systemPrompt);
    let fullResponse = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullResponse += chunkText;
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    // Save to AI History
    await db.aIHistory.create({
      data: {
        userId,
        toolId: AIToolType.NOTE_SUMMARIZER,
        prompt: `Q&A: ${question.substring(0, 100)}`,
        response: fullResponse,
        tokensUsed: 0
      }
    });

    res.write("data: [DONE]\n\n");
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "Failed to generate answer" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
