class Problem {
  constructor({id, title, requirements, rubric}) {
    this.id = id; this.title = title;
    this.requirements = [...requirements];
    this.rubric = [...rubric];
  }
}
module.exports = Problem;
