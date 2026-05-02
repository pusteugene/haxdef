import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { getScoreColor } from "./utils.js";

function sanitizeLine(line) {
  return String(line ?? "")
    .replace(/\r/g, "")
    // Strip common control chars that can show up in copied text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trimEnd();
}

export function generatePDF(reportText, url, score) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `report-${Date.now()}.pdf`;
      const reportsDir = path.resolve("backend", "reports");
      const filePath = path.join(reportsDir, fileName);

      fs.mkdirSync(reportsDir, { recursive: true });

      const doc = new PDFDocument({
        size: "A4",
        margin: 50
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ===== COVER =====
      doc.fontSize(26).fillColor("#111").text("HaxDef", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(18)
        .fillColor("#666")
        .text("Security Assessment Report", { align: "center" });
      doc.moveDown(2);
      doc.fontSize(12).fillColor("#999").text(`Website: ${url}`, { align: "center" });

      const color = getScoreColor(score);

      // ===== SECURITY SCORE =====
      doc.fontSize(18).fillColor("#111").text("Security Score", { align: "center" });
      doc.moveDown();
      doc.fontSize(48).fillColor(color).text(`${score}/100`, { align: "center" });
      doc.moveDown();
      doc
        .fontSize(12)
        .fillColor("#666")
        .text(
          "This score reflects the overall security posture of your website based on detected vulnerabilities.",
          { align: "center" }
        );

      doc.addPage();

      // ===== HEADER =====
      doc.fontSize(16).fillColor("#111").text("Executive Summary");
      doc.moveDown();
      doc
        .fontSize(11)
        .fillColor("#333")
        .text(
          "We conducted an automated security assessment of your website and identified potential risks that may expose your system to attacks, data leaks, or service disruption."
        );
      doc.moveDown(2);

      // ===== RISKS BLOCK =====
      doc.fontSize(14).fillColor("#111").text("Risk Overview");
      doc.moveDown();

      const legend = [
        { color: "#FF4D4F", label: "High Risk Issues" },
        { color: "#FA8C16", label: "Medium Risk Issues" },
        { color: "#52C41A", label: "Low Risk Issues" }
      ];

      const startX = doc.x;
      for (const item of legend) {
        const y = doc.y + 2;
        doc.save();
        doc.rect(startX, y, 10, 10).fill(item.color);
        doc.restore();
        doc.fillColor("#333").fontSize(11).text(item.label, startX + 16, doc.y);
        doc.moveDown(0.4);
      }
      doc.moveDown(2);

      // ===== FINDINGS =====
      doc.fontSize(14).fillColor("#111").text("Findings");
      doc.moveDown();

      const lines = String(reportText ?? "").split("\n").map(sanitizeLine).filter(Boolean);
      lines.forEach((line) => {
        const l = line.toLowerCase();
        if (l.includes("critical") || l.includes("high")) {
          doc.fillColor("#FF4D4F");
        } else if (l.includes("medium")) {
          doc.fillColor("#FA8C16");
        } else if (l.includes("low")) {
          doc.fillColor("#52C41A");
        } else {
          doc.fillColor("#333");
        }

        doc.fontSize(11).text(line);
        doc.moveDown(0.5);
      });

      doc.moveDown(2);

      // ===== RECOMMENDATIONS =====
      doc.fontSize(14).fillColor("#111").text("Recommendations");
      doc.moveDown();
      doc
        .fontSize(11)
        .fillColor("#333")
        .text(
          "We recommend performing a full manual security audit to identify deeper vulnerabilities and properly secure your system. Addressing these issues early significantly reduces the risk of real-world attacks."
        );
      doc.moveDown(2);

      // ===== CTA =====
      doc.fontSize(14).fillColor("#111").text("Next Steps");
      doc.moveDown();
      doc
        .fontSize(11)
        .fillColor("#333")
        .text("Want us to fix these issues?\n\nContact HaxDef for a full security audit and protection plan.");

      // ===== FOOTER =====
      doc.moveDown(3);
      doc.fontSize(9).fillColor("#999").text("HaxDef — Cybersecurity Solutions", { align: "center" });

      doc.end();

      stream.on("finish", () => resolve({ filePath, fileName }));
      stream.on("error", reject);
    } catch (e) {
      reject(e);
    }
  });
}

