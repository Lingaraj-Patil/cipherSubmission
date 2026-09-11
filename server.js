require("dotenv").config();
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { GeminiEvaluator } = require("./src/services/GeminiEvaluator");

const PORT = process.env.PORT || 3000;
const llmEvaluator = new GeminiEvaluator();
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const ATTEMPTS_FILE = path.join(DATA_DIR, "attempts.json");
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ATTEMPTS_FILE)) fs.writeFileSync(ATTEMPTS_FILE, "[]");

const problems = [
  {
    id: "parking-lot",
    title: "Parking Lot",
    difficulty: "Foundational",
    timebox: 35,
    statement: "Design a parking lot that supports multiple floors, vehicle types, spot allocation, entry/exit and fee calculation.",
    requirements: [
      "Support motorcycle, car and truck vehicles.",
      "Parking spots may have compatible vehicle types.",
      "A vehicle receives a ticket when it enters and the ticket is closed at exit.",
      "Fee calculation should be replaceable without rewriting parking flow.",
      "The design should make it easy to add another fee policy later."
    ],
    focus: ["responsibilities", "strategy", "encapsulation", "extensibility"],
    rubric: ["Requirement understanding","Class responsibilities","Coupling / cohesion","Encapsulation and interfaces","Appropriate abstraction / patterns","Extensibility","Edge cases and testability","Quality of explanation"]
  },
  {
    id: "elevator",
    title: "Elevator System",
    difficulty: "Intermediate",
    timebox: 40,
    statement: "Design an elevator system that accepts requests, moves elevators between floors and handles door/state transitions.",
    requirements: [
      "Support multiple elevators.",
      "A request specifies a source floor and destination floor.",
      "An elevator has explicit movement/door states.",
      "Scheduling should be replaceable as a policy.",
      "Invalid transitions should be rejected."
    ],
    focus: ["state", "strategy", "interfaces", "edge-cases"],
    rubric: ["Requirement understanding","Class responsibilities","Coupling / cohesion","Encapsulation and interfaces","Appropriate abstraction / patterns","Extensibility","Edge cases and testability","Quality of explanation"]
  },
  {
    id: "vending-machine",
    title: "Vending Machine",
    difficulty: "Foundational",
    timebox: 30,
    statement: "Design a vending machine that manages inventory, accepts money, selects products and returns change.",
    requirements: [
      "Products have price and inventory count.",
      "The machine accepts money before selection.",
      "Selection must fail safely when a product is unavailable or funds are insufficient.",
      "Refund/change behaviour must be explicit.",
      "The transaction lifecycle should be easy to extend."
    ],
    focus: ["state", "encapsulation", "validation", "testability"],
    rubric: ["Requirement understanding","Class responsibilities","Coupling / cohesion","Encapsulation and interfaces","Appropriate abstraction / patterns","Extensibility","Edge cases and testability","Quality of explanation"]
  },
  {
    id: "library",
    title: "Library Management",
    difficulty: "Intermediate",
    timebox: 35,
    statement: "Design a library that manages books, physical copies, members, borrowing and returns.",
    requirements: [
      "A title may have multiple physical copies.",
      "Members can borrow available copies and return them.",
      "A copy cannot be borrowed by two members at once.",
      "Loan rules should be isolated from catalog data.",
      "The design should allow a future reservation/hold policy."
    ],
    focus: ["domain boundaries", "policy", "invariants", "extensibility"],
    rubric: ["Requirement understanding","Class responsibilities","Coupling / cohesion","Encapsulation and interfaces","Appropriate abstraction / patterns","Extensibility","Edge cases and testability","Quality of explanation"]
  }
];

function readAttempts() {
  try { return JSON.parse(fs.readFileSync(ATTEMPTS_FILE, "utf8")); }
  catch { return []; }
}
function writeAttempts(items) {
  fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(items, null, 2));
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"});
  res.end(data);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", c => { raw += c; if (raw.length > 2_000_000) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch(e) { reject(e); } });
    req.on("error", reject);
  });
}
function validateSubmission(submission) {
  const required = ["requirements","assumptions","classes","relationships","behavior","tradeoffs"];
  return required.filter(k => typeof submission[k] !== "string" || !submission[k].trim());
}

async function runEvaluation(attempt, problem) {
  return await llmEvaluator.evaluate({problem, submission:attempt.submission});
}

function serveStatic(req, res) {
  let file = req.url === "/" ? "/index.html" : req.url;
  const safe = path.normalize(file).replace(/^(\.\.[\/\\])+/, "");
  const full = path.join(ROOT, "public", safe);
  if (!full.startsWith(path.join(ROOT, "public"))) return json(res,404,{error:"Not found"});
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) return json(res,404,{error:"Not found"});
  const ext = path.extname(full);
  const types = {".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json"};
  res.writeHead(200, {"Content-Type": types[ext] || "application/octet-stream"});
  fs.createReadStream(full).pipe(res);
}

const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/api/problems") return json(res,200,problems);
    if (req.method === "GET" && url.pathname === "/api/attempts") return json(res,200,readAttempts().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
    if (req.method === "GET" && url.pathname.startsWith("/api/attempts/")) {
      const id = url.pathname.split("/").pop();
      const item = readAttempts().find(a=>a.id===id);
      return item ? json(res,200,item) : json(res,404,{error:"Attempt not found"});
    }
    if (req.method === "POST" && url.pathname === "/api/attempts") {
      const input = await body(req);
      const problem = problems.find(p=>p.id===input.problemId);
      if (!problem) return json(res,400,{error:"Unknown problem"});
      const required = ["requirements","assumptions","classes","relationships","behavior","tradeoffs"];
      const missing = required.filter(k=>typeof input[k] !== "string" || !input[k].trim());
      if (missing.length) return json(res,422,{error:"Complete every section before submitting.", missing});
      if (!llmEvaluator.isConfigured() && process.env.DEMO_MODE !== "true") {
        return json(res,503,{error:"AI evaluation is not configured. Add GEMINI_API_KEY to the server environment."});
      }
      const attempts = readAttempts();
      if (input.idempotencyKey && attempts.some(a=>a.idempotencyKey===input.idempotencyKey))
        return json(res,200,attempts.find(a=>a.idempotencyKey===input.idempotencyKey));
      const attempt = {
        id: crypto.randomUUID(), idempotencyKey: input.idempotencyKey || crypto.randomUUID(),
        problemId: problem.id, problemTitle: problem.title,
        submission: Object.fromEntries(required.map(k=>[k,input[k].trim()])),
        createdAt: new Date().toISOString(), status:"EVALUATING", evaluation:null
      };
      attempts.push(attempt); writeAttempts(attempts);
      // Persist first; the LLM evaluation happens after the submit response.
      runEvaluation(attempt, problem).then(evaluation => {
        const all=readAttempts(), current=all.find(a=>a.id===attempt.id);
        if(!current || current.status!=="EVALUATING") return;
        current.evaluation=evaluation; current.status="COMPLETED";
        writeAttempts(all.map(a=>a.id===current.id?current:a));
      }).catch(error => {
        const all=readAttempts(), current=all.find(a=>a.id===attempt.id);
        if(!current) return;
        current.status="FAILED";
        current.evaluation={type:"llm-rubric-v1",error:error.message,retryable:true};
        writeAttempts(all.map(a=>a.id===current.id?current:a));
      });
      return json(res,202,attempt);
    }
    if (req.method === "POST" && url.pathname.endsWith("/retry")) {
      const id = url.pathname.split("/")[3];
      const attempts = readAttempts();
      const current = attempts.find(a=>a.id===id);
      if (!current) return json(res,404,{error:"Attempt not found"});
      const problem = problems.find(p=>p.id===current.problemId);
      current.status="EVALUATING"; current.evaluation=null; writeAttempts(attempts);
      runEvaluation(current, problem).then(evaluation => {
        const all=readAttempts(), item=all.find(a=>a.id===id);
        if(!item) return;
        item.evaluation=evaluation; item.status="COMPLETED";
        writeAttempts(all.map(a=>a.id===id?item:a));
      }).catch(error => {
        const all=readAttempts(), item=all.find(a=>a.id===id);
        if(!item) return;
        item.status="FAILED";
        item.evaluation={type:"llm-rubric-v1",error:error.message,retryable:true};
        writeAttempts(all.map(a=>a.id===id?item:a));
      });
      return json(res,202,current);
    }
    return serveStatic(req,res);
  } catch(e) {
    return json(res,500,{error:"Unexpected server error"});
  }
});
server.listen(PORT,()=>console.log(`LLD Practice Platform running at http://localhost:${PORT}`));
