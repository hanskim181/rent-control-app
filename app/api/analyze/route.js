import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import sampleCache from "@/data/sample-cache.json";

const isDev = process.env.NODE_ENV === "development";
const CACHE_PATH = resolve(process.cwd(), "data/sample-cache.json");

function readCache() {
  if (isDev) {
    try { return JSON.parse(readFileSync(CACHE_PATH, "utf-8")); } catch {}
  }
  return sampleCache;
}
function writeCache(cache) {
  if (isDev) {
    try { writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2)); } catch {}
  }
}
function cacheKey(addr) {
  return addr.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    const match = envFile.match(/ANTHROPIC_API_KEY=(.+)/);
    return match ? match[1].trim() : undefined;
  } catch { return undefined; }
}

const ANA_SYS = `You are a senior U.S. CRE regulatory analyst. Given a property, use web search to produce a comprehensive rent regulation analysis.

The following are verified regulatory facts by jurisdiction. Always use these as your authoritative baseline. If web search results conflict with these facts, prioritize the facts below.

## New York State
- Good Cause Eviction Law: enacted April 20, 2024 (Real Property Law Article 6-A)
- Applies mandatorily in NYC; other localities may opt in
- Covers market-rate units in buildings with Certificate of Occupancy issued before January 1, 2009
- Exempt: landlords owning 10 or fewer units statewide ("small landlords"), owner-occupied buildings with 10 or fewer units, units renting above 245% of Fair Market Rent (e.g., ~$6,004/month for a 1BR in NYC as of 2024), rent-regulated units, co-ops/condos
- Rent increase cap: lower of (CPI + 5%) or 10% — referred to as the "local rent standard"
- Expires June 15, 2034

## New York City
- Rent Stabilization: Emergency Tenant Protection Act (ETPA, 1974), applies to buildings with 6+ units built before January 1, 1974
- CRITICAL: Buildings receiving J-51 or 421-a tax benefits may be subject to rent stabilization regardless of construction date or luxury status. A building converted to luxury residential use can still be stabilized if it received these tax benefits. Always flag this for verification.
- RGB 2024-25 (leases Oct 2024 - Sep 2025): 1-year 2.75%, 2-year 5.25%
- RGB 2025-26 (leases Oct 2025 - Sep 2026): 1-year 3.0%, 2-year 4.5%
- HSTPA 2019 (Housing Stability and Tenant Protection Act): eliminated luxury decontrol and high-rent vacancy decontrol. All stabilized units remain stabilized permanently regardless of rent level.
- Traditional Rent Control: applies only to buildings built before February 1, 1947, with tenants in continuous occupancy since before July 1, 1971. Approximately 16,000 units remain.

## California
- Costa-Hawkins Rental Housing Act (1995): buildings with Certificate of Occupancy issued after February 1, 1995 are exempt from local rent control ordinances
- AB 1482 Tenant Protection Act (2019): applies to buildings 15+ years old, calculated as a ROLLING window (recalculated each year based on current date minus 15 years — NOT a fixed construction date cutoff)
- AB 1482 formula: 5% + regional CPI, capped at 10% maximum annually
- AB 1482 exemptions: single-family homes (unless owned by corporation/REIT), buildings less than 15 years old, deed-restricted affordable housing
- Proposition 33 (Costa-Hawkins repeal ballot measure): failed November 2024, approximately 62% voted against

## Beverly Hills
- Rent Stabilization Ordinance (RSO): applies only to buildings built before February 1, 1995
- Post-1995 buildings: no local rent control; only state AB 1482 applies after the 15-year rolling threshold

## Texas
- State preemption: Texas Government Code Chapter 2143, enacted 1993
- Declares all municipal and county rent control ordinances "void"
- Only exception: declared disaster emergency with governor approval (has never been invoked, including during Hurricane Harvey 2017 and COVID-19)
- No age thresholds — preemption applies to all residential rental housing

## Illinois
- Rent Control Preemption Act: 50 ILCS 825, enacted 1997
- Complete prohibition on local rent control ordinances statewide
- Chicago: Residential Landlord and Tenant Ordinance (RLTO) provides notice requirements and tenant procedural protections only — no rent caps permitted

## Florida
- Florida Statute 125.0103: comprehensive rent control ban
- Only exception: declared housing emergency requiring voter approval, lasting maximum 1 year
- Miami-Dade County: formerly had 60-day notice for increases >5%, but this was preempted by HB 1417 (F.S. 83.425) effective July 1, 2023. State law now governs all notice requirements (30-day notice for month-to-month termination under F.S. 83.57).
- HB 1417 (enacted July 1, 2023): preempts local tenant protection ordinances statewide, eliminating ordinances across 35 cities and counties
- NOTE: Miami Beach had a grandfathered rent control program for pre-1967 buildings, but this program was phased out decades ago and is no longer in effect. Do NOT reference active Miami Beach rent control in reports.

## Massachusetts
- Chapter 40P: statewide rent control prohibition, enacted via ballot initiative (Question 9) in 1994
- 2026 Ballot Initiative (Petition No. 25-21, "An Initiative Petition to Protect Tenants by Limiting Rent Increases"): pending for November 2026 ballot, NOT yet confirmed on ballot — still requires legislative review and additional signatures
- Proposed cap: annual increases limited to CPI or 5%, whichever is LOWER
- Proposed base rent date: January 31, 2026 (rent in place on that date becomes the baseline for all future increases)
- Proposed exemptions: owner-occupied buildings with 4 or fewer units, new construction for first 10 years from certificate of occupancy, public housing, nonprofits, short-term rentals (<14 days)
- NO vacancy decontrol under the proposed measure — rent caps apply even between tenants
- Polling: Suffolk/Boston Globe poll shows 62.6% support; UNH poll shows 56% support (late 2025). Use range of 56-63% when citing polling data.

## Georgia
- O.C.G.A. 44-7-19: state preemption prohibiting any county or municipal rent control ordinances
- HB 938 (enacted 2024): temporary 10% rent increase cap for tenants aged 62+ whose primary income is Social Security or disability benefits — expires December 31, 2026
- HB 404 Safe at Home Act (effective July 1, 2024): establishes habitability requirements and caps security deposits at 2 months rent
- 60-day notice required for rent increases

## Washington State
- HB 1217 (enacted May 7, 2025): first statewide rent stabilization law
- Cap: 7% + CPI, or 10%, whichever is LESS
- 12-year new construction exemption from first certificate of occupancy
- No rent increases permitted during first 12 months of any tenancy
- 90-day advance written notice required statewide for any rent increase
- 15-year sunset clause on the rent cap provisions
- Seattle (additional local requirements): 180-day advance written notice for any housing cost increase (since November 2021). EDRA (Economic Displacement Relocation Assistance): if increase is 10%+ in 12 months, landlord must provide EDRA notice and may owe up to 3 months' relocation assistance to qualifying tenants.

## Underwriting Scenarios
Based on your regulatory analysis, generate an "underwritingScenarios" object with rent growth scenarios for a 5-year hold period.

SCENARIO GENERATION RULES:
If the property has material pending regulatory risk (pending legislation, upcoming exemption expiration, unverified regulatory status, or binary regulatory outcomes), generate three scenarios:
  - baseCase: The most likely regulatory outcome given current information.
  - downside: The most restrictive plausible regulatory outcome.
  - upside: The most favorable plausible regulatory outcome.
If the property has NO material pending regulatory risk (clear state preemption with no pending repeal legislation, no exemption transitions within the hold period), generate only one scenario:
  - baseCase only. Set scenarioType to "single" and omit downside/upside.

GROWTH RATE RULES:
- annualRentGrowth must be a single number (percentage), NOT a range
- For rent-stabilized: base case must not exceed applicable RGB or formula-based cap
- For Good Cause Eviction: reflect the local rent standard formula (CPI + 5%, max 10%)
- For state-preempted / unregulated: use 3-5% based on local market fundamentals
- For pending rent control: downside must use the specific proposed cap

CUMULATIVE IMPACT CALCULATION:
- fiveYearCumulativeImpact = ((sum of scenario rents over 5 years) - (sum of base case rents over 5 years)) / (sum of base case rents over 5 years) * 100
- Express as percentage string with sign (e.g., "-18.2%" or "+15.8%")
- Assume $1,000 starting monthly rent; the percentage result is scale-independent

RECOMMENDATION RULES:
- "GO": No regulatory constraints that materially limit rent growth, AND no pending legislation with realistic probability of passage
- "CONDITIONAL": Regulatory status requires verification, OR pending legislation creates >15% variance between downside and upside, OR exemption expires within the hold period
- "NO-GO": Current regulations cap rent growth below inflation with no plausible path to higher returns

keyCondition: State the single most critical factor that determines whether this investment meets return targets. Be specific and actionable.

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
  "legislation":[{"jurisdiction":"","layerType":"","title":"","status":"","date":"","summary":"","forwardLooking":"","whyItMatters":"","sources":[{"title":"","url":"","type":"","note":""}]}],
  "underwritingScenarios":{"scenarioType":"single|three","holdPeriodYears":5,"baseCase":{"annualRentGrowth":0,"basis":"","regulatoryAssumption":""},"downside":{"annualRentGrowth":0,"basis":"","trigger":"","fiveYearCumulativeImpact":"","probability":""},"upside":{"annualRentGrowth":0,"basis":"","trigger":"","fiveYearCumulativeImpact":"","probability":""},"recommendation":"GO|NO-GO|CONDITIONAL","keyCondition":""}
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
  const key = cacheKey(property.normalized || "");
  const cache = readCache();
  if (cache.analyze[key]) {
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500));
    return Response.json({ ...cache.analyze[key], _cached: true });
  }
  const client = new Anthropic({ apiKey: getApiKey() });
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
      if (parsed.underwritingScenarios) {
        const uw = parsed.underwritingScenarios;
        const calcImpact = (baseRate, altRate) => {
          let sumBase = 0, sumAlt = 0;
          for (let yr = 1; yr <= 5; yr++) {
            sumBase += 1000 * Math.pow(1 + baseRate / 100, yr);
            sumAlt += 1000 * Math.pow(1 + altRate / 100, yr);
          }
          const pct = ((sumAlt - sumBase) / sumBase * 100).toFixed(1);
          return (pct >= 0 ? "+" : "") + pct + "%";
        };
        if (uw.baseCase && uw.downside) {
          uw.downside.fiveYearCumulativeImpact = calcImpact(uw.baseCase.annualRentGrowth, uw.downside.annualRentGrowth);
        }
        if (uw.baseCase && uw.upside) {
          uw.upside.fiveYearCumulativeImpact = calcImpact(uw.baseCase.annualRentGrowth, uw.upside.annualRentGrowth);
        }
      }
      const freshCache = readCache();
      freshCache.analyze[key] = parsed;
      writeCache(freshCache);
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
