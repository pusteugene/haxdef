export function normalizeUrl(input) {
  try {
    const trimmed = String(input).trim();
    if (!trimmed) return null;

    // Allow users to paste "example.com" without scheme.
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    const u = new URL(withScheme);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function calculateScore(issues) {
  let score = 100;

  issues.forEach((issue) => {
    const text = String(issue).toLowerCase();

    if (text.includes("high")) score -= 25;
    else if (text.includes("medium")) score -= 15;
    else if (text.includes("low")) score -= 5;
    else score -= 10;
  });

  return Math.max(score, 0);
}

export function getScoreColor(score) {
  if (score >= 80) return "#52C41A"; // green
  if (score >= 50) return "#FA8C16"; // orange
  return "#FF4D4F"; // red
}

