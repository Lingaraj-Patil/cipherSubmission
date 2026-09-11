const VALID_STATES = new Set(["DRAFT","SUBMITTED","EVALUATING","COMPLETED","FAILED"]);
class Attempt {
  constructor({id, problemId, submission, status="DRAFT"}) {
    if (!id || !problemId) throw new Error("id and problemId are required");
    this.id=id; this.problemId=problemId; this.submission=submission; this.status=status;
  }
  transition(next) {
    const allowed = {DRAFT:["SUBMITTED"], SUBMITTED:["EVALUATING"], EVALUATING:["COMPLETED","FAILED"], FAILED:["EVALUATING"], COMPLETED:[]};
    if (!VALID_STATES.has(next) || !allowed[this.status].includes(next)) throw new Error(`Invalid transition ${this.status} -> ${next}`);
    this.status=next; return this;
  }
}
module.exports = Attempt;
