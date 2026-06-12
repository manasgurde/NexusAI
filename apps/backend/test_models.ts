import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import * as path from "path";

// Load backend .env variables
dotenv.config({ path: path.join(__dirname, "./.env") });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is not set in .env!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName: string, apiVersion?: string) {
  console.log(`Testing model: ${modelName} (version: ${apiVersion || 'default'})...`);
  try {
    const model = genAI.getGenerativeModel(
      { model: modelName },
      apiVersion ? { apiVersion } : undefined
    );
    const result = await model.generateContent("Say hello!");
    const text = result.response.text();
    console.log(`✅ Success for ${modelName}: "${text.trim()}"`);
    return true;
  } catch (err: any) {
    console.error(`❌ Failed for ${modelName}: ${err.message || err}`);
    return false;
  }
}

async function run() {
  const modelsToTest = [
    { name: "gemini-1.5-flash", version: "v1" },
    { name: "gemini-1.5-pro", version: "v1" },
    { name: "gemini-1.5-flash", version: "v1beta" },
    { name: "gemini-1.5-pro", version: "v1beta" },
    { name: "gemini-2.5-flash", version: "v1beta" },
    { name: "gemini-2.5-flash", version: "v1" },
    { name: "gemini-2.5-pro", version: "v1beta" },
    { name: "gemini-2.5-pro", version: "v1" }
  ];

  for (const item of modelsToTest) {
    await testModel(item.name, item.version);
    console.log("---------------------------------------");
  }
}

run();
