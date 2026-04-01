import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Anthropic from "@anthropic-ai/sdk";

const GEO_SYS =
  'You are a US address normalization engine. Return ONLY valid JSON: {"normalized":"full address","zip":"5-digit ZIP","state":"state name","county":"county","city":"city","borough":"borough or N/A","municipality":"municipality or N/A","lat":"lat 4dec","lng":"lon 4dec","valid":true/false,"errorMessage":"if invalid"}';

export async function POST(request) {
  console.log("API KEY exists:", !!process.env.ANTHROPIC_API_KEY);
  console.log("API KEY value:", process.env.ANTHROPIC_API_KEY?.substring(0, 15) + "...");
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { address } = await request.json();
    if (!address || !address.trim()) {
      return Response.json({ error: "Address is required" }, { status: 400 });
    }
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: GEO_SYS,
      messages: [{ role: "user", content: `Normalize: "${address}"` }],
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ error: "Failed to parse address" }, { status: 500 });
    }
    const result = JSON.parse(match[0]);
    if (!result.valid) {
      return Response.json({ error: result.errorMessage || "Invalid address" }, { status: 400 });
    }
    return Response.json(result);
  } catch (err) {
    console.error("Geocode error:", err);
    return Response.json({ error: "Failed to process address: " + err.message }, { status: 500 });
  }
}
