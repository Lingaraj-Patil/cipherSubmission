class Evaluation {
  constructor({criteria, summary, evaluatorType}) {
    this.criteria=criteria; this.summary=summary; this.evaluatorType=evaluatorType;
  }
  percentage() {
    const max=this.criteria.length*5;
    const total=this.criteria.reduce((sum,c)=>sum+c.score,0);
    return max ? Math.round(total/max*100) : 0;
  }
}
module.exports = Evaluation;
