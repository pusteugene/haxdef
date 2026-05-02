import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

function fallbackReport({ url, issues }) {
  return `
HaxDef Security Report

Website: ${url}

Summary:
We identified security risks that may expose your website to attacks.

Findings:
${issues.map((i) => "- " + i).join("\n")}

Recommendation:
We recommend a manual security audit for deeper analysis.

Want us to fix these issues? Contact HaxDef for a full audit.
`;
}

export async function generateReport(scanData) {
  const { url, issues } = scanData;

  if (!openai || !apiKey || apiKey === "your_api_key_here") {
    return fallbackReport({ url, issues });
  }

  const prompt = `
You are a cybersecurity expert writing a professional report for a business owner.

Website: ${url}

Findings:
${issues.join("\n")}

Write a clear, simple, non-technical security report.

Structure:
1. Summary
2. Key Risks
3. Findings (with explanation)
4. Recommendations
5. Next Steps (include a short call-to-action)

Do NOT use complex technical jargon.
Make it easy to understand.

Explain why this is risky in real-world scenarios (data leaks, hacking, downtime), but keep it balanced and not sensational.

End with:
"Want us to fix these issues? Contact HaxDef for a full audit."
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a cybersecurity consultant." },
        { role: "user", content: prompt }
      ]
    });

    const text = response?.choices?.[0]?.message?.content?.trim();
    if (!text) return fallbackReport({ url, issues });

    const cta = "Want us to fix these issues? Contact HaxDef for a full audit.";
    return text.includes(cta) ? text : `${text}\n\n${cta}`;
  } catch {
    return fallbackReport({ url, issues });
  }
}

