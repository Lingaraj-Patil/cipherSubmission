class Rubric {
  constructor(criteria) { this.criteria = [...criteria]; }
  maxScore() { return this.criteria.length * 5; }
}
module.exports = Rubric;
