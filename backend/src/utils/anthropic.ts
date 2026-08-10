import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

const client = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : null;

export type DocumentType = "offer" | "certificate";

const DEFAULT_PARAGRAPHS: Record<DocumentType, string> = {
  offer:
    "We are pleased to welcome you to the team. Over the course of this internship, you will have " +
    "the opportunity to work alongside experienced mentors, contribute to meaningful projects, and " +
    "develop skills that will serve you well throughout your career.",
  certificate:
    "During this internship, they demonstrated strong dedication, a willingness to learn, and made " +
    "a positive contribution to the team. We are confident the skills and experience gained here will " +
    "serve them well in their future endeavors.",
};

const SYSTEM_PROMPT =
  "You write single, polished paragraphs for formal HR documents (offer letters and internship " +
  "completion certificates). Given a short informal note from an admin, expand it into one warm, " +
  "professional paragraph of 3-5 sentences suitable for a printed company document. Do not include " +
  "a greeting, sign-off, subject line, or markdown formatting — return only the paragraph text itself.";

// Falls back to a generic paragraph on any failure — a missing/invalid API
// key, an unreachable model, or a network error should never block document
// generation entirely.
export async function expandDescription(
  type: DocumentType,
  internName: string,
  description: string | undefined
): Promise<string> {
  const trimmed = description?.trim();
  if (!trimmed) {
    return DEFAULT_PARAGRAPHS[type];
  }
  if (!client) {
    return DEFAULT_PARAGRAPHS[type];
  }

  const context =
    type === "offer"
      ? `This is for an offer letter being sent to ${internName}. Admin's note: "${trimmed}"`
      : `This is for ${internName}'s internship completion certificate, referring to them in the third person. Admin's note: "${trimmed}"`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: context }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text.trim() : "";
    return text || DEFAULT_PARAGRAPHS[type];
  } catch (err) {
    console.error("[anthropic] description expansion failed, using default paragraph:", err);
    return DEFAULT_PARAGRAPHS[type];
  }
}
