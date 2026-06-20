import type { BillingInvoice } from "@/types/billing";
import { APP_NAME } from "@/lib/constants";

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function downloadInvoicePdf(invoice: BillingInvoice, customerName: string, customerEmail: string): void {
  const date = new Date(invoice.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines = [
    `${APP_NAME} - Invoice`,
    "",
    `Invoice ID: ${invoice.id}`,
    `Date: ${date}`,
    `Status: ${invoice.status.toUpperCase()}`,
    "",
    `Bill To:`,
    customerName || "Researcher",
    customerEmail || "",
    "",
    `Plan: ${invoice.planName}`,
    `Amount: $${invoice.amount.toFixed(2)}`,
    `Payment: Card ending ${invoice.cardLast4}`,
    "",
    "Thank you for your subscription.",
    "This is a simulated invoice — no actual payment was processed.",
  ];

  let y = 750;
  const textOps = lines
    .map((line) => {
      const op = `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
      y -= line === "" ? 10 : 18;
      return op;
    })
    .join("\n");

  const stream = `${textOps}\n`;
  const streamLen = stream.length;

  const objects = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj",
    `4 0 obj<</Length ${streamLen}>>stream\n${stream}endstream\nendobj`,
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
