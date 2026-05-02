const API_BASE = "http://localhost:3000";

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, kind = "info") {
  const el = $("status");
  el.textContent = text || "";
  el.style.color = kind === "error" ? "var(--danger)" : "var(--muted)";
}

async function scan() {
  const url = $("urlInput").value.trim();
  $("result").textContent = "";
  $("auditBtn").disabled = true;

  if (!url) {
    setStatus("Enter a URL.", "error");
    return;
  }

  $("scanBtn").disabled = true;
  setStatus("Scanning… this can take a bit.");

  try {
    const controller = new AbortController();
    const timeoutMs = 70_000;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${API_BASE}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    clearTimeout(t);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Request failed");
    }

    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "HaxDef_Report.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(link.href), 2000);

    $("result").textContent = "PDF downloaded: HaxDef_Report.pdf";
    $("auditBtn").disabled = false;
    setStatus("Done.");
  } catch (e) {
    if (e?.name === "AbortError") {
      setStatus("Timed out waiting for scan. Try again or narrow templates.", "error");
    } else {
      setStatus(e?.message || "Scan failed.", "error");
    }
  } finally {
    $("scanBtn").disabled = false;
  }
}

function fullAudit() {
  const text = [
    "We found potential risks.",
    "Fixing them requires manual testing.",
    "",
    "Contact us to schedule a full audit."
  ].join("\n");

  const current = $("result").textContent || "";
  $("result").textContent = current ? `${current}\n\n---\n\n${text}` : text;
}

$("scanBtn").addEventListener("click", scan);
$("auditBtn").addEventListener("click", fullAudit);

