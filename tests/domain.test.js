const test = require("node:test");
const assert = require("node:assert/strict");
const Attempt = require("../src/domain/Attempt");

test("attempt follows the expected evaluation lifecycle", () => {
  const a = new Attempt({id:"a1", problemId:"parking-lot", submission:{}});
  a.transition("SUBMITTED").transition("EVALUATING").transition("COMPLETED");
  assert.equal(a.status, "COMPLETED");
});

test("invalid attempt transitions are rejected", () => {
  const a = new Attempt({id:"a1", problemId:"parking-lot", submission:{}});
  assert.throws(() => a.transition("COMPLETED"), /Invalid transition/);
});

test("completed attempts cannot be evaluated twice through the domain state machine", () => {
  const a = new Attempt({id:"a1", problemId:"parking-lot", submission:{}});
  a.transition("SUBMITTED").transition("EVALUATING").transition("COMPLETED");
  assert.throws(() => a.transition("EVALUATING"), /Invalid transition/);
});
