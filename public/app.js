let problems=[], currentProblem=null;
const $=s=>document.querySelector(s);
const api=async (url,opts)=>{const r=await fetch(url,opts);const d=await r.json();if(!r.ok)throw new Error(d.error||"Request failed");return d};

function show(id){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$("#"+id).classList.add("active");window.scrollTo(0,0)}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{show(b.dataset.tab); if(b.dataset.tab==="history") loadHistory();});
$("#backBtn").onclick=()=>show("practice");

async function loadProblems(){
  problems=await api("/api/problems");
  $("#problemGrid").innerHTML=problems.map(p=>`
    <article class="problem" data-id="${p.id}">
      <span class="tag">${p.difficulty} · ${p.timebox} min</span>
      <h3>${p.title}</h3><p>${p.statement}</p>
      <div class="meta"><span>${p.focus.join(" · ")}</span><span class="arrow">Start →</span></div>
    </article>`).join("");
  document.querySelectorAll(".problem").forEach(x=>x.onclick=()=>openProblem(x.dataset.id));
}
function openProblem(id){
  currentProblem=problems.find(p=>p.id===id);
  $("#problemTitle").textContent=currentProblem.title;
  $("#problemStatement").textContent=currentProblem.statement;
  $("#requirements").innerHTML="<strong>Requirements</strong><ul>"+currentProblem.requirements.map(x=>`<li>${x}</li>`).join("")+"</ul>";
  $("#attemptForm").reset(); $("#feedback").classList.add("hidden"); $("#statusPill").textContent="DRAFT"; $("#formError").textContent="";
  show("workspace");
}
$("#attemptForm").onsubmit=async e=>{
  e.preventDefault(); $("#formError").textContent="";
  const data=Object.fromEntries(new FormData(e.target).entries());
  const key=crypto.randomUUID();
  try{
    const a=await api("/api/attempts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,problemId:currentProblem.id,idempotencyKey:key})});
    $("#statusPill").textContent=a.status; $("#feedback").classList.remove("hidden");
    $("#feedback").innerHTML="<h3>Saved. Gemini AI evaluation in progress…</h3><p>Your submission is persisted first. The LLM now evaluates it against the fixed LLD rubric.</p>";
    poll(a.id);
  }catch(err){$("#formError").textContent=err.message}
};
async function poll(id){
  for(let i=0;i<12;i++){
    await new Promise(r=>setTimeout(r,400));
    const a=await api("/api/attempts/"+id); $("#statusPill").textContent=a.status;
    if(a.status==="COMPLETED"||a.status==="FAILED"){renderFeedback(a); return;}
  }
}
function renderFeedback(a){
  const e=a.evaluation;
  if(a.status==="FAILED"){ $("#feedback").innerHTML=`<h3>Gemini AI evaluation failed</h3><p>${e.error || "The evaluator failed."}</p><p>Your submission is saved. Retry after the API is available.</p>`; return; }
  $("#feedback").innerHTML=`<div class="score"><div><div class="eyebrow">GEMINI AI RUBRIC REVIEW · ${e.model || "Gemini"}</div><div class="score-num">${e.percentage}%</div></div><p>${e.summary}</p></div>
  ${e.criteria.map(c=>`<div class="criterion"><strong>${c.criterion}</strong><strong>${c.score}/5</strong><div><div>${c.evidence}</div><small>Concern: ${c.concern}<br>Suggestion: ${c.suggestion}<br>Confidence: ${Math.round(c.confidence*100)}%</small></div></div>`).join("")}`;
}
async function loadHistory(){
  const items=await api("/api/attempts");
  $("#historyList").innerHTML=items.length?items.map(a=>`
    <article class="attempt"><div><strong>${a.problemTitle}</strong><small>${new Date(a.createdAt).toLocaleString()} · ${a.status}</small></div>
    <div>${a.evaluation?`<b>${a.evaluation.percentage}%</b>`:`—`}</div></article>`).join(""):`<div class="requirements">No attempts yet. Complete your first practice session.</div>`;
}
$("#refreshHistory").onclick=loadHistory;
loadProblems();
