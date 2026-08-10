import PDFDocument from "pdfkit";
import { env } from "../config/env";
import { DocumentType } from "./anthropic";

const BRAND_ORANGE = "#FF6A33";
const INK_BLACK = "#111111";
const MUTED_GRAY = "#666666";

const COMPANY_NAME = env.smtp.from.split("<")[0].trim() || "Intern Management System";

interface DocumentData {
  type: DocumentType;
  internName: string;
  department: string | null;
  date: string;
  paragraph: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Renders a clean, formal letterhead — a solid orange bar with the company
// name is the only spot of brand color; everything below it is plain black
// text on white, the way an actual offer letter or certificate would look.
function drawLetterhead(doc: PDFKit.PDFDocument) {
  const pageWidth = doc.page.width;

  doc.rect(0, 0, pageWidth, 90).fill(BRAND_ORANGE);
  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(COMPANY_NAME, 60, 32, { width: pageWidth - 120 });

  doc.fillColor(INK_BLACK);
  doc.y = 130;
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  doc.rect(0, pageHeight - 14, pageWidth, 14).fill(BRAND_ORANGE);
}

function drawOfferLetter(doc: PDFKit.PDFDocument, data: DocumentData) {
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(MUTED_GRAY)
    .text(formatDate(data.date), { align: "right" });

  doc.moveDown(1.5);
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(INK_BLACK)
    .text("Offer of Internship", { align: "left" });

  doc.moveDown(1.5);
  doc.font("Helvetica").fontSize(12).fillColor(INK_BLACK);
  doc.text(`Dear ${data.internName},`);
  doc.moveDown(1);

  const deptClause = data.department ? ` in the ${data.department} department` : "";
  doc.text(
    `We are delighted to offer you an internship position${deptClause}, starting ${formatDate(
      data.date
    )}. This letter confirms our invitation for you to join us and begin this new chapter with our team.`,
    { align: "justify" }
  );
  doc.moveDown(1);
  doc.text(data.paragraph, { align: "justify" });
  doc.moveDown(1);
  doc.text(
    "Please treat this letter as formal confirmation of your internship offer. We look forward to " +
      "having you on board and are confident this will be a rewarding experience for both you and the team.",
    { align: "justify" }
  );

  doc.moveDown(3);
  doc.text("Sincerely,");
  doc.moveDown(2);
  doc.font("Helvetica-Bold").text(COMPANY_NAME);
  doc.font("Helvetica").fillColor(MUTED_GRAY).fontSize(10).text("Human Resources");
}

function drawCertificate(doc: PDFKit.PDFDocument, data: DocumentData) {
  doc.moveDown(2);
  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor(INK_BLACK)
    .text("Certificate of Completion", { align: "center" });

  doc.moveDown(2);
  doc.font("Helvetica").fontSize(12).fillColor(MUTED_GRAY).text("This is to certify that", {
    align: "center",
  });

  doc.moveDown(0.5);
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(BRAND_ORANGE)
    .text(data.internName, { align: "center" });

  doc.moveDown(0.5);
  const deptClause = data.department ? ` in the ${data.department} department` : "";
  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor(INK_BLACK)
    .text(`has successfully completed an internship${deptClause}, concluding on ${formatDate(data.date)}.`, {
      align: "center",
    });

  doc.moveDown(2);
  doc.text(data.paragraph, { align: "justify" });

  doc.moveDown(4);
  const signatureY = doc.y;
  doc
    .moveTo(60, signatureY)
    .lineTo(220, signatureY)
    .strokeColor(MUTED_GRAY)
    .stroke();
  doc.fontSize(10).fillColor(MUTED_GRAY).text(COMPANY_NAME, 60, signatureY + 4);
  doc.text("Authorized Signature", 60, signatureY + 18);
}

export function generateDocumentPdf(data: DocumentData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 0, bottom: 40, left: 60, right: 60 } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawLetterhead(doc);
    doc.x = 60;

    if (data.type === "offer") {
      drawOfferLetter(doc, data);
    } else {
      drawCertificate(doc, data);
    }

    drawFooter(doc);
    doc.end();
  });
}
