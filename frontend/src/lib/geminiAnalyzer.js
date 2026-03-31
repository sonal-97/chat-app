import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ─── Gemini Client ───────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// ─── Structured Output Schema ────────────────────────────────────
const ScamAnalysisSchema = z.object({
  isScam: z
    .boolean()
    .describe("True if the chat is a scam or social engineering attempt"),
  confidence: z
    .number()
    .describe(
      "Confidence score between 0 and 1 indicating how confident the analysis is"
    ),
  severity: z
    .enum(["low", "medium", "high", "critical"])
    .describe(
      "Severity level of the social engineering attempt. 'low' for benign, 'critical' for dangerous"
    ),
  summary: z
    .string()
    .describe("Brief summary of the chat in max 100 words"),
  explanation: z
    .string()
    .describe(
      "Detailed reasoning explaining why it is or is not a scam/social engineering"
    ),
  indicators: z
    .array(z.string())
    .describe(
      "List of words or short phrases from the chat indicating scam intent"
    ),
  manipulation_techniques: z
    .array(z.string())
    .describe(
      "Named manipulation techniques detected, e.g. 'urgency', 'authority', 'impersonation', 'phishing', 'pretexting'"
    ),
});

// ─── Prompt ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a cybersecurity expert specializing in scam and social engineering detection.

Analyze the chat provided and return a structured JSON analysis.

Rules:
- isScam: true only if there is clear evidence of social engineering, scam, phishing, or manipulation.
- confidence: a float 0-1. Use 0.9+ only when extremely obvious. Use 0.3-0.6 for ambiguous cases.
- severity: "low" for harmless, "medium" for suspicious, "high" for likely scam, "critical" for active attack/phishing.
- summary: max 100 words. If NOT a scam, write a neutral summary without misleading terms (avoid words like "urgent", "pressure" unless actually present). If IS a scam, include descriptive terms like "manipulation", "impersonation", "phishing" etc.
- explanation: detailed reasoning with specific evidence from the chat.
- indicators: extract ONLY words or short phrases from the chat that indicate scam intent. Prefer phrases showing urgency, authority, manipulation, impersonation, or pressure. Use phrases actually present or clearly implied in the chat.
- manipulation_techniques: name the specific social engineering techniques detected (e.g., "pretexting", "baiting", "quid pro quo", "tailgating", "authority exploitation", "urgency/scarcity", "impersonation"). Empty array if none detected.`;

// ─── Public API ──────────────────────────────────────────────────
export async function analyzeChat(conversationText) {
  if (!conversationText?.trim()) {
    throw new Error("Empty conversation text");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze this chat conversation for social engineering:\n\n${conversationText}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(ScamAnalysisSchema),
    },
  });

  const parsed = ScamAnalysisSchema.parse(JSON.parse(response.text));
  return parsed;
}
