import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));
app.use(morgan("dev"));

// Rate limiter: limit each IP to 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

import authRouter from "./controllers/auth.js";
import dashboardRouter from "./controllers/dashboard.js";
import chatbotRouter from "./routes/ai/chatbot.js";
import codeReviewRouter from "./routes/ai/code-review.js";
import contentGenRouter from "./routes/ai/content-gen.js";
import noteSummarizeRouter from "./routes/ai/note-summarize.js";
import uploadRouter from "./routes/ai/upload.js";
import imageGenRouter from "./routes/ai/image-gen.js";
import resumeRouter from "./routes/ai/resume.js";

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

// Auth Routes
app.use("/api/v1/auth", authRouter);

// Dashboard Routes
app.use("/api/v1/dashboard", dashboardRouter);

// AI Tool Routes
app.use("/api/v1/ai/chatbot", chatbotRouter);
app.use("/api/v1/ai/code-review", codeReviewRouter);
app.use("/api/v1/ai/content-gen", contentGenRouter);
app.use("/api/v1/ai/note-summarize/upload", uploadRouter);
app.use("/api/v1/ai/note-summarize", noteSummarizeRouter);
app.use("/api/v1/ai/image-gen", imageGenRouter);
app.use("/api/v1/ai/resume/upload", uploadRouter);
app.use("/api/v1/ai/resume", resumeRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Express Error Handler caught:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error occurred."
  });
});

// Start listening if not running in a test mode
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Express server running on http://localhost:${PORT}`);
  });
}

export default app;
