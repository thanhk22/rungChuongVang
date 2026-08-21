// ======================================================
// KẾT NỐI WEBSOCKET
// ======================================================

const socket = new WebSocket(
    `ws://${location.host}`
);


// ======================================================
// BIẾN TRẠNG THÁI
// ======================================================

let selectedTeamId = null;
let selectedTeamName = null;
let clientId = null;
let answerSubmitted = false;
let tangTocTimer = null;
let tangTocDeadline = 0;
let currentRound = null;
let vcnvTimer = null;
let vcnvDeadline = 0;

// ======================================================
// DANH SÁCH ĐỘI
// ======================================================

const teams = [
    'Đội Xanh',
    'Đội Trắng',
    'Đội Đỏ',
    'Đội Vàng'
];


// ======================================================
// LẤY ELEMENT
// ======================================================

const teamSelection =
    document.getElementById(
        'teamSelection'
    );

const waitingScreen =
    document.getElementById(
        'waitingScreen'
    );

const answerScreen =
    document.getElementById(
        'answerScreen'
    );

const confirmTeamButton =
    document.getElementById(
        'confirmTeamButton'
    );

const selectedTeamDisplay =
    document.getElementById(
        'selectedTeamDisplay'
    );

const answerInput =
    document.getElementById(
        'answerInput'
    );

const submitAnswerButton =
    document.getElementById(
        'submitAnswerButton'
    );

const roundTitle =
    document.getElementById(
        'roundTitle'
    );

const waitingRoundTitle =
    document.getElementById(
        'waitingRoundTitle'
    );

const answerRoundTitle =
    document.getElementById(
        'answerRoundTitle'
    );

const questionText =
    document.getElementById(
        'questionText'
    );


// ======================================================
// CHỌN ĐỘI
// ======================================================

document
    .querySelectorAll('.team-button')
    .forEach((button) => {

        button.addEventListener(
            'click',
            () => {

                // Bỏ trạng thái chọn
                document
                    .querySelectorAll(
                        '.team-button'
                    )
                    .forEach((item) => {

                        item.classList.remove(
                            'selected'
                        );

                    });


                // Đánh dấu nút hiện tại
                button.classList.add(
                    'selected'
                );


                // Lấy ID đội
                selectedTeamId =
                    Number(
                        button.dataset.teamId
                    );


                // Lấy tên đội
                selectedTeamName =
                    teams[selectedTeamId];


                // Cho phép xác nhận
                confirmTeamButton.disabled =
                    false;

            }
        );

    });


// ======================================================
// XÁC NHẬN ĐỘI
// ======================================================

confirmTeamButton.addEventListener(
    'click',
    () => {

        if (
            selectedTeamId === null
        ) {
            return;
        }


        socket.send(
            JSON.stringify({

                type:
                    'REGISTER_TEAM',

                teamId:
                    selectedTeamId,

                teamName:
                    selectedTeamName

            })
        );

    }
);


// ======================================================
// NHẬN DỮ LIỆU TỪ SERVER
// ======================================================

socket.addEventListener(
    'message',
    (event) => {

        const data =
            JSON.parse(event.data);


        // ------------------------------------------
        // ĐĂNG KÝ THÀNH CÔNG
        // ------------------------------------------

        if (
            data.type ===
            'REGISTER_SUCCESS'
        ) {

            clientId =
                data.clientId;


            selectedTeamName =
                data.teamName;


            selectedTeamDisplay.textContent =
                selectedTeamName;


            teamSelection.hidden =
                true;

            waitingScreen.hidden =
                false;
            
            currentRound = null;

            roundTitle.textContent =
                'ĐANG CHỜ';

            waitingRoundTitle.textContent =
                'ĐANG CHỜ';

        }

        // ------------------------------------------
        // ĐĂNG KÝ THẤT BẠI
        // ------------------------------------------

        if (
            data.type ===
            'REGISTER_ERROR'
        ) {

            alert(
                data.message
            );

        }

        // ======================================================
        // VCNV - NHẬN CÂU HỎI
        // ======================================================

        if (
            data.type ===
            'VCNV_QUESTION'
        ) {

            console.log(
                'Nhận câu hỏi VCNV:',
                data
            );

            currentRound =
                'VCNV';

            // ------------------------------------------
            // Đổi tiêu đề
            // ------------------------------------------

            roundTitle.textContent =
                '🧩 VƯỢT CHƯỚNG NGẠI VẬT';

            waitingRoundTitle.textContent =
                '🧩 VƯỢT CHƯỚNG NGẠI VẬT';

            answerRoundTitle.textContent =
                '🧩 VƯỢT CHƯỚNG NGẠI VẬT';

            // ------------------------------------------
            // Chuyển từ màn hình chờ
            // sang màn hình trả lời
            // ------------------------------------------

            waitingScreen.hidden =
                true;

            answerScreen.hidden =
                false;

            // ------------------------------------------
            // Số câu
            // ------------------------------------------

            document.getElementById(
                'questionNumber'
            ).textContent =
                `CÂU ${
                    data.questionIndex + 1
                } / ${
                    data.totalQuestions
                }`;

            // ------------------------------------------
            // Nội dung câu hỏi
            // ------------------------------------------

            questionText.textContent =
                data.question?.question ||
                '';

            clearInterval(
                tangTocTimer
            );

            tangTocTimer =
                null;

            tangTocDeadline =
                0;

            const timerElement =
                document.getElementById(
                    'timer'
                );

            if (timerElement) {

                timerElement.textContent =
                    '';

            }


            // ------------------------------------------
            // Cho phép trả lời
            // ------------------------------------------

            answerSubmitted =
                false;

            answerInput.value =
                '';

            answerInput.disabled =
                false;

            submitAnswerButton.disabled =
                false;

            submitAnswerButton.textContent =
                'GỬI ĐÁP ÁN';
            
            startVCNVTimer();


            return;

        }

        // ======================================================
        // VCNV - SERVER ĐÃ CHỐT KẾT QUẢ
        // ======================================================

        if (
            data.type ===
            'VCNV_RESULT'
        ) {

            console.log(
                'VCNV đã kết thúc câu:',
                data
            );


            clearInterval(
                vcnvTimer
            );

            vcnvTimer =
                null;

            answerInput.disabled =
                true;

            submitAnswerButton.disabled =
                true;

            submitAnswerButton.textContent =
                'HẾT THỜI GIAN';

            return;

        }

        // ======================================================
        // TĂNG TỐC - NHẬN CÂU HỎI
        // ======================================================

        if (
            data.type ===
            'TANGTOC_QUESTION'
        ) {

            currentRound =
                'TANGTOC';

            console.log(
                'Nhận câu hỏi Tăng tốc:',
                data
            );

            // Ẩn màn hình chờ
            waitingScreen.hidden =
                true;

            // Hiện màn hình trả lời
            answerScreen.hidden =
                false;

            // Cập nhật số câu
            document.getElementById(
                'questionNumber'
            ).textContent =
                `CÂU ${data.questionIndex + 1} / ${data.totalQuestions}`;


            // Hiển thị câu hỏi
            let questionElement =
                document.getElementById(
                    'tangtocQuestion'
                );


            if (!questionElement) {

                questionElement =
                    document.createElement(
                        'div'
                    );

                questionElement.id =
                    'tangtocQuestion';

                questionElement.className =
                    'tangtoc-team-question';


                document
                    .getElementById(
                        'questionNumber'
                    )
                    .after(
                        questionElement
                    );

            }


            questionElement.textContent =
                data.question?.question || '';


            // Hiển thị hình ảnh nếu có
            let imageElement =
                document.getElementById(
                    'tangtocImage'
                );


            if (!imageElement) {

                imageElement =
                    document.createElement(
                        'img'
                    );

                imageElement.id =
                    'tangtocImage';

                imageElement.className =
                    'tangtoc-team-image';


                questionElement.after(
                    imageElement
                );

            }


            if (
                data.question?.image
            ) {

                imageElement.src =
                    data.question.image;

                imageElement.hidden =
                    false;

            } else {

                imageElement.removeAttribute(
                    'src'
                );

                imageElement.hidden =
                    true;

            }

            // Cho phép trả lời câu mới
            answerSubmitted =
                false;

            answerInput.value =
                '';

            answerInput.disabled =
                false;

            submitAnswerButton.disabled =
                false;

            submitAnswerButton.textContent =
                'GỬI ĐÁP ÁN';

        }

        // ======================================================
        // TĂNG TỐC - BẮT ĐẦU TIMER
        // ======================================================

        if (
            data.type ===
            'TANGTOC_STARTED'
        ) {

            console.log(
                'Tăng tốc bắt đầu:',
                data
            );


            startTangTocTimer(
                data.deadline
            );

        }

    }
);

// ======================================================
// GỬI ĐÁP ÁN
// ======================================================

submitAnswerButton.addEventListener(
    'click',
    () => {

        // Không cho gửi khi hết thời gian
        if (
            tangTocDeadline &&
            Date.now() >= tangTocDeadline
        ) {
            return;
        }


        const answer =
            answerInput.value.trim();


        if (!answer) {

            alert(
                'Vui lòng nhập đáp án.'
            );

            return;
        }

        socket.send(
            JSON.stringify({

                type:
                    currentRound === 'VCNV'
                    ? 'VCNV_ANSWER'
                    : 'ANSWER',

                clientId:
                    clientId,

                teamId:
                    selectedTeamId,

                answer:
                    answer
            })
        );


        // Khóa ngay sau khi gửi
        answerSubmitted =
            true;

        answerInput.disabled =
            false;

        submitAnswerButton.disabled =
            false;

        submitAnswerButton.textContent =
            'CẬP NHẬT ĐÁP ÁN';

    }
);

// ======================================================
// TIMER TĂNG TỐC - ĐIỆN THOẠI ĐỘI
// ======================================================

function startTangTocTimer(
    deadline
) {

    clearInterval(
        tangTocTimer
    );


    tangTocDeadline =
        deadline;


    updateTangTocTimer();


    tangTocTimer =
        setInterval(
            () => {

                updateTangTocTimer();

            },
            100
        );

}


// ======================================================
// CẬP NHẬT TIMER
// ======================================================

function updateTangTocTimer() {

    const timerElement =
        document.getElementById(
            'timer'
        );


    if (!timerElement) {
        return;
    }


    const remainingMs =
        Math.max(
            0,
            tangTocDeadline -
            Date.now()
        );


    const seconds =
        Math.ceil(
            remainingMs / 1000
        );


    timerElement.textContent =
        seconds;


    if (
        seconds <= 5
    ) {

        timerElement.style.color =
            '#dc3545';

    } else {

        timerElement.style.color =
            '';

    }

    if (
        remainingMs <= 0
    ) {

        clearInterval(
            tangTocTimer
        );


        answerInput.disabled =
            true;

        submitAnswerButton.disabled =
            true;

        submitAnswerButton.textContent =
            'HẾT THỜI GIAN';

    }

}

// ======================================================
// TIMER VCNV - 30 GIÂY
// ======================================================

function startVCNVTimer() {

    clearInterval(vcnvTimer);

    const timerElement =
        document.getElementById('timer');

    if (!timerElement) {
        return;
    }

    const duration = 20;

    vcnvDeadline =
        Date.now() +
        duration * 1000;


    function updateVCNVTimer() {

        const remaining =
            Math.max(
                0,
                Math.ceil(
                    (
                        vcnvDeadline -
                        Date.now()
                    ) / 1000
                )
            );


        timerElement.textContent =
            remaining;


        if (remaining <= 0) {

            clearInterval(
                vcnvTimer
            );

            vcnvTimer =
                null;


            // Hết giờ → khóa trả lời
            answerInput.disabled =
                true;

            submitAnswerButton.disabled =
                true;

            submitAnswerButton.textContent =
                'HẾT GIỜ';
        }
    }


    updateVCNVTimer();


    vcnvTimer =
        setInterval(
            updateVCNVTimer,
            200
        );

}