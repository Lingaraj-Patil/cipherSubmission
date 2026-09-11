const Evaluator = require("./Evaluator");
class DeterministicEvaluator extends Evaluator {
  constructor(rubric) { super(); this.rubric=rubric; }
  evaluate(submission) {
    const text=Object.values(submission).join(" ").toLowerCase();
    return this.rubric.criteria.map(c=>({
      criterion:c,
      score: text.includes(c.toLowerCase().split(" ")[0]) ? 4 : 2
    }));
  }
}
module.exports = DeterministicEvaluator;
