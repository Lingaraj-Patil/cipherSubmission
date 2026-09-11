const { GoogleGenAI } = require("@google/genai");

const RUBRIC = [
  "Requirement understanding",
  "Class responsibilities",
  "Coupling / cohesion",
  "Encapsulation and interfaces",
  "Appropriate abstraction / patterns",
  "Extensibility",
  "Edge cases and testability",
  "Quality of explanation"
];

const responseSchema = {
  type: "object",
  properties: {
    overallScore: { type: "integer" },
    summary: { type: "string" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          criterion: { type: "string", enum: RUBRIC },
          score: { type: "integer" },
          evidence: { type: "string" },
          concern: { type: "string" },
          suggestion: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["criterion","score","evidence","concern","suggestion","confidence"]
      }
    }
  },
  required: ["overallScore","summary","criteria"]
};

class GeminiEvaluator {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
  } = {}) {
    this.model = model;
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  isConfigured() {
    return Boolean(this.client);
  }

  async evaluate({ problem, submission }) {
    if (!this.client) {
      throw new Error("GEMINI_API_KEY is not configured. Add a Gemini API key to the server environment.");
    }

    const prompt = `
You are an expert Low-Level Design interviewer and reviewer.

Evaluate the learner's LLD design for the supplied problem. Multiple designs can be valid.
Do NOT compare the learner to one canonical class diagram. Judge only evidence in the learner submission.

Score each criterion from 1 to 5:
5 excellent, 4 good, 3 acceptable with gaps, 2 weak, 1 missing/incorrect.

Rules:
- Never award points merely because a pattern or buzzword is mentioned.
- Evidence must refer to the learner's actual submission.
- Do not invent classes, relationships, requirements or behaviour.
- Distinguish missing explanation from incorrect design.
- Suggestions must be concrete and actionable.
- Return exactly one result for every rubric criterion.
- overallScore must equal the sum of the eight criterion scores.
- confidence must be between 0 and 1.

RUBRIC:
${RUBRIC.map((r,i)=>`${i+1}. ${r}`).join("\n")}

PROBLEM:
Title: ${problem.title}
Statement: ${problem.statement}
Requirements:
${problem.requirements.map((x,i)=>`${i+1}. ${x}`).join("\n")}

LEARNER SUBMISSION:
Requirements & assumptions:
${submission.requirements}

Domain classes:
${submission.classes}

Relationships:
${submission.relationships}

Behaviour & flow:
${submission.behavior}

Edge cases & testability:
${submission.assumptions}

Trade-offs & extensibility:
${submission.tradeoffs}
`;

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    const raw = response.text;
    if (!raw) throw new Error("Gemini returned an empty evaluation.");

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { throw new Error("Gemini returned invalid JSON."); }

    if (!Array.isArray(parsed.criteria) || parsed.criteria.length !== RUBRIC.length) {
      throw new Error("Gemini evaluation returned an invalid criterion count.");
    }

    const allowed = new Set(RUBRIC);
    for (const c of parsed.criteria) {
      if (!allowed.has(c.criterion) || !Number.isInteger(c.score) || c.score < 1 || c.score > 5) {
        throw new Error("Gemini evaluation failed rubric validation.");
      }
      if (typeof c.confidence !== "number" || c.confidence < 0 || c.confidence > 1) {
        throw new Error("Gemini evaluation returned invalid confidence.");
      }
    }

    const total = parsed.criteria.reduce((sum,c)=>sum+c.score,0);
    return {
      type: "gemini-rubric-v1",
      model: this.model,
      totalScore: total,
      maxScore: 40,
      percentage: Math.round(total / 40 * 100),
      summary: parsed.summary,
      criteria: parsed.criteria
    };
  }
}

module.exports = { GeminiEvaluator, RUBRIC };
