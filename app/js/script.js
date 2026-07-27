/* ---------------- data loading ---------------- */
let PROBLEMS = [];

async function loadProblems(){
  try {
    const res = await fetch('output/output.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    PROBLEMS = await res.json();
    initFilters();
  } catch (err) {
    console.error('Failed to load output.json:', err);
    $('#pool-count').textContent = '0';
    $('#btn-to-reel').disabled = true;

    // Optional: surface this to the user instead of failing silently
    $('#screen-filter .card').insertAdjacentHTML('afterbegin',
      '<p style="color:var(--error)">Could not load problem data.</p>');
  }
}

loadProblems();

/* ---------------- state ---------------- */
let pool = [];
let n = 0;
let ncopy = 3;
let park_box_top = 0;
let parkHeight = 0;
const selected = {competition:new Set(), stage:new Set(), year:new Set()}

/* ---------------- helpers ---------------- */
const $ = (sel) => document.querySelector(sel);
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
  $('#' + id).scrollIntoView();
}

function uniqueValues(field){
  return [...new Set(PROBLEMS.map(p => p[field]))].sort();
}

/* ---------------- 1. filter screen ---------------- */;
function recomputePool(){
  pool = PROBLEMS.filter(p =>
    (selected.competition.size === 0 || selected.competition.has(p.competition)) &&
    (selected.stage.size === 0 || selected.stage.has(p.stage)) &&
    (selected.year.size === 0 || selected.year.has(p.year))
  );
  $('#pool-count').textContent = pool.length;
  $('#btn-to-reel').disabled = pool.length === 0;
}

function buildChipRow(containerId, field, values){
  const el = $('#' + containerId);
  el.innerHTML = '';
  values.forEach(v => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.classList.add('chip', 'dark-shadow');
    chip.textContent = v;
    chip.addEventListener('click', () => {
      if (selected[field].has(v)) { selected[field].delete(v); chip.classList.remove('selected'); }
      else { selected[field].add(v); chip.classList.add('selected'); }
      recomputePool();
    });
    el.appendChild(chip);
  });
}

function initFilters(){
  buildChipRow('filter-competition', 'competition', uniqueValues('competition'));
  buildChipRow('filter-stage', 'stage', uniqueValues('stage'));
  buildChipRow('filter-year', 'year', uniqueValues('year'));
  recomputePool();
}

function clearFilters() {
    pool = PROBLEMS;
    selected.competition.clear();
    selected.stage.clear();
    selected.year.clear();

    document.querySelectorAll(".chip.selected").forEach(chip =>
        chip.classList.remove("selected")
    );

    $("#pool-count").textContent = pool.length;
}
$("#btn-clear-filters").addEventListener("click", clearFilters);

/* ---------------- Go to Reel---------------- */
function showtheProblems(){
  const track = $('#reel-track');
  if (!track) return;

  track.innerHTML = '';
  const fragment = document.createDocumentFragment();

  for (let j = 0 ; j<ncopy ; j++){
    pool.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'reel-item';
      div.textContent = `${p.competition} ${p.stage} ${p.year}, Problem ${p.number}`;
      fragment.appendChild(div);
    });
  }

  track.appendChild(fragment);
}

let reelLength = 0;
let spin_duration = 0; // in second

function toreelPage(){
  n = pool.length;
  if (n<=100){
    spin_duration = 2;
  }
  else if (n<=500){
    spin_duration = (n-100) / 400 + 2;
  }
  else {
    spin_duration = 3;
  }

  showScreen('screen-reel');
  showtheProblems();

  park_box_top = $('#reel-center-line').offsetTop;
  parkHeight = $('#reel-center-line').offsetHeight;
  reelLength = n * parkHeight;
  track = $('#reel-track');
  track.style.top = `${park_box_top - n * parkHeight}px`;

  $('#timer-setup').style.visibility = 'hidden';
  $('#btn-start-shuffle').style.visibility = 'visible';
}

$('#btn-to-reel').addEventListener("click", () => {
  toreelPage();
});

document.addEventListener('keydown', (e) => { 
  if (e.key === 'Enter' && $('#screen-filter').classList.contains('active') && !$('#btn-to-reel').disabled) { 
    toreelPage();
  }
});

/* ---------------- 2. gacha reel ---------------- */
let offset = 0;
let distance = 0;
function animate(targetDistance) {
  let speed = 16 / (1000 * spin_duration) * targetDistance;
  offset += speed;
  offset = offset % reelLength;
  track.style.transform = `translateY(${-offset}px)`;

  distance += speed;
  if (distance < targetDistance) {
      requestAnimationFrame(() => animate(targetDistance));
  }
  else{
      offset = targetDistance % reelLength;
      track.style.transform = `translateY(${-offset}px)`;
      track.classList.remove('spinning');
      track.classList.add('settled');

      $('#drawn-id-block').style.visibility = 'visible';
      $('#timer-setup').style.visibility = 'visible';
  }
}

let isdrawn = false;
let temp = 0;
let idxdrawn = 0;
function btnClicked(){
    offset = 0;
    distance = 0;

    if(isdrawn){
    track.querySelector('.is-target').classList.remove('is-target');
    }

    idxdrawn = Math.floor(Math.random() * n) + 1;
    let item =  track.querySelectorAll('.reel-item')[n + idxdrawn-1]
    let drawn = pool[idxdrawn-1];
    let loops = (n * ncopy) >= 100 ? 1 : 2; //how many time pass the end of one reel
    let targetDistance = loops * reelLength + (idxdrawn - 1) * parkHeight;

    item.classList.add('is-target','drawn-id-value','drawn-id-block');
    track.classList.add('spinning');
    track.classList.remove('settled');

    $('#drawn-id-value').textContent = `${drawn.competition} ${drawn.stage} ${drawn.year}, Problem ${drawn.number}`;    
    $('#drawn-id-block').style.visibility = 'hidden';
    $('#timer-setup').style.visibility = 'hidden';

    animate(targetDistance);
    
    isdrawn = true;
    $('#btn-shuffle-placeholder').style.display = 'none';
    $('#btn-start-shuffle').style.visibility = 'none';
}

$('#btn-start-shuffle').addEventListener("click", function (){
  btnClicked();
});


$('#btn-again').addEventListener('click', () => {
  showScreen('screen-reel');
  $('#timer-setup').style.visibility = 'hidden';
  btnClicked();
});

/* ---------------- timer setup ---------------- */
let duration = 60;
let remaining = 60;
let timerHandle = null;
let dur = 0;

function getDuration() {
    const min = parseInt(document.getElementById("timer-min").value) || 0;
    const sec = parseInt(document.getElementById("timer-sec").value) || 0;
    return min * 60 + sec;
}

$('#btn-proceed').addEventListener("click", function() {
    dur = getDuration();
    enterProblemScreen();
});

/* ---------------- 3. problem + timer ---------------- */
function enterProblemScreen(){
  showScreen('screen-problem');
  drawn = pool[idxdrawn-1];
  $('#problem-meta').innerHTML = `
    <span class="tag">${drawn.competition}</span>
    <span class="tag">${drawn.stage}</span>
    <span class="tag">${drawn.year}</span>
    <span class="tag">Problem ${drawn.number}</span>
  `;
  $('#problem-title').textContent = `${drawn.competition} ${drawn.stage} ${drawn.year}, Problem ${drawn.number}`;
  $("#btn-stop-timer").style.display = "block";
  $('#warning-banner').classList.remove('show');
  $('#btn-reveal').style.display = 'none';
  $('#answer-box').classList.remove('show');
  $('#btn-again-after-problem').style.display = 'none';
  $('#problem-statement').innerHTML = drawn.statement;
  setTimeout(() => {
      MathJax.typesetPromise([$('#problem-statement')]);
  }, 0);
  remaining = dur;
  updateRing();
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    remaining--;
    updateRing();
    if (remaining <= 0) {
      clearInterval(timerHandle);
      onTimeUp();
    }
  }, 1000);
}

function updateRing(){
  const ring = $('#timer-ring');
  const s = Math.max(remaining, 0);
  const mins = Math.floor(s / 60).toString().padStart(2, '0');
  const secs = (s % 60).toString().padStart(2, '0');
  ring.innerHTML = `<span class="timer-icon" aria-hidden="true">&#9201;</span> ${mins}:${secs}`;
  ring.className = 'timer-ring ' + (remaining <= 0 ? 'up' : remaining <= 10 ? 'low' : 'ok');
}

function onTimeUp(){
  remaining = 0;
  updateRing();
  $('#warning-banner').classList.add('show');
  $('#btn-reveal').style.display = 'block';
  $('#btn-again-after-problem').style.display = 'block';
  $('#warning-banner').style.display = 'block';
  $("#btn-stop-timer").style.display = "none";
}

$("#btn-stop-timer").addEventListener("click", () => {
    clearInterval(timerHandle);
    onTimeUp();
    $("#btn-stop-timer").style.display = "none";
});

$('#btn-reveal').addEventListener('click', () => {
  $("#warning-banner").style.display = "none";
  const box = $('#answer-box');
  const text = $('#answer-text');
  if (drawn.answer && drawn.answer.trim() !== '') {
    box.classList.remove('empty');
    text.textContent = drawn.answer;
  } else {
    box.classList.add('empty');
    text.textContent = 'The answer is not added yet.';
  }
  box.classList.add('show');
  if (window.MathJax) MathJax.typesetPromise([text]);
});

$('#btn-again-after-problem').addEventListener('click', () => {
  clearInterval(timerHandle);
  showScreen('screen-reel');
  $('#drawn-id-block').style.visibility = 'hidden';
  $('#timer-setup').style.visibility = 'hidden';
  btnClicked();
  $('#warning-banner').style.display = 'none';
});