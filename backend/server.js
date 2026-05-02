import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runScan } from "./scanner.js";
import { generateReport } from "./ai.js";
import { normalizeUrl, calculateScore } from "./utils.js";
import { generatePDF } from "./pdf.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scan", async (req, res) => {
  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url" });
  }

  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    return res.status(400).json({ error: "Invalid url" });
  }

  try {
    const scanResults = await runScan(normalizedUrl);
    const report = await generateReport(scanResults);
    const score = calculateScore(scanResults.issues ?? []);
    const { filePath } = await generatePDF(report, normalizedUrl, score);
    res.download(filePath, "HaxDef_Report.pdf");
  } catch (err) {
    console.error("Scan failed:", err?.message || err);
    res.status(500).json({ error: "Scan failed" });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

