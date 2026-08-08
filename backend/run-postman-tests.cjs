/**
 * run-postman-tests.cjs
 *
 * Zero-dependency Postman collection runner.
 * Reads ../.postman.json, executes every request against localhost:5000,
 * evaluates the inline test scripts, and prints a pass/fail summary.
 *
 * Usage:  node run-postman-tests.cjs
 *
 * It uses only Node.js built-ins (http, https, fs, path, vm) — no npm install needed.
 */

"use strict";

const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");
const vm    = require("vm");
const url   = require("url");

// ── Load collection ───────────────────────────────────────────────────────────

const collectionFile = path.resolve(__dirname, "../.postman.json");
if (!fs.existsSync(collectionFile)) {
  console.error("❌  Collection file not found:", collectionFile);
  process.exit(1);
}
const raw        = JSON.parse(fs.readFileSync(collectionFile, "utf8"));
const collection = raw.collection || raw;

// ── Shared variables ──────────────────────────────────────────────────────────

const collectionVars = {
  base_url:   "http://localhost:5000",
  user_id:    "test-user-id",
  email:      "test@example.com",
};

// ── Helper: resolve {{variable}} placeholders ─────────────────────────────────

function interpolate(str) {
  if (typeof str !== "string") return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => collectionVars[k] ?? `{{${k}}}`);
}

// ── Helper: send an HTTP request ──────────────────────────────────────────────

function sendRequest(item) {
  return new Promise((resolve) => {
    const req  = item.request;
    const rawUrl = interpolate(typeof req.url === "string" ? req.url : req.url?.raw || "");
    let parsedUrl;
    try { parsedUrl = new url.URL(rawUrl); }
    catch { return resolve({ status: 0, body: "", error: `Invalid URL: ${rawUrl}` }); }

    const method  = (req.method || "GET").toUpperCase();
    const headers = {};
    (req.header || []).forEach(h => { headers[interpolate(h.key)] = interpolate(h.value); });
    if (!headers["Content-Type"] && method !== "GET" && method !== "DELETE") {
      headers["Content-Type"] = "application/json";
    }

    let bodyData = null;
    if (req.body?.mode === "raw" && req.body.raw) {
      bodyData = interpolate(req.body.raw);
      headers["Content-Length"] = Buffer.byteLength(bodyData);
    }

    const options = {
      hostname: parsedUrl.hostname,
      port:     parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path:     parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
    };

    const lib = parsedUrl.protocol === "https:" ? https : http;
    const request = lib.request(options, (res) => {
      let body = "";
      res.on("data", d => { body += d; });
      res.on("end", () => resolve({ status: res.statusCode, body, error: null }));
    });
    request.on("error", err => resolve({ status: 0, body: "", error: err.message }));
    request.setTimeout(15000, () => {
      request.destroy();
      resolve({ status: 0, body: "", error: "Request timed out" });
    });
    if (bodyData) request.write(bodyData);
    request.end();
  });
}

// ── Minimal pm sandbox ────────────────────────────────────────────────────────

function createPmSandbox(responseStatus, responseBody, testResults) {
  let parsedBody = null;

  const response = {
    code: responseStatus,
    status: String(responseStatus),
    to: {
      have: {
        status: (expected) => {
          if (responseStatus !== expected) throw new Error(`Expected status ${expected} but got ${responseStatus}`);
        },
      },
    },
    json: () => {
      if (!parsedBody) parsedBody = JSON.parse(responseBody);
      return parsedBody;
    },
  };

  // chai-style expect with a limited subset
  function expect(actual, label) {
    const self = {
      _actual: actual,
      _label:  label || String(actual),
      _negate: false,
      get not() { const n = expect(actual, label); n._negate = true; return n; },

      _assert(pass, msg) {
        if (this._negate ? pass : !pass) throw new Error(msg);
        return self;
      },

      to:   (() => { const t = {}; Object.defineProperty(t, "be",   { get: () => self.be   }); Object.defineProperty(t, "have", { get: () => self.have }); Object.defineProperty(t, "include", { value: (v) => self.include(v) }); Object.defineProperty(t, "satisfy", { value: (fn) => self.satisfy(fn) }); Object.defineProperty(t, "match", { value: (re) => self.match(re) }); return t; })(),
      be:   (() => { const b = {}; Object.defineProperty(b, "true",  { get: () => self._assert(self._actual === true,  `Expected true, got ${JSON.stringify(self._actual)}`) }); Object.defineProperty(b, "false", { get: () => self._assert(self._actual === false, `Expected false`) }); Object.defineProperty(b, "an",   { value: (t) => self.an(t) }); Object.defineProperty(b, "a",    { value: (t) => self.an(t) }); Object.defineProperty(b, "oneOf", { value: (arr) => self.oneOf(arr) }); return b; })(),
      have: { property: (k, v) => { const has = k in Object(actual); if (!self._negate && !has) throw new Error(`Expected property "${k}" on ${JSON.stringify(actual)}`); if (v !== undefined && actual[k] !== v) throw new Error(`Expected property "${k}" to be ${v}, got ${actual[k]}`); return self; } },

      an(type) {
        const got = typeof actual === "object" && Array.isArray(actual) ? "array" : typeof actual;
        const is  = type === "array" ? Array.isArray(actual) : got === type;
        return self._assert(is, `Expected ${type} but got ${got}`);
      },
      not: new Proxy({}, {
        get: (_, prop) => {
          if (prop === "empty") {
            const isEmpty = actual == null || actual.length === 0;
            return self._assert(!isEmpty, `Expected non-empty`);
          }
          return self[prop];
        }
      }),
      include(substr) { return self._assert(String(actual).includes(String(substr)), `Expected "${actual}" to include "${substr}"`); },
      match(re)       { return self._assert(re.test(String(actual)), `Expected "${actual}" to match ${re}`); },
      satisfy(fn)     { return self._assert(fn(actual), `Satisfy check failed`); },
      oneOf(arr)      { return self._assert(arr.includes(actual), `Expected one of [${arr}], got ${actual}`); },
      equal(v)        { return self._assert(actual === v, `Expected ${JSON.stringify(v)}, got ${JSON.stringify(actual)}`); },
      above(n)        { return self._assert(actual > n, `Expected ${actual} to be above ${n}`); },
    };
    return self;
  }

  const pm = {
    response,
    test(name, fn) {
      try {
        fn();
        testResults.push({ name, passed: true });
      } catch (e) {
        testResults.push({ name, passed: false, error: e.message });
      }
    },
    expect,
    collectionVariables: {
      set: (k, v) => { collectionVars[k] = v; },
      get: (k)    => collectionVars[k],
    },
    environment: {
      set: (k, v) => { collectionVars[k] = v; },
      get: (k)    => collectionVars[k],
    },
  };
  return pm;
}

// ── Run one item (request + tests) ────────────────────────────────────────────

async function runItem(item, folderName) {
  if (!item.request) return null; // skip folders without request

  const name    = item.name || "Unnamed";
  const display = folderName ? `${folderName} / ${name}` : name;

  const { status, body, error } = await sendRequest(item);

  const testResults = [];
  if (error) {
    testResults.push({ name: "Connection", passed: false, error });
  } else {
    const testEvent = (item.event || []).find(e => e.listen === "test");
    if (testEvent?.script?.exec) {
      const code = testEvent.script.exec.join("\n");
      const pm   = createPmSandbox(status, body, testResults);
      try {
        vm.runInNewContext(code, { pm, console }, { timeout: 5000 });
      } catch (e) {
        testResults.push({ name: "Script error", passed: false, error: e.message });
      }
    }
  }

  const allPassed  = testResults.every(t => t.passed);
  const passCount  = testResults.filter(t => t.passed).length;
  const failCount  = testResults.filter(t => !t.passed).length;
  const icon       = error ? "⚠ " : allPassed ? "✅" : "❌";
  const statusStr  = error ? `CONN_ERR` : String(status);

  console.log(`  ${icon} [${statusStr}] ${display}  (${passCount}/${testResults.length} assertions)`);
  testResults.filter(t => !t.passed).forEach(t => {
    console.log(`       ↳ FAIL: ${t.name} — ${t.error}`);
  });

  return { name: display, passed: allPassed, testResults, connError: error };
}

// ── Walk collection items recursively ────────────────────────────────────────

async function runFolder(items, folderName) {
  const results = [];
  for (const item of items) {
    if (item.item) {
      // sub-folder
      const subName = folderName ? `${folderName} / ${item.name}` : item.name;
      console.log(`\n  📁 ${item.name}`);
      const sub = await runFolder(item.item, item.name);
      results.push(...sub);
    } else {
      const r = await runItem(item, folderName);
      if (r) results.push(r);
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(` Coursevia API — Test Run`);
  console.log(` Collection : ${collection.info?.name || "Coursevia Backend API"}`);
  console.log(` Target     : ${collectionVars.base_url}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const results = await runFolder(collection.item || [], "");

  const total      = results.length;
  const passed     = results.filter(r => r.passed).length;
  const failed     = total - passed;
  const connErrors = results.filter(r => r.connError).length;

  const totalAssert  = results.reduce((s, r) => s + r.testResults.length, 0);
  const failedAssert = results.reduce((s, r) => s + r.testResults.filter(t => !t.passed).length, 0);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" RESULTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(` Requests   : ${total}  (✅ ${passed} passed, ❌ ${failed} failed)`);
  console.log(` Assertions : ${totalAssert}  (✅ ${totalAssert - failedAssert} passed, ❌ ${failedAssert} failed)`);
  if (connErrors > 0) {
    console.log(`\n ⚠  ${connErrors} request(s) could not connect. Is the server running on port 5000?`);
    console.log(`    Start it with:  node backend/server.js`);
  }

  if (failed === 0 && connErrors === 0) {
    console.log("\n ✅  All tests passed!\n");
  } else if (connErrors === total) {
    console.log("\n ⚠  All requests failed to connect. Server is not running.\n");
  } else {
    console.log(`\n ❌  ${failed} request(s) had failing tests.\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
})();
