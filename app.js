const CSV_FILE = 'questions.csv';
const BRANCHES = [
  { id: 'thieu', label: 'Ngành Thiếu' },
  { id: 'oanh', label: 'Oanh Vũ' },
];

let questions = [];
let teams = ['Đội 1', 'Đội 2', 'Đội 3', 'Đội 4'];
let scores = createEmptyScores();
let activeTeam = 0;
let activeBranch = 0;
let pack = null;
let pool = [];
let idx = 0;
let locked = false;
let timer = null;
let timeLeft = 15;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  renderLoading();

  try {
    questions = await loadQuestions(CSV_FILE);
    startSetup();
  } catch (error) {
    renderError(error);
  }
}

function render(html) {
  document.getElementById('app').innerHTML = html;
}

function renderLoading() {
  render(`<div class="screen"><div class="card">
    <h1>🔔 RUNG CHUÔNG VÀNG</h1>
    <div class="sub">Đang tải câu hỏi...</div>
  </div></div>`);
}

function renderError(error) {
  render(`<div class="screen"><div class="card">
    <h1>Không tải được câu hỏi</h1>
    <p class="note">${escapeHtml(error.message)}</p>
  </div></div>`);
}

async function loadQuestions(fileName) {
  const response = await fetch(fileName, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Không tìm thấy hoặc không đọc được ${fileName}.`);
  }

  const csvText = await response.text();
  return mapQuestionsFromCsv(csvText);
}

function mapQuestionsFromCsv(csvText) {
  const rows = parseCsv(csvText).filter((row) => row.some((cell) => cell.trim()));

  if (rows.length < 2) {
    throw new Error('File CSV chưa có dữ liệu câu hỏi.');
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const requiredHeaders = ['pack', 'branch', 'question', 'answer_a', 'answer_b', 'answer_c', 'answer_d', 'correct'];

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`File CSV thiếu cột "${header}".`);
    }
  }

  return rows.slice(1).map((row, rowIndex) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = (row[index] || '').trim();
    });

    const correct = parseCorrectAnswer(record.correct);
    const branch = normalizeBranch(record.branch);
    const mappedQuestion = {
      pack: Number(record.pack),
      branch,
      q: record.question,
      a: [record.answer_a, record.answer_b, record.answer_c, record.answer_d],
      correct,
    };

    if (!Number.isInteger(mappedQuestion.pack)) {
      throw new Error(`Dòng ${rowIndex + 2}: cột pack không hợp lệ.`);
    }

    if (!mappedQuestion.q || mappedQuestion.a.some((answer) => !answer)) {
      throw new Error(`Dòng ${rowIndex + 2}: câu hỏi hoặc đáp án đang bị trống.`);
    }

    return mappedQuestion;
  });
}

function normalizeBranch(value) {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '_');

  if (['thieu', 'nganh_thieu', 'nganhthieu'].includes(normalized)) {
    return 'thieu';
  }

  if (['oanh', 'oanh_vu', 'oanhvu'].includes(normalized)) {
    return 'oanh';
  }

  throw new Error(`Ngành "${value}" không hợp lệ. Hãy dùng "thieu" hoặc "oanh".`);
}

function parseCorrectAnswer(value) {
  const normalized = value.trim().toUpperCase();
  const letters = ['A', 'B', 'C', 'D'];

  if (letters.includes(normalized)) {
    return letters.indexOf(normalized);
  }

  const number = Number(normalized);

  if (Number.isInteger(number) && number >= 0 && number <= 3) {
    return number;
  }

  if (Number.isInteger(number) && number >= 1 && number <= 4) {
    return number - 1;
  }

  throw new Error(`Đáp án đúng "${value}" không hợp lệ. Hãy dùng A, B, C hoặc D.`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  row.push(field);

  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function createEmptyScores() {
  return teams.map(() => BRANCHES.map(() => 0));
}

function getActiveBranchId() {
  return BRANCHES[activeBranch].id;
}

function getBranchLabel(branchId) {
  return BRANCHES.find((branch) => branch.id === branchId)?.label || branchId;
}

function getActiveBranchLabel() {
  return BRANCHES[activeBranch].label;
}

function getTeamTotal(teamIndex) {
  return scores[teamIndex].reduce((sum, score) => sum + score, 0);
}

function startSetup(isRenaming = false) {
  const heading = isRenaming ? 'Đổi tên 4 đội' : 'Nhập tên 4 đội';
  const buttonLabel = isRenaming ? 'Lưu tên đội →' : 'Bắt đầu cuộc thi →';

  render(`<div class="screen"><div class="card">
    <h1>🔔 RUNG CHUÔNG VÀNG</h1>
    <div class="sub">Phiên bản tương tác dành cho 4 đội</div>
    <h2>${heading}</h2>
    <div class="team-grid">${teams.map((team, i) => `<input id="t${i}" value="${escapeHtml(team)}" placeholder="Tên đội ${i + 1}">`).join('')}</div>
    <button onclick="saveTeams()">${buttonLabel}</button>
    <p class="note">Sau khi bắt đầu, MC có thể chọn gói câu hỏi, chọn đáp án A/B/C/D, hệ thống tự chấm điểm và cập nhật bảng điểm.</p>
  </div></div>`);
}

function saveTeams() {
  teams = [0, 1, 2, 3].map((i) => document.getElementById(`t${i}`).value.trim() || `Đội ${i + 1}`);
  showPacks();
}

function scoreboard() {
  return `<div class="scoreboard">${teams.map((team, teamIndex) => `<div class="score ${teamIndex === activeTeam ? 'active-team' : ''}">
    <div class="score-name">${escapeHtml(team)}</div>
    <div class="score-total"><b id="score-total-${teamIndex}">${getTeamTotal(teamIndex)}</b><span>tổng điểm</span></div>
    <div class="score-branches">${BRANCHES.map((branch, branchIndex) => `<div class="score-branch ${teamIndex === activeTeam && branchIndex === activeBranch ? 'active' : ''}">
      <span>${branch.label}</span><b id="score-${teamIndex}-${branchIndex}">${scores[teamIndex][branchIndex]}</b>
    </div>`).join('')}</div>
  </div>`).join('')}</div>`;
}

function teamSelector() {
  return `<div class="team-selector">
    <div class="team-selector-label">Đội đang trả lời</div>
    <div class="team-options">${teams.map((team, i) => `<button class="team-option ${i === activeTeam ? 'active' : ''}" onclick="selectTeam(${i})">${escapeHtml(team)}</button>`).join('')}</div>
  </div>`;
}

function branchSelector() {
  return `<div class="branch-selector">
    <div class="branch-selector-label">Ngành câu hỏi</div>
    <div class="branch-options">${BRANCHES.map((branch, i) => `<button class="branch-option ${i === activeBranch ? 'active' : ''}" onclick="selectBranch(${i})">${branch.label}</button>`).join('')}</div>
  </div>`;
}

function selectionControls() {
  return `<div class="selection-controls">${teamSelector()}${branchSelector()}</div>`;
}

function refreshScoreboard() {
  const board = document.querySelector('.scoreboard');

  if (board) {
    board.outerHTML = scoreboard();
  }
}

function selectTeam(teamIndex) {
  activeTeam = teamIndex;

  const selector = document.querySelector('.team-selector');
  refreshScoreboard();

  if (selector) {
    selector.outerHTML = teamSelector();
  }
}

function selectBranch(branchIndex) {
  activeBranch = branchIndex;

  if (document.querySelector('.pack-grid')) {
    showPacks();
    return;
  }

  const selector = document.querySelector('.branch-selector');
  refreshScoreboard();

  if (selector) {
    selector.outerHTML = branchSelector();
  }
}

function resetScores() {
  if (!confirm('Bạn có chắc muốn reset toàn bộ điểm về 0?')) {
    return;
  }

  scores = createEmptyScores();
  showPacks();
}

function showPacks() {
  const currentBranchId = getActiveBranchId();
  const totalQuestions = questions.filter((question) => question.branch === currentBranchId).length;
  const packCounts = [1, 2, 3, 4].map((packNumber) => questions.filter((question) => question.pack === packNumber && question.branch === currentBranchId).length);

  render(`<div class="screen"><div class="card">
    <div class="top">
      <div><h1>🎯 CHỌN GÓI CÂU HỎI</h1><div class="sub">Chọn một trong 4 gói</div></div>
      <div class="top-actions">
        <button class="secondary" onclick="startSetup(true)">Đổi tên đội</button>
        <button class="danger" onclick="resetScores()">Reset điểm</button>
      </div>
    </div>
    ${scoreboard()}
    ${selectionControls()}
    <div class="grid pack-grid">
      <button class="pack" onclick="choosePack(1)" ${packCounts[0] === 0 ? 'disabled' : ''}>🟢 GÓI 1<small>Kiến thức cơ bản · ${packCounts[0]} câu</small></button>
      <button class="pack" onclick="choosePack(2)" ${packCounts[1] === 0 ? 'disabled' : ''}>🔵 GÓI 2<small>Kiến thức tổng hợp · ${packCounts[1]} câu</small></button>
      <button class="pack" onclick="choosePack(3)" ${packCounts[2] === 0 ? 'disabled' : ''}>🟡 GÓI 3<small>Logistics · ${packCounts[2]} câu</small></button>
      <button class="pack" onclick="choosePack(4)" ${packCounts[3] === 0 ? 'disabled' : ''}>🔴 GÓI 4<small>Vu Lan & kỹ năng · ${packCounts[3]} câu</small></button>
    </div>
    <p class="note">Bộ ${getActiveBranchLabel()}: ${totalQuestions} câu. Mỗi câu đúng: +10 điểm cho đội và ngành đang chọn.</p>
  </div></div>`);
}

function choosePack(selectedPack) {
  pack = selectedPack;
  pool = questions.filter((question) => question.pack === selectedPack && question.branch === getActiveBranchId());
  idx = 0;
  showQuestion();
}

function showQuestion() {
  if (idx >= pool.length) {
    showPacks();
    return;
  }

  locked = false;
  timeLeft = 15;
  clearInterval(timer);

  const question = pool[idx];

  render(`<div class="screen"><div class="card">
    <div class="top"><div><b>GÓI ${pack}</b> · ${getBranchLabel(question.branch)} · CÂU ${idx + 1}/${pool.length}</div><div class="timer" id="timer">15s</div></div>
    ${scoreboard()}
    ${teamSelector()}
    <div class="q">${escapeHtml(question.q)}</div>
    <div class="answers">${question.a.map((answer, i) => `<button id="ans${i}" onclick="answer(${i})"><b>${String.fromCharCode(65 + i)}.</b> ${escapeHtml(answer)}</button>`).join('')}</div>
    <div id="feedback" class="feedback"></div>
    <div id="nextbox" class="hidden"><button class="next" onclick="nextQuestion()">Câu tiếp theo →</button></div>
  </div></div>`);

  timer = setInterval(() => {
    timeLeft--;
    const timerElement = document.getElementById('timer');

    if (timerElement) {
      timerElement.textContent = `${timeLeft}s`;
    }

    if (timeLeft <= 0) {
      clearInterval(timer);
      answer(-1);
    }
  }, 1000);
}

function answer(choice) {
  if (locked) return;

  locked = true;
  clearInterval(timer);

  const question = pool[idx];
  const feedback = document.getElementById('feedback');

  question.a.forEach((_, i) => {
    document.getElementById(`ans${i}`).disabled = true;
  });

  document.getElementById(`ans${question.correct}`).classList.add('correct');

  if (choice === question.correct) {
    scores[activeTeam][activeBranch] += 10;
    refreshScoreboard();
    feedback.innerHTML = `🎉 <b>CHÍNH XÁC! ${escapeHtml(teams[activeTeam])} - ${getActiveBranchLabel()} +10 điểm</b>`;
  } else if (choice === -1) {
    feedback.innerHTML = `⏰ <b>HẾT GIỜ!</b> Đáp án đúng: ${String.fromCharCode(65 + question.correct)}. ${escapeHtml(question.a[question.correct])}`;
  } else {
    document.getElementById(`ans${choice}`).classList.add('wrong');
    feedback.innerHTML = `❌ <b>CHƯA ĐÚNG!</b> Đáp án đúng: ${String.fromCharCode(65 + question.correct)}. ${escapeHtml(question.a[question.correct])}`;
  }

  document.getElementById('nextbox').classList.remove('hidden');
}

function nextQuestion() {
  idx++;
  showQuestion();
}

function endGame() {
  const ranking = teams
    .flatMap((team, teamIndex) => BRANCHES.map((branch, branchIndex) => ({
      name: `${team} - ${branch.label}`,
      score: scores[teamIndex][branchIndex],
    })))
    .sort((a, b) => b.score - a.score);

  render(`<div class="screen"><div class="card final"><h1>🏆 KẾT QUẢ CHUNG CUỘC</h1>${scoreboard()}
    <ol>${ranking.map((item) => `<li><b>${escapeHtml(item.name)}</b> — ${item.score} điểm</li>`).join('')}</ol>
    <button onclick="showPacks()">Quay lại bảng chọn gói</button></div></div>`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
