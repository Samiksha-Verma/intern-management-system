import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { DOCUMENT_UPLOAD_DIR } from "../middleware/upload.middleware";
import { expandDescription } from "../utils/anthropic";
import { generateDocumentPdf } from "../utils/pdf";
import { sendDocumentEmail } from "../utils/mailer";

const DOCUMENT_LABELS = {
  offer: "Offer Letter",
  certificate: "Completion Certificate",
} as const;

// An intern must have actually been accepted (invited or active) before we'll
// generate a document for them — a still-pending sign-up isn't a real intern
// yet, and this also keeps the dropdown consistent with the "All Interns" page.
async function getAcceptedIntern(internId: string) {
  const intern = await prisma.user.findUnique({ where: { id: internId } });
  if (!intern || intern.role !== "intern" || intern.status === "pending") {
    throw new HttpError(404, "Intern not found");
  }
  return intern;
}

const generateSchema = z.object({
  internId: z.string().trim().min(1, "Please select an intern"),
  type: z.enum(["offer", "certificate"]),
  date: z.string().trim().min(1, "Date is required"),
  description: z.string().trim().max(2000).optional(),
});

export async function generateDocument(req: Request, res: Response) {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { internId, type, date, description } = parsed.data;

  const intern = await getAcceptedIntern(internId);

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpError(400, "Invalid date");
  }

  const paragraph = await expandDescription(type, intern.name, description);

  const pdfBuffer = await generateDocumentPdf({
    type,
    internName: intern.name,
    department: intern.department,
    date,
    paragraph,
  });

  const documentId = `${crypto.randomUUID()}-${type}`;
  fs.writeFileSync(path.join(DOCUMENT_UPLOAD_DIR, `${documentId}.pdf`), pdfBuffer);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${DOCUMENT_LABELS[type].replace(/\s+/g, "-")}.pdf"`,
    "X-Document-Id": documentId,
  });
  res.send(pdfBuffer);
}

const sendSchema = z.object({
  internId: z.string().trim().min(1, "internId is required"),
});

export async function sendGeneratedDocument(req: Request, res: Response) {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const documentId = req.params.id;
  const type = documentId.endsWith("-offer")
    ? "offer"
    : documentId.endsWith("-certificate")
      ? "certificate"
      : null;
  if (!type) {
    throw new HttpError(404, "Document not found");
  }

  const intern = await getAcceptedIntern(parsed.data.internId);

  const filePath = path.join(DOCUMENT_UPLOAD_DIR, `${documentId}.pdf`);
  if (!fs.existsSync(filePath)) {
    throw new HttpError(404, "Document not found — it may have expired, please generate it again");
  }
  const pdfBuffer = fs.readFileSync(filePath);

  await sendDocumentEmail(
    intern.email,
    intern.name,
    DOCUMENT_LABELS[type],
    pdfBuffer,
    `${DOCUMENT_LABELS[type].replace(/\s+/g, "-")}.pdf`
  );

  res.json({ success: true });
}
