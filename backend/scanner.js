import { spawn } from "node:child_process";
import axios from "axios";

function bufferToStringSafe(buf) {
  if (!buf) return "";
  return Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf);
}

async function runHeaderChecks(url) {
  try {
    const resp = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { "User-Agent": "HaxDefScanner/0.1" }
    });

    const h = resp.headers ?? {};
    const issues = [];

    // A few common “productizable” checks with clear severity.
    if (!h["content-security-policy"]) issues.push("Missing Content-Security-Policy - medium");
    if (!h["x-frame-options"]) issues.push("Missing X-Frame-Options (clickjacking protection) - low");
    if (!h["x-content-type-options"]) issues.push("Missing X-Content-Type-Options (MIME sniffing protection) - low");
    if (!h["referrer-policy"]) issues.push("Missing Referrer-Policy - low");

    // Only meaningful on HTTPS.
    if (String(url).toLowerCase().startsWith("https://") && !h["strict-transport-security"]) {
      issues.push("Missing Strict-Transport-Security (HSTS) - medium");
    }

    if (h["x-powered-by"]) issues.push("Technology exposure via X-Powered-By header - low");

    return issues;
  } catch {
    return ["Website not reachable or blocked - medium"];
  }
}

function killProcessTree(child) {
  if (!child?.pid) return;
  // On Windows, child.kill() may not kill subprocesses; taskkill is more reliable.
  if (process.platform === "win32") {
    try {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
    } catch {
      // ignore
    }
    return;
  }

  try {
    child.kill("SIGKILL");
  } catch {
    // ignore
  }
}

export function runScan(url) {
  return new Promise((resolve) => {
    // Safer than exec: no shell expansion, args are passed directly.
    // Nuclei v3 uses -jsonl (or -j) for JSON lines output.
    const args = ["-u", url, "-jsonl", "-silent"];

    // Optional "прокачка" via env.
    // Example: NUCLEI_TAGS=xss,sqli,misconfig
    if (process.env.NUCLEI_TAGS) args.push("-tags", process.env.NUCLEI_TAGS);
    // Example: NUCLEI_TIMEOUT=10
    if (process.env.NUCLEI_TIMEOUT) args.push("-timeout", String(process.env.NUCLEI_TIMEOUT));
    // Example: NUCLEI_RATE_LIMIT=50
    if (process.env.NUCLEI_RATE_LIMIT) args.push("-rate-limit", String(process.env.NUCLEI_RATE_LIMIT));
    // Keep runs bounded and predictable.
    args.push("-retries", "1");

    const nucleiBin = process.env.NUCLEI_BIN || "nuclei";
    const child = spawn(nucleiBin, args, {
      windowsHide: true
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutBytes = 0;
    const MAX_BYTES = 1024 * 5000; // ~5MB like your exec maxBuffer

    child.stdout.on("data", (d) => {
      stdoutBytes += d.length ?? 0;
      if (stdoutBytes <= MAX_BYTES) stdoutChunks.push(d);
    });
    child.stderr.on("data", (d) => {
      stderrChunks.push(d);
    });

    const killAfterMs = Number(process.env.NUCLEI_KILL_AFTER_MS) || 120_000;
    const killer = setTimeout(() => {
      killProcessTree(child);
    }, killAfterMs);

    child.on("error", () => {
      clearTimeout(killer);
      (async () => {
        const extra = await runHeaderChecks(url);
        resolve({
          url,
          issues: Array.from(new Set(["Scan failed (nuclei not found or not executable) - medium", ...extra]))
        });
      })();
    });

    child.on("close", (code) => {
      clearTimeout(killer);

      const stdout = bufferToStringSafe(Buffer.concat(stdoutChunks));
      const stderr = bufferToStringSafe(Buffer.concat(stderrChunks));

      (async () => {
        const extra = await runHeaderChecks(url);

        // If nuclei produced nothing (common with -silent), still return useful issues.
        if (!stdout.trim() || code !== 0) {
          const base = ["Scan failed or no vulnerabilities found - low"].concat(
            stderr.trim() ? [`nuclei: ${stderr.trim().slice(0, 300)} - low`] : []
          );
          return resolve({
            url,
            issues: Array.from(new Set([...base, ...extra]))
          });
        }

        try {
          const lines = stdout.trim().split("\n").filter(Boolean);
          const nucleiIssues = lines
            .map((line) => {
              const parsed = JSON.parse(line);
              const name = parsed?.info?.name ?? "Unknown finding";
              const severity = parsed?.info?.severity ?? "unknown";
              return `${name} - ${severity}`;
            })
            .filter(Boolean);

          const combined = Array.from(new Set([...nucleiIssues, ...extra]));

          resolve({
            url,
            issues: combined.length ? combined : ["No major issues found - low"]
          });
        } catch {
          resolve({
            url,
            issues: Array.from(new Set(["Error parsing scan results - medium", ...extra]))
          });
        }
      })();
    });
  });
}

