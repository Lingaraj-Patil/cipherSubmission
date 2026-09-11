const OpenAI = require("openai");

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

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "integer", minimum: 8, maximum: 40 },
    summary: { type: "string" },
    criteria: {
      type: "array", minItems: 8, maxItems: 8,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          criterion: { type: "string", enum: RUBRIC },
          score: { type: "integer", minimum: 1, maximum: 5 },
          evidence: { type: "string" },
          concern: { type: "string" },
          suggestion: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["criterion","score","evidence","concern","suggestion","confidence"]
      }
    }
  },
  required: ["overallScore","summary","criteria"]
};

class LlmEvaluator {
  constructor({apiKey=process.env.OPENAI_API_KEY, model=process.env.OPENAI_MODEL||"gpt-5.6-luna"}={}) {
    this.model=model;
    this.client=apiKey ? new OpenAI({apiKey}) : null;
  }
  isConfigured(){ return Boolean(this.client); }

  async evaluate({problem, submission}) {
    if (!this.client) throw new Error("OPENAI_API_KEY is not configured. Set it on the server before submitting for AI evaluation.");

    const prompt=`You are an expert Low-Level Design interviewer and reviewer.

Evaluate the learner's design for the supplied problem. Multiple LLD designs can be valid.
Judge only the evidence in the learner submission. Do not compare it to one canonical solution.
Do not award points for buzzwords merely being mentioned. If something is absent, say it is absent.
Do not invent evidence.

Score each of these 8 criteria from 1 to 5:
${RUBRIC.map((r,i)=>`${i+1}. ${r}`).join("\n")}

For every criterion return:
- score
- evidence from the actual submission
- concern
- actionable suggestion
- confidence from 0 to 1

The overall score must be the sum of the eight criterion scores.

PROBLEM
Title: ${problem.title}
Statement: ${problem.statement}
Requirements:
${problem.requirements.map((x,i)=>`${i+1}. ${x}`).join("\n")}

LEARNER SUBMISSION
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
${submission.tradeoffs}`;

    const response=await this.client.responses.create({
      model:this.model,
      instructions:"Return only the structured evaluation. Be rigorous, fair, specific and evidence-based.",
      input:prompt,
      text:{format:{type:"json_schema",name:"lld_evaluation",strict:true,schema}},
      reasoning:{effort:"medium"}
    });

    if(response.status!=="completed") throw new Error(`LLM evaluation did not complete: ${response.status||"unknown status"}`);
    let parsed;
    try { parsed=JSON.parse(response.output_text); }
    catch { throw new Error("LLM returned invalid structured evaluation JSON."); }

    if(!Array.isArray(parsed.criteria)||parsed.criteria.length!==8) throw new Error("LLM evaluation returned an invalid criterion count.");
    const allowed=new Set(RUBRIC);
    for(const c of parsed.criteria){
      if(!allowed.has(c.criterion)||c.score<1||c.score>5) throw new Error("LLM evaluation failed rubric validation.");
    }
    const total=parsed.criteria.reduce((sum,c)=>sum+c.score,0);
    return {
      type:"llm-rubric-v1", model:this.model, responseId:response.id,
      totalScore:total, maxScore:40, percentage:Math.round(total/40*100),
      summary:parsed.summary, criteria:parsed.criteria
    };
  }
}
module.exports={LlmEvaluator,RUBRIC};
