import { Router, Response } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { checkQuota, QuotaRequest } from "../../middlewares/quota.js";
import { db } from "../../lib/db.js";
import { AIToolType } from "@nexusai/shared";

const router = Router();

router.post("/", requireAuth, checkQuota, async (req: QuotaRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { prompt, stylePreset, aspectRatio } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    res.status(400).json({ success: false, message: "prompt is required" });
    return;
  }

  try {
    // 1. Resolve style preset modifier
    let styledPrompt = prompt.trim();
    const style = stylePreset || "none";
    
    const styleModifiers: Record<string, string> = {
      photorealistic: ", photorealistic, extremely detailed, 8k resolution, professional photography, raw photo, realistic lighting",
      anime: ", anime style, vibrant illustration, colorful, hand-drawn, aesthetic anime style, highly detailed",
      cyberpunk: ", cyberpunk style, glowing neon lights, futuristic city landscape, highly detailed digital art, synthwave aesthetic",
      "digital-art": ", beautiful digital art, concept art, trending on artstation, fantasy illustration, cinematic composition",
      "oil-painting": ", oil painting style, visible textured brush strokes, classical art, masterpiece, realistic painting",
      cinematic: ", cinematic key visual, highly dramatic lighting, atmospheric depth, photorealistic movie still, 35mm lens",
    };

    if (styleModifiers[style]) {
      styledPrompt += styleModifiers[style];
    }

    // 2. Resolve aspect ratio to width and height
    const ratio = aspectRatio || "1:1";
    let width = 1024;
    let height = 1024;

    const ratioDimensions: Record<string, { w: number; h: number }> = {
      "1:1": { w: 1024, h: 1024 },
      "16:9": { w: 1024, h: 576 },
      "9:16": { w: 576, h: 1024 },
      "4:3": { w: 1024, h: 768 },
      "3:4": { w: 768, h: 1024 },
    };

    if (ratioDimensions[ratio]) {
      width = ratioDimensions[ratio].w;
      height = ratioDimensions[ratio].h;
    }

    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(styledPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

    console.log(`Generating image for user ${userId}: "${styledPrompt}" with size ${width}x${height}`);

    // 3. Fetch image buffer from Pollinations.ai
    const response = await fetch(pollinationsUrl);
    
    if (!response.ok) {
      throw new Error(`Image generator API returned status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:image/webp;base64,${buffer.toString("base64")}`;

    // 4. Save to AI history log
    await db.aIHistory.create({
      data: {
        userId,
        toolId: AIToolType.IMAGE_GEN,
        prompt: prompt,
        response: base64Image,
        tokensUsed: 0
      }
    });

    res.status(200).json({
      success: true,
      image: base64Image,
      prompt: prompt,
      style: style,
      ratio: ratio,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate image.",
    });
  }
});

export default router;
