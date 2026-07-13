// Đã gắn link API chuẩn của bạn
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz41rI1FitmvynC6OnGzrNRQR_Ehz8nbySPiJy8UExLT8lrO1EtYIhHfCS0fpHH6sEXlQ/exec";

let database = []; 
let userName = ""; // Biến lưu tên người làm bài
let allFlashcards = [];

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
      ytIframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
      
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
  async function loadDataFromSheet() {
    // 1. Bật trạng thái "Đang tải..." cho bảng Bài tập
    if (quizListEl) quizListEl.innerHTML = "<tr><td colspan='4' style='text-align:center; color:#666;'>Đang tải bài tập... ⏳</td></tr>";
    
    // 2. BẬT TRẠNG THÁI "ĐANG TẢI..." CHO BẢNG TỪ VỰNG
    const vocabTbody = document.getElementById('vocab-list-tbody');
    if (vocabTbody) vocabTbody.innerHTML = "<tr><td colspan='4' style='text-align:center; color:#666;'>Đang tải kho từ vựng... ⏳</td></tr>";
    
    try {
      const response = await fetch(APPS_SCRIPT_URL);
      const apiData = await response.json(); // Nhận dữ liệu tổng hợp
      
      database = apiData.quizzes; // Tách lấy kho đề thi
      database.sort((a, b) => a.title.localeCompare(b.title));

      allFlashcards = apiData.flashcards || [];
      
      // Hàm này sẽ tự động xóa dòng "Đang tải..." và đắp dữ liệu thật lên
      renderVocabList();
      
      // Gọi các hàm vẽ giao diện
      renderDashboard(); 
      renderVideos(apiData.videos); 
      renderDocuments(apiData.documents); 
      
    } catch (error) {
      if (quizListEl) quizListEl.innerHTML = "<tr><td colspan='4' style='text-align:center; color:red;'>Lỗi tải dữ liệu. Vui lòng kiểm tra lại link Google Sheets!</td></tr>";
      if (vocabTbody) vocabTbody.innerHTML = "<tr><td colspan='4' style='text-align:center; color:red;'>Lỗi tải dữ liệu.</td></tr>";
      console.error(error);
    }
  }

  // --- HÀM VẼ GIAO DIỆN VIDEO ---
  function renderVideos(videoList) {
    const videoGrid = document.getElementById("video-grid-container");
    if (!videoGrid) return;
    
    videoGrid.innerHTML = ""; 

    if (!videoList || videoList.length === 0) {
      videoGrid.innerHTML = "<p style='padding: 20px; color:#666;'>Giáo viên chưa tải lên bài giảng nào.</p>";
      return;
    }

    videoList.forEach(vid => {
      const card = document.createElement("div");
      card.className = "video-card";
      
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
      
      card.addEventListener("click", () => {
        document.getElementById("modal-video-title").innerText = vid.title;
        document.getElementById("yt-iframe").src = `https://www.youtube.com/embed/${vid.ytId}?autoplay=1&rel=0`;
        document.getElementById("video-modal").classList.remove("hidden");
      });

      videoGrid.appendChild(card);
    });
  }

  // --- HÀM VẼ GIAO DIỆN TÀI LIỆU TỰ ĐỘNG ---
  // --- HÀM VẼ GIAO DIỆN TÀI LIỆU TỰ ĐỘNG ---
  function renderDocuments(docList) {
    const docTbody = document.getElementById("doc-list-tbody");
    if (!docTbody) return;
    
    docTbody.innerHTML = ""; // Xóa chữ Đang tải...

    if (!docList || docList.length === 0) {
      docTbody.innerHTML = "<tr><td colspan='3' style='text-align:center; color:#666;'>Giáo viên chưa tải lên tài liệu nào.</td></tr>";
      return;
    }

    docList.forEach((doc, index) => {
      const tr = document.createElement("tr");
      
      // Mặc định luôn có nút tải file bài tập/lý thuyết
      let actionButtonsHTML = `
        <a href="${doc.link}" target="_blank" style="text-decoration: none; flex: 1;">
          <button class="btn-enter-quiz" style="background: var(--surface-strong); width: 100%; white-space: nowrap;">Tải bài tập</button>
        </a>
      `;
      
      // XỬ LÝ THÔNG MINH: Nếu Cột C có link đáp án thì mới sinh ra nút thứ 2
      if (doc.answerLink && doc.answerLink.trim() !== "") {
        actionButtonsHTML += `
          <a href="${doc.answerLink}" target="_blank" style="text-decoration: none; flex: 1;">
            <button class="btn-enter-quiz" style="background: var(--text-tertiary); width: 100%; white-space: nowrap;">Xem đáp án</button>
          </a>
        `;
      }

      tr.innerHTML = `
        <td class="col-stt" style="text-align:center;">${index + 1}</td>
        <td class="fw-bold">${doc.title}</td>
        <td class="col-action">
          <div style="display: flex; gap: 8px; justify-content: center; align-items: center; width: 100%; flex-wrap: wrap;">
            ${actionButtonsHTML}
          </div>
        </td>
      `;
      docTbody.appendChild(tr);
    });
  }

  // --- HIỂN THỊ DANH SÁCH ĐỀ THI ---
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

    document.querySelectorAll(".btn-enter-quiz[data-quizid]").forEach(btn => {
      btn.addEventListener("click", function() {
        let name = prompt("Nhập Họ và Tên của bạn để lưu lên Bảng xếp hạng:");
        if (!name || name.trim() === "") {
          alert("Bạn phải nhập tên để vào thi nhé!");
          return;
        }
        userName = name.trim(); 
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
    
    const btnViewRank = document.getElementById("btn-view-rank");
    if(btnViewRank) {
      btnViewRank.innerText = "Đang lưu điểm...";
      btnViewRank.disabled = true;
    }

    try {
      await fetch(`${APPS_SCRIPT_URL}?action=saveScore&quizId=${currentQuizData.quizId}&name=${encodeURIComponent(userName)}&score=${score}&time=${timeTakenSecs}`);
    } catch (err) {
      console.error("Lỗi lưu điểm:", err);
    }

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

  // --- XỬ LÝ NÚT XEM BẢNG XẾP HẠNG ---
  document.getElementById("btn-view-rank").addEventListener("click", async () => {
    const rankTbody = document.getElementById("rank-tbody");
    const rankModal = document.getElementById("rank-modal");

    document.getElementById("rank-quiz-title").innerText = currentQuizData.title;
    rankTbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Đang tải dữ liệu xếp hạng... ⏳</td></tr>";
    rankModal.classList.remove("hidden");

    try {
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

  // --- TÍNH NĂNG DROP LIST (THU MỞ KHỐI) ---
  document.querySelectorAll(".toggle-header").forEach(header => {
    header.addEventListener("click", function() {
      this.parentElement.classList.toggle("collapsed");
    });
  });

  // Gọi hàm tải dữ liệu ngay khi web vừa mở
  loadDataFromSheet();
});

/* =========================================================================
   CÁC HÀM XỬ LÝ FLASHCARDS & LEARN MODE (BẢN GAME: MCQ & GHÉP NỐI)
========================================================================= */
let currentVocabSetId = null;
let currentVocabWords = [];
let flashcardIndex = 0;

function renderVocabList() {
  const tbody = document.getElementById('vocab-list-tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  if (!allFlashcards || allFlashcards.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">Chưa có bộ từ vựng nào.</td></tr>';
    return;
  }

  allFlashcards.forEach((set, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-stt">${index + 1}</td>
      <td class="fw-bold">${set.title}</td>
      <td class="col-time" style="text-align: center;">${set.words.length} từ</td>
      <td class="col-action">
        <button class="btn-enter-quiz" onclick="openFlashcard('${set.setId}')">Học ngay</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.openFlashcard = function(setId) {
  const set = allFlashcards.find(s => s.setId === setId);
  if (!set || set.words.length === 0) return alert("Bộ từ này chưa có dữ liệu!");
  
  currentVocabSetId = set.setId; 
  currentVocabWords = set.words; 
  flashcardIndex = 0;
  
  document.getElementById('fc-set-title').innerText = set.title;
  document.getElementById('flashcard').classList.remove('is-flipped');
  updateFlashcardUI();
  
  document.getElementById('dashboard-screen').classList.add('hidden');
  document.getElementById('flashcard-screen').classList.remove('hidden');
};

function updateFlashcardUI() {
  const word = currentVocabWords[flashcardIndex];
  document.getElementById('fc-progress').innerText = `Từ ${flashcardIndex + 1} / ${currentVocabWords.length}`;
  
  // Mặt trước
  document.getElementById('fc-word').innerText = word.word;
  document.getElementById('fc-type').innerText = word.type ? `(${word.type})` : "";
  
  // Xử lý Phiên âm (Nếu không có thì tự ẩn đi)
  const fcPhonetic = document.getElementById('fc-phonetic');
  if (fcPhonetic) {
    fcPhonetic.innerText = word.phonetic ? word.phonetic : "";
    fcPhonetic.style.display = word.phonetic ? "block" : "none"; 
  }

  // Mặt sau
  document.getElementById('fc-meaning').innerText = word.meaning;
  
  // Xử lý Ví dụ
  const fcExample = document.getElementById('fc-example');
  if (fcExample) {
    fcExample.innerText = word.example ? `VD: ${word.example}` : "";
    fcExample.style.display = word.example ? "block" : "none";
  }

  // Xử lý Ghi chú / Từ đồng nghĩa
  const fcExtra = document.getElementById('fc-extra');
  if (fcExtra) {
    // Đổi innerText thành innerHTML và chèn link ảnh 3D
    fcExtra.innerHTML = word.extraInfo ? `<img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Light%20bulb/3D/light_bulb_3d.png" class="icon-3d" style="width: 18px; height: 18px;"> ${word.extraInfo}` : "";
    fcExtra.style.display = word.extraInfo ? "inline-block" : "none";
  }
}

// Bắt đầu gán sự kiện sau khi Web load xong
document.addEventListener("DOMContentLoaded", () => {

  // ================= 1. CÁC SỰ KIỆN CỦA FLASHCARD =================
  const btnBackDashboard = document.getElementById('btn-back-dashboard');
  if (btnBackDashboard) {
      btnBackDashboard.addEventListener('click', () => {
        document.getElementById('flashcard-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
      });
  }

  const fcContainer = document.getElementById('flashcard-container');
  if (fcContainer) {
      fcContainer.addEventListener('click', () => {
        document.getElementById('flashcard').classList.toggle('is-flipped');
      });
  }
  
  // Biến chống click đúp liên tục gây lỗi hiệu ứng
  let isFCSwiping = false;

  const btnNextFc = document.getElementById('btn-next-fc');
  if (btnNextFc) {
      btnNextFc.addEventListener('click', () => {
        // Nếu thẻ đang bay hoặc đã hết từ thì bỏ qua click
        if (isFCSwiping || flashcardIndex >= currentVocabWords.length - 1) return;
        isFCSwiping = true;
        
        const container = document.getElementById('flashcard-container');
        
        // Bước 1: Trượt thẻ hiện tại sang TRÁI, thu nhỏ và mờ dần đi
        container.style.transition = 'all 0.15s ease-in';
        container.style.opacity = '0';
        container.style.transform = 'translateX(-50px) scale(0.95)';

        // Đợi 150 mili-giây cho thẻ bay ra ngoài xong rồi mới đổi chữ
        setTimeout(() => {
          // Bước 2: Chuyển sang từ mới & Tự động úp thẻ lại
          flashcardIndex++; 
          document.getElementById('flashcard').classList.remove('is-flipped');
          updateFlashcardUI();
          
          // Bước 3: Đưa khung chứa tàng hình dịch sang bên PHẢI để chuẩn bị lướt vào
          container.style.transition = 'none';
          container.style.transform = 'translateX(50px) scale(0.95)';
          void container.offsetWidth; // Bắt trình duyệt ghi nhận vị trí lập tức

          // Bước 4: Thẻ mới lướt mạnh vào TRUNG TÂM với hiệu ứng nảy (cubic-bezier)
          container.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          container.style.opacity = '1';
          container.style.transform = 'translateX(0) scale(1)';
          
          // Mở khóa click sau khi hiệu ứng hoàn tất
          setTimeout(() => { isFCSwiping = false; }, 300);
        }, 150);
      });
  }

  const btnPrevFc = document.getElementById('btn-prev-fc');
  if (btnPrevFc) {
      btnPrevFc.addEventListener('click', () => {
        // Nếu thẻ đang bay hoặc đang ở từ đầu tiên thì bỏ qua
        if (isFCSwiping || flashcardIndex <= 0) return;
        isFCSwiping = true;

        const container = document.getElementById('flashcard-container');
        
        // Bước 1: Lùi về thì trượt thẻ sang PHẢI (Ngược lại với nút Next)
        container.style.transition = 'all 0.15s ease-in';
        container.style.opacity = '0';
        container.style.transform = 'translateX(50px) scale(0.95)';

        setTimeout(() => {
          // Bước 2: Lùi từ & Úp thẻ
          flashcardIndex--; 
          document.getElementById('flashcard').classList.remove('is-flipped');
          updateFlashcardUI();
          
          // Bước 3: Đưa khung tàng hình dịch sang bên TRÁI chuẩn bị lướt vào
          container.style.transition = 'none';
          container.style.transform = 'translateX(-50px) scale(0.95)';
          void container.offsetWidth; 

          // Bước 4: Lướt vào trung tâm
          container.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          container.style.opacity = '1';
          container.style.transform = 'translateX(0) scale(1)';

          setTimeout(() => { isFCSwiping = false; }, 300);
        }, 150);
      });
  }

  const btnSpeak = document.getElementById('btn-speak');
  if (btnSpeak) {
      btnSpeak.addEventListener('click', (e) => {
        e.stopPropagation(); 
        playAudio(document.getElementById('fc-word').innerText);
      });
  }
// ================= LẮNG NGHE PHÍM TẮT CHO FLASHCARD =================
  document.addEventListener('keydown', (e) => {
    const fcScreen = document.getElementById('flashcard-screen');
    
    // Chỉ nhận lệnh phím tắt khi người dùng ĐANG MỞ màn hình Flashcard
    if (fcScreen && !fcScreen.classList.contains('hidden')) {
      
      // 1. Phím Cách (Space) -> Lật thẻ
      if (e.code === 'Space') {
        e.preventDefault(); // Chặn trình duyệt tự động cuộn trang xuống
        document.getElementById('flashcard').classList.toggle('is-flipped');
      } 
      // 2. Mũi tên Phải (ArrowRight) -> Từ tiếp theo
      else if (e.key === 'ArrowRight') {
        const btnNextFc = document.getElementById('btn-next-fc');
        if (btnNextFc) btnNextFc.click();
      } 
      // 3. Mũi tên Trái (ArrowLeft) -> Lùi lại từ trước
      else if (e.key === 'ArrowLeft') {
        const btnPrevFc = document.getElementById('btn-prev-fc');
        if (btnPrevFc) btnPrevFc.click();
      } 
      // 4. Phím X (Chữ x hoa hoặc thường) -> Phát âm
      else if (e.key === 'x' || e.key === 'X') {
        const btnSpeak = document.getElementById('btn-speak');
        if (btnSpeak) btnSpeak.click();
      }
    }
  });
  // ================= CÁC SỰ KIỆN CỦA LEARN MODE (LOGIC COMBO LỬA & CHIA CHẶNG 5) =================
  let userProgress = {}; 
  let isAutoAdvancing = false; 
  let globalCombo = 0; // Bộ đếm Lửa (không bị reset qua chặng)

  const Q_COEF = 1.5; // Hệ số nhân câu hỏi
  const Q_PER_SEGMENT = 5; // Mặc định 1 chặng = 5 câu
  let targetQuestions = 0; 
  let currentCorrectCount = 0; 
  let matchingMistakes = 0; 
  let segmentWordsTracker = new Map(); 
  let lastSegmentTriggered = 0;

  // 🎵 BỘ ÂM THANH STREAK 1 ĐẾN 5 🎵
  // Bạn hãy thay tên file 1.mp3, 2.mp3... bằng tên file thực tế của bạn
  const streakSounds = [
    new Audio('1.mp3'), // Câu 1
    new Audio('2.mp3'), // Câu 2
    new Audio('3.mp3'), // Câu 3
    new Audio('4.mp3'), // Câu 4
    new Audio('5.mp3')  // Câu 5 (Hoàn thành chặng)
  ];
  streakSounds.forEach(s => s.volume = 0.8);

  const soundIncorrect = new Audio('wrong.mp3'); 
  soundIncorrect.volume = 0.7;

  const soundPop = new Audio('1.mp3'); // Tiếng "bóp" nhẹ khi nối đúng 1 cặp lẻ (Dùng chung tiếng 1)
  soundPop.volume = 0.3;

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function playAudio(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      let utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; window.speechSynthesis.speak(utterance);
    }
  }

  const btnBackToFc = document.getElementById('btn-back-to-fc');
  if (btnBackToFc) {
      btnBackToFc.addEventListener('click', () => {
        document.getElementById('learn-screen').classList.add('hidden');
        document.getElementById('flashcard-screen').classList.remove('hidden');
      });
  }

  const btnExitLearn = document.getElementById('btn-exit-learn');
  if (btnExitLearn) {
      btnExitLearn.addEventListener('click', () => {
        if(confirm("Bạn muốn thoát chế độ học? Tiến độ đã được lưu lại tự động.")) {
          document.getElementById('learn-screen').classList.add('hidden');
          document.getElementById('dashboard-screen').classList.remove('hidden');
        }
      });
  }

  const btnOpenLearn = document.getElementById('btn-open-learn');
  if (btnOpenLearn) {
      btnOpenLearn.addEventListener('click', () => {
        document.getElementById('flashcard-screen').classList.add('hidden');
        document.getElementById('learn-screen').classList.remove('hidden');
        
        let savedData = localStorage.getItem(`vact_learn_${currentVocabSetId}`);
        userProgress = savedData ? JSON.parse(savedData) : {};
        
        currentVocabWords.forEach(w => { 
          if (!userProgress[w.word]) userProgress[w.word] = { status: 0 }; 
        });
        
        // TÍNH TOÁN & LÀM TRÒN SỐ CÂU HỎI CHIA HẾT CHO 5
        let rawTarget = Math.ceil(currentVocabWords.length * Q_COEF);
        targetQuestions = Math.ceil(rawTarget / Q_PER_SEGMENT) * Q_PER_SEGMENT; // Ví dụ 52 -> 55
        
        currentCorrectCount = 0;
        globalCombo = 0; 
        segmentWordsTracker.clear(); 
        lastSegmentTriggered = 0; 
        nextLearnQuestion();
      });
  }

  function nextLearnQuestion() {
    if (isAutoAdvancing) return;
    updateLearnProgress();
    
    // CHIẾN THẮNG KHI ĐẠT ĐỦ SỐ CÂU ĐÃ LÀM TRÒN
    if (currentCorrectCount >= targetQuestions) {
      if (confirm("🔥 XUẤT SẮC! BẠN ĐÃ VƯỢT QUA TẤT CẢ CÁC CHẶNG!\nBạn có muốn Reset để chơi lại từ đầu không?")) {
        userProgress = {};
        currentVocabWords.forEach(w => { userProgress[w.word] = { status: 0 }; });
        currentCorrectCount = 0; globalCombo = 0; segmentWordsTracker.clear(); lastSegmentTriggered = 0;
        saveLearnProgress(); nextLearnQuestion();
      } else {
        document.getElementById('learn-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
      }
      return;
    }
    
    // TỔNG KẾT CHẶNG SAU MỖI 5 CÂU
    if (currentCorrectCount > 0 && currentCorrectCount % Q_PER_SEGMENT === 0 && currentCorrectCount !== lastSegmentTriggered && currentCorrectCount < targetQuestions) {
      showSegmentSummary();
      lastSegmentTriggered = currentCorrectCount;
      return; 
    }

    let sortedWords = [...currentVocabWords].sort((a, b) => userProgress[a.word].status - userProgress[b.word].status);
    let lowestStatus = userProgress[sortedWords[0].word].status;
    let poolToAsk = sortedWords.filter(w => userProgress[w.word].status === lowestStatus);

    document.getElementById('learn-mcq').classList.add('hidden');
    document.getElementById('learn-matching').classList.add('hidden');
    document.getElementById('learn-feedback-text').classList.add('hidden');
    document.getElementById('btn-next-learn').classList.add('hidden');
    document.getElementById('btn-prompt-audio').classList.add('hidden');
    document.getElementById('learn-prompt').style.display = 'block';
    document.getElementById('learn-question-area').style.pointerEvents = 'auto';

    if (poolToAsk.length >= 4 && Math.random() < 0.35) {
      renderMatching(poolToAsk);
    } else {
      renderMCQ(poolToAsk);
    }
  }

  // =================================================================
  // 💥 HÀM TẠO HIỆU ỨNG HẠT SÁNG NỔ BUNG (PARTICLE BURST)
  // =================================================================
  function createParticles(x, y) {
    const particleCount = 15; // Số hạt bắn ra
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random kích thước hạt (từ 4px đến 10px)
      const size = Math.random() * 6 + 4;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Đặt tâm vụ nổ chính xác tại tọa độ chuột/ngón tay
      particle.style.left = `${x - size/2}px`;
      particle.style.top = `${y - size/2}px`;
      
      // Tính toán hướng bay tỏa tròn 360 độ ngẫu nhiên
      const angle = Math.random() * 2 * Math.PI;
      const velocity = Math.random() * 60 + 40; // Tốc độ bay xa
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      
      // Gắn tọa độ vào biến CSS custom để keyframe điều khiển
      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      
      document.body.appendChild(particle);
      
      // Tự dọn rác HTML sau 0.6 giây để không làm nặng web
      setTimeout(() => particle.remove(), 600);
    }
  }

  // --- GAME 1: TRẮC NGHIỆM ĐA DẠNG ---
  function renderMCQ(unmastered) {
    let targetWord = unmastered[Math.floor(Math.random() * unmastered.length)];
    let randMode = Math.random();
    let qText, correctAns, hasAudio = false;

    segmentWordsTracker.set(targetWord.word, targetWord); 

    if (randMode < 0.33) {
      qText = targetWord.word; correctAns = targetWord.meaning;
    } else if (randMode < 0.66) {
      qText = targetWord.meaning; correctAns = targetWord.word;
    } else {
      qText = "Nghe và chọn nghĩa đúng"; correctAns = targetWord.meaning; hasAudio = true;
    }

    document.getElementById('learn-prompt').innerText = qText;
    if (hasAudio) {
      const btnPromptAudio = document.getElementById('btn-prompt-audio');
      btnPromptAudio.classList.remove('hidden');
      btnPromptAudio.onclick = () => playAudio(targetWord.word);
      playAudio(targetWord.word);
    }

    const container = document.getElementById('learn-mcq'); 
    container.innerHTML = "";
    container.classList.remove('hidden');
    
    let options = [correctAns];
    let pool = currentVocabWords.filter(w => (randMode < 0.66 && randMode >= 0.33 ? w.word : w.meaning) !== correctAns);
    pool = shuffleArray(pool);
    for(let i = 0; i < 3 && i < pool.length; i++) {
      options.push(randMode < 0.66 && randMode >= 0.33 ? pool[i].word : pool[i].meaning);
    }
    options = shuffleArray(options);

    options.forEach((opt, index) => {
      let btn = document.createElement('button'); 
      btn.className = 'learn-option-btn'; 
      btn.innerHTML = `<span class="option-num">${index + 1}</span> <span class="option-text">${opt}</span>`;
      
      // KÍCH HOẠT BẪY BẮT TỌA ĐỘ (e) TẠI NÚT CLICK
      btn.onclick = (e) => checkMCQAnswer(opt === correctAns, targetWord, btn, correctAns, e);
      container.appendChild(btn);
    });
  }

  function checkMCQAnswer(isCorrect, targetWord, btn, correctAns, e) {
    if (isAutoAdvancing) return;
    document.getElementById('learn-question-area').style.pointerEvents = 'none';
    const fbText = document.getElementById('learn-feedback-text'); 
    fbText.classList.remove('hidden', 'text-success', 'text-error');

    if (isCorrect) {
      // 🎇 BẮN PHÁO SÁNG TẠI VỊ TRÍ CHUỘT
      if (e) createParticles(e.clientX, e.clientY);

      let soundIndex = currentCorrectCount % Q_PER_SEGMENT;
      streakSounds[soundIndex].currentTime = 0; 
      streakSounds[soundIndex].play();

      btn.classList.add('correct');
      userProgress[targetWord.word].status++; 
      currentCorrectCount++; 
      globalCombo++; 
      
      saveLearnProgress(); updateLearnProgress(); 

      fbText.classList.add('text-success'); fbText.innerText = "Tuyệt vời! Chính xác ✔";
      isAutoAdvancing = true;
      setTimeout(() => { isAutoAdvancing = false; nextLearnQuestion(); }, 800);
    } else {
      soundIncorrect.currentTime = 0; soundIncorrect.play();
      btn.classList.add('incorrect'); 

      document.querySelectorAll('.learn-option-btn').forEach(optBtn => {
        if (optBtn.querySelector('.option-text').innerText === correctAns) {
          optBtn.classList.add('correct');
        }
      });
      
      globalCombo = 0; // Sai phát mất Lửa ngay
      saveLearnProgress(); updateLearnProgress(); 

      fbText.classList.add('text-error');
      fbText.innerHTML = `Chưa chính xác! Chú ý quan sát đáp án đúng nhé 🔄`;
      
      const btnNext = document.getElementById('btn-next-learn');
      btnNext.classList.remove('hidden');
      btnNext.style.width = '100%';
      btnNext.innerText = "Đã hiểu! Tiếp tục (Nhấn Enter)";
      btnNext.focus();
    }
  }

  // --- GAME 2: GHÉP NỐI 2 CỘT ---
  let matchPairsLeft = 0;
  let selectedMatch = { left: null, right: null };

  function renderMatching(unmastered) {
    matchingMistakes = 0;
    document.getElementById('learn-prompt').innerText = "Ghép nối các cặp từ tương ứng";
    document.getElementById('learn-matching').classList.remove('hidden');

    let pool = shuffleArray([...unmastered]).slice(0, 4);
    matchPairsLeft = pool.length;
    pool.forEach(w => segmentWordsTracker.set(w.word, w));
    selectedMatch = { left: null, right: null };

    let leftCol = document.getElementById('match-col-left');
    let rightCol = document.getElementById('match-col-right');
    leftCol.innerHTML = ""; rightCol.innerHTML = "";

    let leftItems = pool.map(w => ({ text: w.word, id: w.word, isAudio: Math.random() > 0.5 }));
    let rightItems = pool.map(w => ({ text: w.meaning, id: w.word }));

    leftItems = shuffleArray(leftItems);
    rightItems = shuffleArray(rightItems);

    leftItems.forEach(item => {
      let btn = document.createElement('button');
      btn.className = 'match-btn';
      if(item.isAudio) {
        // Chèn ảnh cái loa 3D
        btn.innerHTML = '<img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Speaker%20high%20volume/3D/speaker_high_volume_3d.png" class="icon-3d" style="margin-right: 8px;"> Nghe phát âm';
      } else {
        btn.innerText = item.text;
      }
      
      // KÍCH HOẠT BẪY BẮT TỌA ĐỘ
      btn.onclick = (e) => {
        if(item.isAudio) playAudio(item.text);
        handleMatchSelection(btn, item, 'left', e);
      };
      leftCol.appendChild(btn);
    });

    rightItems.forEach(item => {
      let btn = document.createElement('button');
      btn.className = 'match-btn';
      btn.innerText = item.text;
      
      // KÍCH HOẠT BẪY BẮT TỌA ĐỘ
      btn.onclick = (e) => handleMatchSelection(btn, item, 'right', e);
      rightCol.appendChild(btn);
    });
  }

  function handleMatchSelection(btn, item, colType, e) {
    if(btn.classList.contains('matched')) return;

    if(colType === 'left') {
      if(selectedMatch.left) selectedMatch.left.btn.classList.remove('selected');
      selectedMatch.left = { btn, item };
    } else {
      if(selectedMatch.right) selectedMatch.right.btn.classList.remove('selected');
      selectedMatch.right = { btn, item };
    }
    btn.classList.add('selected');

    if(selectedMatch.left && selectedMatch.right) {
      let lBtn = selectedMatch.left.btn; let rBtn = selectedMatch.right.btn;
      let lItem = selectedMatch.left.item; let rItem = selectedMatch.right.item;

      if(lItem.id === rItem.id) {
        
        // 🎇 BẮN PHÁO SÁNG KHI GHÉP NỐI ĐÚNG 1 CẶP
        if (e) createParticles(e.clientX, e.clientY);

        lBtn.className = 'match-btn matched'; rBtn.className = 'match-btn matched';
        userProgress[lItem.id].status++; 
        matchPairsLeft--;
        selectedMatch = { left: null, right: null };
        
        if(matchPairsLeft === 0) {
          // Xong GAME NỐI -> ĐƯỢC TÍNH 1 BẬC
          let soundIndex = currentCorrectCount % Q_PER_SEGMENT;
          streakSounds[soundIndex].currentTime = 0; 
          streakSounds[soundIndex].play();

          currentCorrectCount++; 
          globalCombo++;
          saveLearnProgress(); updateLearnProgress();

          const fbText = document.getElementById('learn-feedback-text'); 
          fbText.classList.remove('hidden', 'text-error');
          fbText.classList.add('text-success');
          fbText.innerText = "Tuyệt vời! Bạn đã hoàn thành câu ghép nối ✔";

          isAutoAdvancing = true;
          setTimeout(() => { isAutoAdvancing = false; nextLearnQuestion(); }, 800);
        } else {
          // Nối đúng 1 cặp nhưng chưa xong
          soundPop.currentTime = 0; soundPop.play();
        }
      } else {
        // GHÉP SAI
        soundIncorrect.currentTime = 0; soundIncorrect.play();
        lBtn.classList.remove('selected'); rBtn.classList.remove('selected');
        lBtn.classList.add('error'); rBtn.classList.add('error');
        
        matchingMistakes++;

        if (matchingMistakes > 1) {
          globalCombo = 0; 
          saveLearnProgress(); updateLearnProgress();

          const fbText = document.getElementById('learn-feedback-text'); 
          fbText.classList.remove('hidden', 'text-success');
          fbText.classList.add('text-error');
          fbText.innerHTML = `Bạn đã ghép sai quá 1 lần! Chú ý hơn nhé 🔄`;
          
          document.querySelectorAll('.match-btn:not(.matched)').forEach(b => b.style.pointerEvents = 'none');
          
          const btnNext = document.getElementById('btn-next-learn');
          btnNext.classList.remove('hidden');
          btnNext.style.width = '100%';
          btnNext.innerText = "Đã hiểu! Tiếp tục (Nhấn Enter)";
          btnNext.focus();
        } else {
          setTimeout(() => {
            lBtn.classList.remove('error'); rBtn.classList.remove('error');
          }, 400); 
        }
        selectedMatch = { left: null, right: null };
      }
    }
  }

  const btnNextLearn = document.getElementById('btn-next-learn');
  if (btnNextLearn) {
      btnNextLearn.addEventListener('click', nextLearnQuestion);
  }

  document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isAutoAdvancing) {
      const fbText = document.getElementById('learn-feedback-text');
      if (fbText && !fbText.classList.contains('hidden') && fbText.classList.contains('text-error')) {
        nextLearnQuestion();
      } else if (!document.getElementById('segment-summary-screen').classList.contains('hidden')) {
        document.getElementById('btn-next-segment').click();
      }
    }
  });

  function updateLearnProgress() {
    document.getElementById('badge-mastered').innerText = currentCorrectCount;
    document.getElementById('badge-total').innerText = targetQuestions;
    
    let comboBadge = document.getElementById('combo-badge');
    // Đổi innerText thành innerHTML và chèn ảnh lửa 3D
    if (comboBadge) comboBadge.innerHTML = `<img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png" class="icon-3d" alt="Fire"> x${globalCombo}`;

    const container = document.getElementById('segmented-progress-bar');
    if (container) {
      container.innerHTML = "";
      const numSegments = Math.ceil(targetQuestions / Q_PER_SEGMENT);
      
      for(let i = 0; i < numSegments; i++) {
        let seg = document.createElement('div'); seg.className = 'segment';
        let fill = document.createElement('div'); fill.className = 'segment-fill';
        
        let maxInSeg = Math.min(Q_PER_SEGMENT, targetQuestions - i * Q_PER_SEGMENT);
        let doneInSeg = Math.max(0, Math.min(maxInSeg, currentCorrectCount - i * Q_PER_SEGMENT));
        
        fill.style.width = (doneInSeg / maxInSeg * 100) + '%';
        
        if (globalCombo >= 3 && doneInSeg > 0 && doneInSeg <= maxInSeg) {
          fill.classList.add('on-fire');
        }
        
        seg.appendChild(fill); container.appendChild(seg);
      }
    }

    if (globalCombo >= 3) {
      if (comboBadge) comboBadge.classList.add('on-fire');
    } else {
      if (comboBadge) comboBadge.classList.remove('on-fire');
    }
  }

  function saveLearnProgress() { 
    localStorage.setItem(`vact_learn_${currentVocabSetId}`, JSON.stringify(userProgress)); 
  }

  // ===================== HÀM TẠO BẢNG TỔNG KẾT =====================
  // ===================== HÀM TẠO BẢNG TỔNG KẾT & BANNER =====================
  function showSegmentSummary() {
    // 1. Ẩn bảng câu hỏi
    document.getElementById('learn-main-board').classList.add('hidden');
    
    // 2. Kích hoạt Banner chúc mừng nảy lên
    const banner = document.getElementById('celebration-banner');
    banner.classList.remove('hidden');
    void banner.offsetWidth; // Ép trình duyệt khởi động CSS Animation
    banner.classList.add('show');

    // 3. Đổ dữ liệu sẵn vào bảng tổng kết (ẩn ở phía sau)
    const list = document.getElementById('segment-words-list');
    list.innerHTML = "";
    segmentWordsTracker.forEach(w => {
      list.innerHTML += `
        <div style="display: flex; flex-direction: column; padding: 15px 20px; border-bottom: 1px solid var(--border-strong);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
            <strong style="color: var(--surface-strong); font-size: 18px;">${w.word}</strong>
            <span style="color: var(--text-secondary); font-size: 14px;">${w.type ? `(${w.type})` : ''}</span>
          </div>
          <span style="color: var(--text-primary); font-size: 16px;">${w.meaning}</span>
        </div>`;
    });

    // 4. Giữ Banner khoe thành tích trong 1.8 giây, sau đó tự tắt và mở bảng tổng kết
    setTimeout(() => {
      banner.classList.remove('show');
      
      // Chờ CSS mờ dần (0.3s) rồi mới ẩn HTML hoàn toàn
      setTimeout(() => {
        banner.classList.add('hidden');
        document.getElementById('segment-summary-screen').classList.remove('hidden');
        
        const btnNextSeg = document.getElementById('btn-next-segment');
        if (btnNextSeg) btnNextSeg.focus();
      }, 300);
      
    }, 1800); // 1800ms = 1.8 giây
  }

  const btnNextSegment = document.getElementById('btn-next-segment');
  if (btnNextSegment) {
    btnNextSegment.addEventListener('click', () => {
      segmentWordsTracker.clear(); 
      document.getElementById('segment-summary-screen').classList.add('hidden');
      document.getElementById('learn-main-board').classList.remove('hidden');
      nextLearnQuestion(); 
    });
  }

}); // <-- Dấu đóng ngoặc cuối cùng của file