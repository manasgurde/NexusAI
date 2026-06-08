import { Router, Response } from "express";
import { geminiFlash } from "../../lib/gemini.js";
import { requireAuth } from "../../middlewares/auth.js";
import { checkQuota, QuotaRequest } from "../../middlewares/quota.js";
import { db } from "../../lib/db.js";
import { AIToolType } from "@nexusai/shared";

const router = Router();

router.post("/analyze", requireAuth, checkQuota, async (req: QuotaRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { resumeText, jobDescription } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 50) {
    res.status(400).json({ success: false, message: "resumeText must be at least 50 characters long" });
    return;
  }

  try {
    const hasJobDescription = jobDescription && typeof jobDescription === "string" && jobDescription.trim().length > 0;
    
    // 1. Construct analysis prompt
    const prompt = `You are an expert ATS (Applicant Tracking System) optimizer and professional recruiter. Analyze the following resume text${
      hasJobDescription ? " and match it against the provided Job Description." : "."
    }

Provide a comprehensive, objective assessment. You must return EXACTLY a JSON object matching the following structure:
{
  "score": number (Overall ATS score from 0 to 100 based on standard formatting, structure, and readability),
  "matchScore": number or null (Job compatibility score from 0 to 100 if a Job Description is provided, else null),
  "strengths": string[] (List of 3-5 key strengths or strong aspects of the resume),
  "improvements": string[] (List of 3-5 specific areas for improvement or formatting fixes),
  "keywordsFound": string[] (List of keywords/skills successfully identified in the resume),
  "keywordsMissing": string[] (List of important keywords/skills ${
    hasJobDescription ? "found in the Job Description but missing in the resume" : "that are standard for this industry but missing in the resume"
  }),
  "recommendations": string[] (List of 3-5 actionable recommendations to optimize the resume for ATS and landing interviews)
}

**Resume Text:**
${resumeText}

${hasJobDescription ? `**Job Description:**\n${jobDescription}` : ""}

Return ONLY the raw JSON object. Do not wrap it in markdown code blocks or add any other text outside the JSON.`;

    console.log(`Analyzing resume for user ${userId} (JD provided: ${hasJobDescription})`);

    // 2. Fetch analysis from Gemini using JSON Mode
    const model = geminiFlash;
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.response.text();
    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("Gemini JSON parse failed, raw output:", responseText);
      throw new Error("Failed to parse analysis results from Gemini API.");
    }

    // 3. Save to AI history
    await db.aIHistory.create({
      data: {
        userId,
        toolId: AIToolType.RESUME_ANALYZER,
        prompt: `Resume Analysis (Length: ${resumeText.length} chars)`,
        response: JSON.stringify(analysisResult),
        tokensUsed: 0
      }
    });

    res.status(200).json({
      success: true,
      data: analysisResult,
    });
  } catch (error: any) {
    console.error("Resume analysis error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze resume.",
    });
  }
});

export default router;
