import { Router, Response } from "express";
import multer from "multer";
import mammoth from "mammoth";
import { geminiFlash } from "../../lib/gemini.js";
import pdfParse from "pdf-parse";
import { requireAuth, AuthenticatedRequest } from "../../middlewares/auth.js";
import { db } from "../../lib/db.js";

const router = Router();

// Configure multer to store files in memory (50MB maximum file size, checked dynamically below)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.post("/", requireAuth, upload.single("file"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: "No file was uploaded" });
      return;
    }

    // Retrieve active subscription to check dynamic file limit
    const sub = await db.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
    });

    const plan = sub?.plan || "FREE";

    // Enforce file size limit based on plan
    const LIMITS: Record<string, number> = {
      FREE: 2 * 1024 * 1024,      // 2MB for Free plan
      PRO_299: 10 * 1024 * 1024,  // 10MB for Starter Pro
      PRO_599: 25 * 1024 * 1024,  // 25MB for Growth Pro
      PRO_999: 50 * 1024 * 1024,  // 50MB for Elite Pro
    };

    const limitBytes = LIMITS[plan] || LIMITS.FREE;

    if (file.size > limitBytes) {
      const limitMB = limitBytes / (1024 * 1024);
      res.status(403).json({
        success: false,
        message: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the upload limit of ${limitMB}MB for your current plan. Please upgrade to a higher plan to upload larger files.`,
      });
      return;
    }

    let extractedText = "";

    const mimeType = file.mimetype;
    console.log(`Received file for text extraction from user ${userId} (${plan}): ${file.originalname} (${mimeType}), size: ${file.size} bytes`);

    if (mimeType === "application/pdf") {
      const pdfData = await (pdfParse as any)(file.buffer);
      extractedText = pdfData.text;
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.originalname.endsWith(".docx")
    ) {
      const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = docxResult.value;
    } else if (mimeType.startsWith("image/")) {
      const base64Data = file.buffer.toString("base64");
      
      const prompt = "Extract and transcribe all readable text from this image. Do not add any introduction, explanations, markdown wrappers, or metadata — just output the transcribed text exactly as it appears. If there is no readable text, output an empty response.";
      
      const result = await geminiFlash.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ]);
      
      extractedText = result.response.text();
    } else {
      res.status(400).json({
        success: false,
        message: `Unsupported file type: ${mimeType}. Only PDFs, Word documents (.docx), and images are supported.`,
      });
      return;
    }

    const cleanText = extractedText.trim();

    if (!cleanText) {
      res.status(422).json({
        success: false,
        message: "Could not extract any readable text from the file.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      text: cleanText,
    });
  } catch (error: any) {
    console.error("Error during file text extraction:", error);
    res.status(500).json({
      success: false,
      message: `Failed to extract text from file: ${error.message || error}`,
    });
  }
});

export default router;
