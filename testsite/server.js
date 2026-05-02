import express from "express";

const app = express();
const port = Number(process.env.TESTSITE_PORT) || 8081;

// Intentionally insecure demo site:
// - No security headers (CSP, X-Frame-Options, etc.)
// - Reflected XSS sink on /echo
// - Verbose error on /crash

app.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>HaxDef Test Site (Intentionally Insecure)</title>
  </head>
  <body>
    <h1>HaxDef Test Site</h1>
    <p>This site is intentionally insecure for testing only.</p>
    <ul>
      <li><a href="/echo?msg=%3Cscript%3Ealert(1)%3C%2Fscript%3E">/echo reflected XSS</a></li>
      <li><a href="/headers">/headers</a></li>
      <li><a href="/crash">/crash</a></li>
    </ul>
  </body>
</html>`);
});

// Reflected XSS: user input inserted into HTML unsafely
app.get("/echo", (req, res) => {
  const msg = String(req.query.msg ?? "");
  res.type("html").send(`<!doctype html>
<html>
  <body>
    <h2>Echo</h2>
    <div>Message: ${msg}</div>
  </body>
</html>`);
});

// Endpoint with minimal output, leaving default Express headers enabled.
app.get("/headers", (req, res) => {
  res.json({ ok: true, note: "No additional security headers set." });
});

// Simulated crash: shows stack traces in dev-like style
app.get("/crash", (req, res) => {
  throw new Error("Intentional test exception: unsafe error handling");
});

// Very permissive error handler (intentionally bad)
app.use((err, req, res, next) => {
  res.status(500).type("text").send(String(err?.stack || err));
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Test site running at http://127.0.0.1:${port}`);
});

