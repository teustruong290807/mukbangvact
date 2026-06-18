// Đã gắn link API chuẩn của bạn
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxvDaLC3CPF76oD669ZF96EJ-UXNzleeDevU79fyQw8Xy9auH-Z-Gv5k9qvBPVtSvrTg/exec";

let database = []; 
let userName = ""; // Biến lưu tên người làm bài

document.addEventListener("DOMContentLoaded", () => {
  // --- TÍNH NĂNG MỞ VIDEO BÀI GIẢNG ---
  const videoModal = document.getElementById("video-modal");
  const ytIframe = document.getElementById("yt-iframe");
  const modalVideoTitle = document.getElementById("modal-video-title");

  // Bắt sự kiện click vào các thẻ video
  document.querySelectorAll(".video-card").forEach(card => {
    card.addEventListener("click", function() {
      const ytId = this.getAttribute("data-ytid");
      const title = this.querySelector(".video-title").innerText;
      
      modalVideoTitle.innerText = title;
      // Gắn link nhúng Youtube (autoplay=1 để tự phát khi mở lên)
      ytIframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1`;
      
      videoModal.classList.remove("hidden");
    });
  });

  // Tắt Modal Video
  document.getElementById("close-video-modal").addEventListener("click", () => {
    videoModal.classList.add("hidden");
    ytIframe.src = ""; // Xóa source để video ngừng phát và tắt tiếng
  });

  // Nút "Đã hiểu bài" -> Tắt video và cuộn xuống danh sách đề
  document.getElementById("btn-done-watching").addEventListener("click", () => {
    videoModal.classList.add("hidden");
    ytIframe.src = "";
    document.querySelector(".dashboard-table").scrollIntoView({ behavior: 'smooth' });
  });
  const dashboardScreen = document.getElementById("dashboard-screen");
  const quizContainer = document.getElementById("quiz-container");
  const resultScreen = document.getElementById("result-screen");
  
  const quizListEl = document.getElementById("quiz-list-tbody");
  const quizContentEl = document.getElementById("quiz-content");
  const questionGridEl = document.getElementById("question-grid");
  const btnSubmit = document.getElementById("btn-submit");
  
  let currentQuizData = null; 
  let userAnswers = {};       
  let startTime = 0;          
  let timerId = null;         

  // --- HÀM TẢI DỮ LIỆU TỪ GOOGLE SHEETS ---
  // --- HÀM TẢI DỮ LIỆU TỪ GOOGLE SHEETS ---
  async function loadDataFromSheet() {
    if (quizListEl) quizListEl.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Đang tải dữ liệu từ kho đề... ⏳</td></tr>";
    
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const apiData = await response.json(); // Nhận dữ liệu tổng hợp
      
      database = apiData.quizzes; // Tách lấy kho đề thi
      database.sort((a, b) => a.title.localeCompare(b.title));
      renderDashboard(); 

      // Gọi hàm vẽ Video
      renderVideos(apiData.videos); 
      
    } catch (error) {
      if (quizListEl) quizListEl.innerHTML = "<tr><td colspan='4' style='text-align:center; color:red;'>Lỗi tải dữ liệu. Vui lòng kiểm tra lại link Google Sheets!</td></tr>";
      console.error(error);
    }
  }

  // --- HÀM VẼ GIAO DIỆN VIDEO TỰ ĐỘNG ---
  function renderVideos(videoList) {
    const videoGrid = document.getElementById("video-grid-container");
    if (!videoGrid) return;
    
    videoGrid.innerHTML = ""; // Xóa chữ Đang tải

    if (!videoList || videoList.length === 0) {
      videoGrid.innerHTML = "<p style='padding: 20px; color:#666;'>Chưa có video nào.</p>";
      return;
    }

    videoList.forEach(vid => {
      const card = document.createElement("div");
      card.className = "video-card";
      // Tạo khung HTML cho từng video kèm ảnh bìa Youtube tự động
      card.innerHTML = `
        <div class="video-thumb">
          <div class="play-icon">▶</div>
          <img src="https://img.youtube.com/vi/${vid.ytId}/maxresdefault.jpg" alt="Thumbnail">
        </div>
        <div class="video-info">
          <h4 class="video-title">${vid.title}</h4>
          <p class="video-desc">${vid.desc}</p>
        </div>
      `;
      
      // Bắt sự kiện bấm vào thẻ thì mở cửa sổ xem video
      card.addEventListener("click", () => {
        document.getElementById("modal-video-title").innerText = vid.title;
        document.getElementById("yt-iframe").src = `https://www.youtube.com/embed/${vid.ytId}?autoplay=1`;
        document.getElementById("video-modal").classList.remove("hidden");
      });

      videoGrid.appendChild(card);
    });
  }

  // Các nút điều khiển cửa sổ Video Modal
  const btnCloseVideo = document.getElementById("close-video-modal");
  if (btnCloseVideo) {
    btnCloseVideo.addEventListener("click", () => {
      document.getElementById("video-modal").classList.add("hidden");
      document.getElementById("yt-iframe").src = ""; // Xóa link để ngắt tiếng video
    });
  }

  const btnDoneWatching = document.getElementById("btn-done-watching");
  if (btnDoneWatching) {
    btnDoneWatching.addEventListener("click", () => {
      document.getElementById("video-modal").classList.add("hidden");
      document.getElementById("yt-iframe").src = "";
      document.querySelector(".dashboard-table").scrollIntoView({ behavior: 'smooth' });
    });
  }

  // --- HIỂN THỊ DANH SÁCH ĐỀ (DẠNG BẢNG) ---
  function renderDashboard() {
    if (!quizListEl) return; 
    quizListEl.innerHTML = "";
    
    database.forEach((quiz, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-stt">${index + 1}</td>
        <td class="fw-bold">${quiz.title}</td>
        <td class="col-time">${quiz.timeMinutes} phút</td>
        <td class="col-action">
          <button class="btn-enter-quiz" data-quizid="${quiz.quizId}">Vào thi</button>
        </td>
      `;
      quizListEl.appendChild(tr);
    });

    document.querySelectorAll(".btn-enter-quiz").forEach(btn => {
      btn.addEventListener("click", function() {
        // HỎI TÊN TRƯỚC KHI VÀO THI ĐỂ XẾP HẠNG
        let name = prompt("Nhập Họ và Tên của bạn để lưu lên Bảng xếp hạng:");
        if (!name || name.trim() === "") {
          alert("Bạn phải nhập tên để vào thi nhé!");
          return;
        }
        userName = name.trim(); // Lưu tên lại
        startSpecificQuiz(this.getAttribute("data-quizid"));
      });
    });
  }

  function startSpecificQuiz(quizId) {
    currentQuizData = database.find(q => q.quizId === quizId);
    document.querySelector(".quiz-title").innerText = currentQuizData.title;
    
    userAnswers = {};
    quizContentEl.innerHTML = "";
    questionGridEl.innerHTML = "";
    document.querySelector(".main-content").classList.remove("review-mode");
    
    dashboardScreen.classList.add("hidden");
    quizContainer.classList.remove("hidden");
    
    renderQuizQuestions(currentQuizData.questions);
    startTimer(currentQuizData.timeMinutes * 60);
    startTime = Date.now();
  }

  function renderQuizQuestions(questions) {
    questions.forEach((item) => {
      const gridBtn = document.createElement("button");
      gridBtn.className = "q-btn";
      gridBtn.innerText = item.id;
      gridBtn.id = `btn-q${item.id}`;
      gridBtn.addEventListener("click", () => {
        document.getElementById(`question-${item.id}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      questionGridEl.appendChild(gridBtn);

      const qBlock = document.createElement("div");
      qBlock.className = "question-block";
      qBlock.id = `question-${item.id}`;

      if (item.type === "true_false") {
        let trHTML = "";
        item.statements.forEach(stmt => {
          trHTML += `
            <tr>
              <td><strong>${stmt.id})</strong> ${stmt.text}</td>
              <td><button class="tf-btn" data-question="${item.id}" data-statement="${stmt.id}" data-answer="Đúng">Đ</button></td>
              <td><button class="tf-btn" data-question="${item.id}" data-statement="${stmt.id}" data-answer="Sai">S</button></td>
            </tr>
          `;
        });
        qBlock.innerHTML = `
          <div class="question-text">Câu ${item.id}: ${item.question}</div>
          ${item.context ? `<div class="context-text">${item.context.replace(/\n/g, '<br>')}</div>` : ""}
          <table class="tf-table">
            <thead><tr><th>Nhận định</th><th>Đúng</th><th>Sai</th></tr></thead>
            <tbody>${trHTML}</tbody>
          </table>
        `;
      } else {
        let optionsHTML = "";
        for (const [letter, text] of Object.entries(item.options)) {
          optionsHTML += `
            <div class="option-item" data-question="${item.id}" data-answer="${letter}" id="opt-${item.id}-${letter}">
              <span class="option-letter">${letter}</span><span class="option-text">${text}</span>
            </div>
          `;
        }
        qBlock.innerHTML = `<div class="question-text">Câu ${item.id}: ${item.question}</div><div class="options-group">${optionsHTML}</div>`;
      }
      quizContentEl.appendChild(qBlock);
    });

    attachOptionListeners();
  }

  function attachOptionListeners() {
    document.querySelectorAll(".option-item").forEach(option => {
      option.addEventListener("click", function() {
        const qId = this.getAttribute("data-question");
        document.querySelectorAll(`.option-item[data-question="${qId}"]`).forEach(sib => sib.classList.remove("selected"));
        this.classList.add("selected");
        userAnswers[qId] = this.getAttribute("data-answer");
        
        const gridBtn = document.getElementById(`btn-q${qId}`);
        if(gridBtn) gridBtn.classList.add("answered");
      });
    });

    document.querySelectorAll(".tf-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        const qId = this.getAttribute("data-question");
        const sId = this.getAttribute("data-statement");
        
        document.querySelectorAll(`.tf-btn[data-question="${qId}"][data-statement="${sId}"]`).forEach(sib => sib.classList.remove("selected"));
        this.classList.add("selected");
        userAnswers[`${qId}_${sId}`] = this.getAttribute("data-answer");

        const currentQuestion = currentQuizData.questions.find(q => q.id == qId);
        let allAnswered = true;
        currentQuestion.statements.forEach(stmt => {
          if (!userAnswers[`${qId}_${stmt.id}`]) allAnswered = false;
        });

        if (allAnswered) {
          const gridBtn = document.getElementById(`btn-q${qId}`);
          if(gridBtn) gridBtn.classList.add("answered");
        }
      });
    });
  }

  function startTimer(totalSeconds) {
    let timeLeft = totalSeconds; 
    const timerEl = document.getElementById("timer");
    clearInterval(timerId); 
    timerId = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timerId); timerEl.innerText = "00:00:00"; submitQuiz(); 
      } else {
        let m = Math.floor(timeLeft / 60); let s = timeLeft % 60;
        timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        timeLeft--;
      }
    }, 1000);
  }

  // SỬA CHỖ NÀY: Thêm chữ async vào trước function
  async function submitQuiz() {
    clearInterval(timerId); 
    let correctActions = 0, wrongActions = 0, skippedActions = 0;
    let totalMaxScore = currentQuizData.questions.length;
    let totalEarnedScore = 0;

    currentQuizData.questions.forEach(item => {
      if (item.type === "true_false") {
        let stmtCorrect = 0;
        item.statements.forEach(stmt => {
          const uAns = userAnswers[`${item.id}_${stmt.id}`];
          const correctAns = stmt.correctAnswer;

          const btnDung = document.querySelector(`.tf-btn[data-question="${item.id}"][data-statement="${stmt.id}"][data-answer="Đúng"]`);
          const btnSai = document.querySelector(`.tf-btn[data-question="${item.id}"][data-statement="${stmt.id}"][data-answer="Sai"]`);
          if (btnDung && correctAns === "Đúng") btnDung.classList.add("correct-ans");
          if (btnSai && correctAns === "Sai") btnSai.classList.add("correct-ans");

          if (!uAns) {
            skippedActions++;
          } else if (uAns === correctAns) {
            stmtCorrect++; correctActions++;
          } else {
            wrongActions++;
            const wrongBtn = document.querySelector(`.tf-btn[data-question="${item.id}"][data-statement="${stmt.id}"][data-answer="${uAns}"]`);
            if (wrongBtn) wrongBtn.classList.add("wrong-ans");
          }
        });

        if (item.statements.length === 4) {
          if (stmtCorrect === 1) totalEarnedScore += 0.1;
          else if (stmtCorrect === 2) totalEarnedScore += 0.25;
          else if (stmtCorrect === 3) totalEarnedScore += 0.5;
          else if (stmtCorrect === 4) totalEarnedScore += 1.0;
        } else {
          totalEarnedScore += (stmtCorrect / item.statements.length);
        }

      } else {
        const uAns = userAnswers[item.id];
        const correctAns = item.correctAnswer;
        const correctNode = document.getElementById(`opt-${item.id}-${correctAns}`);
        if(correctNode) correctNode.classList.add("correct-ans");

        if (!uAns) {
          skippedActions++;
        } else if (uAns === correctAns) {
          totalEarnedScore += 1; correctActions++;
        } else {
          wrongActions++;
          const wrongNode = document.getElementById(`opt-${item.id}-${uAns}`);
          if(wrongNode) wrongNode.classList.add("wrong-ans");
        }
      }
    });

    let score = (totalEarnedScore / totalMaxScore) * 10;
    score = Number(score.toFixed(2)); 

    const timeTakenSecs = Math.floor((Date.now() - startTime) / 1000);
    
    // SỬA CHỖ NÀY: Vô hiệu hóa nút xem xếp hạng tạm thời
    const btnViewRank = document.getElementById("btn-view-rank");
    if(btnViewRank) {
      btnViewRank.innerText = "Đang lưu điểm...";
      btnViewRank.disabled = true;
    }

    // SỬA CHỖ NÀY: Dùng await để buộc hệ thống chờ lưu điểm xong mới chạy tiếp
    try {
      await fetch(`${APPS_SCRIPT_URL}?action=saveScore&quizId=${currentQuizData.quizId}&name=${encodeURIComponent(userName)}&score=${score}&time=${timeTakenSecs}`);
    } catch (err) {
      console.error("Lỗi lưu điểm:", err);
    }

    // Mở khóa lại nút xem xếp hạng
    if(btnViewRank) {
      btnViewRank.innerText = "Xem xếp hạng";
      btnViewRank.disabled = false;
    }

    document.getElementById("final-score").innerText = score;
    document.getElementById("final-status").innerText = score >= 5 ? "(Đạt)" : "(Không đạt)";
    document.getElementById("stat-correct").innerText = correctActions;
    document.getElementById("stat-incorrect").innerText = wrongActions;
    document.getElementById("stat-skipped").innerText = skippedActions;
    document.getElementById("time-taken-text").innerText = `${Math.floor(timeTakenSecs / 60)} phút ${timeTakenSecs % 60} giây`;

    quizContainer.classList.add("hidden");
    resultScreen.classList.remove("hidden");
  }
  if(btnSubmit) {
    btnSubmit.addEventListener("click", () => {
      if (confirm("Bạn có chắc chắn muốn nộp bài không?")) submitQuiz();
    });
  }

  // --- TÍNH NĂNG MỚI: XỬ LÝ NÚT XEM BẢNG XẾP HẠNG ---
  document.getElementById("btn-view-rank").addEventListener("click", async () => {
    const rankTbody = document.getElementById("rank-tbody");
    const rankModal = document.getElementById("rank-modal");

    document.getElementById("rank-quiz-title").innerText = currentQuizData.title;
    rankTbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Đang tải dữ liệu xếp hạng... ⏳</td></tr>";
    rankModal.classList.remove("hidden");

    try {
      // Gọi lên Sheets lấy danh sách xếp hạng
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getRank&quizId=${currentQuizData.quizId}&t=${Date.now()}`);
      const ranks = await response.json();

      rankTbody.innerHTML = "";
      if (ranks.length === 0) {
        rankTbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Chưa có ai hoàn thành bài thi này.</td></tr>";
        return;
      }

      ranks.forEach((r, idx) => {
        let rankClass = "";
        if (idx === 0) rankClass = "rank-1"; // Top 1
        else if (idx === 1) rankClass = "rank-2"; // Top 2
        else if (idx === 2) rankClass = "rank-3"; // Top 3

        let m = Math.floor(r.time / 60); let s = r.time % 60;
        let timeStr = `${m}p ${s}s`;

        rankTbody.innerHTML += `
          <tr class="${rankClass}">
            <td style="text-align: center; font-weight: bold;">#${idx + 1}</td>
            <td>${r.name}</td>
            <td style="text-align: center; font-weight: bold; color: #17a2b8;">${r.score}</td>
            <td style="text-align: center;">${timeStr}</td>
          </tr>
        `;
      });
    } catch (error) {
      rankTbody.innerHTML = "<tr><td colspan='4' style='text-align:center; color:red;'>Lỗi tải dữ liệu.</td></tr>";
    }
  });

  // Tắt bảng xếp hạng
  document.getElementById("close-rank-modal").addEventListener("click", () => {
    document.getElementById("rank-modal").classList.add("hidden");
  });

  document.getElementById("btn-retry").addEventListener("click", () => {
    resultScreen.classList.add("hidden");
    startSpecificQuiz(currentQuizData.quizId); 
  });

  document.getElementById("btn-view-result").addEventListener("click", () => {
    resultScreen.classList.add("hidden");
    quizContainer.classList.remove("hidden");
    document.querySelector(".main-content").classList.add("review-mode");
    
    btnSubmit.innerText = "Trở về Trang chủ";
    btnSubmit.onclick = () => { window.location.reload(); };
  });

  // Gọi hàm chạy ngay khi mới mở web
  loadDataFromSheet();
});
