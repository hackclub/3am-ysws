import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { getDb } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { isCertificateOrder } from "@/lib/certificates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function appUrl(path: string): string | null {
  try {
    const base = new URL(process.env.APP_URL ?? "");
    if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) return null;
    const url = new URL(path, base);
    return url.origin === base.origin ? url.toString() : null;
  } catch {
    return null;
  }
}

async function createCertificatePdf(input: {
  recipient: string;
  certificateId: string;
  issuedAt: Date;
  verificationUrl: string;
}): Promise<Uint8Array> {
  const templatePath = join(process.cwd(), "public", "assets", "certificate_without_name_placeholder_fixed.pdf");
  const templateBytes = await readFile(templatePath);
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPages()[0];
  if (!page) throw new Error("certificate_template_has_no_pages");

  const cream = rgb(0.96, 0.89, 0.75);
  const nameFont = await pdf.embedFont(StandardFonts.TimesRoman);
  const detailsFont = await pdf.embedFont(StandardFonts.Helvetica);

  // The blank recipient line in the supplied A4 artwork is centered at x≈421pt,
  // with its baseline just above the line at y≈316pt (PDF bottom-left coordinates).
  const cleanedName = input.recipient
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "3AM Maker";
  const maxNameWidth = 500;
  let nameSize = 25;
  while (nameSize > 14 && nameFont.widthOfTextAtSize(cleanedName, nameSize) > maxNameWidth) {
    nameSize -= 0.5;
  }
  const nameWidth = nameFont.widthOfTextAtSize(cleanedName, nameSize);
  page.drawText(cleanedName, {
    x: (page.getWidth() - nameWidth) / 2,
    y: 336,
    size: nameSize,
    font: nameFont,
    color: cream,
  });

  const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
  qrUrl.searchParams.set("size", "320x320");
  qrUrl.searchParams.set("format", "png");
  qrUrl.searchParams.set("data", input.verificationUrl);
  const qrResponse = await fetch(qrUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
  });
  if (!qrResponse.ok) throw new Error(`certificate_qr_http_${qrResponse.status}`);
  const qrBytes = new Uint8Array(await qrResponse.arrayBuffer());
  const qrImage = await pdf.embedPng(qrBytes);

  // Keep the QR in the lower-right clear area, away from the existing beans and signature.
  const qrSize = 48;
  const qrX = page.getWidth() - 72 - qrSize;
  const qrY = 85;
  page.drawRectangle({
    x: qrX - 2,
    y: qrY - 2,
    width: qrSize + 4,
    height: qrSize + 4,
    color: rgb(1, 1, 1),
    borderColor: cream,
    borderWidth: 1,
  });
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  const caption = "SCAN TO VERIFY";
  const captionSize = 5.2;
  page.drawText(caption, {
    x: qrX + (qrSize - detailsFont.widthOfTextAtSize(caption, captionSize)) / 2,
    y: 79,
    size: captionSize,
    font: detailsFont,
    color: cream,
  });

  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(input.issuedAt);
  const details = `ISSUED ${date}  |  ${input.certificateId}`;
  const detailsSize = 6.5;
  const detailsWidth = detailsFont.widthOfTextAtSize(details, detailsSize);
  page.drawText(details, {
    x: 400 - detailsWidth / 2,
    y: 79,
    size: detailsSize,
    font: detailsFont,
    color: cream,
  });

  return pdf.save();
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await getDb()
    .select({ order: orders, user: users })
    .from(orders)
    .innerJoin(users, eq(users.sub, orders.userSub))
    .where(eq(orders.id, id))
    .limit(1);

  if (!row || row.order.status !== "posted" || !isCertificateOrder(row.order.itemName)) {
    return NextResponse.json({ error: "certificate_not_found" }, { status: 404 });
  }

  const verificationUrl = appUrl("/certificates/verify/" + row.order.id);
  if (!verificationUrl) {
    return NextResponse.json({ error: "app_url_not_configured" }, { status: 503 });
  }

  const recipient = row.order.fullName?.trim() || row.user.name || "3AM Maker";
  const certificateId = "3AM-" + row.order.id.slice(0, 8).toUpperCase();

  try {
    const pdfBytes = await createCertificatePdf({
      recipient,
      certificateId,
      issuedAt: row.order.fulfilledAt ?? row.order.createdAt,
      verificationUrl,
    });

    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificateId}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[certificates] PDF generation failed", error);
    return NextResponse.json({ error: "certificate_generation_failed" }, { status: 503 });
  }
}
