"use client";
import { useState, useRef, useCallback, useEffect } from "react";

const bC = (b) => {
  const m = {
    Applies: { bg: "#dc262612", text: "#b91c1c", border: "#dc262625" },
    "Potentially Applies": { bg: "#f59e0b12", text: "#92400e", border: "#f59e0b25" },
    "Does Not Apply": { bg: "#10b98112", text: "#047857", border: "#10b98125" },
    "Does Not Apply Separately": { bg: "#6b728012", text: "#4b5563", border: "#6b728025" },
    Pending: { bg: "#8b5cf612", text: "#6d28d9", border: "#8b5cf625" },
    "Requires Verification": { bg: "#f59e0b12", text: "#92400e", border: "#f59e0b25" },
    High: { bg: "#10b98112", text: "#047857", border: "#10b98125" },
    Moderate: { bg: "#f59e0b12", text: "#92400e", border: "#f59e0b25" },
    Low: { bg: "#dc262612", text: "#b91c1c", border: "#dc262625" },
    "Not Available": { bg: "#6b728012", text: "#4b5563", border: "#6b728025" },
  };
  return m[b] || { bg: "#6b728012", text: "#4b5563", border: "#6b728025" };
};
const sC = (s) => {
  const m = { Effective: "#047857", Passed: "#047857", Proposed: "#92400e", Pending: "#6d28d9", "Under Consideration": "#92400e", Introduced: "#2563eb", "In Litigation": "#b91c1c", Monitoring: "#64748b", "Pending State Approval": "#6d28d9", Rejected: "#b91c1c", "None Identified": "#64748b" };
  return m[s] || "#64748b";
};
const rS = (r) => {
  if (!r) return { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" };
  const l = r.toLowerCase();
  if (l === "low") return { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" };
  if (l === "moderate") return { bg: "#fffbeb", text: "#92400e", border: "#fde68a" };
  if (l === "high") return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
  return { bg: "#faf5ff", text: "#6b21a8", border: "#e9d5ff" };
};
const cS = (c) => {
  if (!c) return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
  const l = c.toLowerCase();
  if (l.includes("likely subject")) return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
  if (l.includes("statewide rent cap")) return { bg: "#fffbeb", text: "#92400e", border: "#fde68a" };
  if (l.includes("likely exempt")) return { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" };
  if (l.includes("conditionally")) return { bg: "#fffbeb", text: "#92400e", border: "#fde68a" };
  return { bg: "#faf5ff", text: "#6b21a8", border: "#e9d5ff" };
};
const GL = { preempts_local: "State Preempts Local", allows_local: "State Allows Local", partial_preemption: "Partial Preemption", unclear: "Unclear" };
const RL = { state_only: "State Only", state_plus_local_overlay: "State + Local Overlay", local_primary_with_state_floor: "Local Primary / State Floor", mixed_or_case_specific: "Mixed / Case-Specific", uncertain: "Uncertain" };
const DL = { high: "High", moderate: "Moderate", low: "Low" };

function Badge({ label }) {
  const c = bC(label);
  return <span style={{ background: c.bg, color: c.text, border: "1px solid " + c.border, padding: "2px 10px", borderRadius: 4, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>;
}
function StatusPill({ label }) {
  const c = sC(label);
  return <span style={{ background: c + "10", color: c, border: "1px solid " + c + "25", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{label}</span>;
}
function Sec({ children, icon }) {
  return (<div style={{ marginBottom: 8, marginTop: 32 }}><h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>{icon && <span style={{ fontSize: 14, opacity: 0.6 }}>{icon}</span>}{children}</h2><div style={{ height: 1.5, width: 48, background: "#334155", borderRadius: 1, marginTop: 6, opacity: 0.4 }} /></div>);
}
function Card({ children, style: sx }) {
  return <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "16px 20px", marginBottom: 10, ...sx }}>{children}</div>;
}
function FR({ label, children }) {
  return (<div style={{ marginBottom: 8 }}><div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div><div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.55 }}>{children}</div></div>);
}
function KV({ label, value }) {
  return (<div style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "baseline" }}><span style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", minWidth: 150, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span><span style={{ fontSize: 12.5, color: "#1e293b" }}>{value || "—"}</span></div>);
}
function SrcLink({ s }) {
  return (<div style={{ display: "flex", gap: 6, marginBottom: 5, fontSize: 12, lineHeight: 1.5 }}><span style={{ color: "#2563eb", flexShrink: 0 }}>↗</span><div><a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>{s.title}</a>{s.type && <span style={{ color: "#94a3b8", marginLeft: 5, fontSize: 10.5 }}>({s.type})</span>}{s.note && <div style={{ color: "#64748b", fontSize: 11, marginTop: 1 }}>{s.note}</div>}</div></div>);
}

async function geocode(raw) {
  const r = await fetch("/api/geocode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: raw }) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Geocode failed");
  return data;
}
async function analyze(prop) {
  const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ property: prop }) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Analysis failed");
  return data;
}

async function doExportReport(prop, data) {
  const fa = data.finalApplicability || {};
  const bc = data.buildingCharacteristics || {};
  const gs = data.governingStructure || {};
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  const CW = W - M * 2;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  let y = 0;

  const checkPage = (need) => { if (y + need > 260) { doc.addPage(); y = 20; } };
  const drawLine = (y1, color) => { doc.setDrawColor(...color); doc.setLineWidth(0.4); doc.line(M, y1, W - M, y1); };
  const sectionTitle = (num, title) => {
    checkPage(18);
    y += 10;
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
    doc.text(num + ".  " + title, M, y);
    y += 2; drawLine(y, [51, 65, 85]); y += 6;
  };
  const label = (lbl, val, indent) => {
    checkPage(10);
    const x = indent || M;
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
    doc.text(lbl.toUpperCase(), x, y);
    y += 3.5;
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(String(val || "—"), CW - (x - M));
    doc.text(lines, x, y); y += lines.length * 4 + 2;
  };
  const kvRow = (lbl, val) => {
    checkPage(8);
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
    doc.text(lbl.toUpperCase(), M + 2, y);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
    doc.text(String(val || "—"), M + 52, y);
    y += 5;
  };

  // === COVER HEADER ===
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 44, "F");
  doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("Multifamily Rent Control Intelligence", M, 18);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
  doc.text("Regulatory Screening Report", M, 26);
  doc.setFontSize(8); doc.text("Generated: " + dateStr, M, 33);
  doc.text("CONFIDENTIAL", W - M - doc.getTextWidth("CONFIDENTIAL"), 33);
  y = 54;

  // === 1. PROPERTY OVERVIEW ===
  sectionTitle("1", "Property Overview");
  const propRows = [
    ["Address", prop.normalized, "ZIP Code", prop.zip],
    ["State", prop.state, "County", prop.county],
    ["City", prop.city, "Borough", prop.borough !== "N/A" ? prop.borough : "N/A"],
    ["Year Built", bc.yearBuilt || "N/A", "Building Age", bc.estimatedAge ? bc.estimatedAge + " years" : "N/A"],
    ["Coordinates", prop.lat + ", " + prop.lng, "Data Confidence", bc.confidence || "N/A"],
  ];
  propRows.forEach(row => {
    checkPage(8);
    doc.setFillColor(248, 250, 252); doc.rect(M, y - 3.5, CW, 7, "F");
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
    doc.text(row[0].toUpperCase(), M + 2, y);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
    doc.text(String(row[1]), M + 35, y);
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
    doc.text(row[2].toUpperCase(), M + CW / 2 + 2, y);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
    doc.text(String(row[3]), M + CW / 2 + 35, y);
    y += 7;
  });

  // === 2. INVESTMENT SUMMARY ===
  sectionTitle("2", "Investment Summary");
  checkPage(12);
  doc.setFillColor(250, 251, 253); doc.roundedRect(M, y - 2, CW, 10, 2, 2, "F");
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52); doc.text("Regulatory Risk: " + (data.regulatoryRiskLevel || "—"), M + 4, y + 4);
  doc.setTextColor(71, 85, 105); doc.text("Classification: " + (fa.classification || "—"), M + 70, y + 4);
  y += 14;
  (data.investmentSummary || []).forEach(b => {
    checkPage(8);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(b, CW - 8);
    doc.text("•", M + 2, y); doc.text(lines, M + 7, y);
    y += lines.length * 4 + 2;
  });

  // === 3. FINAL APPLICABILITY ===
  sectionTitle("3", "Final Rent Control Applicability");
  kvRow("Classification", fa.classification);
  kvRow("Primary Rule", fa.primaryGoverningRule);
  kvRow("Overlay Rule(s)", fa.overlayRules || "None");
  kvRow("Confidence", fa.confidenceLevel);
  kvRow("Age Interpretation", fa.ageInterpretation);
  y += 2;
  checkPage(16);
  doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
  doc.roundedRect(M, y - 2, CW, 14, 2, 2, "FD");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
  doc.text("UNDERWRITING RENT GROWTH CONSTRAINT", M + 4, y + 3);
  doc.setFontSize(10); doc.setFont("courier", "bold"); doc.setTextColor(15, 23, 42);
  doc.text(String(fa.underwritingRentGrowthFormula || "—"), M + 4, y + 9);
  y += 18;
  label("Applicability Reasoning", fa.reasoning);
  label("Investment Implications", fa.investmentImplications);
  if (fa.riskFlags && fa.riskFlags.length > 0) {
    checkPage(10);
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(153, 27, 27);
    doc.text("RISK FLAGS", M, y); y += 4;
    fa.riskFlags.forEach(f => {
      checkPage(6);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(153, 27, 27);
      doc.text("!  " + f, M + 2, y); y += 5;
    });
    y += 2;
  }

  // === 4. GOVERNING STRUCTURE ===
  sectionTitle("4", "Governing Rent Regulation Structure");
  kvRow("Preemption Status", GL[gs.statePreemptionStatus] || gs.statePreemptionStatus);
  kvRow("Local Authority", gs.localRegulationAuthority);
  kvRow("Local Rule Strength", gs.localRuleStrength);
  kvRow("Regime Structure", RL[gs.overlappingRegime] || gs.overlappingRegime);
  kvRow("Asset Dependency", DL[gs.assetLevelDependency] || gs.assetLevelDependency);
  y += 2;
  label("Primary Rule", gs.primaryRule);
  label("Structural Interpretation", gs.structuralInterpretation);
  label("Applicability Risk", gs.applicabilityRiskNote);

  // === 5. RENT CONTROL BY JURISDICTION ===
  sectionTitle("5", "Rent Control by Jurisdiction");
  (data.rentControl || []).forEach(rc => {
    checkPage(30);
    doc.setFillColor(248, 250, 252); doc.roundedRect(M, y - 2, CW, 8, 1, 1, "F");
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
    doc.text(rc.jurisdiction, M + 3, y + 3);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    doc.text(rc.layerType + "  |  " + (rc.badge || ""), W - M - doc.getTextWidth(rc.layerType + "  |  " + (rc.badge || "")), y + 3);
    y += 10;
    kvRow("Status", rc.statusLabel);
    kvRow("Formula", rc.formula);
    kvRow("Certainty", rc.certainty);
    if (rc.ageThreshold) kvRow("Age Threshold", rc.ageThreshold);
    label("Summary", rc.summary, M + 2);
    label("Applicability", rc.applicability, M + 2);
    label("Investment Impact", rc.investmentImplications, M + 2);
    if (rc.sources && rc.sources.length > 0) {
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
      doc.text("SOURCES", M + 2, y); y += 4;
      rc.sources.forEach(s => {
        checkPage(6);
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(37, 99, 235);
        const srcLine = doc.splitTextToSize((s.title || "") + " (" + (s.type || "") + ") - " + (s.url || ""), CW - 6);
        doc.text(srcLine, M + 4, y); y += srcLine.length * 3.5 + 1;
      });
    }
    y += 4;
  });

  // === 6. LEGISLATION ===
  sectionTitle("6", "Pending Legislation & Regulatory Activity");
  (data.legislation || []).forEach(leg => {
    checkPage(24);
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
    doc.text(leg.title || "", M, y);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    y += 4;
    doc.text(leg.jurisdiction + "  |  " + (leg.status || "") + "  |  " + (leg.date || ""), M, y);
    y += 5;
    label("Summary", leg.summary, M + 2);
    label("Forward-Looking", leg.forwardLooking, M + 2);
    label("Investment Relevance", leg.whyItMatters, M + 2);
    if (leg.sources && leg.sources.length > 0) {
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
      doc.text("SOURCES", M + 2, y); y += 4;
      leg.sources.forEach(s => {
        checkPage(6);
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(37, 99, 235);
        const srcLine = doc.splitTextToSize((s.title || "") + " - " + (s.url || ""), CW - 6);
        doc.text(srcLine, M + 4, y); y += srcLine.length * 3.5 + 1;
      });
    }
    y += 4;
  });

  // === DISCLAIMER FOOTER ===
  checkPage(30);
  y += 6; drawLine(y, [148, 163, 184]); y += 6;
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(100, 116, 139);
  doc.text("DISCLAIMER", M, y); y += 4;
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
  const disc = doc.splitTextToSize("For screening purposes only. Not legal advice. AI-generated analysis may contain errors. Final applicability depends on asset-specific characteristics including certificate of occupancy date, unit count, ownership structure, tax benefit status, and renovation history. Confirm through qualified legal counsel before investment decisions.", CW);
  doc.text(disc, M, y);

  // === PAGE NUMBERS ===
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
    doc.text("Rent Control Intelligence  |  " + prop.normalized, M, 274);
    doc.text("Page " + i + " of " + pages, W - M - doc.getTextWidth("Page " + i + " of " + pages), 274);
  }

  doc.save("RentControl_" + prop.zip + "_" + new Date().toISOString().slice(0, 10) + ".pdf");
}

function doExportCSV(prop, data) {
  const fa = data.finalApplicability || {};
  const bc = data.buildingCharacteristics || {};
  const h = ["Property Address", "ZIP Code", "State", "County", "City", "Borough", "Year Built", "Building Age", "Primary Rule", "Overlay Rule", "Final Classification", "Formula Expression", "Summary", "Regulatory Risk Level", "UW Rent Growth Constraint", "Investment Implications", "Pending Regulation", "Risk Flags", "Source URLs"];
  const pending = (data.legislation || []).map(l => l.title + " [" + l.status + "]").join("; ");
  const urls = [...new Set((data.rentControl || []).flatMap(rc => (rc.sources || []).map(s => s.url)).concat((data.legislation || []).flatMap(l => (l.sources || []).map(s => s.url))))].join("; ");
  const row = [prop.normalized, prop.zip, prop.state, prop.county, prop.city, prop.borough !== "N/A" ? prop.borough : "", bc.yearBuilt || "", bc.estimatedAge || "", fa.primaryGoverningRule || "", fa.overlayRules || "None", fa.classification || "", (data.rentControl || []).map(r => r.formula).join(" | "), fa.reasoning || "", data.regulatoryRiskLevel || "", fa.underwritingRentGrowthFormula || "", fa.investmentImplications || "", pending, (fa.riskFlags || []).join("; "), urls];
  const esc = (v) => { const s = String(v != null ? v : ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = [h.map(esc).join(","), row.map(esc).join(",")].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "RentControl_" + prop.zip + "_" + new Date().toISOString().slice(0, 10) + ".csv"; a.click(); URL.revokeObjectURL(a.href);
}

function doCopy(prop, data) {
  const fa = data.finalApplicability || {};
  const bc = data.buildingCharacteristics || {};
  const txt = "RENT CONTROL SCREENING: " + prop.normalized + " (ZIP " + prop.zip + ")\nClassification: " + (fa.classification || "-") + "\nPrimary Rule: " + (fa.primaryGoverningRule || "-") + "\nOverlay: " + (fa.overlayRules || "None") + "\nUW Rent Growth: " + (fa.underwritingRentGrowthFormula || "-") + "\nRisk Level: " + (data.regulatoryRiskLevel || "-") + "\nYear Built: " + (bc.yearBuilt || "N/A") + " | Age: " + (bc.estimatedAge || "N/A") + "\nConfidence: " + (fa.confidenceLevel || "-") + "\nRisk Flags: " + ((fa.riskFlags || []).join("; ") || "None") + "\n" + (fa.reasoning || "");
  navigator.clipboard.writeText(txt).catch(() => {});
}

const STEPS = ["Normalizing address", "Mapping jurisdictions", "Researching building data", "Analyzing state regulations", "Searching local ordinances", "Evaluating governing structure", "Assessing age applicability", "Reviewing legislation", "Synthesizing implications"];

function Progress({ step, phase }) {
  const pct = phase === "geo" ? 12 : Math.min(98, 12 + (step + 1) * 10);
  return (<div style={{ textAlign: "center", paddingTop: 60 }}><div style={{ maxWidth: 440, margin: "0 auto" }}><div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, overflow: "hidden", marginBottom: 14 }}><div style={{ height: "100%", background: "#334155", borderRadius: 2, width: pct + "%", transition: "width 0.6s" }} /></div><p style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>{phase === "geo" ? "Normalizing address..." : (STEPS[Math.min(step, STEPS.length - 1)] || "Finalizing") + "..."}</p><p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>{phase === "geo" ? "Validating..." : "Live regulatory research — typically 30-90 seconds"}</p></div></div>);
}

function Results({ data, prop }) {
  const bc = data.buildingCharacteristics || {};
  const gs = data.governingStructure || {};
  const fa = data.finalApplicability || {};
  const cs = cS(fa.classification);
  const rs = rS(data.regulatoryRiskLevel);
  return (
    <div>
      <Sec icon="②">Investment Summary</Sec>
      <Card style={{ background: "#fafbfd" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ background: rs.bg, color: rs.text, border: "1px solid " + rs.border, padding: "3px 12px", borderRadius: 4, fontSize: 11.5, fontWeight: 600 }}>Regulatory Risk: {data.regulatoryRiskLevel || "—"}</span>
          <span style={{ background: cs.bg, color: cs.text, border: "1px solid " + cs.border, padding: "3px 12px", borderRadius: 4, fontSize: 11.5, fontWeight: 600 }}>{fa.classification || "—"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(data.investmentSummary || []).map((b, i) => (<div key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.55 }}><span style={{ color: "#334155", fontWeight: 700 }}>•</span><span>{b}</span></div>))}
        </div>
      </Card>

      <Sec icon="③">Final Rent Control Applicability</Sec>
      <Card style={{ borderLeft: "4px solid " + cs.text }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ background: cs.bg, color: cs.text, border: "1px solid " + cs.border, padding: "5px 14px", borderRadius: 4, fontSize: 14, fontWeight: 700 }}>{fa.classification || "—"}</span>
          <span style={{ fontSize: 11.5, color: "#64748b" }}>Confidence: <strong>{fa.confidenceLevel || "—"}</strong></span>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Underwriting Rent Growth Constraint</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", lineHeight: 1.55, fontFamily: "'SF Mono','Fira Code',monospace" }}>{fa.underwritingRentGrowthFormula || "—"}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 28px", marginBottom: 10 }}>
          <KV label="Primary Rule" value={fa.primaryGoverningRule} />
          <KV label="Overlay Rule(s)" value={fa.overlayRules || "None"} />
          <KV label="Age Interpretation" value={fa.ageInterpretation} />
        </div>
        <FR label="Applicability Reasoning">{fa.reasoning}</FR>
        <FR label="Investment Implications"><span style={{ color: "#334155" }}>{fa.investmentImplications || "—"}</span></FR>
        {fa.riskFlags && fa.riskFlags.length > 0 && (<div style={{ marginTop: 6 }}><div style={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Risk Flags</div><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{fa.riskFlags.map((f, i) => (<span key={i} style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "2px 8px", borderRadius: 3, fontSize: 11, fontWeight: 500 }}>⚠ {f}</span>))}</div></div>)}
      </Card>

      <Sec icon="④">Building Characteristics</Sec>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 28px" }}>
          <FR label="Year Built"><strong style={{ fontSize: 15 }}>{bc.yearBuilt || "Not Available"}</strong></FR>
          <FR label="Estimated Age">{bc.estimatedAge ? bc.estimatedAge + " years" : "N/A"}</FR>
          <FR label="Data Confidence"><Badge label={bc.confidence || "Not Available"} /></FR>
        </div>
        {bc.source && <FR label="Source">{bc.source}</FR>}
        {bc.notes && <FR label="Notes"><span style={{ fontStyle: "italic", color: "#64748b" }}>{bc.notes}</span></FR>}
      </Card>

      <Sec icon="⑤">Governing Rent Regulation Structure</Sec>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 28px", marginBottom: 10 }}>
          <KV label="Preemption" value={GL[gs.statePreemptionStatus] || gs.statePreemptionStatus} />
          <KV label="Local Authority" value={gs.localRegulationAuthority} />
          <KV label="Local Rule Strength" value={gs.localRuleStrength} />
          <KV label="Regime Structure" value={RL[gs.overlappingRegime] || gs.overlappingRegime} />
          <KV label="Asset Dependency" value={DL[gs.assetLevelDependency] || gs.assetLevelDependency} />
          <KV label="Borough Authority" value={gs.boroughAuthority === "not_applicable" ? "N/A" : gs.boroughAuthority} />
        </div>
        <FR label="Primary Rule">{gs.primaryRule || "—"}</FR>
        {gs.overlayRules && gs.overlayRules !== "None" && <FR label="Overlay">{gs.overlayRules}</FR>}
        <FR label="Structural Interpretation">{gs.structuralInterpretation || "—"}</FR>
        <FR label="Applicability Risk"><span style={{ color: "#92400e" }}>{gs.applicabilityRiskNote || "—"}</span></FR>
      </Card>

      <Sec icon="⑥">Current Rent Control Status by Jurisdiction</Sec>
      {(data.rentControl || []).map((rc, i) => (
        <Card key={i} style={{ borderLeft: "3px solid " + bC(rc.badge).text }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            <div><div style={{ fontSize: 14, fontWeight: 700 }}>{rc.jurisdiction}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Layer: {rc.layerType} · {rc.ruleDateBasis}</div></div>
            <Badge label={rc.badge} />
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 4, padding: "6px 10px", marginBottom: 10, fontSize: 12.5, fontWeight: 600 }}>{rc.statusLabel}</div>
          <FR label="Formula"><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 3, fontSize: 12, fontFamily: "'SF Mono','Fira Code',monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{rc.formula}</code></FR>
          <FR label="Summary">{rc.summary}</FR>
          <FR label="Applicability">{rc.applicability}</FR>
          {rc.ageThreshold && <FR label="Age Threshold"><strong>{rc.ageThreshold}</strong></FR>}
          <FR label="Investment Implications"><span style={{ color: "#334155", fontStyle: "italic" }}>{rc.investmentImplications || "—"}</span></FR>
          <FR label="Certainty">{rc.certainty}</FR>
          {rc.sources && rc.sources.length > 0 && (<details style={{ marginTop: 6 }}><summary style={{ fontSize: 11, fontWeight: 600, color: "#64748b", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em" }}>Sources ({rc.sources.length})</summary><div style={{ marginTop: 6 }}>{rc.sources.map((s, j) => <SrcLink key={j} s={s} />)}</div></details>)}
        </Card>
      ))}

      <Sec icon="⑦">Pending Legislation & Regulatory Activity</Sec>
      {(data.legislation || []).map((leg, i) => (
        <Card key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>{leg.title}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{leg.jurisdiction} · {leg.layerType} · {leg.date}</div></div>
            <StatusPill label={leg.status} />
          </div>
          <FR label="Summary">{leg.summary}</FR>
          <FR label="Forward-Looking">{leg.forwardLooking}</FR>
          <FR label="Investment Relevance"><span style={{ fontStyle: "italic", color: "#334155" }}>{leg.whyItMatters}</span></FR>
          {leg.sources && leg.sources.length > 0 && (<details style={{ marginTop: 4 }}><summary style={{ fontSize: 11, fontWeight: 600, color: "#64748b", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em" }}>Sources ({leg.sources.length})</summary><div style={{ marginTop: 6 }}>{leg.sources.map((s, j) => <SrcLink key={j} s={s} />)}</div></details>)}
        </Card>
      ))}

      <Sec icon="⑧">Sources & Methodology</Sec>
      <Card>
        <FR label="Methodology">This tool normalizes the property address, extracts the ZIP Code and jurisdictional layers, enriches building characteristics, evaluates governing structure across overlapping layers, assesses age-based applicability, and synthesizes a final regulatory determination with investment implications — via live AI-powered web research.</FR>
        <FR label="Source Hierarchy">Primary sources prioritized where available: (1) Official government and code repositories, (2) Housing authority and rent board publications, (3) Legislative trackers, (4) Legal/policy analyses, (5) Secondary news sources for recent activity.</FR>
        <FR label="Analysis Engine">Address normalization, building data enrichment, governing structure logic, age-based applicability assessment, and regulatory analysis powered by Claude (Anthropic) with real-time web search.</FR>
        <div style={{ marginTop: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 4, fontSize: 11.5, color: "#475569", lineHeight: 1.55, borderLeft: "2px solid #94a3b8" }}>
          <strong>Disclaimer:</strong> For screening purposes only. Not legal advice. AI-generated analysis may contain errors. Final applicability depends on asset-specific characteristics including certificate of occupancy date, unit count, ownership structure, tax benefit status, and renovation history. Confirm through qualified legal counsel before investment decisions.
        </div>
      </Card>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [prop, setProp] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const stepRef = useRef(null);

  const startSteps = useCallback(() => {
    let i = 0; setStep(0);
    if (stepRef.current) clearInterval(stepRef.current);
    stepRef.current = setInterval(() => { i++; if (i >= STEPS.length) { clearInterval(stepRef.current); return; } setStep(i); }, 6000);
  }, []);

  const doSearch = useCallback(async (addr) => {
    if (!addr.trim()) return;
    setLoading(true); setError(null); setProp(null); setData(null); setCopied(false);
    setPhase("geo"); setStep(0);
    let geo;
    try { geo = await geocode(addr); setProp(geo); } catch (e) { setError(e.message); setLoading(false); setPhase(null); return; }
    await new Promise(res => setTimeout(res, 3000));
    setPhase("analysis"); startSteps();
    try { const d = await analyze(geo); setData(d); } catch (e) { setError(e.message); }
    if (stepRef.current) clearInterval(stepRef.current);
    setLoading(false); setPhase(null);
  }, [startSteps]);

  const handleRetry = async () => {
    if (!prop) return;
    setError(null); setData(null); setPhase("analysis"); setLoading(true); startSteps();
    try { const d = await analyze(prop); setData(d); } catch (e) { setError(e.message); }
    if (stepRef.current) clearInterval(stepRef.current);
    setLoading(false); setPhase(null);
  };

  const handleClear = () => {
    setQuery(""); setProp(null); setData(null); setError(null); setLoading(false); setPhase(null); setCopied(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", minHeight: "100vh", background: "#f8fafc", color: "#1e293b" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "#0f172a", color: "#fff", width: 30, height: 30, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>RC</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Multifamily Rent Control Intelligence</div>
            </div>
            {data && prop && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => { doCopy(prop, data); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 4, padding: "5px 12px", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}>{copied ? "✓ Copied" : "Copy Summary"}</button>
                <button onClick={() => doExportReport(prop, data)} style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 4, padding: "5px 12px", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}>Export Report</button>
                <button onClick={() => doExportCSV(prop, data)} style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 4, padding: "5px 12px", fontSize: 11.5, fontWeight: 500, cursor: "pointer" }}>Export CSV</button>
              </div>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "0 4px 0 12px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doSearch(query); }} placeholder="Enter U.S. multifamily property address" disabled={loading} style={{ flex: 1, border: "none", background: "transparent", padding: "10px 10px", fontSize: 13.5, color: "#1e293b", outline: "none", opacity: loading ? 0.5 : 1 }} />
              {query && !loading && <button onClick={handleClear} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: "4px 6px" }}>×</button>}
              <button onClick={() => doSearch(query)} disabled={loading || !query.trim()} style={{ background: loading || !query.trim() ? "#94a3b8" : "#0f172a", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", fontSize: 12.5, fontWeight: 600, cursor: loading || !query.trim() ? "default" : "pointer", margin: "3px 0" }}>{loading ? "Analyzing..." : "Search"}</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 60px" }}>
        {!prop && !loading && !error && (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Regulatory Screening & Applicability Engine</h1>
            <p style={{ fontSize: 13, color: "#64748b", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>Enter any U.S. multifamily property address to screen for rent regulation exposure, assess governing structure, evaluate age-based applicability, and generate a final regulatory determination with underwriting implications.</p>
            <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {["70 Pine Street, New York, NY", "8500 Burton Way, Los Angeles, CA", "301 West Ave, Austin, TX", "200 N Michigan Ave, Chicago, IL", "1600 NE 1st Ave, Miami, FL", "929 Massachusetts Ave, Cambridge, MA", "265 Ponce De Leon Ave NE, Atlanta, GA", "2116 4th Ave, Seattle, WA"].map((ex, i) => (
                <button key={i} onClick={() => { setQuery(ex); doSearch(ex); }} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4, padding: "5px 12px", fontSize: 11.5, color: "#64748b", cursor: "pointer" }}>{ex}</button>
              ))}
            </div>
          </div>
        )}

        {loading && <Progress step={step} phase={phase} />}

        {prop && !loading && (
          <div>
            <Sec icon="①">Property Snapshot</Sec>
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 28px" }}>
                <FR label="Normalized Address"><strong>{prop.normalized}</strong></FR>
                <FR label="ZIP Code"><span style={{ background: "#0f172a", color: "#fff", padding: "1px 8px", borderRadius: 3, fontSize: 12, fontWeight: 600 }}>{prop.zip}</span></FR>
                <FR label="State">{prop.state}</FR>
                <FR label="County">{prop.county}</FR>
                <FR label="City">{prop.city}</FR>
                {prop.borough !== "N/A" && <FR label="Borough">{prop.borough}</FR>}
                <FR label="Coordinates">{prop.lat}, {prop.lng}</FR>
              </div>
            </Card>
          </div>
        )}

        {error && !loading && (
          <Card style={{ borderLeft: "3px solid #b91c1c", marginTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c", marginBottom: 6 }}>Analysis Error</div>
            <p style={{ fontSize: 12.5, color: "#475569", marginBottom: 10 }}>{error}</p>
            <div style={{ display: "flex", gap: 8 }}>
              {prop && <button onClick={handleRetry} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 4, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>}
              <button onClick={handleClear} style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 4, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>New Search</button>
            </div>
          </Card>
        )}

        {data && !loading && <Results data={data} prop={prop} />}
      </div>
    </div>
  );
}
