import { Router, Response } from "express";
import { geminiFlash } from "../../lib/gemini.js";
import { requireAuth, AuthenticatedRequest } from "../../middlewares/auth.js";
import { checkQuota, QuotaRequest } from "../../middlewares/quota.js";
import { db } from "../../lib/db.js";
import { AIToolType } from "@nexusai/shared";

const router = Router();

// 1. Get user's chat sessions from the past 10 days
router.get("/sessions", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const sessions = await db.chatSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: tenDaysAgo
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to retrieve chat sessions" });
  }
});

// 2. Get all messages inside a specific chat session
router.get("/sessions/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const sessionId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const session = await db.chatSession.findFirst({
      where: {
        id: sessionId,
        userId
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Chat session not found" });
      return;
    }

    res.status(200).json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to load chat history" });
  }
});

// 3. Delete a specific chat session
router.delete("/sessions/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const sessionId = req.params.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const session = await db.chatSession.findFirst({
      where: {
        id: sessionId,
        userId
      }
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Chat session not found" });
      return;
    }

    await db.chatSession.delete({
      where: {
        id: sessionId
      }
    });

    res.status(200).json({ success: true, message: "Chat session deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to delete chat session" });
  }
});

// 4. Send a message & stream responses (supports starting new session or continuing existing)
router.post("/", requireAuth, checkQuota, async (req: QuotaRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { messages, sessionId: bodySessionId } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ success: false, message: "messages array is required" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Abort on client disconnect
  req.on("close", () => res.end());

  try {
    let activeSessionId = bodySessionId;
    let history: any[] = [];
    const lastMessage = messages[messages.length - 1]?.content ?? "";

    if (activeSessionId) {
      // Continuing an existing thread - verify owner
      const session = await db.chatSession.findFirst({
        where: { id: activeSessionId, userId }
      });

      if (!session) {
        throw new Error("Chat session not found or access denied.");
      }

      // Query database message history
      const dbMessages = await db.chatMessage.findMany({
        where: { sessionId: activeSessionId },
        orderBy: { createdAt: "asc" }
      });

      history = dbMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    } else {
      // Start a new thread
      const title = lastMessage.length > 35 ? lastMessage.substring(0, 35) + "..." : lastMessage;
      const session = await db.chatSession.create({
        data: {
          userId,
          title
        }
      });
      activeSessionId = session.id;
    }

    // Save user's prompt message to database
    await db.chatMessage.create({
      data: {
        sessionId: activeSessionId,
        role: "user",
        content: lastMessage
      }
    });

    const chat = geminiFlash.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage);
    let fullResponse = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Save assistant's response to database
    await db.chatMessage.create({
      data: {
        sessionId: activeSessionId,
        role: "assistant",
        content: fullResponse
      }
    });

    // Update session timestamp
    await db.chatSession.update({
      where: { id: activeSessionId },
      data: { updatedAt: new Date() }
    });

    // Create overall tool history log
    await db.aIHistory.create({
      data: {
        userId,
        toolId: AIToolType.CHATBOT,
        prompt: lastMessage,
        response: fullResponse,
        tokensUsed: 0
      }
    });

    // Send final metadata chunk containing the active session ID
    res.write(`data: ${JSON.stringify({ sessionId: activeSessionId, done: true })}\n\n`);
    res.write("data: [DONE]\n\n");
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "AI generation failed" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
