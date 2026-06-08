import * as dotenv from "dotenv";
import * as path from "path";

// Load backend .env variables
dotenv.config({ path: path.join(__dirname, "./.env") });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is not set in .env!");
  process.exit(1);
}

console.log(`Using API key: ${apiKey.substring(0, 8)}...`);

async function testEndpoint(apiVersion: string) {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${apiKey}`;
  console.log(`\nFetching from: https://generativelanguage.googleapis.com/${apiVersion}/models`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Success (${apiVersion}): Found ${data.models?.length || 0} models.`);
      const supported = data.models
        ?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        ?.map((m: any) => m.name);
      console.log("Supported generateContent models:");
      supported?.forEach((name: string) => console.log(` - ${name}`));
    } else {
      console.error(`❌ Error (${apiVersion}): Status ${res.status}`, data);
    }
  } catch (err: any) {
    console.error(`❌ Error (${apiVersion}):`, err.message || err);
  }
}

async function run() {
  await testEndpoint("v1");
  await testEndpoint("v1beta");
}

run();
