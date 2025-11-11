// Crossword Layout Editor — 15×15
// Saves to localStorage; export/import JSON; manual numbering; auto-numbering.

const app = document.getElementById("app");
app.innerHTML = `
<style>
:root{
  --teal:#1f9dbf; --gold:#f5b041; --bg:#faf9f6; --card:#fff;
  --thin:#ddd; --gold-shade:#faf1de; --text:#222;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--text);
  font-family:"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1100px;margin:0 auto;padding:16px}
.header{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
h1{margin:0;color:var(--teal);font-size:clamp(1.2rem,4vw,1.8rem)}
.card{background:var(--card);border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,.06);padding:14px;margin-top:12px}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
label{font-size:0.95rem}
input[type="text"],select,textarea{
  border:1px solid var(--thin);border-radius:8px;padding:8px 10px;font-size:0.95rem;background:#fff
}
textarea{width:100%;min-height:120px}
button{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
.btn{background:#f1f1f1}
.btn-teal{background:var(--teal);color:#fff}
.btn-gold{background:var(--gold);color:#222}
.btn-danger{background:#ef5350;color:#fff}
.row{display:flex;gap:12px;flex-wrap:wrap}
.col{flex:1;min-width:260px}
.grid-wrap{display:flex;justify-content:center}
.grid{
  --cols:15;
  display:grid;gap:6px;grid-template-columns:repeat(var(--cols),1fr);
  width:min(720px,96vw);padding:10px;background:var(--card);border-radius:12px
}
.cell{
  position:relative;aspect-ratio:1/1;border:1px solid var(--thin);
  background:#fff;border-radius:6px;overflow:hidden;cursor:pointer;
}
.cell.black{background:var(--gold-shade)}
.num{
  position:absolute;top:2px;left:4px;font-size:clamp(9px,1.8vw,14px);
  font-weight:800;color:#333;text-shadow:0 1px 0 #fff
}
.toolbox{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.badge{padding:6px 10px;border-radius:999px;border:1px solid var(--thin);background:#fff}
.active{outline:2px solid var(--teal)}
hr{border:none;border-top:1px solid var(--thin);margin:10px 0}
.small{font-size:.9rem;color:#666}
.toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);
  background:var(--teal);color:#fff;padding:10px 14px;border-radius:10px;
  box-shadow:0 8px 18px rgba(0,0,0,.15);font-weight:700;opacity:0;
  transition:opacity .25s ease,transform .25s ease;z-index:9999}
.toast.show{opacity:1;transform:translateX(-50%) translateY(-4px)}
</style>

<div class="wrap">
  <div class="header">
    <h1>Crossword Layout Editor — 15×15</h1>
    <div class="controls">
      <button id="exportBtn" class="btn-gold">⬇️ Export Puzzle JSON</button>
      <label class="btn">⬆️ Import JSON <input id="importFile" type="file" accept=".json" hidden></label>
      <button id="clearAll" class="btn-danger">🧹 Clear (grid + clues)</button>
    </div>
  </div>

  <div class="card">
    <div class="row">
      <div class="col">
        <div class="controls" style="margin-bottom:8px">
          <label>Title <input id="title" type="text" placeholder="Daily Crossword" value="Daily Crossword"></label>
          <label>Subtitle <input id="subtitle" type="text" placeholder="Around the House" value="Around the House"></label>
          <label>Size
            <select id="size">
              <option value="15x15" selected>15 × 15</option>
              <option value="13x13">13 × 13</option>
              <option value="21x21">21 × 21</option>
            </select>
          </label>
        </div>

        <div class="toolbox">
          <span class="badge" id="toolToggle">🧱 Block tool</span>
          <span class="badge" id="toolNumber">🔢 Number tool</span>
          <button id="autoNumber" class="btn-teal">⚡ Auto-number</button>
          <span class="small">Tip: In Number tool, tap a start cell to set/edit its clue number.</span>
        </div>

        <div class="grid-wrap">
          <div id="grid" class="grid"></div>
        </div>
        <div class="small" style="text-align:center;margin-top:6px">
          Tap cells to toggle blocks. Switch to Number tool to add or edit clue numbers.
        </div>
      </div>

      <div class="col">
        <h3 style="margin:6px 0;color:var(--teal)">Clues</h3>
        <div class="small">Format: <code>1. Clue text</code> (one per line)</div>
        <label>Across<textarea id="across"></textarea></label>
        <label>Down<textarea id="down"></textarea></label>
      </div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin:6px 0;color:var(--teal)">Save & Reset</h3>
    <div class="controls">
      <button id="saveNow" class="btn">💾 Save Now</button>
      <button id="clearProgress" class="btn">🗑️ Clear My Saved Progress</button>
      <span class="small">Auto-save is ON (local to your device).</span>
    </div>
  </div>
</div>

<div id="toast" class="toast">Saved</div>
`;

/* ---------- State ---------- */
let rows=15, cols=15;
let grid = Array.from({length:rows},()=>Array(cols).fill(""));   // ""=white, "#"=black
let numbers = Array.from({length:rows},()=>Array(cols).fill(0)); // 0=no number, else clue start number
let tool = "block"; // "block" or "number"
const LS_KEY="xwd-editor-15x15";

/* ---------- DOM ---------- */
const gridEl = document.getElementById('grid');
const sizeSel= document.getElementById('size');
const toast = document.getElementById('toast');
const titleEl=document.getElementById('title');
const subEl=document.getElementById('subtitle');
const acrossEl=document.getElementById('across');
const downEl=document.getElementById('down');
const toolToggle=document.getElementById('toolToggle');
const toolNumber=document.getElementById('toolNumber');
const exportBtn=document.getElementById('exportBtn');
const importFile=document.getElementById('importFile');
const autoNumberBtn=document.getElementById('autoNumber');
const clearAllBtn=document.getElementById('clearAll');
const saveNowBtn=document.getElementById('saveNow');
const clearProgressBtn=document.getElementById('clearProgress');

function showToast(msg){
  toast.textContent=msg;toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),1200);
}

/* ---------- Build Grid ---------- */
function buildGrid(){
  gridEl.style.setProperty('--cols', cols);
  gridEl.innerHTML='';
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cell=document.createElement('div');
      cell.className='cell'+(grid[r][c]==="#"?' black':'');
      const n = numbers[r][c];
      if(n){ const num=document.createElement('div');num.className='num';num.textContent=n;cell.appendChild(num); }
      cell.addEventListener('click',()=>onCellClick(r,c));
      gridEl.appendChild(cell);
    }
  }
}
function onCellClick(r,c){
  if(tool==="block"){
    grid[r][c] = (grid[r][c]==="#") ? "" : "#";
    if(grid[r][c]==="#") numbers[r][c]=0; // clear number if blocked
  }else{
    if(grid[r][c]==="#"){ showToast("This is a block. Toggle to white first."); return; }
    const current = numbers[r][c]||"";
    const v = prompt("Set clue number for this start cell (leave blank to remove):", current);
    if(v===null) return; // cancelled
    const num = String(v).trim();
    numbers[r][c] = num===""?0:parseInt(num,10)||0;
  }
  buildGrid(); autoSave();
}

/* ---------- Auto-number (standard rules) ---------- */
function autoNumber(){
  let n=1;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(grid[r][c]==="#"){ numbers[r][c]=0; continue; }
      const leftBlocked = (c===0) || grid[r][c-1]==="#";
      const topBlocked  = (r===0) || grid[r-1][c]==="#";
      if(leftBlocked || topBlocked){
        numbers[r][c]=n++;
      } // else keep existing (manual) if any
    }
  }
  buildGrid(); autoSave(); showToast("Auto-numbered");
}

/* ---------- Clue parsing ---------- */
function parseClues(text){
  const out={};
  const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s);
  for(const line of lines){
    const m=line.match(/^(\d+)\.\s*(.+)$/);
    if(m){ out[m[1]]=m[2]; }
  }
  return out;
}

/* ---------- Export / Import ---------- */
function exportJSON(){
  const payload={
    title: titleEl.value||"Daily Crossword",
    subtitle: subEl.value||"",
    rows, cols,
    grid,
    numbers,
    across: parseClues(acrossEl.value),
    down: parseClues(downEl.value)
  };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download="puzzle.json";
  document.body.appendChild(a); a.click(); a.remove();
  showToast("Exported JSON");
}

function importJSONFile(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      rows=data.rows|0; cols=data.cols|0;
      grid=data.grid; numbers=data.numbers||Array.from({length:rows},()=>Array(cols).fill(0));
      titleEl.value=data.title||""; subEl.value=data.subtitle||"";
      acrossEl.value=Object.entries(data.across||{}).map(([k,v])=>`${k}. ${v}`).join('\n');
      downEl.value=Object.entries(data.down||{}).map(([k,v])=>`${k}. ${v}`).join('\n');
      gridEl.style.setProperty('--cols', cols);
      buildGrid(); autoSave(); showToast("Imported");
    }catch(e){ alert("Invalid JSON"); }
  };
  reader.readAsText(file);
}

/* ---------- Auto-save ---------- */
function autoSave(){
  const data={
    rows, cols, grid, numbers,
    title:titleEl.value, subtitle:subEl.value,
    across:acrossEl.value, down:downEl.value
  };
  try{ localStorage.setItem(LS_KEY, JSON.stringify(data)); }catch(e){}
}
function loadSaved(){
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(!raw) return;
    const d=JSON.parse(raw);
    rows=d.rows||15; cols=d.cols||15;
    grid=d.grid||grid; numbers=d.numbers||numbers;
    titleEl.value=d.title||titleEl.value;
    subEl.value=d.subtitle||subEl.value;
    acrossEl.value=d.across||""; downEl.value=d.down||"";
  }catch(e){}
}

/* ---------- Events ---------- */
toolToggle.onclick=()=>{ tool="block"; toolToggle.classList.add('active'); toolNumber.classList.remove('active'); };
toolNumber.onclick=()=>{ tool="number"; toolNumber.classList.add('active'); toolToggle.classList.remove('active'); };
autoNumberBtn.onclick=autoNumber;
exportBtn.onclick=exportJSON;
importFile.onchange=(e)=>{ if(e.target.files[0]) importJSONFile(e.target.files[0]); };
clearAllBtn.onclick=()=>{
  if(!confirm("Clear everything (grid, numbers, clues)?")) return;
  grid=Array.from({length:rows},()=>Array(cols).fill(""));
  numbers=Array.from({length:rows},()=>Array(cols).fill(0));
  acrossEl.value=""; downEl.value="";
  buildGrid(); autoSave();
};
saveNowBtn.onclick=()=>{autoSave(); showToast("Saved");};
clearProgressBtn.onclick=()=>{localStorage.removeItem(LS_KEY); showToast("Cleared saved progress");};

sizeSel.onchange=()=>{
  const val=sizeSel.value; const [r,c]=val.split('x').map(Number);
  if((r!==rows||c!==cols)&&confirm(`Switch grid to ${r}×${c}? Current work will be resized (out-of-range cells lost).`)){
    const newGrid=Array.from({length:r},()=>Array(c).fill(""));
    const newNum=Array.from({length:r},()=>Array(c).fill(0));
    for(let i=0;i<Math.min(rows,r);i++)
      for(let j=0;j<Math.min(cols,c);j++){ newGrid[i][j]=grid[i][j]; newNum[i][j]=numbers[i][j]; }
    rows=r; cols=c; grid=newGrid; numbers=newNum;
    gridEl.style.setProperty('--cols', cols); buildGrid(); autoSave();
  }else{
    sizeSel.value=`${rows}x${cols}`;
  }
};

/* ---------- Init ---------- */
loadSaved();
toolToggle.classList.add('active');
gridEl.style.setProperty('--cols', cols);
buildGrid();
