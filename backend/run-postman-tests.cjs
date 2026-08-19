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

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const url = require("url");

// ── Load collection ───────────────────────────────────────────────────────────

const collectionFile = path.resolve(__dirname, "../.postman.json");
if (!fs.existsSync(collectionFile)) {
  console.error("❌  Collection file not found:", collectionFile);
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(collectionFile, "utf8"));
const collection = raw.collection || raw;

// ── Shared variables ──────────────────────────────────────────────────────────

const collectionVars = {
  base_url: "http://localhost:5000",
  user_id: "test-user-id",
  email: "test@example.com",
};

// ── Helper: resolve {{variable}} placeholders ─────────────────────────────────

function interpolate(str) {
  if (typeof str !== "string") return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => collectionVars[k] ?? `{{${k}}}`);
}

// ── Helper: send an HTTP request ──────────────────────────────────────────────

function sendRequest(item) {
  return new Promise((resolve) => {
    const req = item.request;
    const rawUrl = interpolate(typeof req.url === "string" ? req.url : req.url?.raw || "");
    let parsedUrl;
    try { parsedUrl = new url.URL(rawUrl); }
    catch { return resolve({ status: 0, body: "", error: `Invalid URL: ${rawUrl}` }); }

    const method = (req.method || "GET").toUpperCase();
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
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
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
      _label: label || String(actual),
      _negate: false,

      _assert(pass, msg) {
        if (self._negate ? pass : !pass) throw new Error(msg);
        // Reset negation after each assertion
        self._negate = false;
        return self;
      },

      // Chainable words that return self (no-ops for flow)
      get to() { return self; },
      get be() { return self; },
      get been() { return self; },
      get is() { return self; },
      get that() { return self; },
      get which() { return self; },
      get and() { return self; },
      get has() { return self; },
      get have() { return self; },
      get with() { return self; },
      get at() { return self; },
      get of() { return self; },
      get same() { return self; },
      get a() { return self._typeChainer(); },
      get an() { return self._typeChainer(); },

      // .not returns self with _negate toggled
      get not() {
        const clone = Object.create(self);
        clone._negate = !self._negate;
        return clone;
      },

      // .empty assertion (used via .not.empty)
      get empty() {
        const isEmpty = actual == null || (typeof actual === "string" || Array.isArray(actual) ? actual.length === 0 : Object.keys(actual).length === 0);
        return self._assert(!isEmpty, `Expected non-empty value`);
      },

      // .true / .false property assertions
      get true() { return self._assert(actual === true, `Expected true, got ${JSON.stringify(actual)}`); },
      get false() { return self._assert(actual === false, `Expected false, got ${JSON.stringify(actual)}`); },

      // _typeChainer: called when .a or .an is accessed — returns a proxy so
      // both `.a('string')` (call) and `.a.string` (property) work, plus
      // chaining after a type call (e.g. .an('array').that.is.not.empty)
      _typeChainer() {
        const checker = (type) => {
          if (type === undefined) return self; // bare .a / .an with no call
          const got = Array.isArray(actual) ? "array" : typeof actual;
          const is = type === "array" ? Array.isArray(actual) : got === type;
          self._assert(is, `Expected ${type} but got ${got}`);
          return self; // return self so further chaining works
        };
        // Make checker callable AND return self for property access
        checker._actual = actual;
        checker._negate = self._negate;
        checker._assert = self._assert.bind(self);
        // Copy all self methods / getters onto checker
        Object.setPrototypeOf(checker, self);
        return checker;
      },

      // Named type shorthands: .a.string, .a.number, etc.
      get string() { return self._assert(typeof actual === "string", `Expected string, got ${typeof actual}`); },
      get number() { return self._assert(typeof actual === "number", `Expected number, got ${typeof actual}`); },
      get boolean() { return self._assert(typeof actual === "boolean", `Expected boolean, got ${typeof actual}`); },
      get object() { return self._assert(actual !== null && typeof actual === "object" && !Array.isArray(actual), `Expected object, got ${typeof actual}`); },
      get array() { return self._assert(Array.isArray(actual), `Expected array, got ${typeof actual}`); },
      get null() { return self._assert(actual === null, `Expected null, got ${JSON.stringify(actual)}`); },
      get undefined() { return self._assert(actual === undefined, `Expected undefined`); },
      get exist() { return self._assert(actual != null, `Expected value to exist, got ${actual}`); },
      get ok() { return self._assert(!!actual, `Expected truthy, got ${JSON.stringify(actual)}`); },

      // Assertion methods
      property(k, v) {
        const has = actual != null && k in Object(actual);
        self._assert(has, `Expected property "${k}" on ${JSON.stringify(actual)}`);
        if (v !== undefined) self._assert(actual[k] === v, `Expected property "${k}" to be ${v}, got ${actual?.[k]}`);
        return self;
      },
      include(substr) { return self._assert(String(actual).includes(String(substr)), `Expected "${actual}" to include "${substr}"`); },
      match(re) { return self._assert(re.test(String(actual)), `Expected "${actual}" to match ${re}`); },
      satisfy(fn) { return self._assert(fn(actual), `Satisfy check failed`); },
      oneOf(arr) { return self._assert(arr.includes(actual), `Expected one of [${arr}], got ${actual}`); },
      equal(v) { return self._assert(actual === v, `Expected ${JSON.stringify(v)}, got ${JSON.stringify(actual)}`); },
      eql(v) { return self._assert(JSON.stringify(actual) === JSON.stringify(v), `Deep equal failed`); },
      above(n) { return self._assert(typeof actual === "number" && actual > n, `Expected ${actual} to be above ${n}`); },
      least(n) { return self._assert(typeof actual === "number" && actual >= n, `Expected ${actual} to be at least ${n}`); },
      below(n) { return self._assert(typeof actual === "number" && actual < n, `Expected ${actual} to be below ${n}`); },
      lengthOf(n) { return self._assert(actual?.length === n, `Expected length ${n}, got ${actual?.length}`); },
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
      get: (k) => collectionVars[k],
    },
    environment: {
      set: (k, v) => { collectionVars[k] = v; },
      get: (k) => collectionVars[k],
    },
  };
  return pm;
}

// ── Run one item (request + tests) ────────────────────────────────────────────

async function runItem(item, folderName) {
  if (!item.request) return null; // skip folders without request

  const name = item.name || "Unnamed";
  const display = folderName ? `${folderName} / ${name}` : name;

  const { status, body, error } = await sendRequest(item);

  const testResults = [];
  if (error) {
    testResults.push({ name: "Connection", passed: false, error });
  } else {
    const testEvent = (item.event || []).find(e => e.listen === "test");
    if (testEvent?.script?.exec) {
      const code = testEvent.script.exec.join("\n");
      const pm = createPmSandbox(status, body, testResults);
      try {
        vm.runInNewContext(code, { pm, console }, { timeout: 5000 });
      } catch (e) {
        testResults.push({ name: "Script error", passed: false, error: e.message });
      }
    }
  }

  const allPassed = testResults.every(t => t.passed);
  const passCount = testResults.filter(t => t.passed).length;
  const failCount = testResults.filter(t => !t.passed).length;
  const icon = error ? "⚠ " : allPassed ? "✅" : "❌";
  const statusStr = error ? `CONN_ERR` : String(status);

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

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const connErrors = results.filter(r => r.connError).length;

  const totalAssert = results.reduce((s, r) => s + r.testResults.length, 0);
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
