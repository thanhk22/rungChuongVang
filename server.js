const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 3002;


// ======================================================
// HTTP SERVER
// ======================================================

const server = http.createServer((req, res) => {

    let filePath;

    if (req.url === '/') {

        filePath = path.join(
            __dirname,
            'index.html'
        );

    } else {

        filePath = path.join(
            __dirname,
            req.url
        );

    }


    fs.readFile(filePath, (error, data) => {

        if (error) {

            res.writeHead(404);

            res.end(
                '404 - Không tìm thấy file'
            );

            return;
        }


        res.writeHead(200);

        res.end(data);

    });

});


// ======================================================
// WEBSOCKET SERVER
// ======================================================

const wss = new WebSocket.Server({
    server: server
});


// ======================================================
// TRẠNG THÁI HỆ THỐNG
// ======================================================

// Kết nối của máy MC
let hostSocket = null;


// Tên 4 đội.
// Máy MC sẽ gửi danh sách này sang server.
let teamNames = [
    'Đội Xanh',
    'Đội Trắng',
    'Đội Đỏ',
    'Đội Vàng'
];


// Các thiết bị đội đang kết nối.
//
// Map:
// teamId → thông tin thiết bị
//
const connectedTeams = new Map();


// ======================================================
// TRẠNG THÁI PHẦN TĂNG TỐC
// ======================================================

const TANGTOC_CSV_FILE =
    'questions_tangtoc.csv';

let tangToc = {

    active: false,

    branch: null,

    questions: [],

    questionIndex: 0,

    totalQuestions: 4,

    timeLimit: 30,

    questionStartedAt: 0,

    questionDeadline: 0,

    answers: new Map(),

    timer: null

};

// ======================================================
// TRẠNG THÁI VƯỢT CHƯỚNG NGẠI VẬT
// ======================================================

let vcnv = {

    active: false,

    branch: null,

    questions: [],

    questionIndex: 0,

    totalQuestions: 4,
    
    timeLimit: 20,

    questionStartedAt: 0,

    questionDeadline: 0,

    answers: new Map(),

    timer: null

};

// ======================================================
// HÀM GỬI DỮ LIỆU
// ======================================================

function sendTo(ws, data) {

    if (!ws) {
        console.error(
            'SEND ERROR: WebSocket không tồn tại',
            data.type
        );
        return;
    }

    if (
        ws.readyState !== WebSocket.OPEN
    ) {
        console.error(
            'SEND ERROR: WebSocket không OPEN',
            {
                type: data.type,
                readyState: ws.readyState
            }
        );
        return;
    }

    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {

        ws.send(
            JSON.stringify(data)
        );

    }

}


// ======================================================
// GỬI DANH SÁCH TRẠNG THÁI ĐỘI CHO MC
// ======================================================

function sendTeamStatusToHost() {

    const status = [];

    for (
        let teamId = 0;
        teamId < 4;
        teamId++
    ) {

        const team =
            connectedTeams.get(teamId);


        status.push({

            teamId,

            teamName:
                teamNames[teamId],

            connected:
                !!team

        });

    }


    sendTo(
        hostSocket,
        {

            type:
                'TEAM_STATUS',

            teams:
                status

        }
    );

}


// ======================================================
// GỬI DANH SÁCH TÊN ĐỘI CHO CÁC ĐIỆN THOẠI
// ======================================================

function broadcastTeamNames() {

    wss.clients.forEach((client) => {

        if (
            client.role === 'TEAM'
        ) {

            sendTo(
                client,
                {

                    type:
                        'TEAM_LIST',

                    teams:
                        teamNames

                }
            );

        }

    });

}

// ======================================================
// ĐỌC CSV TĂNG TỐC
// ======================================================

function parseCsv(text) {

    const rows = [];

    let row = [];
    let field = '';
    let inQuotes = false;

    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char = text[i];

        if (inQuotes) {

            if (char === '"') {

                if (
                    text[i + 1] === '"'
                ) {

                    field += '"';
                    i++;

                } else {

                    inQuotes = false;

                }

            } else {

                field += char;

            }

        } else if (
            char === '"'
        ) {

            inQuotes = true;

        } else if (
            char === ','
        ) {

            row.push(field);
            field = '';

        } else if (
            char === '\n'
        ) {

            row.push(field);
            rows.push(row);

            row = [];
            field = '';

        } else if (
            char !== '\r'
        ) {

            field += char;

        }

    }

    row.push(field);

    if (
        row.some(
            cell =>
                cell.length > 0
        )
    ) {

        rows.push(row);

    }

    return rows;
}


// ======================================================
// CHUẨN HÓA NGÀNH
// ======================================================

function normalizeBranch(value) {

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
            '_'
        );

}

// ======================================================
// NẠP CÂU HỎI VƯỢT CHƯỚNG NGẠI VẬT
//
// question_vcnv.csv
//
// Cấu trúc:
// branch,question,answer,key
// ======================================================

function loadVCNVQuestions(branch) {

    const filePath =
        path.join(
            __dirname,
            'question_vcnv.csv'
        );


    const csvText =
        fs.readFileSync(
            filePath,
            'utf8'
        );


    const rows =
        parseCsv(csvText)
            .filter(
                row =>
                    row.some(
                        cell =>
                            cell.trim()
                    )
            );


    if (rows.length < 2) {

        throw new Error(
            'question_vcnv.csv chưa có câu hỏi.'
        );

    }


    const headers =
        rows[0].map(
            header =>
                header
                    .trim()
                    .toLowerCase()
        );


    const getIndex =
        name =>
            headers.indexOf(name);


    const branchIndex =
        getIndex('branch');

    const questionIndex =
        getIndex('question');

    const answerIndex =
        getIndex('answer');

    const keyIndex =
        getIndex('key');

    const imageIndex = 
        getIndex('image');


    if (
        branchIndex < 0 ||
        questionIndex < 0 ||
        answerIndex < 0 ||
        keyIndex < 0 ||
        imageIndex < 0
    ) {

        throw new Error(
            'question_vcnv.csv phải có 5 cột: branch, question, answer, key, image.'
        );

    }


    const questions =
        rows
            .slice(1)
            .map(
                row => {

                    return {

                        branch:
                            normalizeBranch(
                                row[branchIndex]
                            ),

                        question:
                            row[questionIndex]
                                ?.trim() || '',

                        answer:
                            row[answerIndex]
                                ?.trim() || '',

                        key:
                            row[keyIndex]
                                ?.trim() || '',
                        
                        image:
                            row[imageIndex]
                                ?.trim() || ''

                    };

                }
            )
            .filter(
                question =>
                    question.branch ===
                    normalizeBranch(branch)
            );


    return questions;

}

// ======================================================
// GỬI CÂU HỎI VCNV
// ======================================================

// ======================================================
// GỬI CÂU HỎI VCNV
// ======================================================

function sendVCNVQuestion() {

    const question =
        vcnv.questions[
            vcnv.questionIndex
        ];


    if (!question) {
        return;
    }


    vcnv.answers.clear();


    // ------------------------------------------
    // Gửi cho các đội
    // KHÔNG gửi answer và key
    // ------------------------------------------

    const teamPayload = {

        type:
            'VCNV_QUESTION',

        questionIndex:
            vcnv.questionIndex,

        totalQuestions:
            vcnv.totalQuestions,

        question: {

            question:
                question.question

        }

    };


    connectedTeams.forEach(
        team => {

            sendTo(
                team.ws,
                teamPayload
            );

        }
    );


    console.log(
        `VCNV: gửi câu ${
            vcnv.questionIndex + 1
        }/${
            vcnv.totalQuestions
        }`
    );

}

// ======================================================
// BẮT ĐẦU TIMER VCNV
// ======================================================

function startVCNVTimer() {

    clearTimeout(
        vcnv.timer
    );


    vcnv.questionStartedAt =
        Date.now();


    vcnv.questionDeadline =
        Date.now() +
        vcnv.timeLimit * 1000;


    console.log(
        `VCNV: bắt đầu ${vcnv.timeLimit} giây`
    );


    // Báo cho MC nếu cần dùng timer phía MC
    sendTo(
        hostSocket,
        {

            type:
                'VCNV_STARTED',

            questionIndex:
                vcnv.questionIndex,

            timeLimit:
                vcnv.timeLimit,

            deadline:
                vcnv.questionDeadline

        }
    );


    // Sau 30 giây server tự chốt
    vcnv.timer =
        setTimeout(
            () => {

                finishVCNVQuestion();

            },
            vcnv.timeLimit * 1000
        );

}

// ======================================================
// BẮT ĐẦU VCNV
// ======================================================

function startVCNV(
    branch
) {

    const questions =
        loadVCNVQuestions(
            branch
        );
    
    const image =
        questions[0]?.image || '';

    if (
        questions.length <
        4
    ) {

        throw new Error(
            `Ngành "${branch}" không đủ 4 câu VCNV.`
        );

    }


    vcnv.active =
        true;

    vcnv.branch =
        branch;

    vcnv.questions =
        questions.slice(
            0,
            4
        );

    vcnv.questionIndex =
        0;

    vcnv.totalQuestions =
        vcnv.questions.length;

    vcnv.answers.clear();


    sendVCNVQuestion();

}

// ======================================================
// CHỐT KẾT QUẢ CÂU VCNV
// ======================================================

function finishVCNVQuestion() {

    if (
        !vcnv.active
    ) {

        return;

    }


    clearTimeout(
        vcnv.timer
    );

    vcnv.timer =
        null;


    const question =
        vcnv.questions[
            vcnv.questionIndex
        ];


    if (!question) {

        return;

    }


    const results = [];


    // ------------------------------------------
    // CHỐT ĐỦ 4 ĐỘI
    // ------------------------------------------

    for (
        let teamId = 0;
        teamId < 4;
        teamId++
    ) {

        const saved =
            vcnv.answers.get(
                teamId
            );


        if (saved) {

            results.push({

                teamId,

                team:
                    teamNames[
                        teamId
                    ],

                answer:
                    saved.answer,

                correct:
                    saved.correct,

                answered:
                    true

            });

        } else {

            results.push({

                teamId,

                team:
                    teamNames[
                        teamId
                    ],

                answer:
                    '',

                correct:
                    false,

                answered:
                    false

            });

        }

    }


    const payload = {

        type:
            'VCNV_RESULT',

        questionIndex:
            vcnv.questionIndex,

        totalQuestions:
            vcnv.totalQuestions,

        correctAnswer:
            question.answer,

        results

    };


    // ------------------------------------------
    // GỬI TOÀN BỘ KẾT QUẢ VỀ MC
    // ------------------------------------------

    sendTo(
        hostSocket,
        payload
    );


    // ------------------------------------------
    // Gửi kết quả cho các đội cũng được
    // để họ biết câu đã kết thúc.
    // ------------------------------------------

    connectedTeams.forEach(
        team => {

            sendTo(
                team.ws,
                {

                    type:
                        'VCNV_RESULT',

                    questionIndex:
                        vcnv.questionIndex

                }
            );

        }
    );


    console.log(
        'VCNV: ĐÃ CHỐT KẾT QUẢ',
        results
    );


    // Không cho nhận thêm đáp án
    // của câu này.
    vcnv.answers.clear();

}


// ======================================================
// NẠP CÂU HỎI TĂNG TỐC
// question_tangtoc.csv
//
// Cấu trúc:
// branch,question,answer,image
// ======================================================

function loadTangTocQuestions(branch) {

    const filePath =
        path.join(
            __dirname,
            'questions_tangtoc.csv'
        );

    const csvText =
        fs.readFileSync(
            filePath,
            'utf8'
        );


    const rows =
        parseCsv(csvText)
            .filter(
                row =>
                    row.some(
                        cell =>
                            cell.trim()
                    )
            );


    if (rows.length < 2) {

        throw new Error(
            'questions_tangtoc.csv chưa có câu hỏi.'
        );

    }


    // ------------------------------------------
    // Header
    // ------------------------------------------

    const headers =
        rows[0].map(
            header =>
                header
                    .trim()
                    .toLowerCase()
        );


    const getIndex =
        name =>
            headers.indexOf(name);


    const branchIndex =
        getIndex('branch');

    const questionIndex =
        getIndex('question');

    const answerIndex =
        getIndex('answer');

    const imageIndex =
        getIndex('image');


    // ------------------------------------------
    // Kiểm tra cột
    // ------------------------------------------

    if (
        branchIndex < 0 ||
        questionIndex < 0 ||
        answerIndex < 0 ||
        imageIndex < 0
    ) {

        throw new Error(
            'questions_tangtoc.csv phải có 4 cột: branch, question, answer, image.'
        );

    }


    // ------------------------------------------
    // Đọc dữ liệu
    // ------------------------------------------

    const questions =
        rows
            .slice(1)
            .map(row => {

                return {

                    branch:
                        normalizeBranch(
                            row[branchIndex]
                        ),

                    question:
                        row[questionIndex]
                            ?.trim() || '',

                    answer:
                        row[answerIndex]
                            ?.trim() || '',

                    image:
                        row[imageIndex]
                            ?.trim() || ''

                };

            })
            .filter(
                question =>
                    question.branch ===
                    normalizeBranch(branch)
            );


    return questions;

}

// ======================================================
// GỬI CÂU HỎI TĂNG TỐC
// ======================================================

function sendTangTocQuestion() {

    const question =
        tangToc.questions[
            tangToc.questionIndex
        ];

    if (!question) {

        finishTangToc();

        return;

    }


    tangToc.answers.clear();

    // ==========================================
    // GỬI CHO MC
    // MC được biết đáp án để hiển thị kết quả
    // ==========================================

    const hostPayload = {

        type:
            'TANGTOC_QUESTION',

        questionIndex:
            tangToc.questionIndex,

        totalQuestions:
            tangToc.totalQuestions,

        question: {

            question:
                question.question,

            answer:
                question.answer,

            image:
                question.image || null

        }

    };


    // ==========================================
    // GỬI CHO ĐỘI
    // Không gửi answer
    // ==========================================

    const teamPayload = {

        type:
            'TANGTOC_QUESTION',

        questionIndex:
            tangToc.questionIndex,

        totalQuestions:
            tangToc.totalQuestions,

        question: {

            question:
                question.question,

            image:
                question.image || null

        }

    };


    // MC
    sendTo(
        hostSocket,
        hostPayload
    );


    // 4 đội
    connectedTeams.forEach(
        team => {

            sendTo(
                team.ws,
                teamPayload
            );

        }
    );


    console.log(
        `Tăng tốc: gửi câu ${
            tangToc.questionIndex + 1
        }/${tangToc.totalQuestions}`
    );

}

// ======================================================
// BẮT ĐẦU TIMER CÂU TĂNG TỐC
// ======================================================

function startTangTocTimer() {

    clearTimeout(
        tangToc.timer
    );


    tangToc.questionStartedAt =
        Date.now();


    tangToc.questionDeadline =
        Date.now() +
        tangToc.timeLimit * 1000;


    const payload = {

        type:
            'TANGTOC_STARTED',

        questionIndex:
            tangToc.questionIndex,

        timeLimit:
            tangToc.timeLimit,

        deadline:
            tangToc.questionDeadline

    };


    sendTo(
        hostSocket,
        payload
    );


    connectedTeams.forEach(
        team => {

            sendTo(
                team.ws,
                payload
            );

        }
    );


    tangToc.timer =
        setTimeout(
            () => {

                finishTangTocQuestion();

            },
            tangToc.timeLimit * 1000
        );

}

// ======================================================
// CHUẨN HÓA ĐÁP ÁN
// ======================================================

function normalizeAnswer(
    answer
) {

    return String(answer || '')
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
// KẾT THÚC THỜI GIAN CÂU
// ======================================================

function finishTangTocQuestion() {

    clearTimeout(
        tangToc.timer
    );

    tangToc.timer = null;


    const question =
        tangToc.questions[
            tangToc.questionIndex
        ];


    if (!question) {

        finishTangToc();

        return;

    }


    const results = [];


    for (
        let teamId = 0;
        teamId < 4;
        teamId++
    ) {

        const answer =
            tangToc.answers.get(
                teamId
            );


        if (!answer) {

            results.push({

                teamId,

                team:
                    teamNames[teamId],

                answer: '',

                correct: false,

                elapsedMs: null,

                points: 0

            });

            continue;

        }


        results.push({

            teamId,

            team:
                teamNames[teamId],

            answer:
                answer.answer,

            correct:
                answer.correct,

            elapsedMs:
                answer.elapsedMs,

            points: 0

        });

    }


    // Chỉ đội trả lời đúng mới được xếp hạng.
    const correctResults =
        results
            .filter(
                result =>
                    result.correct
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.elapsedMs -
                    b.elapsedMs
            );


    const points =
        [40, 30, 20, 10];


    correctResults.forEach(
        (
            result,
            index
        ) => {

            result.points =
                points[index] || 0;

        }
    );


    const payload = {

        type:
            'TANGTOC_RESULT',

        questionIndex:
            tangToc.questionIndex,

        totalQuestions:
            tangToc.totalQuestions,

        correctAnswer:
            question.answer,

        results

    };


    sendTo(
        hostSocket,
        payload
    );


    connectedTeams.forEach(
        team => {

            sendTo(
                team.ws,
                payload
            );

        }
    );


    console.log(
        'Kết quả Tăng tốc:',
        results
    );

}

// ======================================================
// KHỞI ĐỘNG TĂNG TỐC
// ======================================================

function startTangToc(
    branch,
    totalQuestions,
    timeLimit
) {

    const questions =
        loadTangTocQuestions(
            branch
        );


    if (
        questions.length === 0
    ) {

        throw new Error(
            `Không có câu Tăng tốc cho ngành "${branch}".`
        );

    }


    tangToc.active = true;

    tangToc.branch =
        branch;

    tangToc.questions =
        questions.slice(
            0,
            Number(totalQuestions) || 4
        );

    tangToc.questionIndex =
        0;

    tangToc.totalQuestions =
        tangToc.questions.length;

    tangToc.timeLimit =
        Number(timeLimit) || 30;

    tangToc.answers.clear();


    sendTangTocQuestion();

    startTangTocTimer(); //bắt đầu đếm thời gian

}

// ======================================================
// CHUYỂN CÂU TĂNG TỐC
// ======================================================

function nextTangTocQuestion() {

    if (
        !tangToc.active
    ) {

        return;

    }


    tangToc.questionIndex++;


    if (
        tangToc.questionIndex >=
        tangToc.questions.length
    ) {

        finishTangToc();

        return;

    }


    sendTangTocQuestion();

    startTangTocTimer();

}

// ======================================================
// KẾT THÚC PHẦN TĂNG TỐC
// ======================================================

function finishTangToc() {

    clearTimeout(
        tangToc.timer
    );


    tangToc.timer = null;
    tangToc.active = false;


    const payload = {

        type:
            'TANGTOC_FINISHED'

    };


    sendTo(
        hostSocket,
        payload
    );


    connectedTeams.forEach(
        team => {

            sendTo(
                team.ws,
                payload
            );

        }
    );


    tangToc.questions = [];
    tangToc.answers.clear();

    console.log(
        'Đã kết thúc Tăng tốc.'
    );

}

// ======================================================
// KHI CÓ THIẾT BỊ KẾT NỐI
// ======================================================

wss.on('connection', (ws) => {

    const clientId =
        Math.random()
            .toString(36)
            .substring(2, 10);


    ws.clientId = clientId;

    ws.role = null;

    ws.teamId = null;


    console.log(
        `Thiết bị kết nối: ${clientId}`
    );


    // ==================================================
    // NHẬN MESSAGE
    // ==================================================
    ws.on('message', (message) => {
        let data;
        try {
            data =
                JSON.parse(
                    message.toString()
                );
        } catch (error) {
            console.log(
                'Dữ liệu JSON không hợp lệ.'
            );
            return;
        }
        // ==================================================
        // MÁY MC ĐĂNG KÝ
        // ==================================================
        if (
            data.type ===
            'REGISTER_HOST'
        ) {
            hostSocket = ws;
            ws.role = 'HOST';
            console.log(
                'Máy MC đã kết nối.'
            );
            // Gửi tên đội hiện tại
            sendTo(
                ws,
                {
                    type:
                        'TEAM_LIST',
                    teams:
                        teamNames
                }
            );
            // Gửi trạng thái 4 đội
            sendTeamStatusToHost();
            return;
        }
        // ==================================================
        // MC GỬI TÊN 4 ĐỘI
        // ==================================================
        if (
            data.type ===
            'TEAM_LIST'
        ) {
            // Chỉ cho phép máy MC gửi
            if (
                ws.role !== 'HOST'
            ) {
                return;
            }
            if (
                !Array.isArray(data.teams) ||
                data.teams.length !== 4
            ) {
                return;
            }
            teamNames =
                data.teams.map(
                    (name, index) => {
                        const cleanName =
                            String(name)
                                .trim();
                        return (
                            cleanName ||
                            `Đội ${index + 1}`
                        );
                    }
                );
            console.log(
                'Cập nhật tên đội:',
                teamNames
            );
            // Cập nhật tên trên điện thoại
            broadcastTeamNames();
            // Cập nhật trạng thái cho MC
            sendTeamStatusToHost();
            return;
        }
        // ==================================================
        // ĐIỆN THOẠI ĐĂNG KÝ ĐỘI
        // ==================================================
        if (
            data.type ===
            'REGISTER_TEAM'
        ) {
            const teamId =
                Number(data.teamId);
            // Kiểm tra teamId
            if (
                !Number.isInteger(teamId) ||
                teamId < 0 ||
                teamId > 3
            ) {
                sendTo(
                    ws,
                    {
                        type:
                            'REGISTER_ERROR',
                        message:
                            'Đội không hợp lệ.'
                    }
                );
                return;
            }
            // Kiểm tra đội đã có thiết bị chưa
            if (
                connectedTeams.has(teamId)
            ) {
                sendTo(
                    ws,
                    {
                        type:
                            'REGISTER_ERROR',
                        message:
                            `${teamNames[teamId]} đã có thiết bị kết nối.`
                    }
                );
                return;
            }
            // Đăng ký thiết bị
            ws.role = 'TEAM';
            ws.teamId = teamId;
            connectedTeams.set(
                teamId,
                {
                    clientId,
                    teamId,
                    teamName:
                        teamNames[teamId],
                    ws
                }
            );
            console.log(
                `Đăng ký thành công: ${teamNames[teamId]}`
            );
            // Báo thành công cho điện thoại
            sendTo(
                ws,
                {
                    type:
                        'REGISTER_SUCCESS',
                    clientId,
                    teamId,
                    teamName:
                        teamNames[teamId]
                }
            );
            // Cập nhật danh sách tên đội
            broadcastTeamNames();
            // Cập nhật trạng thái cho MC
            sendTeamStatusToHost();
            return;
        }

        // ==================================================
        // MC BẮT ĐẦU VCNV
        // ==================================================

        if (
            data.type ===
            'START_VCNV'
        ) {

            if (
                ws.role !==
                'HOST'
            ) {

                return;

            }


            const questions =
                loadVCNVQuestions(
                    data.branch
                );

            const image =
                questions[0]?.image || '';

            const hasDifferentImages =
                questions.some(
                    question =>
                        question.image !== image
                );

            if (
                hasDifferentImages
            ) {

                sendTo(
                    ws,
                    {
                        type:
                            'VCNV_ERROR',
                        message:
                            'Các câu VCNV của cùng một ngành phải sử dụng cùng một link image.'
                    }
                );
                return;
            }

            if (
                questions.length < 4
            ) {
                sendTo(
                    ws,
                    {
                        type:
                            'VCNV_ERROR',
                        message:
                            'Không đủ 4 câu hỏi VCNV cho ngành này.'
                    }
                );
                return;
            }

            vcnv.active =
                true;

            vcnv.branch =
                data.branch;

            vcnv.questions =
                questions.slice(
                    0,
                    4
                );

            vcnv.questionIndex =
                0;

            vcnv.totalQuestions =
                4;

            vcnv.answers.clear();

            sendTo(
                ws,
                {

                    type:
                        'VCNV_DATA',

                    branch:
                        vcnv.branch,

                    questions:
                        vcnv.questions.map(
                            question => ({

                                question:
                                    question.question,

                                answer:
                                    question.answer,

                                key:
                                    question.key

                            })
                        ),

                    image:
                        vcnv.questions[0]?.image ||
                        ''

                }
            );

            console.log(
                'VCNV đã bắt đầu:',
                data.branch
            );

            return;
        }

        // ==================================================
        // MC BẮT ĐẦU TĂNG TỐC
        // ==================================================

        if (
            data.type ===
            'START_TANGTOC'
        ) {

            if (
                ws.role !== 'HOST'
            ) {

                return;

            }


            try {

                startTangToc(

                    data.branch,

                    data.totalQuestions,

                    data.timeLimit

                );

            } catch (error) {

                console.error(
                    'Lỗi START_TANGTOC:',
                    error
                );


                sendTo(
                    ws,
                    {

                        type:
                            'TANGTOC_ERROR',

                        message:
                            error.message

                    }
                );

            }


            return;

        }

        // ==================================================
        // MC CHỌN CÂU VCNV
        // ==================================================

        if (
            data.type ===
            'VCNV_SHOW_QUESTION'
        ) {

            if (
                ws.role !== 'HOST'
            ) {

                return;

            }


            if (
                !vcnv.active
            ) {

                return;

            }


            const questionIndex =
                Number(
                    data.questionIndex
                );


            if (
                !Number.isInteger(
                    questionIndex
                ) ||
                questionIndex < 0 ||
                questionIndex >= vcnv.questions.length
            ) {

                return;

            }


            vcnv.questionIndex =
                questionIndex;

            vcnv.answers.clear();

            sendVCNVQuestion();

            startVCNVTimer();

            return;

        }

        // ==================================================
        // ĐIỆN THOẠI GỬI ĐÁP ÁN VCNV
        // ==================================================

        if (
            data.type ===
            'VCNV_ANSWER'
        ) {

            if (ws.role !== 'TEAM') {
                return;
            }

            if (!vcnv.active) {
                return;
            }

            // ------------------------------------------
            // ĐÃ HẾT THỜI GIAN
            // ------------------------------------------

            if (Date.now() >= vcnv.questionDeadline) {
                return;
            }


            if (!Number.isInteger(ws.teamId)) {
                return;
            }

            const question = vcnv.questions[vcnv.questionIndex];

            if (!question) {
                return;
            }


            const answer = String(data.answer || '').trim();

            if (!answer) {
                return;
            }

            const correct = (normalizeAnswer(answer) === normalizeAnswer(question.answer));

            // Lưu đáp án mới nhất của đội
            vcnv.answers.set(
                ws.teamId,
                {
                    answer,
                    correct
                }
            );

            console.log(
                `VCNV - ${teamNames[ws.teamId]}:`,
                answer,
                correct
            );

            return;

        }

        // ==================================================
        // ĐIỆN THOẠI GỬI ĐÁP ÁN TĂNG TỐC
        // ==================================================

        if (
            data.type ===
            'ANSWER'
        ) {

            if (
                ws.role !== 'TEAM'
            ) {
                return;
            }

            if (
                !tangToc.active
            ) {
                return;
            }

            if (
                !Number.isInteger(ws.teamId)
            ) {
                return;
            }

            // Đã hết thời gian.
            if (
                Date.now() >=
                tangToc.questionDeadline
            ) {
                return;
            }

            const question =
                tangToc.questions[
                    tangToc.questionIndex
                ];

            if (!question) {
                return;
            }

            const answer =
                String(
                    data.answer || ''
                ).trim();

            if (!answer) {
                return;
            }

            const correct =
              normalizeAnswer(answer) ===
              normalizeAnswer(question.answer);

            // thời gian của lượt gửi này
            const elapsedMs =
                Date.now() -
                tangToc.questionStartedAt;

            // lưu đáp án mới nhất
            tangToc.answers.set(
                ws.teamId,
                {
                    answer,
                    correct,
                    elapsedMs
                }
            );

            console.log(
                `Tăng tốc - ${teamNames[ws.teamId]}:`,
                answer,
                correct,
                `${elapsedMs}ms`
            );

            // BÁO CHO MC
            sendTo(
                hostSocket,
                {

                    type:
                        'TANGTOC_ANSWER_RECEIVED',

                    teamId:
                        ws.teamId,

                    team:
                        teamNames[
                            ws.teamId
                        ],

                    answer,

                    correct,

                    elapsedMs

                }
            );

            return;

        }

        // ==================================================
        // MC YÊU CẦU CÂU TĂNG TỐC TIẾP THEO
        // ==================================================

        if (
            data.type ===
            'NEXT_TANGTOC_QUESTION'
        ) {

            if (
                ws.role !== 'HOST'
            ) {

                return;

            }


            nextTangTocQuestion();

            return;

        }

    });


    // ==================================================
    // THIẾT BỊ NGẮT KẾT NỐI
    // ==================================================

    ws.on('close', () => {

        console.log(
            `Thiết bị ngắt kết nối: ${clientId}`
        );


        // Nếu là máy MC
        if (
            ws.role === 'HOST'
        ) {

            if (
                hostSocket === ws
            ) {

                hostSocket = null;

            }

            return;

        }


        // Nếu là điện thoại đội
        if (
            ws.role === 'TEAM' &&
            ws.teamId !== null
        ) {

            const team =
                connectedTeams.get(
                    ws.teamId
                );


            // Chỉ xóa đúng thiết bị
            if (
                team &&
                team.clientId === clientId
            ) {

                connectedTeams.delete(
                    ws.teamId
                );

            }


            // Báo lại cho MC
            sendTeamStatusToHost();

        }

    });

});


// ======================================================
// START SERVER
// ======================================================

server.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            `Server đang chạy tại port ${PORT}`
        );

    }
);