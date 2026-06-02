// =============== STATE MANAGEMENT ===============
const AppState = {
  speechEnabled: true,
  confettiEnabled: true,
  difficulty: 'medium',
  totalStars: 0,
  currentSubject: '',
  currentQuestions: [],
  currentIndex: 0,
  correctCount: 0,
  currentStreak: 0,
  quizActive: false,
  compMode: false,
  compPassage: '',
  compQuestions: [],
  compIndex: 0,
  compIsListening: false,
  subjectStats: {},
  currentUtterance: null,
  
  MATH_PROBLEM_COUNT: 2,
  READING_PROBLEM_COUNT: 3,
  
  init() {
    this.loadFromStorage();
    this.updateStarDisplay();
    this.updateDifficultyButtons();
  },
  
  loadFromStorage() {
    try {
      const stars = localStorage.getItem('safia_complete_stars');
      if (stars) this.totalStars = parseInt(stars);
      const stats = localStorage.getItem('safia_complete_stats');
      if (stats) this.subjectStats = JSON.parse(stats);
    } catch(e) {}
  },
  
  saveToStorage() {
    localStorage.setItem('safia_complete_stars', this.totalStars);
    localStorage.setItem('safia_complete_stats', JSON.stringify(this.subjectStats));
  },
  
  updateStarDisplay() {
    document.getElementById('starCount').innerText = this.totalStars;
  },
  
  updateDifficultyButtons() {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      if (btn.dataset.diff === this.difficulty) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  },
  
  recordAnswer(subject, isCorrect) {
    if (!this.subjectStats[subject]) {
      this.subjectStats[subject] = { total: 0, correct: 0, percent: 0 };
    }
    this.subjectStats[subject].total++;
    if (isCorrect) this.subjectStats[subject].correct++;
    this.subjectStats[subject].percent = Math.round((this.subjectStats[subject].correct / this.subjectStats[subject].total) * 100);
    this.saveToStorage();
  },
  
  getWeakSubjects() {
    const weak = [];
    for (const [subject, stats] of Object.entries(this.subjectStats)) {
      if (stats.percent < 70 && stats.total >= 2) {
        weak.push({ subject, percent: stats.percent });
      }
    }
    return weak.sort((a,b) => a.percent - b.percent);
  }
};

// =============== HELPER FUNCTIONS ===============
function randomInt(min, max) { 
  const diff = AppState.difficulty === 'easy' ? 0.7 : (AppState.difficulty === 'hard' ? 1.3 : 1);
  const adjustedMax = Math.min(max, Math.floor(max * diff));
  return Math.floor(Math.random() * (adjustedMax - min + 1)) + min;
}

function shuffle(arr) { 
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { 
    const j = Math.floor(Math.random() * (i + 1)); 
    [a[i], a[j]] = [a[j], a[i]]; 
  } 
  return a; 
}

function speakNow(text, button = null) {
  if (!AppState.speechEnabled) return;
  if (window.speechSynthesis) {
    if (AppState.currentUtterance) window.speechSynthesis.cancel();
    AppState.currentUtterance = new SpeechSynthesisUtterance(text);
    AppState.currentUtterance.rate = 0.9;
    AppState.currentUtterance.pitch = 1.1;
    AppState.currentUtterance.lang = 'en-US';
    if (button) {
      button.style.opacity = '0.7';
      AppState.currentUtterance.onend = AppState.currentUtterance.onerror = () => {
        button.style.opacity = '1';
      };
    }
    window.speechSynthesis.speak(AppState.currentUtterance);
  }
}

function launchConfetti() {
  if (!AppState.confettiEnabled) return;
  for (let i = 0; i < 40; i++) {
    let conf = document.createElement("div");
    conf.style.position = "fixed";
    conf.style.width = "8px";
    conf.style.height = "8px";
    conf.style.background = `hsl(${Math.random() * 360}, 100%, 60%)`;
    conf.style.left = Math.random() * window.innerWidth + "px";
    conf.style.top = "70%";
    conf.style.borderRadius = "50%";
    conf.style.zIndex = "9999";
    conf.style.pointerEvents = "none";
    document.body.appendChild(conf);
    let vy = -Math.random() * 8 - 3;
    let vx = (Math.random() - 0.5) * 10;
    let life = 100;
    function animate() {
      let top = parseFloat(conf.style.top);
      let left = parseFloat(conf.style.left);
      conf.style.top = top + vy + "px";
      conf.style.left = left + vx + "px";
      vy += 0.3;
      life--;
      if (life <= 0 || top > window.innerHeight) conf.remove();
      else requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
    setTimeout(() => conf.remove(), 800);
  }
}
// =============== MATH QUESTION GENERATORS ===============
function generateAdditionCarry() {
  let a, b;
  do { a = randomInt(13, 69); b = randomInt(13, 69); } while ((a % 10) + (b % 10) < 10 || a + b > 99);
  const answer = a + b;
  const options = shuffle([answer, answer+1, answer-1, answer+2].map(String));
  return {
    type: "math", subject: "additionCarry",
    instruction: "🌸 Solve the addition problem.",
    text: `${a} + ${b} = ?`,
    options, correct: options.indexOf(String(answer)),
    coaching: `Add the ones first: ${a%10} + ${b%10} = ${(a%10)+(b%10)}. Carry the 1.`
  };
}

function generateSubtractionBorrow() {
  let a, b;
  do { a = randomInt(31, 95); b = randomInt(13, a - 5); } while ((a % 10) >= (b % 10) || a - b < 10);
  const answer = a - b;
  const options = shuffle([answer, answer+1, answer-1, answer+2].map(String));
  return {
    type: "math", subject: "subtractionBorrow",
    instruction: "🌸 Solve the subtraction problem.",
    text: `${a} − ${b} = ?`,
    options, correct: options.indexOf(String(answer)),
    coaching: `${a%10} is smaller, so borrow from tens.`
  };
}

function generateMissingNumber() {
  const a = randomInt(3, 15);
  const total = randomInt(a + 3, 25);
  const missing = total - a;
  const options = shuffle([missing, missing+1, missing-1, missing+2].map(String));
  return {
    type: "math", subject: "missingNumber",
    instruction: "🌸 Find the missing number.",
    text: `${a} + ? = ${total}`,
    options, correct: options.indexOf(String(missing)),
    coaching: `Subtract: ${total} − ${a} = ${missing}.`
  };
}

function generateMakeASum() {
  const target = randomInt(8, 20);
  const a = randomInt(2, target - 2);
  const b = target - a;
  const options = shuffle([`${a} + ${b}`, `${a+1} + ${b-1}`, `${a-1} + ${b+1}`, `${randomInt(1,target-1)} + ${randomInt(1,target-1)}`]);
  return {
    type: "math", subject: "makeASum",
    instruction: `🌸 Which two numbers add up to ${target}?`,
    text: "Choose the correct pair:",
    options, correct: options.findIndex(opt => opt === `${a} + ${b}`),
    coaching: `Try adding each pair: ${a}+${b}=${target}.`
  };
}

function generateHowManyMore() {
  const larger = randomInt(15, 50);
  const smaller = randomInt(5, larger - 5);
  const answer = larger - smaller;
  const options = shuffle([answer, answer+1, answer-1, answer+2].map(String));
  return {
    type: "math", subject: "howManyMore",
    instruction: "🌸 Subtract the smaller from the larger.",
    text: `${larger} − ${smaller} = ?`,
    options, correct: options.indexOf(String(answer)),
    coaching: `${larger} − ${smaller} = ${answer}.`
  };
}

function generateWordProblem() {
  const start = randomInt(5, 25);
  const add = randomInt(2, 12);
  const answer = start + add;
  const options = shuffle([answer, answer+1, answer-1, answer+2].map(String));
  return {
    type: "math", subject: "wordProblems",
    instruction: "🌸 Read the story problem.",
    text: `Safia has ${start} stickers. Her friend gives her ${add} more. How many now?`,
    options, correct: options.indexOf(String(answer)),
    coaching: `"Gives her more" means ADD.`
  };
}

// =============== MEASUREMENT & DATA GENERATORS ===============
function generateTimeQuestion() {
  const hour = randomInt(1, 12);
  const minute = randomInt(0, 1) === 0 ? 0 : 30;
  let answer = minute === 0 ? `${hour}:00` : `${hour}:30`;
  const wrongOptions = shuffle([`${hour+1}:00`, `${hour-1}:30`, `${hour}:15`, `${hour}:45`].filter(t => t !== answer).slice(0, 3));
  const options = shuffle([answer, ...wrongOptions]);
  return {
    type: "math", subject: "time",
    instruction: "🌸 What time is shown on the clock?",
    text: `<div class="clock-face">🕐 ${answer}</div>`,
    options: options,
    correct: options.indexOf(answer),
    coaching: `The hour hand is at ${hour}, minute hand at ${minute === 0 ? '12' : '6'} → ${answer}.`
  };
}

function generateMoneyQuestion() {
  const pennies = randomInt(0, 4);
  const nickels = randomInt(0, 3);
  const dimes = randomInt(0, 2);
  const total = pennies + (nickels * 5) + (dimes * 10);
  const options = shuffle([`${total}¢`, `${total+1}¢`, `${total-1}¢`, `${total+2}¢`]);
  let coinDisplay = "";
  for (let i = 0; i < pennies; i++) coinDisplay += `<div class="coin penny">1¢</div>`;
  for (let i = 0; i < nickels; i++) coinDisplay += `<div class="coin nickel">5¢</div>`;
  for (let i = 0; i < dimes; i++) coinDisplay += `<div class="coin dime">10¢</div>`;
  if (coinDisplay === "") coinDisplay = "<div>No coins shown</div>";
  return {
    type: "math", subject: "money",
    instruction: "🌸 Count the coins. How much money is there?",
    text: `<div class="coin-row">${coinDisplay}</div>`,
    options: options,
    correct: options.indexOf(`${total}¢`),
    coaching: `Pennies = ${pennies}¢, Nickels = ${nickels*5}¢, Dimes = ${dimes*10}¢ → Total = ${total}¢.`
  };
}

function generateGraphQuestion() {
  const cats = randomInt(2, 6);
  const dogs = randomInt(2, 6);
  const fish = randomInt(1, 4);
  const max = Math.max(cats, dogs, fish);
  const heights = [cats, dogs, fish].map(v => Math.round((v / max) * 60) + 20);
  const options = shuffle(["Cats", "Dogs", "Fish", "All the same"]);
  const correctIndex = options.findIndex(opt => {
    if (opt === "Cats") return cats > dogs && cats > fish;
    if (opt === "Dogs") return dogs > cats && dogs > fish;
    if (opt === "Fish") return fish > cats && fish > dogs;
    return cats === dogs && dogs === fish;
  });
  return {
    type: "math", subject: "graphs",
    instruction: "🌸 Look at the graph. Which pet is the most popular?",
    text: `<div class="graph-row">
      <div class="graph-bar"><div class="bar" style="height:${heights[0]}px;"></div><div>🐱 ${cats}</div></div>
      <div class="graph-bar"><div class="bar" style="height:${heights[1]}px;"></div><div>🐶 ${dogs}</div></div>
      <div class="graph-bar"><div class="bar" style="height:${heights[2]}px;"></div><div>🐟 ${fish}</div></div>
    </div>`,
    options: options,
    correct: correctIndex,
    coaching: `Cats: ${cats}, Dogs: ${dogs}, Fish: ${fish}. The highest number is the most popular.`
  };
}

function generateLengthWeightQuestion() {
  const type = randomInt(1, 2);
  if (type === 1) {
    const longer = randomInt(10, 30);
    const shorter = randomInt(3, longer - 2);
    const options = shuffle(["The pencil", "The crayon", "They are the same", "Cannot tell"]);
    return {
      type: "math", subject: "lengthWeight",
      instruction: "🌸 Which is longer?",
      text: `<div style="font-size:2rem;">✏️ Pencil (${longer}cm) &nbsp;&nbsp;&nbsp; 🖍️ Crayon (${shorter}cm)</div>`,
      options: options,
      correct: options.indexOf("The pencil"),
      coaching: `${longer}cm is longer than ${shorter}cm, so the pencil is longer.`
    };
  } else {
    const heavy = randomInt(20, 50);
    const light = randomInt(2, 15);
    const options = shuffle(["The rock", "The feather", "They are the same", "Cannot tell"]);
    return {
      type: "math", subject: "lengthWeight",
      instruction: "🌸 Which is heavier?",
      text: `<div style="font-size:2rem;">🪨 Rock (${heavy}g) &nbsp;&nbsp;&nbsp; 🪶 Feather (${light}g)</div>`,
      options: options,
      correct: options.indexOf("The rock"),
      coaching: `${heavy}g is heavier than ${light}g, so the rock is heavier.`
    };
  }
}

function generateSortingQuestion() {
  const type = randomInt(1, 3);
  let instruction = "", items = "", correctAnswer = "", options = [];
  if (type === 1) {
    instruction = "🌸 Sort the pencils: small vs large";
    items = "✏️ Small Pencil &nbsp;&nbsp; 📏 Large Pencil &nbsp;&nbsp; ✏️ Small Pencil";
    correctAnswer = "Small pencils go in small box, large pencil goes in large box";
    options = ["Sort by size", "Sort by color", "Sort by length", "Cannot sort"];
  } else if (type === 2) {
    instruction = "🌸 Sort the items: hot vs cold";
    items = "🔥 Fire &nbsp;&nbsp; 🧊 Ice Cube &nbsp;&nbsp; ☕ Hot Soup";
    correctAnswer = "Fire and Hot Soup are hot. Ice Cube is cold.";
    options = ["Hot: Fire, Soup; Cold: Ice", "All are hot", "All are cold", "Cannot sort"];
  } else {
    instruction = "🌸 Sort the animals: living vs non-living";
    items = "🐱 Cat &nbsp;&nbsp; 🪨 Rock &nbsp;&nbsp; 🐕 Dog";
    correctAnswer = "Cat and Dog are living. Rock is non-living.";
    options = ["Living: Cat, Dog; Non-living: Rock", "All are living", "All are non-living", "Cannot sort"];
  }
  return {
    type: "math", subject: "sorting",
    instruction: instruction,
    text: `<div style="font-size:1.5rem; text-align:center;">${items}</div>`,
    options: options,
    correct: 0,
    coaching: correctAnswer
  };
}
// =============== READING GENERATORS ===============
const VOCAB_WORDS = [
  { word: "enormous", meaning: "very big", example: "The enormous elephant was huge." },
  { word: "gentle", meaning: "soft and kind", example: "The gentle puppy licked softly." },
  { word: "valiant", meaning: "brave", example: "The valiant knight saved the kingdom." },
  { word: "curious", meaning: "wants to learn", example: "The curious cat looked inside." },
  { word: "tremendous", meaning: "very large", example: "The tremendous wave crashed." },
  { word: "dazzling", meaning: "very bright", example: "The dazzling stars lit up the sky." }
];

function generateVocabulary() {
  const item = VOCAB_WORDS[randomInt(0, VOCAB_WORDS.length - 1)];
  const wrongs = VOCAB_WORDS.map(w => w.meaning).filter(m => m !== item.meaning).slice(0, 3);
  const options = shuffle([item.meaning, ...wrongs]);
  return {
    type: "reading", subject: "vocabulary",
    instruction: `🌸 Choose the word that means the same as "${item.word}".`,
    story: item.example,
    pictures: options.map(opt => ({ emoji: opt === item.meaning ? "📖" : "🤔", label: opt, correct: opt === item.meaning })),
    correct: options.findIndex(opt => opt === item.meaning),
    coaching: `${item.word} means ${item.meaning}.`
  };
}

const SEQUENCING_STORIES = [
  { order: ["woke up", "brushed teeth", "ate breakfast", "went to school"], question: "What happened AFTER brushing teeth?", correct: "ate breakfast", wrong: ["woke up", "went to school"], fullStory: "First, Mia woke up. Then she brushed her teeth. Next, she ate breakfast. Finally, she went to school." },
  { order: ["planted seed", "sprout appeared", "flower bloomed", "made new seeds"], question: "What happened BEFORE the flower bloomed?", correct: "sprout appeared", wrong: ["planted seed", "made new seeds"], fullStory: "First, Tom planted a seed. Then a sprout appeared. Next, a flower bloomed. Finally, it made new seeds." }
];

function generateSequencing() {
  const s = SEQUENCING_STORIES[randomInt(0, SEQUENCING_STORIES.length - 1)];
  const options = shuffle([s.correct, ...s.wrong]);
  return {
    type: "reading", subject: "sequencing",
    instruction: "🌸 Read the story. Then answer.",
    story: s.fullStory,
    question: s.question,
    pictures: options.map(opt => ({ emoji: "📖", label: opt, correct: opt === s.correct })),
    correct: options.findIndex(opt => opt === s.correct),
    coaching: `The order is: ${s.order.join(" → ")}.`
  };
}

const FITB_SENTENCES = [
  { sentence: "The _____ elephant was so big it couldn't fit through the gate.", options: ["tiny", "enormous", "colorful", "fast"], correct: "enormous", explanation: "Enormous means very big" },
  { sentence: "Safia felt a rumbling in her tummy. She was very _____.", options: ["sleepy", "hungry", "thirsty", "happy"], correct: "hungry", explanation: "A rumbling tummy means you want food" }
];

function generateFillBlank() {
  const b = FITB_SENTENCES[randomInt(0, FITB_SENTENCES.length - 1)];
  return {
    type: "fitb", subject: "fillInBlank",
    instruction: "🌸 Choose the best word.",
    sentence: b.sentence,
    options: shuffle([...b.options]),
    correct: b.correct,
    explanation: b.explanation,
    coaching: b.explanation
  };
}

const SPELLING_WORDS = [
  { word: "friend", hint: "Someone you like to play with", explanation: "F-R-I-E-N-D" },
  { word: "because", hint: "The reason why something happens", explanation: "B-E-C-A-U-S-E" }
];

function generateSpelling() {
  const w = SPELLING_WORDS[randomInt(0, SPELLING_WORDS.length - 1)];
  return { type: "spell", subject: "spelling", instruction: "🌸 Listen, then type.", word: w.word, hint: w.hint, explanation: w.explanation };
}

const READING_PASSAGES = [
  { passage: "Safia and her mom went to the beach. Safia built a big sandcastle. A wave came and washed away one wall. Safia felt sad but rebuilt it even bigger.", questions: [
    { text: "Where did Safia go?", options: ["Park", "Beach", "School"], correct: 1 },
    { text: "What happened to the sandcastle?", options: ["It got bigger", "A wave washed it", "She knocked it down"], correct: 1 }
  ] }
];

function generateReadingComprehension() {
  const p = READING_PASSAGES[0];
  return { type: "comp", subject: "readingComprehension", passage: p.passage, questions: JSON.parse(JSON.stringify(p.questions)), isListening: false };
}

const LISTENING_PASSAGES = [
  { audioText: "Leo and his dad went to the park. Leo played on the swings first. Then he climbed the slide. After that, he got a drink of water.", questions: [
    { text: "Where did Leo go?", options: ["Beach", "Park", "Library"], correct: 1 },
    { text: "What did Leo do FIRST?", options: ["Climbed slide", "Played on swings", "Got water"], correct: 1 }
  ] }
];

function generateListeningComprehension() {
  const p = LISTENING_PASSAGES[0];
  return { type: "comp", subject: "listeningComprehension", passage: p.audioText, questions: JSON.parse(JSON.stringify(p.questions)), isListening: true };
}

// =============== SECTION BUILDERS ===============
function buildMathSection(generator) {
  const qs = []; for (let i = 0; i < AppState.MATH_PROBLEM_COUNT; i++) qs.push(generator()); return qs;
}
function buildReadingSection(generator) {
  const qs = []; for (let i = 0; i < AppState.READING_PROBLEM_COUNT; i++) qs.push(generator()); return qs;
}
function buildMathReview() {
  return [
    generateAdditionCarry(), generateSubtractionBorrow(), generateMissingNumber(),
    generateMakeASum(), generateHowManyMore(), generateWordProblem(),
    generateTimeQuestion(), generateMoneyQuestion(), generateGraphQuestion(),
    generateLengthWeightQuestion(), generateSortingQuestion()
  ];
}
function buildReadingReview() {
  return [generateVocabulary(), generateSequencing(), generateFillBlank(), generateSpelling(), generateReadingComprehension(), generateListeningComprehension()];
}

// =============== UI RENDER FUNCTIONS ===============
let currentCompData = null;

function updateUI() {
  document.getElementById('correctCount').innerText = AppState.correctCount;
  document.getElementById('starCount').innerText = AppState.totalStars;
}

function showMenu() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  document.getElementById('menuScreen').style.display = 'block';
  document.getElementById('quizScreen').style.display = 'none';
  AppState.quizActive = false;
  AppState.compMode = false;
  currentCompData = null;
  updateUI();
}

function showQuiz() {
  document.getElementById('menuScreen').style.display = 'none';
  document.getElementById('quizScreen').style.display = 'block';
  updateUI();
}

function renderQuestion(q) {
  const container = document.getElementById('dynamicContent');
  const questionTextDiv = document.getElementById('questionText');
  const feedbackBox = document.getElementById('feedbackBox');
  const continueBtn = document.getElementById('continueBtn');
  
  feedbackBox.classList.remove('show', 'feedback-correct', 'feedback-wrong');
  continueBtn.style.display = 'none';
  
  if (q.instruction) {
    questionTextDiv.innerHTML = `<div class="instruction-text">${q.instruction}</div>${q.text || ''}`;
  } else {
    questionTextDiv.innerHTML = q.text || '';
  }
  
  if (q.type === 'math') {
    renderMathQuestion(q, container);
  } else if (q.type === 'reading') {
    renderReadingQuestion(q, container);
  } else if (q.type === 'fitb') {
    renderFitbQuestion(q, container);
  } else if (q.type === 'spell') {
    renderSpellQuestion(q, container);
  }
}

function renderMathQuestion(q, container) {
  container.innerHTML = `<div class="options-grid" id="optionsContainer"></div><button class="action-btn submit" id="submitAnswerBtn">🌸 Submit Answer</button>`;
  const optsContainer = document.getElementById('optionsContainer');
  let selectedIndex = null;
  
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIndex = idx;
    });
    optsContainer.appendChild(btn);
  });
  
  const submitBtn = document.getElementById('submitAnswerBtn');
  submitBtn.onclick = () => {
    if (selectedIndex === null) { alert("🌸 Choose an answer first!"); return; }
    const isCorrect = (selectedIndex === q.correct);
    showFeedback(isCorrect, q, q.options[q.correct], q.coaching);
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
    submitBtn.disabled = true;
  };
}

function renderReadingQuestion(q, container) {
  const readBtn = `<button class="audio-btn" onclick="speakNow('${q.story.replace(/'/g, "\\'")}', this)">🔊 Read Aloud</button>`;
  container.innerHTML = `<div class="passage-box">${readBtn}<div style="margin-top:10px;">${q.story}</div></div>
    <div class="instruction-text">${q.question}</div>
    <div class="picture-grid" id="pictureGrid"></div>
    <button class="action-btn submit" id="submitAnswerBtn">🌸 Submit Answer</button>`;
  
  const grid = document.getElementById('pictureGrid');
  let selectedIndex = null;
  
  q.pictures.forEach((pic, idx) => {
    const option = document.createElement('div');
    option.className = 'picture-option';
    option.innerHTML = `<span class="picture-emoji">${pic.emoji}</span><span class="picture-label">${pic.label}</span>`;
    option.addEventListener('click', () => {
      document.querySelectorAll('.picture-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      selectedIndex = idx;
    });
    grid.appendChild(option);
  });
  
  const submitBtn = document.getElementById('submitAnswerBtn');
  submitBtn.onclick = () => {
    if (selectedIndex === null) { alert("🌸 Choose a picture first!"); return; }
    const isCorrect = (selectedIndex === q.correct);
    showFeedback(isCorrect, q, q.pictures[q.correct].label, q.coaching);
    document.querySelectorAll('.picture-option').forEach(opt => opt.style.pointerEvents = 'none');
    submitBtn.disabled = true;
  };
}

function renderFitbQuestion(q, container) {
  const displaySentence = q.sentence.replace("_____", '<span class="fitb-blank" id="fitbBlank">______</span>');
  container.innerHTML = `<div class="fitb-sentence">${displaySentence}</div>
    <div class="fitb-options" id="fitbOptions"></div>
    <button class="action-btn submit" id="submitAnswerBtn">🌸 Submit Answer</button>`;
  
  const optsContainer = document.getElementById('fitbOptions');
  let selectedWord = null;
  
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'fitb-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fitb-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedWord = opt;
    });
    optsContainer.appendChild(btn);
  });
  
  const submitBtn = document.getElementById('submitAnswerBtn');
  submitBtn.onclick = () => {
    if (!selectedWord) { alert("🌸 Choose a word first!"); return; }
    const isCorrect = (selectedWord === q.correct);
    document.getElementById('fitbBlank').innerText = selectedWord;
    showFeedback(isCorrect, q, q.correct, q.coaching);
    document.querySelectorAll('.fitb-opt').forEach(btn => btn.disabled = true);
    submitBtn.disabled = true;
  };
}

function renderSpellQuestion(q, container) {
  container.innerHTML = `<button class="audio-btn" id="speakWordBtn">🔊 Click to hear the word</button>
    <input type="text" id="spellInput" class="option-btn" style="width:100%; margin:10px 0; text-align:center;" placeholder="Type the word here...">
    <button class="action-btn submit" id="submitAnswerBtn">🌸 Submit Answer</button>`;
  
  const speakBtn = document.getElementById('speakWordBtn');
  speakBtn.onclick = () => speakNow(q.word, speakBtn);
  
  const submitBtn = document.getElementById('submitAnswerBtn');
  submitBtn.onclick = () => {
    const answer = document.getElementById('spellInput').value.toLowerCase().trim();
    const isCorrect = (answer === q.word);
    showFeedback(isCorrect, q, q.word, q.explanation);
    document.getElementById('spellInput').disabled = true;
    submitBtn.disabled = true;
  };
}

function showFeedback(isCorrect, q, correctAnswer, coaching) {
  const feedbackBox = document.getElementById('feedbackBox');
  const feedbackMessage = document.getElementById('feedbackMessage');
  const coachingDiv = document.getElementById('coachingMessage');
  const continueBtn = document.getElementById('continueBtn');
  
  AppState.recordAnswer(q.subject, isCorrect);
  
  if (isCorrect) {
    AppState.correctCount++;
    AppState.totalStars++;
    AppState.currentStreak++;
    AppState.saveToStorage();
    AppState.updateStarDisplay();
    updateUI();
    launchConfetti();
    feedbackBox.classList.add('show', 'feedback-correct');
    feedbackMessage.innerHTML = `✅ Correct! 🌸 +1 star!`;
    coachingDiv.innerHTML = '';
  } else {
    AppState.currentStreak = 0;
    updateUI();
    feedbackBox.classList.add('show', 'feedback-wrong');
    feedbackMessage.innerHTML = `❌ The correct answer is: ${correctAnswer}.`;
    coachingDiv.innerHTML = `🧠 <strong>Coach's Corner:</strong> ${coaching}`;
  }
  
  continueBtn.style.display = 'block';
  continueBtn.onclick = () => {
    AppState.currentIndex++;
    const progressLabel = document.getElementById('progressLabel');
    if (AppState.currentIndex < AppState.currentQuestions.length) {
      renderQuestion(AppState.currentQuestions[AppState.currentIndex]);
      progressLabel.textContent = `Question ${AppState.currentIndex + 1} of ${AppState.currentQuestions.length}`;
      document.getElementById('quizProgress').style.width = ((AppState.currentIndex) / AppState.currentQuestions.length) * 100 + '%';
    } else {
      finishQuiz();
    }
    feedbackBox.classList.remove('show');
  };
}

function startComprehension(compData, isListening) {
  AppState.compMode = true;
  currentCompData = compData;
  AppState.compPassage = compData.passage;
  AppState.compQuestions = compData.questions;
  AppState.compIsListening = isListening;
  AppState.compIndex = 0;
  renderComprehensionIntro();
}

function renderComprehensionIntro() {
  const container = document.getElementById('dynamicContent');
  const questionTextDiv = document.getElementById('questionText');
  const feedbackBox = document.getElementById('feedbackBox');
  
  feedbackBox.classList.remove('show');
  
  questionTextDiv.innerHTML = AppState.compIsListening ? "🌸 Click the button to listen. You can listen as many times as you need." : "🌸 Read the story below, then answer the questions.";
  
  if (AppState.compIsListening) {
    container.innerHTML = `<button class="audio-btn" id="listenBtn">🔊 Click to hear the story</button>
      <button class="action-btn submit" id="startQuestionsBtn">🌸 Start Questions →</button>`;
    const listenBtn = document.getElementById('listenBtn');
    listenBtn.onclick = () => speakNow(AppState.compPassage, listenBtn);
  } else {
    container.innerHTML = `<div class="passage-box"><button class="audio-btn" onclick="speakNow('${AppState.compPassage.replace(/'/g, "\\'")}', this)">🔊 Read Aloud</button>
      <div style="margin-top:10px;">${AppState.compPassage}</div></div>
      <button class="action-btn submit" id="startQuestionsBtn">🌸 Start Questions →</button>`;
  }
  
  document.getElementById('startQuestionsBtn').onclick = () => {
    AppState.compIndex = 1;
    renderComprehensionQuestion();
  };
}

function renderComprehensionQuestion() {
  if (AppState.compIndex > AppState.compQuestions.length) {
    finishQuiz();
    return;
  }
  
  const q = AppState.compQuestions[AppState.compIndex - 1];
  const container = document.getElementById('dynamicContent');
  const questionTextDiv = document.getElementById('questionText');
  const feedbackBox = document.getElementById('feedbackBox');
  const progressLabel = document.getElementById('progressLabel');
  
  progressLabel.textContent = `Question ${AppState.compIndex} of ${AppState.compQuestions.length}`;
  questionTextDiv.innerHTML = q.text;
  feedbackBox.classList.remove('show');
  
  let html = '<div class="options-grid">';
  q.options.forEach((opt, idx) => {
    html += `<button class="option-btn" data-opt-index="${idx}">${opt}</button>`;
  });
  html += '</div>';
  
  const replayBtn = AppState.compIsListening ? `<button class="audio-btn" style="width:100%; margin-bottom:10px;" id="relistenBtn">🔊 Re-listen to story</button>` : '';
  container.innerHTML = `${replayBtn}${html}<button class="action-btn submit" id="submitAnswerBtn">🌸 Submit Answer</button>`;
  
  if (AppState.compIsListening) {
    const reListenBtn = document.getElementById('relistenBtn');
    if (reListenBtn) reListenBtn.onclick = () => speakNow(AppState.compPassage, reListenBtn);
  }
  
  let selectedIndex = null;
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIndex = parseInt(btn.dataset.optIndex);
    };
  });
  
  const submitBtn = document.getElementById('submitAnswerBtn');
  submitBtn.onclick = () => {
    if (selectedIndex === null) { alert("🌸 Choose an answer first!"); return; }
    const isCorrect = (selectedIndex === q.correct);
    
    AppState.recordAnswer(AppState.currentSubject, isCorrect);
    
    if (isCorrect) {
      AppState.correctCount++;
      AppState.totalStars++;
      AppState.currentStreak++;
      AppState.saveToStorage();
      AppState.updateStarDisplay();
      updateUI();
      launchConfetti();
      feedbackBox.classList.add('show', 'feedback-correct');
      document.getElementById('feedbackMessage').innerHTML = `✅ Correct! 🌸 +1 star!`;
      document.getElementById('coachingMessage').innerHTML = '';
    } else {
      AppState.currentStreak = 0;
      updateUI();
      feedbackBox.classList.add('show', 'feedback-wrong');
      document.getElementById('feedbackMessage').innerHTML = `❌ The correct answer is: ${q.options[q.correct]}.`;
      document.getElementById('coachingMessage').innerHTML = `🧠 Look back at the ${AppState.compIsListening ? 'audio' : 'story'} to find the answer.`;
    }
    
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
    submitBtn.disabled = true;
    if (AppState.compIsListening) document.getElementById('relistenBtn')?.setAttribute('disabled', 'disabled');
    
    const continueBtn = document.createElement('button');
    continueBtn.className = 'action-btn';
    continueBtn.textContent = '➡ Continue';
    continueBtn.style.width = '100%';
    continueBtn.style.marginTop = '10px';
    continueBtn.onclick = () => {
      AppState.compIndex++;
      if (AppState.compIndex <= AppState.compQuestions.length) {
        renderComprehensionQuestion();
      } else {
        finishQuiz();
      }
    };
    container.appendChild(continueBtn);
  };
}

function finishQuiz() {
  const total = AppState.currentQuestions.length;
  const percent = Math.round((AppState.correctCount / total) * 100);
  const message = percent >= 80 ? `🎉 Amazing! ${AppState.correctCount}/${total} correct!` :
                  percent >= 60 ? `🌸 Good job! ${AppState.correctCount}/${total} correct.` :
                  `🥊 Keep training! ${AppState.correctCount}/${total} correct.`;
  alert(message + `\n\n⭐ You earned ${AppState.correctCount} stars!\n🔄 Start again for new problems!`);
  showMenu();
  AppState.quizActive = false;
  AppState.compMode = false;
  currentCompData = null;
}

function startSubject(subject) {
  AppState.currentSubject = subject;
  AppState.correctCount = 0;
  AppState.currentStreak = 0;
  AppState.currentIndex = 0;
  AppState.compMode = false;
  currentCompData = null;
  updateUI();
  
  // Math sections (2 problems each)
  if (subject === 'additionCarry') AppState.currentQuestions = buildMathSection(generateAdditionCarry);
  else if (subject === 'subtractionBorrow') AppState.currentQuestions = buildMathSection(generateSubtractionBorrow);
  else if (subject === 'missingNumber') AppState.currentQuestions = buildMathSection(generateMissingNumber);
  else if (subject === 'makeASum') AppState.currentQuestions = buildMathSection(generateMakeASum);
  else if (subject === 'howManyMore') AppState.currentQuestions = buildMathSection(generateHowManyMore);
  else if (subject === 'wordProblems') AppState.currentQuestions = buildMathSection(generateWordProblem);
  // Measurement sections (2 problems each)
  else if (subject === 'time') AppState.currentQuestions = buildMathSection(generateTimeQuestion);
  else if (subject === 'money') AppState.currentQuestions = buildMathSection(generateMoneyQuestion);
  else if (subject === 'graphs') AppState.currentQuestions = buildMathSection(generateGraphQuestion);
  else if (subject === 'lengthWeight') AppState.currentQuestions = buildMathSection(generateLengthWeightQuestion);
  else if (subject === 'sorting') AppState.currentQuestions = buildMathSection(generateSortingQuestion);
  // Final review (11 problems)
  else if (subject === 'mathReview') AppState.currentQuestions = buildMathReview();
  // Reading sections (3 problems each)
  else if (subject === 'readingComprehension') { startComprehension(generateReadingComprehension(), false); showQuiz(); return; }
  else if (subject === 'listeningComprehension') { startComprehension(generateListeningComprehension(), true); showQuiz(); return; }
  else if (subject === 'vocabulary') AppState.currentQuestions = buildReadingSection(generateVocabulary);
  else if (subject === 'sequencing') AppState.currentQuestions = buildReadingSection(generateSequencing);
  else if (subject === 'fillInBlank') AppState.currentQuestions = buildReadingSection(generateFillBlank);
  else if (subject === 'spelling') AppState.currentQuestions = buildReadingSection(generateSpelling);
  else if (subject === 'readingReview') AppState.currentQuestions = buildReadingReview();
  
  if (AppState.currentQuestions.length) {
    showQuiz();
    renderQuestion(AppState.currentQuestions[0]);
    document.getElementById('progressLabel').textContent = `Question 1 of ${AppState.currentQuestions.length}`;
    document.getElementById('quizProgress').style.width = '0%';
    document.getElementById('skillBadge').innerHTML = subject.replace(/([A-Z])/g, ' $1').trim();
  }
}

function showStats() {
  const panel = document.getElementById('statsPanel');
  const grid = document.getElementById('statsGrid');
  if (panel.style.display === 'none' || panel.style.display === '') {
    grid.innerHTML = '';
    const weak = AppState.getWeakSubjects();
    if (weak.length > 0) {
      const weakDiv = document.createElement('div');
      weakDiv.innerHTML = '<strong>⚠️ Needs Practice:</strong><br>';
      weak.forEach(w => { weakDiv.innerHTML += `• ${w.subject}: ${w.percent}%<br>`; });
      grid.appendChild(weakDiv);
    }
    for (const [subject, stats] of Object.entries(AppState.subjectStats)) {
      const div = document.createElement('div');
      div.className = 'stat-item';
      div.innerHTML = `<div class="stat-name">${subject}</div><div class="stat-score">${stats.percent}%</div><div>(${stats.correct}/${stats.total})</div>`;
      grid.appendChild(div);
    }
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

// =============== EVENT LISTENERS ===============
document.getElementById('toggleSpeechBtn').onclick = () => {
  AppState.speechEnabled = !AppState.speechEnabled;
  document.getElementById('toggleSpeechBtn').innerHTML = AppState.speechEnabled ? '🔊 Speech ON' : '🔇 Speech OFF';
};
document.getElementById('toggleConfettiBtn').onclick = () => {
  AppState.confettiEnabled = !AppState.confettiEnabled;
  document.getElementById('toggleConfettiBtn').innerHTML = AppState.confettiEnabled ? '🎉 Confetti ON' : '🎊 Confetti OFF';
};
document.getElementById('showStatsBtn').onclick = showStats;
document.getElementById('closeStatsBtn')?.addEventListener('click', () => {
  document.getElementById('statsPanel').style.display = 'none';
});
document.getElementById('backToMenuBtn').onclick = () => {
  if (confirm("Exit quiz? Progress will be lost.")) showMenu();
};

document.querySelectorAll('.difficulty-btn').forEach(btn => {
  btn.onclick = () => {
    AppState.difficulty = btn.dataset.diff;
    AppState.updateDifficultyButtons();
  };
});

document.querySelectorAll('.skill-card').forEach(card => {
  card.onclick = () => startSubject(card.dataset.subject);
});

// =============== INITIALIZE ===============
AppState.init();
showMenu();
