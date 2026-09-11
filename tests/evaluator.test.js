const test=require("node:test");
const assert=require("node:assert/strict");
const {GeminiEvaluator,RUBRIC}=require("../src/services/GeminiEvaluator");

test("fixed rubric contains eight unique criteria",()=>{
  assert.equal(RUBRIC.length,8);
  assert.equal(new Set(RUBRIC).size,8);
});

test("Gemini evaluator reports missing configuration instead of inventing feedback",async()=>{
  const evaluator=new GeminiEvaluator({apiKey:""});
  assert.equal(evaluator.isConfigured(),false);
  await assert.rejects(
    evaluator.evaluate({problem:{title:"x",statement:"x",requirements:[]},submission:{}}),
    /GEMINI_API_KEY/
  );
});
