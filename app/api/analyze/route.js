import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import Anthropic from "@anthropic-ai/sdk";

const ANA_SYS = `You are a senior U.S. CRE regulatory analyst. Given a property, use web search to produce a comprehensive rent regulation analysis.

Return ONLY valid JSON. No markdown, no backticks, no preamble.

Schema:
{
  "buildingCharacteristics":{"yearBuilt":null,"estimatedAge":null,"source":"","confidence":"High|Moderate|Low|Not Available","notes":""},
  "investmentSummary":["bullet1","bullet2","bullet3"],
  "regulatoryRiskLevel":"Low|Moderate|High|Elevated Uncertainty",
  "layers":[{"type":"","name":"","basis":"","status":"applies|potentially_applies|does_not_apply|pending|requires_verification"}],
  "rentControl":[{"jurisdiction":"","layerType":"","statusLabel":"","badge":"Applies|Does Not Apply|Potentially Applies|Pending|Requires Verification","ruleDateBasis":"","formula":"","summary":"","applicability":"","investmentImplications":"","certainty":"","ageThreshold":"","sources":[{"title":"","url":"","type":"Official|Legal/Policy|Secondary","note":""}]}],
  "governingStructure":{"statePreemptionStatus":"preempts_local|allows_local|partial_preemption|unclear","localRegulationAuthority":"","localRuleStrength":"","boroughAuthority":"","overlappingRegime":"","assetLevelDependency":"high|moderate|low","primaryRule":"","overlayRules":"","structuralInterpretation":"","boroughInterpretation":"","applicabilityRiskNote":""},
  "finalApplicability":{"classification":"","primaryGoverningRule":"","overlayRules":"","reasoning":"","ageInterpretation":"","confidenceLevel":"","riskFlags":[],"underwritingRentGrowthFormula":"single-line math expression for rent growth constraint in acquisition underwriting","investmentImplications":"3-5 sentences for underwriting teams"},
  "legislation":[{"jurisdiction":"","layerType":"","title":"","status":"","date":"","summary":"","forwardLooking":"","whyItMatters":"","sources":[{"title":"","url":"","type":"","note":""}]}]
}

Rules:
- Always include State layer plus County/City/Borough as relevant
- investmentSummary: 3-5 concise bullets for executive scanning
- underwritingRentGrowthFormula: clear single-line math expression or constraint
- Each rentControl entry must include investmentImplications
- Use REAL URLs from web search
- Research year built from public records
- Institutional CRE tone
- Label sources Official, Legal/Policy, or Secondary`;

export async function POST(request) {
  const { property } = await request.json();
  if (!property) {
    return Response.json({ error: "Property data is required" }, { status: 400 });
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = "Analyze rent control for: Address: " + property.normalized + " | ZIP: " + property.zip + " | State: " + property.state + " | County: " + property.county + " | City: " + property.city + " | Borough: " + (property.borough !== "N/A" ? property.borough : "N/A") + " | Coords: " + property.lat + ", " + property.lng + "\n\nResearch: (1) year built, (2) current rent control at each layer, (3) governing structure, (4) age-based applicability, (5) pending legislation past 12mo, (6) synthesize final applicability with underwriting rent growth formula and investment implications.\nReturn ONLY JSON.";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system: ANA_SYS,
        messages: [{ role: "user", content: msg }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 15 }],
      });
      const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").replace(/<cite[^>]*>/g, "").replace(/<\/cite>/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (!match) {
        return Response.json({ error: "No valid JSON in API response" }, { status: 500 });
      }
      const parsed = JSON.parse(match[0]);
      if (!parsed.rentControl || !parsed.finalApplicability) {
        return Response.json({ error: "Incomplete analysis structure" }, { status: 500 });
      }
      return Response.json(parsed);
    } catch (err) {
      if (err.status === 429 && attempt < 2) {
        await new Promise(res => setTimeout(res, 20000));
        continue;
      }
      if (attempt < 2 && !err.status) {
        await new Promise(res => setTimeout(res, 10000));
        continue;
      }
      console.error("Analysis error:", err);
      return Response.json({ error: "Analysis failed: " + err.message }, { status: 500 });
    }
  }
}
