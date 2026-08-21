const START_CSV_FILE = 'questions_khoidong.csv'; // câu hỏi cho phần thi khởi động
// ======================================================
// CẤU HÌNH PHẦN VỀ ĐÍCH
// =====================================================
const FINISH_TIME = 20; // Thời gian trả lời của đội đang thi chính
const FINISH_STEAL_TIME = 20; // Thời gian trả lời của đội giành quyền
const STEAL_TIME = 10; // Thời gian để các đội giành quyền trả lời
// Số điểm tương ứng với từng mức độ.
const FINISH_POINTS = {
  easy: 10,       // Dễ
  medium: 20,     // Vừa
  hard: 30,       // Khó
};
const FINISH_QUESTIONS_PER_DIFFICULTY = 12; // số câu mỗi mức độ cho mỗi ngành
const FINISH_QUESTIONS_PER_TEAM = 3; // số câu mỗi đội chọn trong phần Về đích
const FINISH_STAR_MULTIPLIER = 2; // hệ số nhân điểm khi dùng ngôi sao hy vọng
const FINISH_STEAL_PENALTY = 0.5; // % số điểm khi trả lời sai phần giành quyền (về đích)
let finishStealTeam = null; //đội giành quyền trả lời
let finishStealTimeLeft = FINISH_STEAL_TIME; // Thời gian còn lại của đội giành quyền trả lời
let finishStealLocked = false; // Cho biết đội giành quyền đã bị khóa hay chưa
let finishStealActive = false; // true = đang giành quyền, false = không giành quyền
let finishPlayedTeams = []; // Danh sách các đội đã chơi phần Về đích, các đội này vẫn có thể tham gia giành quyền trả lời
const FINISH_CSV_FILE = 'questions_vedich.csv'; // câu hỏi về đích
const BRANCHES = [
  { id: 'thieu', label: 'Ngành Thiếu' },
  { id: 'oanh', label: 'Oanh Vũ' },
];
// Các mức độ câu hỏi của phần Về đích
const FINISH_DIFFICULTIES = [
  {
    id: 'easy',
    label: 'Dễ',
    points: FINISH_POINTS.easy,
  },
  {
    id: 'medium',
    label: 'Vừa',
    points: FINISH_POINTS.medium,
  },
  {
    id: 'hard',
    label: 'Khó',
    points: FINISH_POINTS.hard,
  },
];

let finishQuestions = []; // danh sách câu hỏi về đích
let usedFinishQuestions = new Set(); // danh sách câu đã được sử dụng
let currentFinishSelection = []; // danh sách 3 câu đã chọn của đội hiện tại
let finishPlayedBranch = null; // ngành của đội đang chơi phần Về đích
let currentFinishQuestionIndex = 0; // chỉ số câu hiện tại trong currentFinishSelection: 0, 1, 2
let finishActiveTeam = 0; // chỉ số đội đang chơi phần Về đích
let finishActiveBranch = 'thieu'; // ngành đang chơi chương trình
let currentFinishQuestion = null; // object câu hỏi hiện tại
let currentFinishPoints = 0; // Điểm của câu hiện tại, có thể bị thay đổi khi dùng ngôi sao hy vọng hoặc trả lời sai phần giành quyền
let finishAnswerLocked = false; // true = đội chính đã trả lời, false = đội chính chưa trả lời
let finishTimer = null; // Timer riêng cho phần Về đích
let finishTimeLeft = FINISH_TIME; // Thời gian còn lại của câu hiện tại
// Trạng thái đã sử dụng ngôi sao hy vọng của từng đội.
let finishStarUsedByTeam = [
  false,
  false,
  false,
  false
];
let startQuestions = []; // danh sách câu hỏi
let teams = ['Đội 1', 'Đội 2', 'Đội 3', 'Đội 4'];
let scores = createEmptyScores();
let startPlayedTeams = [
  [],
  []
];
let activeTeam = 0; // đội đang trả lời
let activeBranch = 0; // ngành đang chọn (0: Thiếu, 1: Oanh)
let pack = null; // gói câu hỏi đang chọn (1: Khởi động, 2: Vượt chướng ngại vật, 3: Tăng tốc, 4: Về đích)
let questionSet = null; // bộ câu hỏi đang chọn (chỉ áp dụng cho gói Khởi động)
let pool = []; // danh sách câu hỏi trong gói/bộ đang chọn
let idx = 0; // chỉ số câu hỏi hiện tại trong pool
let locked = false;
let timer = null;
let timeLeft = 15;

// ======================================================
// KẾT NỐI WEBSOCKET - PHẦN TĂNG TỐC
// ======================================================
let mcSocket = null;
let tangTocActive = false;
let tangTocCurrentQuestion = null;
let tangTocCurrentQuestionIndex = 0;
let tangTocDeadline = 0;
let tangTocResults = [];
let tangTocScoredQuestions = new Set();

// ======================================================
// TRẠNG THÁI PHẦN TĂNG TỐC
// ======================================================
let tangTocScreenActive = false; // Màn hình Tăng tốc có đang được mở hay không
const TANGTOC_TIME = 30;// Thời gian suy nghĩ
let tangTocStarted = false; // Trạng thái cuộc thi
let TANGTOC_TOTAL_QUESTIONS = 4; // Tổng số câu

// Trạng thái kết nối của 4 đội
let tangTocTeamStatus = [
  {
    teamId: 0,
    teamName: 'Đội Xanh',
    connected: false
  },
  {
    teamId: 1,
    teamName: 'Đội Trắng',
    connected: false
  },
  {
    teamId: 2,
    teamName: 'Đội Đỏ',
    connected: false
  },
  {
    teamId: 3,
    teamName: 'Đội Vàng',
    connected: false
  }
];

// ======================================================
// TRẠNG THÁI VƯỢT CHƯỚNG NGẠI VẬT
// ======================================================
let vcnvQuestions = []; // lưu 4 câu hỏi
let vcnvCurrentQuestion = -1; // câu hỏi hiện tại
let vcnvRevealedAnswers = []; // những câu đã công bố đáp án, để tính điểm khi trả lời từ khóa
let vcnvRevealedPieces = []; // những mảnh ghép đã mở
let vcnvCurrentScreen = 'PACK';
let vcnvKeyword = '';
let vcnvImage = '';
let vcnvKeywordLockedTeams = []; // đội đoán từ khóa sai, dừng cuộc chơi
let vcnvKeywordRequest = null;
let vcnvLastResult = null;
let vcnvWinnerTeam = null;
let vcnvWinnerKeywordPoints = 0;
let vcnvFinished = false;
let vcnvPreviousScreen = 'QUESTION_SELECTION';
let vcnvWrongKeywordTeam = null;
let vcnvQuestionResult = {
    questionIndex: -1,
    answer: '',
    results: []
};
let vcnvMcTimer = null;
let vcnvDeadline = 0;

// ======================================================
// TRẠNG THÁI CỘNG ĐIỂM VCNV
// ======================================================

// Mỗi phần tử có dạng:
// "ngành-teamId-questionIndex"
//
// Ví dụ:
// "0-2-1"
// = Ngành 0, Đội 2, câu 2
//
let vcnvScoredQuestions = new Set();

// Đảm bảo điểm từ khóa chỉ được cộng một lần
let vcnvKeywordScored = false;

// ======================================================
// KIỂM TRA ĐỘI ĐÃ THI KHỞI ĐỘNG CHƯA
// ======================================================

function hasStartTeamPlayed(teamIndex) {

  const branchIndex =
    activeBranch;

  return startPlayedTeams[
    branchIndex
  ].includes(teamIndex);

}

// ======================================================
// ĐÁNH DẤU ĐỘI ĐÃ HOÀN THÀNH KHỞI ĐỘNG
// ======================================================

function markStartTeamPlayed(teamIndex) {

  const branchIndex =
    activeBranch;

  if (
    !startPlayedTeams[branchIndex].includes(
      teamIndex
    )
  ) {

    startPlayedTeams[branchIndex].push(
      teamIndex
    );

  }

}

function getWebSocketUrl() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}

// ======================================================
// KẾT NỐI MÁY MC VỚI SERVER
// ======================================================

function connectMCWebSocket() {

  // Phải mở chương trình bằng HTTP.
  // Ví dụ:
  // http://localhost:3000

  if (
    location.protocol !== 'http:' &&
    location.protocol !== 'https:'
  ) {

    console.warn(
      'Chương trình chưa được mở qua HTTP.'
    );

    return;

  }


  const protocol =
    location.protocol === 'https:'
      ? 'wss:'
      : 'ws:';


  mcSocket = new WebSocket(
    `${protocol}//${location.host}`
  );


  // ------------------------------------------
  // KẾT NỐI THÀNH CÔNG
  // ------------------------------------------

  mcSocket.addEventListener(
    'open',
    () => {

      console.log(
        'MC đã kết nối WebSocket.'
      );


      mcSocket.send(
        JSON.stringify({

          type:
            'REGISTER_HOST'

        })
      );


      // Gửi tên đội hiện tại
      sendTeamNamesToServer();

    }
  );


  // ------------------------------------------
  // NHẬN DỮ LIỆU
  // ------------------------------------------

  mcSocket.addEventListener(
    'message',
    (event) => {

      let data;


      try {

        data =
          JSON.parse(
            event.data
          );

      } catch (error) {

        console.error(
          'Dữ liệu WebSocket không hợp lệ:',
          event.data
        );

        return;

      }

      // ========================================
      // SERVER GỬI DANH SÁCH TÊN ĐỘI
      // ========================================

      if (
        data.type ===
        'TEAM_LIST'
      ) {

        console.log(
          'Danh sách đội từ server:',
          data.teams
        );


        return;

      }


      // ========================================
      // SERVER GỬI TRẠNG THÁI 4 ĐỘI
      // ========================================

      if (
        data.type ===
        'TEAM_STATUS'
      ) {

        tangTocTeamStatus =
          data.teams;


        console.log(
          'Trạng thái đội:',
          tangTocTeamStatus
        );


        // Nếu đang ở màn hình Tăng tốc
        // thì cập nhật giao diện.
        if (
          typeof tangTocScreenActive !==
          'undefined' &&
          tangTocScreenActive
        ) {

          showTangTocScreen();

        }

        return;

      }

      // ======================================================
      // VCNV - NHẬN DỮ LIỆU CÂU HỎI TỪ SERVER
      // ======================================================

      if (
          data.type ===
          'VCNV_DATA'
      ) {

          console.log(
              'MC nhận dữ liệu VCNV từ server:',
              data
          );

          vcnvQuestions =
              Array.isArray(data.questions)
                  ? data.questions
                  : [];

          // Hình ảnh dùng chung cho bộ VCNV
          vcnvImage = data.image || '';

          // Từ khóa lấy trực tiếp từ CSV
          vcnvKeyword = vcnvQuestions[0]?.key || '';

          if (
              vcnvQuestions.length < 4
          ) {

              console.error(
                  'VCNV: Server trả về chưa đủ 4 câu.'
              );

              return;

          }

          // Chỉ render sau khi đã nhận dữ liệu thật
          showVCNVQuestionSelection();

          return;

      }

      // ========================================
      // VCNV - BẮT ĐẦU TIMER
      // ========================================

      if (
          data.type === 'VCNV_STARTED'
      ) {

          console.log(
              'VCNV bắt đầu timer:',
              data
          );

          vcnvDeadline =
              data.deadline;

          startVCNVMcTimer(
              data.deadline
          );

          return;

      }

      // ========================================
      // TĂNG TỐC - SERVER GỬI CÂU HỎI
      // ========================================

      if (
        data.type === 'TANGTOC_QUESTION'
      ) {

        const question = data.question;

        const imageHtml =
          question.image
            ? `
              <div class="tangtoc-image-wrap">
                <img
                  class="tangtoc-image"
                  src="${question.image}"
                  alt="Hình ảnh câu hỏi"
                >
              </div>
            `
            : '';
        
        const html = `
          <div class="tangtoc-question">

            <div class="tangtoc-header">

              <div class="tangtoc-title">
                🟡 TĂNG TỐC
              </div>

              <div class="tangtoc-progress">
                CÂU ${data.questionIndex + 1}/${data.totalQuestions}
              </div>

              <div
                id="tangtoc-timer"
                class="tangtoc-timer"
              >
                ${TANGTOC_TIME}s
              </div>

            </div>


            ${imageHtml}

          </div>
        `;

        const app =
          document.getElementById('app');
        
        if (app) {
          app.innerHTML = html;
        }

        return;
      }


      // ========================================
      // TĂNG TỐC - BẮT ĐẦU TIMER
      // ========================================

      if (
        data.type === 'TANGTOC_STARTED'
      ) {

        tangTocDeadline =
          data.deadline;

        startTangTocMcTimer(
          data.timeLimit
        );

        return;
      }


      // ========================================
      // TĂNG TỐC - KẾT QUẢ CÂU
      // ========================================

      if (
        data.type === 'TANGTOC_RESULT'
      ) {

        tangTocResults =
          data.results || [];
        
        // cộng điểm tăng tốc vào đội
        applyTangTocScores(
          data.results || [],
          data.questionIndex
        );

        showTangTocResult(data);

        return;
      }


      // ========================================
      // TĂNG TỐC - KẾT THÚC
      // ========================================

      if (
        data.type === 'TANGTOC_FINISHED'
      ) {

        tangTocStarted = false;
        tangTocActive = false;

        clearInterval(timer);

        tangTocCurrentQuestion = null;
        tangTocResults = [];

        showPacks();

        return;
      }


      // ========================================
      // TĂNG TỐC - LỖI
      // ========================================

      if (
        data.type === 'TANGTOC_ERROR'
      ) {

        alert(
          data.message ||
          'Có lỗi trong phần Tăng tốc.'
        );

        return;
      }

      // ======================================================
      // VCNV - NHẬN KẾT QUẢ ĐÃ CHỐT
      // ======================================================

      if (
          data.type ===
          'VCNV_RESULT'
      ) {

          console.log(
              'MC nhận kết quả VCNV:',
              data
          );

          // Lưu kết quả
          vcnvQuestionResult = {

              questionIndex:
                  data.questionIndex,

              answer:
                  data.correctAnswer,

              results:
                  Array.isArray(data.results)
                      ? data.results
                      : []

          };

          // ------------------------------------------
          // CỘNG ĐIỂM CÂU VCNV
          // ------------------------------------------

          applyVCNVQuestionScores(
              vcnvQuestionResult.results,
              data.questionIndex
          );

          // ------------------------------------------
          // ĐÁNH DẤU CÂU ĐÃ CÔNG BỐ ĐÁP ÁN
          // ------------------------------------------

          if (
              !vcnvRevealedAnswers.includes(
                  data.questionIndex
              )
          ) {

              vcnvRevealedAnswers.push(
                  data.questionIndex
              );

          }

          clearInterval(
              vcnvMcTimer
          );

          vcnvMcTimer =
              null;

          vcnvCurrentQuestion =
              data.questionIndex;

          // Chuyển sang màn hình kết quả
          vcnvCurrentScreen =
              'RESULT';

          renderVCNV();

          return;

      }

    }
  );


  // ------------------------------------------
  // NGẮT KẾT NỐI
  // ------------------------------------------

  mcSocket.addEventListener(
    'close',
    () => {

      console.warn(
        'MC đã mất kết nối WebSocket.'
      );

    }
  );


  // ------------------------------------------
  // LỖI
  // ------------------------------------------

  mcSocket.addEventListener(
    'error',
    (error) => {

      console.error(
        'Lỗi WebSocket:',
        error
      );

    }
  );

}

// ======================================================
// CỘNG ĐIỂM TĂNG TỐC
// ======================================================

function applyTangTocScores(
  results,
  questionIndex
) {

  // Không có kết quả
  if (!Array.isArray(results)) {
    return;
  }

  // --------------------------------------------------
  // Chống cộng điểm trùng
  // --------------------------------------------------

  const scoreKey =
    `${activeBranch}-${questionIndex}`;

  if (
    tangTocScoredQuestions.has(scoreKey)
  ) {

    console.warn(
      'Câu Tăng tốc này đã được cộng điểm:',
      scoreKey
    );

    return;

  }

  // --------------------------------------------------
  // Cộng điểm cho từng đội
  // --------------------------------------------------

  results.forEach(
    (result) => {

      const teamId =
        Number(result.teamId);

      const points =
        Number(result.points) || 0;

      // Kiểm tra teamId
      if (
        !Number.isInteger(teamId) ||
        teamId < 0 ||
        teamId >= teams.length
      ) {
        return;
      }

      // Không có điểm thì không làm gì
      if (
        points === 0
      ) {
        return;
      }

      // Cộng vào ngành đang thi
      scores[teamId][activeBranch] +=
        points;

    }
  );

  // Đánh dấu câu này đã cộng điểm
  tangTocScoredQuestions.add(
    scoreKey
  );

  // Cập nhật bảng điểm
  refreshScoreboard();

  console.log(
    'Đã cộng điểm Tăng tốc:',
    results,
    'Ngành:',
    getActiveBranchLabel(),
    'Câu:',
    questionIndex + 1
  );

}

// ======================================================
// CỘNG ĐIỂM VƯỢT CHƯỚNG NGẠI VẬT - CÂU HỎI
// ======================================================

function applyVCNVQuestionScores(
    results,
    questionIndex
) {

    if (
        !Array.isArray(results)
    ) {

        return;

    }


    results.forEach(
        result => {

            const teamId =
                Number(
                    result.teamId
                );


            // ------------------------------------------
            // Kiểm tra teamId
            // ------------------------------------------

            if (
                !Number.isInteger(teamId) ||
                teamId < 0 ||
                teamId >= teams.length
            ) {

                return;

            }


            // ------------------------------------------
            // Chỉ đội trả lời đúng mới được +10
            // ------------------------------------------

            if (
                result.correct !== true
            ) {

                return;

            }


            // ------------------------------------------
            // Chống cộng trùng
            // ------------------------------------------

            const scoreKey =
                `${activeBranch}-${teamId}-${questionIndex}`;


            if (
                vcnvScoredQuestions.has(
                    scoreKey
                )
            ) {

                console.warn(
                    'VCNV: điểm câu này đã được cộng:',
                    scoreKey
                );

                return;

            }


            // ------------------------------------------
            // CỘNG +10
            // ------------------------------------------

            scores[teamId][activeBranch] +=
                10;


            // Đánh dấu đã cộng
            vcnvScoredQuestions.add(
                scoreKey
            );


            console.log(
                `VCNV: ${teams[teamId]} +10 điểm`,
                {
                    branch:
                        getActiveBranchLabel(),

                    question:
                        questionIndex + 1
                }
            );

        }
    );


    // ------------------------------------------
    // Cập nhật bảng điểm
    // ------------------------------------------

    refreshScoreboard();

}

function showTangTocResult(message) {

  clearInterval(timer);


  const results =
    message.results || [];


  // ==================================================
  // LUÔN HIỂN THỊ ĐỦ 4 ĐỘI
  // ==================================================

  const teamResults = [];


  for (
    let teamId = 0;
    teamId < 4;
    teamId++
  ) {

    const result =
      results.find(
        item =>
          Number(item.teamId) === teamId
      );


    if (result) {

      teamResults.push(result);

    } else {

      teamResults.push({

        teamId,

        team:
          teams[teamId] ||
          `Đội ${teamId + 1}`,

        answer: '',

        correct: false,

        elapsedMs: null,

        points: 0

      });

    }

  }


  // ==================================================
  // XẾP THỨ TỰ HIỂN THỊ
  //
  // Đúng + có điểm:
  // 40 → 30 → 20 → 10
  //
  // Sai / không trả lời:
  // xuống dưới
  // ==================================================

  teamResults.sort(
    (a, b) => {

      const aPoints =
        Number(a.points) || 0;

      const bPoints =
        Number(b.points) || 0;


      if (
        aPoints !==
        bPoints
      ) {

        return bPoints - aPoints;

      }


      // Nếu cùng điểm và đều đúng
      // thì đội nhanh hơn đứng trước.

      if (
        a.correct &&
        b.correct &&
        a.elapsedMs != null &&
        b.elapsedMs != null
      ) {

        return (
          a.elapsedMs -
          b.elapsedMs
        );

      }


      return (
        Number(a.teamId) -
        Number(b.teamId)
      );

    }
  );


  // ==================================================
  // TẠO CÁC DÒNG BẢNG
  // ==================================================

  const rows =
    teamResults.map(
      (
        result,
        index
      ) => {

        const elapsed =
          result.elapsedMs == null
            ? '—'
            : `${(
                Number(
                  result.elapsedMs
                ) / 1000
              ).toFixed(2)}s`;


        let rankIcon = '';


        if (
          result.correct &&
          Number(result.points) > 0
        ) {

          const rank =
            Number(result.points);


          if (rank === 40) {
            rankIcon = '🥇';
          }
          else if (rank === 30) {
            rankIcon = '🥈';
          }
          else if (rank === 20) {
            rankIcon = '🥉';
          }
          else if (rank === 10) {
            rankIcon = '4️⃣';
          }

        }
        else {

          rankIcon = '❌';

        }


        return `
          <tr>

            <td class="tangtoc-rank">
              ${rankIcon}
            </td>

            <td>
              <b>
                ${escapeHtml(
                  result.team ||
                  `Đội ${Number(result.teamId) + 1}`
                )}
              </b>
            </td>

            <td>
              ${
                result.answer
                  ? escapeHtml(
                      result.answer
                    )
                  : '—'
              }
            </td>

            <td>
              ${
                result.correct
                  ? '<span class="tangtoc-correct">✅ ĐÚNG</span>'
                  : '<span class="tangtoc-wrong">❌ SAI</span>'
              }
            </td>

            <td>
              ${elapsed}
            </td>

            <td>
              <b>
                ${
                  Number(result.points) > 0
                    ? `+${Number(result.points)}`
                    : '0'
                }
              </b>
            </td>

          </tr>
        `;

      }
    ).join('');


  // ==================================================
  // CÂU CUỐI?
  // ==================================================

  const isLast =
    (
      Number(
        message.questionIndex
      ) || 0
    ) >=
    (
      Number(
        message.totalQuestions
      ) || 4
    ) - 1;


  // ==================================================
  // HIỂN THỊ
  // ==================================================

  render(
    gameLayout(`

      <div class="top">

        <div>

          <h1>
            🟡 TĂNG TỐC
          </h1>

          <div class="sub">
            KẾT QUẢ CÂU
            ${
              (
                Number(
                  message.questionIndex
                ) || 0
              ) + 1
            }/
            ${
              Number(
                message.totalQuestions
              ) || 4
            }
          </div>

        </div>

      </div>


      <div class="tangtoc-result-answer">

        ĐÁP ÁN ĐÚNG:

        <b>
          ${
            escapeHtml(
              message.correctAnswer ||
              '—'
            )
          }
        </b>

      </div>


      <div class="tangtoc-result-table-wrap">

        <table class="tangtoc-result-table">

          <thead>

            <tr>

              <th></th>

              <th>ĐỘI</th>

              <th>ĐÁP ÁN</th>

              <th>KẾT QUẢ</th>

              <th>THỜI GIAN</th>

              <th>ĐIỂM</th>

            </tr>

          </thead>


          <tbody>

            ${rows}

          </tbody>

        </table>

      </div>


      <div class="tangtoc-result-note">

        Đội đúng và nhanh nhất:
        <b>+40 điểm</b>

        ·

        tiếp theo:
        <b>+30</b>,

        <b>+20</b>,

        <b>+10</b>.

        Đội sai hoặc không trả lời:
        <b>0 điểm</b>.

      </div>


      <div class="tangtoc-result-actions">

        <button
          class="next"
          onclick="nextTangTocQuestion()"
        >

          ${
            isLast
              ? 'KẾT THÚC TĂNG TỐC'
              : 'CÂU TIẾP THEO →'
          }

        </button>

      </div>

    `)
  );

}

// ======================================================
// TIMER TĂNG TỐC - MÁY MC
// ======================================================

function startTangTocMcTimer() {

  clearInterval(timer);

  const timerElement =
    document.getElementById(
      'tangtoc-timer'
    );

  if (!timerElement) {

    console.warn(
      'Không tìm thấy #tangtoc-timer'
    );

    return;

  }


  const updateTimer = () => {

    const remainingMs =
      Math.max(
        0,
        tangTocDeadline - Date.now()
      );


    const seconds =
      Math.ceil(
        remainingMs / 1000
      );


    timerElement.textContent =
      `${seconds}s`;


    if (seconds <= 5) {

      timerElement.classList.add(
        'danger'
      );

    } else {

      timerElement.classList.remove(
        'danger'
      );

    }


    if (remainingMs <= 0) {

      clearInterval(timer);

    }

  };


  // Cập nhật ngay lập tức
  updateTimer();


  // Sau đó cập nhật 100ms/lần
  timer =
    setInterval(
      updateTimer,
      100
    );

}

// ======================================================
// GỬI TÊN 4 ĐỘI CHO SERVER
// ======================================================

function sendTeamNamesToServer() {

  if (
    !mcSocket ||
    mcSocket.readyState !== WebSocket.OPEN
  ) {

    return;

  }


  mcSocket.send(
    JSON.stringify({

      type:
        'TEAM_LIST',

      teams:
        teams

    })
  );

}

document.addEventListener('DOMContentLoaded', init);

async function init() {

  // Kết nối MC với server
  connectMCWebSocket();
  renderLoading();

  try {
    // tải dữ liệu câu hỏi phần thi khởi động
    startQuestions = await loadStartQuestions(START_CSV_FILE);

    // tải dữ liệu câu hỏi phần thi về đích
    finishQuestions = await loadFinishQuestions(FINISH_CSV_FILE);

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

async function loadStartQuestions(fileName) {
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
  const requiredHeaders = ['pack', 'branch', 'set', 'question', 'answer_a', 'answer_b', 'answer_c', 'answer_d', 'correct'];

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
      set: Number(record.set),
      q: record.question,
      a: [record.answer_a, record.answer_b, record.answer_c, record.answer_d],
      correct,
    };

    if (!Number.isInteger(mappedQuestion.pack)) {
      throw new Error(`Dòng ${rowIndex + 2}: cột pack không hợp lệ.`);
    }

    if (!Number.isInteger(mappedQuestion.set) || mappedQuestion.set < 1) {
      throw new Error(`Dòng ${rowIndex + 2}: cột set không hợp lệ.`);
    }

    if (!mappedQuestion.q || mappedQuestion.a.some((answer) => !answer)) {
      throw new Error(`Dòng ${rowIndex + 2}: câu hỏi hoặc đáp án đang bị trống.`);
    }

    return mappedQuestion;
  });
}

async function loadFinishQuestions(fileName) {
  // fetch() đọc file csv
  const response = await fetch(fileName, { cache: 'no-store' });
  
  if (!response.ok) {
    throw new Error(`Không tìm thấy hoặc không đọc được ${fileName}.`);
  }

  // chuyển nội dung file csv thành text
  const csvText = await response.text();

  // chuyển text csv thành mảng object JavaScript
  return mapFinishQuestionsFromCsv(csvText);
}

// ======================================================
// CHUYỂN CSV VỀ ĐÍCH THÀNH OBJECT
// ======================================================

function mapFinishQuestionsFromCsv(csvText) {
  // Đọc CSV bằng hàm parseCsv() đã có sẵn trong chương trình.
  const rows = parseCsv(csvText)
    .filter((row) => row.some((cell) => cell.trim()));

  // CSV phải có ít nhất:
  // 1 dòng tiêu đề + 1 dòng dữ liệu
  if (rows.length < 2) {
    throw new Error('File question_vedich.csv chưa có dữ liệu câu hỏi.');
  }

  // Lấy dòng đầu tiên làm tên cột.
  const headers = rows[0].map((header) =>
    header.trim().toLowerCase()
  );

  // 4 cột bắt buộc của CSV Về đích.
  const requiredHeaders = [
    'branch',
    'difficulty',
    'question',
    'answer',
  ];

  // Kiểm tra xem CSV có đủ 4 cột hay không.
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(
        `File question_vedich.csv thiếu cột "${header}".`
      );
    }
  }

  // Chuyển từng dòng CSV thành một object JavaScript.
  return rows.slice(1).map((row, rowIndex) => {
    const record = {};

    // Ghép tên cột với dữ liệu tương ứng.
    headers.forEach((header, index) => {
      record[header] = (row[index] || '').trim();
    });

    // Chuẩn hóa ngành.
    const branch = normalizeBranch(record.branch);

    // Kiểm tra mức độ.
    const difficulty = record.difficulty
      .trim()
      .toLowerCase();

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new Error(
        `Dòng ${rowIndex + 2}: difficulty "${record.difficulty}" không hợp lệ. ` +
        `Hãy dùng easy, medium hoặc hard.`
      );
    }

    // Kiểm tra nội dung câu hỏi.
    if (!record.question) {
      throw new Error(
        `Dòng ${rowIndex + 2}: câu hỏi đang bị trống.`
      );
    }

    // Kiểm tra đáp án.
    if (!record.answer) {
      throw new Error(
        `Dòng ${rowIndex + 2}: đáp án đang bị trống.`
      );
    }

    // Tạo mã nội bộ cho câu hỏi.
    //
    // Người dùng KHÔNG cần viết ID này trong CSV.
    // Nó chỉ dùng trong JavaScript để phân biệt câu hỏi.
    const internalId = `finish_${rowIndex + 1}`;

    return {
      id: internalId,
      branch: branch,
      difficulty: difficulty,
      q: record.question,
      answer: record.answer,
      points: FINISH_POINTS[difficulty],
    };
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

function getPackLabel(packNumber) {
  const labels = {
    1: 'KHỞI ĐỘNG',
    2: 'VƯỢT CHƯỚNG NGẠI VẬT',
    3: 'TĂNG TỐC',
    4: 'VỀ ĐÍCH',
  };

  return labels[packNumber] || `GÓI ${packNumber}`;
}

function getSetNumbersForPack(packNumber, branchId = getActiveBranchId()) {
  return [...new Set(startQuestions
    .filter((question) => question.pack === packNumber && question.branch === branchId)
    .map((question) => question.set))]
    .sort((a, b) => a - b);
}

function getTeamTotal(teamIndex) {
  return scores[teamIndex].reduce((sum, score) => sum + score, 0);
}

function startSetup(isRenaming = false) {
  clearInterval(timer);

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

  teams = [0, 1, 2, 3].map(
    (i) =>
      document
        .getElementById(`t${i}`)
        .value
        .trim() ||
      `Đội ${i + 1}`
  );

  // Đồng bộ tên đội với server
  sendTeamNamesToServer();

  // Bắt đầu cuộc thi mới
  // nên reset trạng thái Ngôi sao.
  resetFinishStars();

  // Reset trạng thái Khởi động
  startPlayedTeams = [
    [],
    []
  ];

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

function gameLayout(content, mainClass = '') {
  return `<div class="screen game-screen">
    <div class="game-layout">
      ${teamPanel()}
      <main class="card main-panel ${mainClass}">${content}</main>
    </div>
  </div>`;
}

function teamPanel() {
  return `<aside class="card team-panel">
    <h2>Th&ocirc;ng tin &#273;&#7897;i</h2>
    <div class="team-panel-actions">
      <button class="secondary" onclick="startSetup(true)">&#272;&#7893;i t&ecirc;n &#273;&#7897;i</button>
      <button class="danger" onclick="resetScores()">Reset &#273;i&#7875;m</button>
    </div>
    ${scoreboard()}
  </aside>`;
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

  // Kiểm tra có thực sự chuyển sang ngành khác hay không.
  const branchChanged = activeBranch !== branchIndex;

  // Cập nhật ngành đang được chọn.
  activeBranch = branchIndex;

  // Nếu chuyển sang ngành khác,
  // danh sách đội đã tham gia Về đích phải được làm mới.
  if (branchChanged) {
    finishPlayedTeams = [];
    finishPlayedBranch = getActiveBranchId();
  }

  // --------------------------------------------
  // ĐANG Ở MÀN HÌNH CHỌN BỘ KHỞI ĐỘNG
  // --------------------------------------------
  if (document.querySelector('.set-grid')) {
    showQuestionSets(pack);
    return;
  }

  // --------------------------------------------
  // ĐANG Ở MÀN HÌNH CHỌN GÓI
  // --------------------------------------------
  if (document.querySelector('.pack-grid')) {
    showPacks();
    return;
  }

  // --------------------------------------------
  // ĐANG Ở MÀN HÌNH CHỌN 3 CÂU VỀ ĐÍCH
  // --------------------------------------------
  if (document.querySelector('.finish-selection')) {
    showFinishSelection();
    return;
  }

  // --------------------------------------------
  // Các màn hình khác
  // --------------------------------------------
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
  clearInterval(timer);
  questionSet = null;

  const currentBranchId = getActiveBranchId();
  const totalQuestions = startQuestions.filter((question) => question.branch === currentBranchId).length;
  const packCounts = [
    startQuestions.filter((question) =>
      question.pack === 1 &&
      question.branch === currentBranchId
    ).length,

    startQuestions.filter((question) =>
      question.pack === 2 &&
      question.branch === currentBranchId
    ).length,

    startQuestions.filter((question) =>
      question.pack === 3 &&
      question.branch === currentBranchId
    ).length,

    finishQuestions.filter((question) =>
      question.branch === currentBranchId
    ).length,
  ];
  const kickoffSetCount = getSetNumbersForPack(1, currentBranchId).length;

  render(gameLayout(`
    <div class="top">
      <div><h1>🎯 CHỌN GÓI CÂU HỎI</h1><div class="sub">Chọn một trong 4 gói</div></div>
    </div>
    ${selectionControls()}
    <div class="grid pack-grid">
      <button
        class="pack"
        onclick="choosePack(1)"
        ${packCounts[0] === 0 ? 'disabled' : ''}
      >
        🟢 KHỞI ĐỘNG
        <small>${kickoffSetCount} bộ · ${packCounts[0]} câu</small>
      </button>

      <button
        class="pack"
        onclick="choosePack(2)"
      >
        🔵 VƯỢT CHƯỚNG NGẠI VẬT
        <small>${packCounts[1]} câu</small>
      </button>

      <button
        class="pack"
        onclick="choosePack(3)"
      >
        🟡 TĂNG TỐC
        <small>${packCounts[2]} câu</small>
      </button>

      <button
        class="pack"
        onclick="choosePack(4)"
        ${packCounts[3] === 0 ? 'disabled' : ''}
      >
        🔴 VỀ ĐÍCH
        <small>${packCounts[3]} câu trong ngân hàng</small>
      </button>
    </div>
    <p class="note">Bộ ${getActiveBranchLabel()}: ${totalQuestions} câu. Mỗi câu đúng: +10 điểm cho đội và ngành đang chọn.</p>
  `));
}

function choosePack(selectedPack) {
  // Lưu gói hiện tại.
  pack = selectedPack;

  // --------------------------------------------
  // GÓI 1: KHỞI ĐỘNG
  // --------------------------------------------
  if (selectedPack === 1) {
    showQuestionSets(selectedPack);
    return;
  }

  // ==========================================
  // VƯỢT CHƯỚNG NGẠI VẬT
  // ==========================================
  if (selectedPack === 2) {
    startVCNV();
    return;
  }

  // --------------------------------------------
  // GÓI 3: TĂNG TỐC
  // --------------------------------------------

  if (selectedPack === 3) {
    showTangTocScreen();
    return;
  }

  // --------------------------------------------
  // GÓI 4: VỀ ĐÍCH
  // Về đích có luật riêng:
  // - Chọn 3 mức độ
  // - Random câu hỏi
  // - Ngôi sao hy vọng
  // - Nhập đáp án
  // - Giành quyền
  // --------------------------------------------
  if (selectedPack === 4) {
    const branchId = getActiveBranchId();

    // Nếu đây là lần đầu bước vào về đích của ngành hiện tại
    // thì bắt đầu lại danh sách đội
    if (finishPlayedBranch !== branchId) {
      finishPlayedTeams = [];
      finishPlayedBranch = branchId;
    }

    // Chọn đội thi
    showFinishTeamSelection();

    return;
  }

  // --------------------------------------------
  // GÓI khác - giữ cơ chế cũ.
  // --------------------------------------------
  questionSet = null;

  pool = startQuestions.filter(
    (question) =>
      question.pack === selectedPack &&
      question.branch === getActiveBranchId()
  );

  idx = 0;

  showQuestion();
}

// ======================================================
// MC CHỌN ĐỘI THAM GIA VỀ ĐÍCH
// ======================================================

function showFinishTeamSelection() {

  clearInterval(timer);

  const allTeamsPlayed =
    finishPlayedTeams.length >= teams.length;

  const teamButtons = teams
    .map((team, teamIndex) => {

      const alreadyPlayed =
        finishPlayedTeams.includes(teamIndex);

      return `
        <button
          class="pack"
          onclick="selectFinishTeam(${teamIndex})"
          ${alreadyPlayed ? 'disabled' : ''}
        >
          ${escapeHtml(team)}

          <small>
            ${
              alreadyPlayed
                ? 'ĐÃ THAM GIA'
                : 'CHỌN ĐỘI THI'
            }
          </small>
        </button>
      `;
    })
    .join('');

  render(
    gameLayout(`

      <div class="top">
        <div>
          <h1>🔴 VỀ ĐÍCH</h1>

          <div class="sub">
            ${getActiveBranchLabel()}
          </div>
        </div>
      </div>

      <div class="card">

        <h2>CHỌN ĐỘI THAM GIA</h2>

        <p class="note">
          MC chọn đội tiếp theo thi Về đích.
        </p>

        <div class="grid pack-grid">
          ${teamButtons}
        </div>

        ${
          allTeamsPlayed
            ? `
              <p class="note">
                Tất cả 4 đội đã hoàn thành phần Về đích.
              </p>
            `
            : ''
        }

      </div>

    `)
  );
}

// ======================================================
// CHỌN ĐỘI ĐỂ BẮT ĐẦU LƯỢT VỀ ĐÍCH
// ======================================================

function selectFinishTeam(teamIndex) {

  // Kiểm tra chỉ số đội.
  if (
    teamIndex < 0 ||
    teamIndex >= teams.length
  ) {
    return;
  }

  // Đội đã thi rồi thì không được chọn lại.
  if (finishPlayedTeams.includes(teamIndex)) {
    return;
  }

  // Đội này trở thành đội chính đang thi.
  activeTeam = teamIndex;

  // Bắt đầu chọn 3 câu cho đội này.
  startFinishSelection();
}

// ======================================================
// BẮT ĐẦU PHẦN CHỌN CÂU VỀ ĐÍCH
// ======================================================

function startFinishSelection() {
  // Dừng timer cũ nếu đang chạy.
  clearInterval(timer);

  // Mỗi khi bắt đầu chọn câu cho một đội,
  // chúng ta phải xóa lựa chọn tạm thời của đội đó.
  currentFinishSelection = [];

  // Câu hiện tại sẽ bắt đầu từ câu số 1.
  currentFinishQuestionIndex = 0;

  // Không có câu nào đang trả lời.
  currentFinishQuestion = null;

  // Hiển thị màn hình chọn 3 mức độ.
  showFinishSelection();
}

// ======================================================
// RANDOM MỘT CÂU VỀ ĐÍCH
// ======================================================

function getRandomUnusedFinishQuestion(difficulty) {
  // Ngành hiện tại của đội.
  const branchId = getActiveBranchId();

  // Lọc ra những câu:
  // 1. Đúng ngành
  // 2. Đúng mức độ
  // 3. Chưa được sử dụng
  const availableQuestions = finishQuestions.filter(
    (question) =>
      question.branch === branchId &&
      question.difficulty === difficulty &&
      !usedFinishQuestions.has(question.id)
  );

  // Nếu không còn câu nào,
  // báo lỗi để MC biết ngân hàng đã hết câu ở mức này.
  if (availableQuestions.length === 0) {
    alert(
      `Không còn câu ${getDifficultyLabel(difficulty)} ` +
      `chưa sử dụng cho ${getActiveBranchLabel()}.`
    );

    return null;
  }

  // Random một vị trí trong danh sách.
  const randomIndex = Math.floor(
    Math.random() * availableQuestions.length
  );

  const selectedQuestion = availableQuestions[randomIndex];

  // Đánh dấu NGAY LẬP TỨC là đã sử dụng.
  // Đây là chủ ý quan trọng:
  // MC có bấm "CHỌN LẠI" thì câu này vẫn đã được dùng,
  // không quay lại ngân hàng.
  usedFinishQuestions.add(selectedQuestion.id);

  return selectedQuestion;
}

// ======================================================
// LẤY TÊN HIỂN THỊ CỦA MỨC ĐỘ
// ======================================================

function getDifficultyLabel(difficulty) {
  const difficultyInfo = FINISH_DIFFICULTIES.find(
    (item) => item.id === difficulty
  );

  return difficultyInfo
    ? difficultyInfo.label
    : difficulty;
}

// ======================================================
// MC CHỌN MỘT MỨC ĐỘ CHO CÂU VỀ ĐÍCH
// ======================================================

function chooseFinishDifficulty(difficulty) {
  // Không cho chọn quá 3 câu.
  if (
    currentFinishSelection.length >=
    FINISH_QUESTIONS_PER_TEAM
  ) {
    return;
  }

  // Random một câu chưa được sử dụng.
  const question = getRandomUnusedFinishQuestion(difficulty);

  // Nếu không còn câu phù hợp thì dừng.
  if (!question) {
    return;
  }

  // Lưu câu vừa chọn.
  currentFinishSelection.push(question);

  // Vẽ lại màn hình.
  showFinishSelection();
}

// ======================================================
// HIỂN THỊ MÀN HÌNH CHỌN 3 CÂU
// ======================================================

function showFinishSelection() {
  clearInterval(timer);

  // Số câu đã chọn.
  const selectedCount = currentFinishSelection.length;

  // Tạo danh sách thứ tự các câu đã chọn.
  const selectedList = currentFinishSelection.length
    ? currentFinishSelection
        .map(
          (question, index) => `
            <div class="finish-selected-item">
              <span class="finish-question-number">
                ${index + 1}
              </span>

              <span class="finish-difficulty-name">
                ${getDifficultyLabel(question.difficulty)}
              </span>

              <span class="finish-question-points">
                ${question.points} điểm
              </span>
            </div>
          `
        )
        .join('')
    : `
      <div class="finish-empty-selection">
        Chưa chọn câu nào
      </div>
    `;

  // Khi đã đủ 3 câu thì khóa các nút mức độ.
  const selectionFinished =
    selectedCount >= FINISH_QUESTIONS_PER_TEAM;

  render(
    gameLayout(`
      <div class="top">
        <div>
          <h1>🔴 VỀ ĐÍCH</h1>

          <div class="sub">
            ${escapeHtml(teams[activeTeam])}
            · ${getActiveBranchLabel()}
          </div>
        </div>
      </div>

      ${selectionControls()}

      <div class="finish-selection">

        <div class="finish-selection-header">
          <h2>Chọn 3 câu hỏi</h2>

          <div class="finish-selection-count">
            ${selectedCount}/3
          </div>
        </div>

        <div class="finish-selected-list">
          ${selectedList}
        </div>

        <div class="finish-difficulty-buttons">

          <button
            class="finish-difficulty easy"
            onclick="chooseFinishDifficulty('easy')"
            ${selectionFinished ? 'disabled' : ''}
          >
            <strong>DỄ</strong>
            <span>10 điểm</span>
          </button>

          <button
            class="finish-difficulty medium"
            onclick="chooseFinishDifficulty('medium')"
            ${selectionFinished ? 'disabled' : ''}
          >
            <strong>VỪA</strong>
            <span>20 điểm</span>
          </button>

          <button
            class="finish-difficulty hard"
            onclick="chooseFinishDifficulty('hard')"
            ${selectionFinished ? 'disabled' : ''}
          >
            <strong>KHÓ</strong>
            <span>30 điểm</span>
          </button>

        </div>

        <div class="finish-selection-actions">

          <button
            class="secondary"
            onclick="resetFinishSelection()"
            ${selectedCount === 0 ? 'disabled' : ''}
          >
            ↩ CHỌN LẠI
          </button>

          ${
            selectionFinished
              ? `
                <button
                  class="next"
                  onclick="confirmFinishSelection()"
                >
                  XÁC NHẬN 3 CÂU →
                </button>
              `
              : ''
          }

        </div>

        <p class="note">
          MC bấm Dễ, Vừa hoặc Khó để hệ thống
          tự động chọn ngẫu nhiên một câu chưa sử dụng.
        </p>

      </div>
    `)
  );
}

// ======================================================
// CHỌN LẠI 3 CÂU
// ======================================================
// LƯU Ý:
// Hàm này CHỈ xóa 3 lựa chọn hiện tại.
// KHÔNG xóa usedFinishQuestions.
// Vì vậy câu đã random trước đó vẫn được xem là đã sử dụng.
// ======================================================

function resetFinishSelection() {
  if (currentFinishSelection.length === 0) {
    return;
  }

  // Xóa 3 lựa chọn hiện tại.
  currentFinishSelection = [];

  // Quay lại trạng thái chưa chọn câu nào.
  currentFinishQuestionIndex = 0;

  // Vẽ lại giao diện.
  showFinishSelection();
}

// ======================================================
// XÁC NHẬN 3 CÂU ĐÃ CHỌN
// ======================================================
function confirmFinishSelection() {
  // Không cho xác nhận nếu chưa đủ 3 câu.
  if (
    currentFinishSelection.length !==
    FINISH_QUESTIONS_PER_TEAM
  ) {
    return;
  }

  // Reset chỉ số câu.
  currentFinishQuestionIndex = 0;

  // Chưa có câu đang trả lời.
  currentFinishQuestion = null;

  // Hiển thị màn hình chuẩn bị câu 1.
  showFinishReadyScreen();
}

// ======================================================
// MÀN HÌNH CHUẨN BỊ CÂU 1
// ======================================================

function showFinishReadyScreen() {
  clearInterval(timer);

  const totalPoints = currentFinishSelection.reduce(
    (sum, question) => sum + question.points,
    0
  );

  const starAvailable = canUseFinishStar(activeTeam);

  const selectedList = currentFinishSelection
    .map(
      (question, index) => `
        <div class="finish-selected-item">
          <span class="finish-question-number">
            ${index + 1}
          </span>

          <span class="finish-difficulty-name">
            ${getDifficultyLabel(question.difficulty)}
          </span>

          <span class="finish-question-points">
            ${question.points} điểm
          </span>
        </div>
      `
    )
    .join('');

  render(
    gameLayout(`
      <div class="top">
        <div>
          <h1>🔴 VỀ ĐÍCH</h1>

          <div class="sub">
            ${escapeHtml(teams[activeTeam])}
            · ${getActiveBranchLabel()}
          </div>
        </div>
      </div>

      <div class="finish-ready">

        <h2>3 câu hỏi đã được chọn</h2>

        <div class="finish-selected-list">
          ${selectedList}
        </div>

        <div class="finish-total-points">
          Tổng tối đa:
          <strong>${totalPoints} điểm</strong>
        </div>

        <!--
          Ngôi sao luôn được hiển thị ở đây.
          Việc sử dụng hay không sẽ do MC hỏi bằng lời.
          Không có popup hỏi trên màn hình.
        -->
        <div
          id="finish-star"
          class="finish-star ${starAvailable ? '' : 'used'}"
          ${
            starAvailable
              ? 'onclick="useFinishStar()"'
              : ''
          }
          title="${
            starAvailable
              ? 'Ngôi sao hy vọng'
              : 'Ngôi sao hy vọng đã sử dụng'
          }"
        >
          ⭐
          <span>
            ${
              starAvailable
                ? 'Ngôi sao hy vọng'
                : 'Đã sử dụng'
            }
          </span>
        </div>

        <button
          class="next finish-start-button"
          onclick="startFinishQuestion()"
        >
          BẮT ĐẦU CÂU HỎI →
        </button>

      </div>
    `)
  );
}

// ======================================================
// BẮT ĐẦU MỘT CÂU HỎI VỀ ĐÍCH
// ======================================================

function startFinishQuestion() {
  // Kiểm tra chỉ số câu hiện tại có hợp lệ không.
  if (
    currentFinishQuestionIndex < 0 ||
    currentFinishQuestionIndex >= currentFinishSelection.length
  ) {
    return;
  }

  // Lấy câu hỏi hiện tại từ 3 câu đã chọn.
  currentFinishQuestion =
    currentFinishSelection[currentFinishQuestionIndex];

  // Lấy số điểm gốc của câu.
  currentFinishPoints = currentFinishQuestion.points;

  // -------------------------------
  // Reset trạng thái câu
  // -------------------------------

  // Ban đầu đội chính chưa trả lời.
  finishAnswerLocked = false;

  // Chưa có đội giành trả lời.
  finishStealTeam = null;

  // Chưa khóa quyền giành quyền trả lời.
  finishStealLocked = false;

  // Chưa bước vào chế độ giành quyền.
  finishStealActive = false;

  // Đặt lại thời gian suy nghĩ.
  finishTimeLeft = FINISH_TIME;

  // Hiển thị câu hỏi.
  showFinishQuestion();

  // Bắt đầu đếm giờ.
  startFinishTimer();
}

// ======================================================
// HIỂN THỊ CÂU HỎI VỀ ĐÍCH
// ======================================================

function showFinishQuestion() {
  // Nếu không có câu hỏi thì dừng.
  if (!currentFinishQuestion) {
    return;
  }

  // Xóa timer cũ trước khi vẽ lại giao diện.
  clearInterval(timer);

  const questionNumber =
    currentFinishQuestionIndex + 1;

  const totalQuestions =
    currentFinishSelection.length;

  const difficulty =
    getDifficultyLabel(
      currentFinishQuestion.difficulty
    );

  render(
    gameLayout(`
      <div class="top">

        <div>
          <h1>🔴 VỀ ĐÍCH</h1>

          <div class="sub">
            ${escapeHtml(teams[activeTeam])}
            · ${getActiveBranchLabel()}
          </div>
        </div>

        <div class="score">
          ${teams.map(
            (team, index) => `
              <div class="score-row">
                <span>${escapeHtml(team)}</span>
                <b>${scores[index] || 0}</b>
              </div>
            `
          ).join('')}
        </div>

      </div>

      <div class="finish-question">

        <!-- ===============================
             THÔNG TIN CÂU
             =============================== -->

        <div class="finish-question-info">

          <div class="finish-question-progress">
            CÂU ${questionNumber}/${totalQuestions}
          </div>

          <div class="finish-question-difficulty">
            ${difficulty}
            · ${currentFinishPoints} điểm
          </div>

        </div>


        <!-- ===============================
             ĐỒNG HỒ
             =============================== -->

        <div
          id="finish-timer"
          class="finish-timer"
        >
          ${finishTimeLeft}
        </div>


        <!-- ===============================
             NỘI DUNG CÂU HỎI
             =============================== -->

        <div class="finish-question-text">
          ${escapeHtml(currentFinishQuestion.q)}
        </div>


        <!-- ===============================
             Ô NHẬP ĐÁP ÁN
             =============================== -->

        <div class="finish-answer-area">

          <input
            id="finish-answer-input"
            type="text"
            class="finish-answer-input"
            placeholder="Nhập đáp án..."
            autocomplete="off"
            onkeydown="handleFinishAnswerKey(event)"
          />

          <button
            id="finish-answer-button"
            class="next"
            onclick="submitFinishAnswer()"
          >
            TRẢ LỜI
          </button>

        </div>


        <!-- ===============================
             NGÔI SAO
             =============================== -->

        <div
          id="finish-star"
          class="finish-star ${
            canUseFinishStar(activeTeam)
              ? ''
              : 'used'
          }"
          title="Ngôi sao hy vọng"
        >
          ⭐

          <span>
            ${
              canUseFinishStar(activeTeam)
                ? 'Ngôi sao hy vọng'
                : 'Đã sử dụng'
            }
          </span>
        </div>


        <p class="note">
          ${canUseFinishStar(activeTeam)
            ? 'Ngôi sao hy vọng chưa được cài đặt.'
            : 'Ngôi sao hy vọng đã được sử dụng.'}
        </p>

      </div>
    `)
  );

  // Sau khi render xong, tự động đặt con trỏ
  // vào ô nhập đáp án.
  const input = document.getElementById(
    'finish-answer-input'
  );

  if (input) {
    input.focus();
  }
}

// ======================================================
// BẮT ĐẦU ĐẾM GIỜ VỀ ĐÍCH
// ======================================================

function startFinishTimer() {
  // Xóa timer cũ nếu có.
  clearInterval(timer);

  // Đảm bảo thời gian bắt đầu đúng.
  finishTimeLeft = FINISH_TIME;

  // Cập nhật giao diện ngay lần đầu.
  updateFinishTimer();

  // Mỗi 1 giây giảm 1.
  timer = setInterval(() => {

    // Nếu đã hết giờ thì dừng.
    if (finishTimeLeft <= 0) {
      clearInterval(timer);

      handleFinishTimeOut();

      return;
    }

    // Giảm thời gian.
    finishTimeLeft--;

    // Cập nhật số trên màn hình.
    updateFinishTimer();

  }, 1000);
}

// ======================================================
// CẬP NHẬT HIỂN THỊ ĐỒNG HỒ
// ======================================================

function updateFinishTimer() {
  const timerElement =
    document.getElementById('finish-timer');

  if (!timerElement) {
    return;
  }

  timerElement.textContent = finishTimeLeft;

  // Khi còn ít thời gian thì thêm class cảnh báo.
  if (finishTimeLeft <= 5) {
    timerElement.classList.add('danger');
  } else {
    timerElement.classList.remove('danger');
  }
}

// ======================================================
// HẾT THỜI GIAN SUY NGHĨ
// ======================================================

function handleFinishTimeOut() {
  // Đảm bảo không thể nhập thêm đáp án cho câu hiện tại.
  finishAnswerLocked = true;

  // Hiển thị giao diện giành quyền trả lời
  showFinishStealSelection();
}

// ======================================================
// XỬ LÝ PHÍM ENTER TRONG Ô ĐÁP ÁN
// ======================================================

function handleFinishAnswerKey(event) {
  // Nếu nhấn Enter
  if (event.key === 'Enter') {
    event.preventDefault();

    submitFinishAnswer();
  }
}

// ======================================================
// ĐỆ QUY / CHUẨN HÓA ĐÁP ÁN
// ======================================================

function normalizeFinishAnswer(answer) {
  return String(answer || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// ======================================================
// KIỂM TRA ĐÁP ÁN ĐỘI CHÍNH
// ======================================================

function submitFinishAnswer() {
  // Nếu câu đã bị khóa thì không xử lý nữa.
  if (finishAnswerLocked) {
    return;
  }

  // Lấy ô nhập.
  const input =
    document.getElementById(
      'finish-answer-input'
    );

  if (!input) {
    return;
  }

  // Lấy đáp án người chơi nhập.
  const userAnswer = input.value.trim();

  // Không cho gửi đáp án rỗng.
  if (!userAnswer) {
    input.focus();

    return;
  }

  // Khóa câu hỏi ngay khi bấm trả lời.
  finishAnswerLocked = true;

  // Dừng đồng hồ.
  clearInterval(timer);

  // Chuẩn hóa hai đáp án để so sánh.
  const normalizedUserAnswer =
    normalizeFinishAnswer(userAnswer);

  const normalizedCorrectAnswer =
    normalizeFinishAnswer(
      currentFinishQuestion.answer
    );

  // So sánh.
  const isCorrect =
    normalizedUserAnswer ===
    normalizedCorrectAnswer;

  // Gọi hàm xử lý kết quả.
  handleFinishMainAnswer(
    isCorrect,
    userAnswer
  );
}

// ======================================================
// XỬ LÝ KẾT QUẢ ĐỘI CHÍNH
// ======================================================

function handleFinishMainAnswer(
  isCorrect,
  userAnswer
) {

  const basePoints =
    currentFinishPoints;

  // Tính điểm theo luật ⭐.
  const scoreChange =
    calculateFinishMainScore(
      basePoints,
      isCorrect,
      activeTeam
    );

  // --------------------------------------------
  // ĐÚNG
  // --------------------------------------------

  if (isCorrect) {

    scores[activeTeam][activeBranch] +=
      scoreChange;

    refreshScoreboard();

    showFinishAnswerResult({
      correct: true,

      title: 'CHÍNH XÁC!',

      message:
        scoreChange > basePoints
          ? `+${scoreChange} điểm · ⭐ ×2`
          : `+${scoreChange} điểm`,

      correctAnswer:
        currentFinishQuestion.answer,
    });

    return;
  }

  // --------------------------------------------
  // SAI
  // --------------------------------------------

  // Nếu dùng ⭐: -10 / -20 / -30
  // Nếu không dùng ⭐: 0 điểm.
  if (scoreChange !== 0) {

    scores[activeTeam][activeBranch] +=
      scoreChange;

    refreshScoreboard();
  }

  // Không hiện đáp án ở đây.
  // Vì các đội khác sẽ được giành quyền.
  showFinishMainWrong();
}

// ======================================================
// ĐỘI CHÍNH TRẢ LỜI SAI
// ======================================================

function showFinishMainWrong() {

  // Đội chính không bị trừ điểm.
  //
  // Chuyển sang màn hình cho các đội khác
  // giành quyền.
  showFinishStealSelection();
}

// ======================================================
// HIỂN THỊ MÀN HÌNH GIÀNH QUYỀN
// ======================================================

function showFinishStealSelection() {

  // Đảm bảo timer đội chính đã dừng.
  clearInterval(timer);

  // Đang trong trạng thái chờ giành quyền.
  finishStealActive = false;

  // Chưa có đội được chọn.
  finishStealTeam = null;

  // Cho phép chọn một đội.
  finishStealLocked = false;

  // Tạo danh sách các đội khác.
  const availableTeams = teams
    .map((team, index) => {

      // Không cho đội đang thi giành quyền.
      if (index === activeTeam) {
        return '';
      }

      return `
        <button
          class="steal-team-button"
          onclick="selectFinishStealTeam(${index})"
        >
          ${escapeHtml(team)}
        </button>
      `;
    })
    .join('');

  render(
    gameLayout(`

      <div class="finish-steal-selection">

        <div class="finish-steal-title">
          GIÀNH QUYỀN TRẢ LỜI
        </div>

        <div class="finish-steal-subtitle">
          Các đội có ${STEAL_TIME} giây để giành quyền trả lời.
        </div>

        <!-- <div class="finish-steal-main-team">
          Đội đang thi:
          <strong>
            ${escapeHtml(teams[activeTeam])}
          </strong>
        </div> -->

        <div
          id="finish-steal-timer"
          class="finish-timer steal-timer"
        >
          ${STEAL_TIME}
        </div>

        <div class="finish-steal-teams">
          ${availableTeams}
        </div>

      </div>

    `)
  );

  startFinishStealTimer();
}

// ======================================================
// CHỌN ĐỘI GIÀNH QUYỀN
// ======================================================

function selectFinishStealTeam(teamIndex) {

  // Không cho chọn nếu đã có đội được chọn.
  if (finishStealLocked) {
    return;
  }

  // Không cho đội chính giành quyền.
  if (teamIndex === activeTeam) {
    return;
  }

  // Kiểm tra index hợp lệ.
  if (
    teamIndex < 0 ||
    teamIndex >= teams.length
  ) {
    return;
  }

  // Lưu đội giành quyền.
  finishStealTeam = teamIndex;

  // Khóa lựa chọn.
  finishStealLocked = true;

  // Bắt đầu thời gian trả lời.
  finishStealActive = true;

  // Dừng thời gian giành quyền.
  clearInterval(timer);

  // Đặt lại thời gian trả lời.
  finishStealTimeLeft = FINISH_STEAL_TIME;

  // Chuyển sang màn hình trả lời.
  showFinishStealQuestion();

  // Chuyển sang thời gian trả lời
  startFinishStealAnswerTimer();
}

function startFinishStealAnswerTimer() {

  clearInterval(timer);

  finishStealTimeLeft =
    FINISH_STEAL_TIME;

  updateFinishStealTimer();


  timer = setInterval(() => {

    finishStealTimeLeft--;

    updateFinishStealTimer();


    if (finishStealTimeLeft <= 0) {

      clearInterval(timer);

      handleFinishStealAnswerTimeout();
    }

  }, 1000);
}

function handleFinishStealAnswerTimeout() {

  clearInterval(timer);

  finishStealActive = false;

  finishAnswerLocked = true;

  // Đội này đã giành quyền.
  // Vì vậy hết giờ vẫn bị -50%.

  const penalty =
    currentFinishPoints *
    FINISH_STEAL_PENALTY;

  scores[finishStealTeam][activeBranch] -=
    penalty;

  refreshScoreboard();

  showFinishStealResult({

    correct: false,

    timeout: true,

    noTeam: false,

    message:
      `${teams[finishStealTeam]} ` +
      `không trả lời kịp. ` +
      `-${penalty} điểm.`
  });
}

function handleFinishStealSelectionTimeout() {

  clearInterval(timer);

  finishStealActive = false;

  finishAnswerLocked = true;

  // Không có đội nào chọn.
  // Không ai bị trừ điểm.
  finishStealTeam = null;

  showFinishStealResult({

    correct: false,

    timeout: true,

    noTeam: true,

    message:
      'Không có đội nào giành quyền trả lời.'
  });
}

// ======================================================
// BẮT ĐẦU THỜI GIAN GIÀNH QUYỀN
// ======================================================

function startFinishSteal() {

  // Kiểm tra đã chọn đội chưa.
  if (finishStealTeam === null) {
    return;
  }

  // Đánh dấu đang trong chế độ giành quyền.
  finishStealActive = true;

  // Đặt lại thời gian.
  finishStealTimeLeft =
    FINISH_STEAL_TIME;

  // Hiển thị màn hình.
  showFinishStealQuestion();

  // Bắt đầu timer.
  startFinishStealTimer();
}

// ======================================================
// HIỂN THỊ MÀN HÌNH GIÀNH QUYỀN TRẢ LỜI
// ======================================================

function showFinishStealQuestion() {
  render(
    gameLayout(`

      <div class="finish-question">

        <div class="top">

          <div>
            <h1>⚡ GIÀNH QUYỀN</h1>

            <div class="sub">
              ${escapeHtml(
                teams[finishStealTeam]
              )}
            </div>
          </div>

        </div>


        <!-- ===============================
             ĐỒNG HỒ 10 GIÂY
             =============================== -->

        <div
          id="finish-steal-timer"
          class="finish-timer steal-timer"
        >
          ${finishStealTimeLeft}
        </div>


        <!-- ===============================
             CÂU HỎI
             =============================== -->

        <div class="finish-question-text">

          ${escapeHtml(
            currentFinishQuestion.q
          )}

        </div>


        <!-- ===============================
             NHẬP ĐÁP ÁN
             =============================== -->

        <div class="finish-answer-area">

          <input
            id="finish-steal-answer-input"
            type="text"
            class="finish-answer-input"
            placeholder="Nhập đáp án..."
            autocomplete="off"
            onkeydown="handleFinishStealAnswerKey(event)"
          />

          <button
            id="finish-steal-answer-button"
            class="next"
            onclick="submitFinishStealAnswer()"
          >
            TRẢ LỜI
          </button>

        </div>


        <div class="note">
          ${escapeHtml(
            teams[finishStealTeam]
          )}
          có ${FINISH_STEAL_TIME} giây.
        </div>

      </div>

    `)
  );

  // Tự động focus ô nhập.
  const input =
    document.getElementById(
      'finish-steal-answer-input'
    );

  if (input) {
    input.focus();
  }
}
 // ======================================================
// TIMER GIÀNH QUYỀN
// ======================================================

function startFinishStealTimer() {

  // Xóa timer cũ.
  clearInterval(timer);

  //
  finishStealTimeLeft = STEAL_TIME;

  updateFinishStealTimer();

  timer = setInterval(() => {

    if (finishStealTimeLeft <= 0) {

      clearInterval(timer);

      handleFinishStealTimeOut();

      return;
    }

    finishStealTimeLeft--;

    updateFinishStealTimer();

  }, 1000);
}

// ======================================================
// CẬP NHẬT TIMER GIÀNH QUYỀN
// ======================================================

function updateFinishStealTimer() {

  const timerElement =
    document.getElementById(
      'finish-steal-timer'
    );

  if (!timerElement) {
    return;
  }

  timerElement.textContent =
    finishStealTimeLeft;

  if (finishStealTimeLeft <= 5) {
    timerElement.classList.add('danger');
  } else {
    timerElement.classList.remove('danger');
  }
}

// ======================================================
// HẾT 10 GIÂY GIÀNH QUYỀN
// ======================================================

function handleFinishStealTimeOut() {

  // Dừng timer.
  clearInterval(timer);

  // Đã kết thúc trạng thái giành quyền.
  finishStealActive = false;

  // Khóa trả lời.
  finishAnswerLocked = true;

  // ==================================================
  // TRƯỜNG HỢP 1:
  // KHÔNG CÓ ĐỘI NÀO GIÀNH QUYỀN
  // ==================================================

  if (finishStealTeam === null) {

    showFinishStealResult({

      correct: false,

      timeout: true,

      noTeam: true,

      message:
        'Không có đội nào giành quyền trả lời.',

    });

    return;
  }

  // ==================================================
  // TRƯỜNG HỢP 2:
  // ĐÃ CÓ ĐỘI GIÀNH QUYỀN
  // Nhưng hết 10 giây mà đội đó không trả lời.
  // Đã giành quyền → BỊ -50%
  // ==================================================

  const penalty =
    currentFinishPoints *
    FINISH_STEAL_PENALTY;

  scores[finishStealTeam][activeBranch] -=
    penalty;

  // Cập nhật bảng điểm.
  refreshScoreboard();

  showFinishStealResult({

    correct: false,

    timeout: true,

    noTeam: false,

    message:
      `${teams[finishStealTeam]} ` +
      `không trả lời kịp. ` +
      `-${penalty} điểm.`,

  });
}

// ======================================================
// ENTER - GIÀNH QUYỀN
// ======================================================

function handleFinishStealAnswerKey(event) {

  if (event.key === 'Enter') {

    event.preventDefault();

    submitFinishStealAnswer();
  }
}

// ======================================================
// ĐỘI GIÀNH QUYỀN TRẢ LỜI
// ======================================================

function submitFinishStealAnswer() {

  // Không xử lý nếu timer đã khóa.
  if (!finishStealActive) {
    return;
  }

  // Không có đội.
  if (finishStealTeam === null) {
    return;
  }

  const input =
    document.getElementById(
      'finish-steal-answer-input'
    );

  if (!input) {
    return;
  }

  const userAnswer =
    input.value.trim();

  if (!userAnswer) {
    input.focus();

    return;
  }

  // Dừng timer.
  clearInterval(timer);

  // Không cho gửi thêm.
  finishStealActive = false;

  const normalizedUserAnswer =
    normalizeFinishAnswer(userAnswer);

  const normalizedCorrectAnswer =
    normalizeFinishAnswer(
      currentFinishQuestion.answer
    );

  const isCorrect =
    normalizedUserAnswer ===
    normalizedCorrectAnswer;

  handleFinishStealAnswer(
    isCorrect,
    userAnswer
  );
}

// ======================================================
// XỬ LÝ KẾT QUẢ GIÀNH QUYỀN
// ======================================================

function handleFinishStealAnswer(
  isCorrect,
  userAnswer
) {

  // Điểm gốc của câu hỏi.
  const basePoints =
    currentFinishPoints;

  // Điểm trừ khi giành quyền trả lời sai.
  const stealPenalty =
    basePoints * FINISH_STEAL_PENALTY;

  // --------------------------------------------
  // ĐÚNG
  // Đội chính bị trừ bằng số điểm của câu hỏi
  // Đội giành quyền được cộng bằng số điểm của câu hỏi
  // --------------------------------------------
  if (isCorrect) {
    // Đội chính chuyển điểm qua đội giành quyền.
    if (finishStarQuestionTeam === activeTeam) {
      // ko trừ (vì đã trừ ở phần xử lý nshv)
    } else { // ko có nshv
      scores[activeTeam][activeBranch] -=
        basePoints;
    }
    // Đội giành quyền nhận điểm từ đội chính.
    scores[finishStealTeam][activeBranch] +=
      basePoints;
    // Cập nhật bảng điểm.
    refreshScoreboard();

    showFinishStealResult({
      correct: true,
      timeout: false,
      message:
        `${teams[finishStealTeam]} ` +
        `+${basePoints} điểm.`,
    });
    return;
  }

  // --------------------------------------------
  // SAI
  // Đội giành quyền bị trừ 50% số điểm của câu hỏi.
  // Đội chính nếu sử dụng nshv thì bị trừ bằng đúng số điểm của câu hỏi.
  // Đội chính ko sử dụng nshv thì ko bị trừ điểm
  // --------------------------------------------
  
  // Nếu đội chính đã dùng ⭐ thì bị trừ bằng đúng số điểm của câu hỏi.
  if (finishStarQuestionTeam === activeTeam) {
    // scores[activeTeam][activeBranch] -= basePoints;
  }
  // Đội giành quyền bị trừ 50% số điểm của câu hỏi.
  scores[finishStealTeam][activeBranch] -=
    stealPenalty;

  refreshScoreboard();

  showFinishStealResult({
    correct: false,
    timeout: false,
    message:
      `${teams[finishStealTeam]} ` +
      `-${Math.abs(stealPenalty)} điểm.`,
  });
}

// ======================================================
// HIỂN THỊ KẾT QUẢ GIÀNH QUYỀN
// ======================================================
function showFinishStealResult({
  correct,
  timeout,
  message,
}) {
  const title = correct
    ? 'GIÀNH QUYỀN THÀNH CÔNG!'
    : timeout
      ? 'HẾT GIỜ!'
      : 'TRẢ LỜI SAI!';
  render(
    gameLayout(`
      <div class="finish-result">
        <div
          class="
            finish-result-icon
            ${correct ? 'correct' : 'wrong'}
          "
        >
          ${
            correct
              ? '✓'
              : timeout
                ? '⏱'
                : '✕'
          }
        </div>
        <h2>
          ${title}
        </h2>
        <p class="finish-result-message">
          ${escapeHtml(message)}
        </p>
        <div class="finish-correct-answer">
          <span>Đáp án đúng:</span>
          <strong>
            ${escapeHtml(
              currentFinishQuestion.answer
            )}
          </strong>
        </div>
        <button
          class="next"
          onclick="nextFinishQuestion()"
        >
          CÂU TIẾP THEO →
        </button>
      </div>
    `)
  );
}
// ======================================================
// HIỂN THỊ KẾT QUẢ TRẢ LỜI
// ======================================================

function showFinishAnswerResult({
  correct,
  title,
  message,
  correctAnswer,
  allowSteal = false,
}) {
  render(
    gameLayout(`

      <div class="finish-result">

        <div
          class="
            finish-result-icon
            ${correct ? 'correct' : 'wrong'}
          "
        >
          ${correct ? '✓' : '✕'}
        </div>

        <h2>${title}</h2>

        <p class="finish-result-message">
          ${message}
        </p>

        <div class="finish-correct-answer">
          <span>Đáp án:</span>

          <strong>
            ${escapeHtml(correctAnswer)}
          </strong>
        </div>

        ${
          allowSteal
            ? `
              <button
                class="next"
                onclick="startFinishStealPhase()"
              >
                GIÀNH QUYỀN TRẢ LỜI →
              </button>
            `
            : `
              <button
                class="next"
                onclick="nextFinishQuestion()"
              >
                CÂU TIẾP THEO →
              </button>
            `
        }

      </div>

    `)
  );
}

// ======================================================
// CHUYỂN SANG CÂU VỀ ĐÍCH TIẾP THEO
// ======================================================

function nextFinishQuestion() {
  // Tăng chỉ số câu.
  currentFinishQuestionIndex++;

  // Câu mới mặc định chưa sử dụng ⭐.
  // MC sẽ quyết định lại ở màn hình chuẩn bị.
  finishStarQuestionTeam = null;
  
  // Nếu vẫn còn câu
  if (
    currentFinishQuestionIndex <
    currentFinishSelection.length
  ) {
    // Chuẩn bị câu tiếp theo.
    showFinishReadyScreen();

    return;
  }

  // Nếu đã hết 3 câu.
  finishComplete();
}

// ======================================================
// KẾT THÚC PHẦN VỀ ĐÍCH CỦA ĐỘI
// ======================================================

function finishComplete() {
  clearInterval(timer);

  render(
    gameLayout(`

      <div class="finish-result">

        <div class="finish-result-icon correct">
          🏁
        </div>

        <h2>HOÀN THÀNH VỀ ĐÍCH</h2>

        <p class="finish-result-message">
          ${escapeHtml(teams[activeTeam])}
          đã hoàn thành 3 câu hỏi.
        </p>

        <div class="finish-final-score">
          Điểm hiện tại:
          <strong>
            ${getTeamTotal(activeTeam)}
          </strong>
        </div>

        <button
          class="next"
          onclick="finishTurnComplete()"
        >
          HOÀN THÀNH →
        </button>

      </div>

    `)
  );
}

// ======================================================
// HOÀN THÀNH LƯỢT VỀ ĐÍCH CỦA MỘT ĐỘI
// ======================================================
function finishTurnComplete() {
  // Đội hiện tại vừa hoàn thành lượt Về đích.
  if (!finishPlayedTeams.includes(activeTeam)) {
    finishPlayedTeams.push(activeTeam);
  }

  // Nếu chưa đủ 4 đội:
  // quay lại cho MC chọn đội tiếp theo.
  if (finishPlayedTeams.length < teams.length) {
    showFinishTeamSelection();
    return;
  }

  // Đủ 4 đội → tổng kết điểm ngành hiện tại
  showFinishFinalResult();
}

function showFinishFinalResult() {

  clearInterval(timer);

  // Lấy điểm của riêng ngành hiện tại.
  const ranking = teams.map((team, teamIndex) => ({
    teamIndex: teamIndex,
    team: team,
    score: scores[teamIndex][activeBranch]
  }));

  // Xếp điểm từ cao xuống thấp.
  ranking.sort((a, b) => b.score - a.score);

  const first = ranking[0];
  const second = ranking[1];
  const third = ranking[2];
  const fourth = ranking[3];

  render(
    gameLayout(`

      <div class="finish-final-result">

        <div class="top">
          <div>
            <h1>🏆 TỔNG KẾT VỀ ĐÍCH</h1>

            <div class="sub">
              ${getActiveBranchLabel()}
            </div>
          </div>
        </div>


        <div class="finish-ranking">


          <!-- =========================
               HẠNG 1
               Ở GIỮA - CAO NHẤT
               ========================= -->

          <div class="finish-rank rank-1">

            <div class="rank-medal">
              🥇
            </div>

            <div class="rank-team">
              ${escapeHtml(first.team)}
            </div>

            <div class="rank-score">
              ${first.score} điểm
            </div>

          </div>


          <!-- =========================
               HẠNG 2
               BÊN TRÁI - THẤP HƠN
               ========================= -->

          <div class="finish-rank rank-2">

            <div class="rank-medal">
              🥈
            </div>

            <div class="rank-team">
              ${escapeHtml(second.team)}
            </div>

            <div class="rank-score">
              ${second.score} điểm
            </div>

          </div>


          <!-- =========================
               HẠNG 3
               BÊN PHẢI
               ========================= -->

          <div class="finish-rank rank-3">

            <div class="rank-medal">
              🥉
            </div>

            <div class="rank-team">
              ${escapeHtml(third.team)}
            </div>

            <div class="rank-score">
              ${third.score} điểm
            </div>

          </div>


          <!-- =========================
               HẠNG 4
               BÊN PHẢI
               NGANG HÀNG HẠNG 3
               ========================= -->

          <div class="finish-rank rank-4">

            <div class="rank-medal">
              4️⃣
            </div>

            <div class="rank-team">
              ${escapeHtml(fourth.team)}
            </div>

            <div class="rank-score">
              ${fourth.score} điểm
            </div>

          </div>

        </div>

        <div class="finish-final-actions">

          <button
            class="next"
            onclick="returnToMainProgram()"
          >
            ← TRỞ VỀ MÀN HÌNH CHƯƠNG TRÌNH
          </button>

        </div>

      </div>

    `)
  );
}

function returnToMainProgram() {

  clearInterval(timer);

  // Quay về màn hình chứa 4 phần thi:
  // Khởi động - Vượt chướng ngại vật
  // Tăng tốc - Về đích
  showPacks();
}

// ======================================================
// SỬ DỤNG NGÔI SAO HY VỌNG
// ======================================================
function useFinishStar() {

  // Đội đã dùng ⭐ trước đó thì không cho dùng.
  if (!canUseFinishStar(activeTeam)) {
    return;
  }

  // Đánh dấu đội đã sử dụng ⭐ trong toàn bộ phần Về đích.
  finishStarUsedByTeam[activeTeam] = true;

  // Đồng thời đánh dấu: CÂU HIỆN TẠI đang sử dụng ⭐.
  finishStarQuestionTeam = activeTeam;

  const star =
    document.getElementById('finish-star');

  if (!star) {
    return;
  }

  star.classList.add('used');

  star.onclick = null;

  const label =
    star.querySelector('span');

  if (label) {
    label.textContent =
      'Đã sử dụng';
  }

  star.title =
    'Ngôi sao hy vọng đã sử dụng';
}

function showQuestionSets(selectedPack) {

  clearInterval(timer);

  pack =
    selectedPack;

  questionSet =
    null;


  const currentBranchId =
    getActiveBranchId();


  const setNumbers =
    getSetNumbersForPack(
      selectedPack,
      currentBranchId
    );


  const playedTeams =
    startPlayedTeams[
      activeBranch
    ];


  const allTeamsPlayed =
    playedTeams.length >= teams.length;


  // ==================================================
  // NÚT CHỌN ĐỘI
  // ==================================================

  const teamButtons =
    teams
      .map(
        (
          team,
          teamIndex
        ) => {

          const played =
            playedTeams.includes(
              teamIndex
            );


          const selected =
            activeTeam === teamIndex;


          return `
            <button
              class="team-option ${
                selected
                  ? 'active'
                  : ''
              }"
              onclick="selectStartTeam(${teamIndex})"
              ${
                played
                  ? 'disabled'
                  : ''
              }
            >

              ${escapeHtml(team)}

              <small>
                ${
                  played
                    ? 'ĐÃ THI'
                    : 'CHỌN ĐỘI'
                }
              </small>

            </button>
          `;

        }
      )
      .join('');


  // ==================================================
  // NÚT CHỌN BỘ
  // ==================================================

  const setButtons =
    setNumbers
      .map(
        (setNumber) => {

          return `
            <button
              class="pack"
              onclick="chooseQuestionSet(${setNumber})"
              ${
                hasStartTeamPlayed(
                  activeTeam
                )
                  ? 'disabled'
                  : ''
              }
            >

              BỘ ${setNumber}

              <small>
                ${
                  startQuestions.filter(
                    (question) =>
                      question.pack ===
                        selectedPack &&
                      question.branch ===
                        currentBranchId &&
                      question.set ===
                        setNumber
                  ).length
                } câu
              </small>

            </button>
          `;

        }
      )
      .join('');


  // ==================================================
  // HIỂN THỊ
  // ==================================================

  render(
    gameLayout(`

      <div class="top">

        <div>

          <h1>
            🟢 KHỞI ĐỘNG
          </h1>

          <div class="sub">
            ${getActiveBranchLabel()}
          </div>

        </div>

      </div>


      <div class="card">

        <h2>
          CHỌN ĐỘI THI
        </h2>

        <div class="team-options">

          ${teamButtons}

        </div>


        <div
          style="
            margin-top: 25px;
          "
        >

          <h2>
            CHỌN BỘ CÂU HỎI
          </h2>

          <div class="grid set-grid">

            ${setButtons}

          </div>

        </div>


        <div
          style="
            margin-top: 25px;
            display: flex;
            justify-content: center;
          "
        >

          <button
            class="next"
            onclick="endKickoff()"
            ${
              allTeamsPlayed
                ? ''
                : 'disabled'
            }
          >

            ✅ KẾT THÚC KHỞI ĐỘNG

          </button>

        </div>


        <p class="note">

          ${
            allTeamsPlayed

              ? 'Đã đủ 4 đội hoàn thành Khởi động. Có thể kết thúc phần thi.'

              : `Đã có ${playedTeams.length}/4 đội hoàn thành Khởi động.`

          }

        </p>


      </div>

    `)
  );

}

// ======================================================
// KẾT THÚC PHẦN KHỞI ĐỘNG
// ======================================================

function endKickoff() {

  const playedTeams =
    startPlayedTeams[
      activeBranch
    ];


  // Chưa đủ 4 đội
  if (
    playedTeams.length <
    teams.length
  ) {

    alert(
      `Chưa thể kết thúc Khởi động.\n\n` +
      `Mới có ${playedTeams.length}/4 đội hoàn thành.`
    );

    return;

  }


  // Dừng timer
  clearInterval(timer);


  // Quay về màn hình chọn 4 phần thi
  showPacks();

}

// ======================================================
// CHỌN ĐỘI THI KHỞI ĐỘNG
// ======================================================

function selectStartTeam(teamIndex) {

  // Kiểm tra đội hợp lệ
  if (
    teamIndex < 0 ||
    teamIndex >= teams.length
  ) {

    return;

  }


  // Đội đã thi rồi thì không cho chọn
  if (
    hasStartTeamPlayed(teamIndex)
  ) {

    return;

  }


  activeTeam =
    teamIndex;


  // Hiển thị lại màn hình chọn bộ
  showQuestionSets(1);

}

function chooseQuestionSet(selectedSet) {

  // Không cho đội đã thi chọn lại
  if (
    hasStartTeamPlayed(activeTeam)
  ) {

    alert(
      `${teams[activeTeam]} đã hoàn thành phần Khởi động.`
    );

    return;

  }


  questionSet =
    selectedSet;


  pool =
    startQuestions.filter(
      (question) =>
        question.pack === pack &&
        question.branch ===
          getActiveBranchId() &&
        question.set ===
          selectedSet
    );


  idx =
    0;


  showQuestion();

}

function showQuestion() {
  
  // Đã hoàn thành phần thi Khởi động
  if (idx >= pool.length) {

    clearInterval(timer);

    // Khởi động hoàn thành, quay trở về màn hình chính
    if (pack === 1){
      markStartTeamPlayed(
        activeTeam
      );

      showQuestionSets(1);
      return;
    }

    showPacks();

    return;
  }

  locked = false;
  timeLeft = 15;
  clearInterval(timer);

  const question = pool[idx];

  render(gameLayout(`
    <div class="top"><div><b>${getPackLabel(pack)}</b>${questionSet ? ` · BỘ ${questionSet}` : ''} · ${getBranchLabel(question.branch)} · CÂU ${idx + 1}/${pool.length}</div><div class="timer" id="timer">15s</div></div>
    ${teamSelector()}
    <div class="q">${escapeHtml(question.q)}</div>
    <div class="answers">${question.a.map((answer, i) => `<button id="ans${i}" onclick="answer(${i})"><b>${String.fromCharCode(65 + i)}.</b> ${escapeHtml(answer)}</button>`).join('')}</div>
    <div id="feedback" class="feedback"></div>
    <div id="nextbox" class="hidden"><button class="next" onclick="nextQuestion()">Câu tiếp theo →</button></div>
  `));

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

  render(gameLayout(`<h1>🏆 KẾT QUẢ CHUNG CUỘC</h1>
    <ol>${ranking.map((item) => `<li><b>${escapeHtml(item.name)}</b> — ${item.score} điểm</li>`).join('')}</ol>
    <button onclick="showPacks()">Quay lại bảng chọn gói</button>`, 'final'));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ======================================================
// KIỂM TRA ĐỘI HIỆN TẠI CÒN NGÔI SAO KHÔNG
// ======================================================

function canUseFinishStar(teamIndex = activeTeam) {

  return !finishStarUsedByTeam[teamIndex];

}

// ======================================================
// RESET NGÔI SAO HY VỌNG
// ======================================================
//
// Chỉ gọi khi:
// - bắt đầu cuộc thi mới
// - reset toàn bộ cuộc thi
//
// Không gọi khi chuyển từ câu 1 sang câu 2.
// ======================================================

function resetFinishStars() {

  finishStarUsedByTeam =
    teams.map(() => false);

}

// ======================================================
// TÍNH ĐIỂM ĐỘI CHÍNH
// ======================================================

function calculateFinishMainScore(
  basePoints,
  isCorrect,
  teamIndex = activeTeam
) {

  // Kiểm tra đội có dùng ⭐ không.
  // Nếu đội đã dùng ⭐ thì câu hiện tại chính là
  // câu mà MC đã click ⭐ trước khi bắt đầu.
  const usedStar =
    finishStarUsedByTeam[teamIndex] &&
    finishStarQuestionTeam === teamIndex;

  // --------------------------------------------
  // TRẢ LỜI ĐÚNG
  // --------------------------------------------

  if (isCorrect) {

    if (usedStar) {
      return basePoints *
        FINISH_STAR_MULTIPLIER;
    }

    return basePoints;
  }

  // --------------------------------------------
  // TRẢ LỜI SAI
  // --------------------------------------------

  if (usedStar) {
    return -basePoints;
  }

  return 0;
}

// ======================================================
// ĐỘI NÀO ĐANG SỬ DỤNG ⭐ CHO CÂU HIỆN TẠI
// ======================================================
//
// null = câu này không dùng ⭐
// 0    = đội 1 dùng ⭐
// 1    = đội 2 dùng ⭐
// ...
// ======================================================
let finishStarQuestionTeam = null;

// ======================================================
// TÍNH ĐIỂM ĐỘI GIÀNH QUYỀN
// ======================================================
function calculateFinishStealScore(
  basePoints,
  isCorrect
) {

  // Đúng:+100% điểm câu.
  if (isCorrect) {
    return basePoints;
  }
  // Sai: -50% điểm câu.
  return -(
    basePoints *
    FINISH_STEAL_PENALTY
  );
}

// ======================================================
// MÀN HÌNH TĂNG TỐC - MÁY MC
// ======================================================

function showTangTocScreen() {

  clearInterval(timer);

  tangTocScreenActive = true;


  // ------------------------------------------
  // Đếm số đội đã kết nối
  // ------------------------------------------

  const connectedCount =
    tangTocTeamStatus.filter(
      (team) =>
        team.connected
    ).length;


  // ------------------------------------------
  // Danh sách 4 đội
  // ------------------------------------------

  const teamStatusHtml =
    tangTocTeamStatus
      .map((team) => {

        const statusText =
          team.connected
            ? '🟢 ĐÃ KẾT NỐI'
            : '🔴 CHƯA KẾT NỐI';


        return `
          <div class="tangtoc-team-status">

            <div class="tangtoc-team-name">
              ${escapeHtml(team.teamName)}
            </div>

            <div class="tangtoc-team-connection">
              ${statusText}
            </div>

          </div>
        `;

      })
      .join('');


  render(
    gameLayout(`

      <div class="top">

        <div>

          <h1>
            🟡 TĂNG TỐC
          </h1>

          <div class="sub">
            ${getActiveBranchLabel()}
          </div>

        </div>

      </div>


      ${selectionControls()}


      <div class="card">

        <h2>
          PHẦN THI TĂNG TỐC
        </h2>


        <p class="note">

          Gồm ${TANGTOC_TOTAL_QUESTIONS}
          câu hỏi Đuổi hình bắt chữ.

          <br>

          Mỗi câu có
          <b>${TANGTOC_TIME} giây</b>
          để suy nghĩ và gửi đáp án.

          <br>

          Đội trả lời đúng nhanh nhất:
          <b>+40 điểm</b>.

          Sau đó lần lượt:
          <b>+30, +20, +10</b>.

          <br>

          Trả lời sai:
          <b>0 điểm</b>.

        </p>


        <div class="tangtoc-connection-summary">

          Đã kết nối:
          <b>
            ${connectedCount}/4
          </b>

        </div>


        <div class="tangtoc-team-list">

          ${teamStatusHtml}

        </div>


        <div class="tangtoc-actions">

          <button
            class="tangtoc-start-button"
            onclick="startTangToc()"
            ${connectedCount < 4 ? 'disabled' : ''}
          >

            ▶ BẮT ĐẦU TĂNG TỐC

          </button>


          <button
            class="secondary-button"
            onclick="showPacks()"
          >

            ← QUAY LẠI

          </button>

        </div>


        ${
          connectedCount < 4
            ? `
              <p class="note warning">

                Cần đủ 4 đội kết nối
                trước khi bắt đầu.

              </p>
            `
            : `
              <p class="note success">

                Đã đủ 4 đội.
                Có thể bắt đầu phần thi.

              </p>
            `
        }

      </div>

    `)
  );

}

// ======================================================
// BẮT ĐẦU TĂNG TỐC
// ======================================================

function startTangToc() {

  if (
    !mcSocket ||
    mcSocket.readyState !== WebSocket.OPEN
  ) {

    alert(
      'Chưa kết nối được với server.'
    );

    return;

  }


  const connectedCount =
    tangTocTeamStatus.filter(
      (team) =>
        team.connected
    ).length;


  if (
    connectedCount < 4
  ) {

    alert(
      'Chưa đủ 4 đội kết nối.'
    );

    return;

  }


  tangTocStarted = true;


  // Gửi lệnh cho server
  mcSocket.send(
    JSON.stringify({

      type: 'START_TANGTOC',

      branch: getActiveBranchId(),

      totalQuestions: TANGTOC_TOTAL_QUESTIONS,

      timeLimit: TANGTOC_TIME

    })
  );

  console.log(
    'MC đã gửi lệnh bắt đầu Tăng tốc.'
  );

}

function nextTangTocQuestion() {

  if (
    !mcSocket ||
    mcSocket.readyState !== WebSocket.OPEN
  ) {

    alert(
      'Chưa kết nối được với server.'
    );

    return;
  }

  mcSocket.send(
    JSON.stringify({

      type:
        'NEXT_TANGTOC_QUESTION'

    })
  );

}

// ======================================================
// KHỞI TẠO VCNV
// ======================================================

function startVCNV() {

    vcnvQuestions = [];

    vcnvCurrentQuestion = -1;

    vcnvRevealedAnswers = [];

    vcnvRevealedPieces = [];

    vcnvKeywordLockedTeams = [];

    vcnvKeywordRequest = null;

    vcnvLastResult = null;

    vcnvWinnerTeam = null;

    vcnvScoredQuestions.clear();

    vcnvKeywordScored = false;

    vcnvWinnerKeywordPoints = 0;

    vcnvFinished = false;

    vcnvKeyword = '';

    vcnvImage = '';
    
    startVCNVServer();

    // showVCNVQuestionSelection();

}

function startVCNVServer() {

    if (
        !mcSocket ||
        mcSocket.readyState !== WebSocket.OPEN
    ) {

        console.error(
            'MC chưa kết nối server.'
        );

        return;

    }


    mcSocket.send(
        JSON.stringify({

            type:
                'START_VCNV',

            branch:
                getActiveBranchId()

        })
    );


    console.log(
        'MC đã gửi START_VCNV'
    );

}

// ======================================================
// MÀN HÌNH CHỌN CÂU HỎI
// ======================================================

function showVCNVQuestionSelection() {

    vcnvCurrentScreen =
        'QUESTION_SELECTION';

    renderVCNV();

}


// ======================================================
// MÀN HÌNH CÂU HỎI
// ======================================================

function showVCNVQuestion(questionIndex) {

    if (
        questionIndex < 0 ||
        questionIndex >= vcnvQuestions.length
    ) {
        return;
    }

    vcnvCurrentQuestion =
        questionIndex;

    vcnvCurrentScreen =
        'QUESTION';

    vcnvQuestionResult = {
        questionIndex: questionIndex,
        answer: vcnvQuestions[questionIndex].answer,
        results: []
    };

    renderVCNV();

    if (
        mcSocket &&
        mcSocket.readyState === WebSocket.OPEN
    ) {

        mcSocket.send(
            JSON.stringify({

                type:
                    'VCNV_SHOW_QUESTION',

                questionIndex:
                    questionIndex

            })
        );

    }

}

function showVCNVQuestionResult() {
  
    vcnvCurrentScreen = 'RESULT';

    renderVCNV();

}

// ======================================================
// CÔNG BỐ ĐÁP ÁN
// ======================================================

function revealVCNVAnswer() {

    if (
        vcnvCurrentQuestion < 0
    ) {
        return;
    }

    if (
        !vcnvRevealedAnswers.includes(
            vcnvCurrentQuestion
        )
    ) {

        vcnvRevealedAnswers.push(
            vcnvCurrentQuestion
        );

    }

    showVCNVResult();

}


// ======================================================
// MÀN HÌNH KẾT QUẢ
// ======================================================

function showVCNVResult() {

    vcnvCurrentScreen =
        'RESULT';

    renderVCNV();

}


// ======================================================
// MÀN HÌNH MẢNH GHÉP
// ======================================================

function showVCNVPiece() {

    vcnvCurrentScreen =
        'PIECE';

    renderVCNV();

    setTimeout(
        () => {

            if (
                vcnvCurrentQuestion >= 0 &&
                !vcnvRevealedPieces.includes(
                    vcnvCurrentQuestion
                )
            ) {

                vcnvRevealedPieces.push(
                    vcnvCurrentQuestion
                );

            }

            renderVCNV();

        },
        2000
    );

}


// ======================================================
// QUAY LẠI CHỌN CÂU
// ======================================================

function continueVCNV() {

    vcnvCurrentQuestion =
        -1;

    vcnvCurrentScreen =
        'QUESTION_SELECTION';

    renderVCNV();

}


// ======================================================
// MỞ MÀN HÌNH TRẢ LỜI TỪ KHÓA
// ======================================================

function showVCNVKeywordScreen() {

  vcnvPreviousScreen = vcnvCurrentScreen;

  vcnvCurrentScreen = 'KEYWORD';

  renderVCNV();

}


// ======================================================
// RENDER VCNV
// ======================================================

function renderVCNV() {

    const app =
        document.getElementById(
            'app'
        );

    if (!app) {
        return;
    }

    app.innerHTML =
        buildVCNVScreen();
}


// ======================================================
// TẠO GIAO DIỆN VCNV
// ======================================================

function buildVCNVScreen() {

    let html = '';

    html += `
        <div class="vcnv-screen">

            <div class="vcnv-header">

                <div class="vcnv-title">
                    VƯỢT CHƯỚNG NGẠI VẬT
                </div>

                <button
                    class="vcnv-keyword-request-button"
                    id="vcnvKeywordRequestButton"
                    onclick="showVCNVKeywordScreen()"
                    hidden
                >
                    TRẢ LỜI TỪ KHÓA
                </button>

            </div>
    `;

    // ==================================================
    // MÀN HÌNH 1
    // ==================================================

    if (
        vcnvCurrentScreen ===
        'QUESTION_SELECTION'
    ) {

        html +=
            buildVCNVQuestionSelection();

    }

    // ==================================================
    // MÀN HÌNH 2
    // ==================================================

    if (
        vcnvCurrentScreen ===
        'QUESTION'
    ) {

        html +=
            buildVCNVQuestionScreen();

    }

    // ==================================================
    // MÀN HÌNH 3
    // ==================================================

    if (
        vcnvCurrentScreen ===
        'RESULT'
    ) {

        html +=
            buildVCNVResultScreen();

    }

    // ==================================================
    // MÀN HÌNH 4
    // ==================================================

    if (
        vcnvCurrentScreen ===
        'PIECE'
    ) {

        html +=
            buildVCNVPieceScreen();

    }

    // ==================================================
    // MÀN HÌNH 5
    // ==================================================
    if (
        vcnvCurrentScreen ===
        'KEYWORD'
    ) {

        html +=
            buildVCNVKeywordScreen();

    }

    if (
        vcnvCurrentScreen ===
        'FINISHED'
    ) {

        html +=
            buildVCNVFinishedScreen();

    }

    if (
        vcnvCurrentScreen ===
        'KEYWORD_WRONG'
    ) {

        html +=
            buildVCNVKeywordWrongScreen();

    }

    if (
        vcnvCurrentScreen ===
        'PUZZLE'
    ) {

        html +=
            buildVCNVPuzzleScreen();

    }
    html += `
        </div>
    `;

    return html;

}

// ======================================================
// VCNV - MÀN HÌNH CHỌN CÂU HỎI
// ======================================================

function buildVCNVQuestionSelection() {

    let html = '';

    html += `
        <div class="vcnv-panel">

            <h2>
                CHỌN CÂU HỎI
            </h2>

            <div class="vcnv-question-list">
    `;


    vcnvQuestions.forEach(
        (question, index) => {

            const revealed =
                vcnvRevealedAnswers.includes(index);

            // Bỏ khoảng trắng khi đếm số ô
            const characters =
                question.answer
                    .replace(/\s/g, '')
                    .split('');


            html += `

                <button
                    class="vcnv-question-row"
                    onclick="showVCNVQuestion(${index})"
                >

                    <span class="vcnv-question-number">
                        (${index + 1})
                    </span>

                    <span class="vcnv-answer-circles">
            `;


            characters.forEach(
                (character) => {

                    html += `

                        <span
                            class="
                                vcnv-answer-circle
                                ${
                                    revealed
                                        ? 'revealed'
                                        : ''
                                }
                            "
                        >
                            ${
                                revealed
                                    ? character
                                    : ''
                            }
                        </span>

                    `;

                }
            );


            html += `

                    </span>

                </button>

            `;

        }
    );


    html += `

            </div>

            <div class="vcnv-question-selection-bottom">

                <button
                    class="vcnv-secondary-button"
                    onclick="showVCNVKeywordScreen()"
                >
                    ĐIỀN TỪ KHÓA
                </button>

            </div>

        </div>
    `;


    return html;

}

// ======================================================
// VCNV - MÀN HÌNH CÂU HỎI
// ======================================================

function buildVCNVQuestionScreen() {

    const question =
        vcnvQuestions[
            vcnvCurrentQuestion
        ];

    if (!question) {
        return '';
    }


    return `

        <div class="vcnv-panel">

            <div class="vcnv-question-label">

                CÂU ${vcnvCurrentQuestion + 1}
                / ${vcnvQuestions.length}

            </div>

            <div
                id="vcnv-mc-timer"
                class="vcnv-mc-timer"
            >
                20
            </div>

            <div class="vcnv-question-content">

                ${question.question}

            </div>


            <div class="vcnv-answer-preview">

                <div class="vcnv-answer-preview-title">
                    ĐÁP ÁN
                </div>

                <div class="vcnv-hidden-answer">
                    ${
                        vcnvRevealedAnswers.includes(
                            vcnvCurrentQuestion
                        )
                            ? question.answer
                            : 'CHƯA CÔNG BỐ'
                    }
                </div>

            </div>


            <div class="vcnv-action-row">

                <button
                    class="vcnv-primary-button"
                    onclick="revealVCNVAnswer()"
                >
                    HIỆN ĐÁP ÁN
                </button>


                <button
                    class="vcnv-secondary-button"
                    onclick="showVCNVQuestionSelection()"
                >
                    QUAY LẠI
                </button>

            </div>

        </div>

    `;

}

// ======================================================
// MÀN HÌNH KẾT QUẢ CÂU VCNV
// ======================================================

function buildVCNVResultScreen() {

    const results =
        vcnvQuestionResult.results ||
        [];

    const questionNumber =
        Number(
            vcnvQuestionResult.questionIndex
        ) + 1;

    let rows = '';

    for (
        let teamId = 0;
        teamId < 4;
        teamId++
    ) {

        const result =
            results.find(
                item =>
                    Number(
                        item.teamId
                    ) === teamId
            );

        if (!result) {
            continue;
        }

        let status;

        if (
            !result.answered
        ) {

            status =
                'KHÔNG TRẢ LỜI';

        } else if (
            result.correct
        ) {

            status =
                'ĐÚNG';

        } else {

            status =
                'SAI';

        }

        rows += `

            <div class="vcnv-result-row">

                <div class="vcnv-result-team">

                    ${escapeHtml(
                        result.team
                    )}

                </div>


                <div class="vcnv-result-answer">

                    ${
                        result.answered
                            ? escapeHtml(
                                result.answer
                              )
                            : '—'
                    }

                </div>


                <div
                    class="
                        vcnv-result-status
                        ${
                            result.correct
                                ? 'correct'
                                : 'wrong'
                        }
                    "
                >

                    ${status}

                </div>

            </div>

        `;

    }


    return `

        <div class="vcnv-panel">

            <h2>
                KẾT QUẢ CÂU ${questionNumber}
            </h2>


            <div class="vcnv-correct-answer">

                ĐÁP ÁN:

                <strong>
                    ${escapeHtml(
                        vcnvQuestionResult.answer
                    )}
                </strong>

            </div>


            <div class="vcnv-results">

                ${rows}

            </div>


            <div class="vcnv-result-actions">

                <button
                    class="vcnv-primary-button"
                    onclick="showVCNVPiece()"
                >
                    TIẾP TỤC
                </button>

            </div>

        </div>

    `;

}
// ======================================================
// DÒNG KẾT QUẢ 1 ĐỘI
// ======================================================

function buildVCNVTeamResultRow(
    teamName
) {

    return `

        <div class="vcnv-result-row">

            <div>
                ${teamName}
            </div>

            <div>
                —
            </div>

            <div>
                —
            </div>

            <div>
                0
            </div>

        </div>

    `;

}

// ======================================================
// VCNV - MÀN HÌNH MẢNH GHÉP
// ======================================================

function buildVCNVPieceScreen() {

    const currentPiece =
        vcnvCurrentQuestion;


    function pieceHtml(
        pieceNumber,
        pieceClass
    ) {

        const opened =
            vcnvRevealedPieces.includes(
                pieceNumber
            );


        return `
            <div
                class="
                    vcnv-piece
                    ${pieceClass}
                    ${opened ? 'opened' : 'closed'}
                "
                ${
                    opened && vcnvImage
                        ? `style="background-image: url('${vcnvImage}');"`
                        : ''
                }
            >
                ${
                    opened
                        ? ''
                        : '?'
                }
            </div>
        `;

    }


    return `

        <div class="vcnv-panel">

            <div class="vcnv-question-label">

                MẢNH GHÉP CÂU
                ${currentPiece + 1}

            </div>

            <div class="vcnv-puzzle">

                ${pieceHtml(0, 'piece-1')}

                ${pieceHtml(1, 'piece-2')}

                ${pieceHtml(2, 'piece-3')}

                ${pieceHtml(3, 'piece-4')}

                <!-- ==========================
                     MẢNH GIỮA
                     LUÔN ĐÓNG
                =========================== -->

                <div
                    class="
                        vcnv-piece
                        piece-5
                        closed
                    "
                >
                    ?
                </div>

            </div>

            <div class="vcnv-piece-message">

                Mảnh ghép sẽ được mở sau 2 giây...

            </div>

            <div class="vcnv-action-row">

                <button
                    class="vcnv-primary-button"
                    onclick="continueVCNV()"
                >
                    TIẾP TỤC
                </button>

            </div>

        </div>

    `;

}

// ======================================================
// VCNV - MÀN HÌNH TRẢ LỜI TỪ KHÓA
// ======================================================

function buildVCNVKeywordScreen() {

    const teamNames = [
        'Đội Xanh',
        'Đội Trắng',
        'Đội Đỏ',
        'Đội Vàng'
    ];

    return `

        <div class="vcnv-panel">

            <div class="vcnv-question-label">

                TRẢ LỜI TỪ KHÓA

            </div>


            <div class="vcnv-keyword-form">

                <div class="vcnv-team-select">

                    ${teamNames.map(
                        (teamName, teamId) => {

                            const locked =
                                vcnvKeywordLockedTeams.includes(
                                    teamId
                                );

                            return `

                                <label
                                    class="
                                        ${
                                            locked
                                                ? 'locked'
                                                : ''
                                        }
                                    "
                                >

                                    <input
                                        type="radio"
                                        name="vcnvKeywordTeam"
                                        value="${teamId}"
                                        ${locked ? 'disabled' : ''}
                                    >

                                    ${teamName}

                                    ${
                                        locked
                                            ? `
                                                <span
                                                    class="vcnv-team-locked-text"
                                                >
                                                    ĐÃ MẤT QUYỀN
                                                </span>
                                            `
                                            : ''
                                    }

                                </label>

                            `;

                        }
                    ).join('')}

                </div>


                <input
                    id="vcnvKeywordInput"
                    class="vcnv-keyword-input"
                    type="text"
                    placeholder="Nhập từ khóa..."
                    autocomplete="off"
                />


                <button
                    class="vcnv-primary-button"
                    onclick="submitVCNVKeyword()"
                >
                    TRẢ LỜI
                </button>

            </div>


            <div class="vcnv-action-row">

                <button
                    class="vcnv-secondary-button"
                    onclick="showVCNVQuestionSelection()"
                >
                    QUAY LẠI
                </button>

            </div>

        </div>

    `;

}

// ======================================================
// XỬ LÝ TRẢ LỜI TỪ KHÓA
// ======================================================

function submitVCNVKeyword() {

    const selectedTeam =
        document.querySelector(
            'input[name="vcnvKeywordTeam"]:checked'
        );


    if (!selectedTeam) {

        alert(
            'Vui lòng chọn đội.'
        );

        return;

    }


    const input =
        document.getElementById(
            'vcnvKeywordInput'
        );


    const answer =
        input.value.trim();


    if (!answer) {

        alert(
            'Vui lòng nhập từ khóa.'
        );

        return;

    }


    const teamId =
        Number(
            selectedTeam.value
        );


    // ------------------------------------------
    // Đội đã bị loại
    // Không alert, chỉ bỏ qua
    // ------------------------------------------

    if (
        vcnvKeywordLockedTeams.includes(
            teamId
        )
    ) {

        return;

    }


    const normalizedAnswer =
        normalizeVCNVText(
            answer
        );


    const normalizedKeyword =
        normalizeVCNVText(
            vcnvKeyword
        );


    const correct =
        normalizedAnswer ===
        normalizedKeyword;


    // ==========================================
    // TRẢ LỜI ĐÚNG
    // ==========================================

    if (correct) {

        // Xác định điểm khi trả lời đúng từ khóa
        const revealedCount =
            vcnvRevealedAnswers.length;

        if (
            revealedCount >= 4
        ) {

            vcnvWinnerKeywordPoints =
                20;

        } else if (
            revealedCount === 3
        ) {

            vcnvWinnerKeywordPoints =
                30;

        } else if (
            revealedCount === 2
        ) {

            vcnvWinnerKeywordPoints =
                40;

        } else if (
            revealedCount === 1
        ) {

            vcnvWinnerKeywordPoints =
                50;

        } else {

            vcnvWinnerKeywordPoints =
                60;

        }

        // Đội thắng
        vcnvWinnerTeam =
            teamId;
        
        // ------------------------------------------
        // CỘNG ĐIỂM TỪ KHÓA
        // ------------------------------------------

        if (
            !vcnvKeywordScored
        ) {

            scores[teamId][activeBranch] +=
                vcnvWinnerKeywordPoints;

            vcnvKeywordScored =
                true;


            refreshScoreboard();


            console.log(
                'VCNV: cộng điểm từ khóa:',
                {
                    team:
                        teams[teamId],

                    branch:
                        getActiveBranchLabel(),

                    points:
                        vcnvWinnerKeywordPoints
                }
            );

        }

        // Kết thúc VCNV
        vcnvFinished =
            true;

        vcnvCurrentScreen =
            'FINISHED';

        renderVCNV();

        return;

    }


    // ==========================================
    // TRẢ LỜI SAI
    // ==========================================

    if (
        !vcnvKeywordLockedTeams.includes(
            teamId
        )
    ) {

        vcnvKeywordLockedTeams.push(
            teamId
        );

    }

    vcnvWrongKeywordTeam =
        teamId;

    vcnvCurrentScreen =
        'KEYWORD_WRONG';

    renderVCNV();

}

// ======================================================
// QUAY LẠI SAU KHI TRẢ LỜI TỪ KHÓA SAI
// ======================================================

function returnFromVCNVKeywordWrong() {

    vcnvCurrentScreen =
        vcnvPreviousScreen;

    renderVCNV();

}

// ======================================================
// CHUẨN HÓA TEXT
// ======================================================

function normalizeVCNVText(
    value
) {

    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .replace(
            /đ/g,
            'd'
        )
        .replace(
            /\s+/g,
            ''
        );

}

// ======================================================
// MÀN HÌNH KẾT THÚC VCNV
// ======================================================

function buildVCNVFinishedScreen() {

    const teamNames = [
        'Đội Xanh',
        'Đội Trắng',
        'Đội Đỏ',
        'Đội Vàng'
    ];

    const winnerName =
        teamNames[vcnvWinnerTeam] ||
        'Đội thắng';


    return `

        <div class="vcnv-finished-panel">

            <div class="vcnv-finished-title">
                VƯỢT CHƯỚNG NGẠI VẬT
            </div>


            <div class="vcnv-finished-subtitle">
                KẾT THÚC PHẦN THI
            </div>


            <div class="vcnv-winner-icon">
                🏆
            </div>


            <div class="vcnv-winner-title">
                ${winnerName}
            </div>


            <div class="vcnv-winner-message">
                ĐÃ TRẢ LỜI ĐÚNG TỪ KHÓA
            </div>


            <div class="vcnv-final-score-box">

                <div class="vcnv-score-label">
                    ĐIỂM TỪ KHÓA
                </div>

                <div class="vcnv-score-value">
                    +${vcnvWinnerKeywordPoints}
                </div>

            </div>


            <div class="vcnv-finished-message">

                Phần thi Vượt chướng ngại vật
                đã kết thúc.

            </div>


            <button
                class="vcnv-finish-button"
                onclick="finishVCNV()"
            >
                TIẾP TỤC
            </button>

        </div>

    `;

}

// ======================================================
// KẾT THÚC VCNV
// ======================================================

function finishVCNV() {

    vcnvFinished =
        true;

    // Tạm thời quay về màn hình chọn phần thi.
    // Phần này sẽ nối với hệ thống điểm và luồng
    // chương trình chính ở bước sau.

    if (typeof showPacks === 'function') {

        showPacks();

    }

}

// ======================================================
// MÀN HÌNH TRẢ LỜI TỪ KHÓA SAI
// ======================================================

function buildVCNVKeywordWrongScreen() {

    const teamNames = [
        'Đội Xanh',
        'Đội Trắng',
        'Đội Đỏ',
        'Đội Vàng'
    ];

    const teamName =
        teamNames[vcnvWrongKeywordTeam] ||
        'Đội';


    return `

        <div class="vcnv-finished-panel">

            <div class="vcnv-finished-title">
                TRẢ LỜI TỪ KHÓA
            </div>


            <div class="vcnv-wrong-icon">
                ✕
            </div>


            <div class="vcnv-wrong-title">
                KHÔNG CHÍNH XÁC
            </div>


            <div class="vcnv-wrong-team">
                ${teamName}
            </div>


            <div class="vcnv-wrong-message">

                Đáp án từ khóa không chính xác.

                <br>

                Đội này không còn quyền
                trả lời từ khóa.

            </div>


            <button
                class="vcnv-finish-button"
                onclick="returnFromVCNVKeywordWrong()"
            >
                TIẾP TỤC
            </button>

        </div>

    `;

}

function showVCNVCurrentPuzzle() {

    vcnvCurrentScreen =
        'PUZZLE';

    renderVCNV();

}

function buildVCNVPuzzleScreen() {

    return `

        <div class="vcnv-puzzle-panel">

            <h2>
                MẢNH GHÉP
            </h2>


            <div class="vcnv-puzzle-placeholder">

                Mảnh ghép câu
                ${vcnvQuestionResult.questionIndex + 1}

            </div>


            <button
                class="vcnv-finish-button"
                onclick="showVCNVQuestionSelection()"
            >

                TIẾP TỤC

            </button>

        </div>

    `;

}

// ======================================================
// TIMER VCNV - MÀN HÌNH MC
// ======================================================

function startVCNVMcTimer(deadline) {

    clearInterval(
        vcnvMcTimer
    );

    vcnvDeadline =
        deadline;

    updateVCNVMcTimer();

    vcnvMcTimer =
        setInterval(
            updateVCNVMcTimer,
            100
        );

}

function updateVCNVMcTimer() {

    const timerElement =
        document.getElementById(
            'vcnv-mc-timer'
        );

    if (!timerElement) {
        return;
    }

    const remainingMs =
        Math.max(
            0,
            vcnvDeadline - Date.now()
        );

    const seconds =
        Math.ceil(
            remainingMs / 1000
        );

    timerElement.textContent =
        seconds;

    if (remainingMs <= 0) {

        clearInterval(
            vcnvMcTimer
        );

        vcnvMcTimer =
            null;

        timerElement.textContent =
            '0';

    }

}