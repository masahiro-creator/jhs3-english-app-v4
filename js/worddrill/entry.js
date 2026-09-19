// 単語ドリル (v3移植) を #tab-words 内にShadow DOMでマウントするモジュール。
// v2本体の見た目・不規則動詞・弱点克服・応援バナー等には一切影響しない自己完結モジュール。
import { WORDS } from "./data/words.js";
import {
  todayString,
  resetDailyCountIfNeeded,
  buildSession,
  requeueOnMiss,
  applyAnswer,
  getDueQuestions,
  getUnseenQuestions,
  countRemainingNewSlots,
  computeStageCounts,
  computeCategoryStats,
  computeMasteredCount,
  getWeakItems,
  shuffleArray,
} from "./lib/scheduler.js";
import { loadProgress, saveProgress, STORAGE_KEYS } from "./lib/storage.js";
import { loadHistory, saveHistory, recordAnswer } from "./lib/historyLog.js";
import { pickDistractors } from "./lib/distractors.js";
import { speak, loadPlaybackRate, savePlaybackRate } from "./lib/speech.js";
import { renderHomeScreen } from "./components/home.js";
import { renderVocabQuizScreen } from "./components/vocabQuiz.js";
import { renderStatsScreen } from "./components/stats.js";
import { renderDoneScreen } from "./components/done.js";
import { renderGraphScreen } from "./components/graph.js";
import { renderWordListScreen, filterWords, WORDLIST_PAGE_SIZE } from "./components/wordList.js";

const DECK = {
  items: WORDS,
  storageKey: STORAGE_KEYS.words,
  title: "単語ドリル",
  emoji: "📚",
  unitLabel: "語",
  newUnitLabel: "語",
  subtitle: `中1〜中3の単語 ${WORDS.length}語 ／ 忘れかけた頃にまた出てくる仕組みだよ`,
};

function cheer() {
  try {
    window.CheeringEngine && window.CheeringEngine.triggerConfetti();
  } catch {
    // 演出が失敗しても学習は続けられるようにする
  }
}

function bumpStreak() {
  try {
    window.StorageEngine && window.StorageEngine.updateStreak();
  } catch {
    // ストリーク更新が失敗しても学習は続けられるようにする
  }
}

export function mountWordDrill(hostElement) {
  const shadow = hostElement.attachShadow({ mode: "open" });
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "css/worddrill.css";
  shadow.appendChild(link);
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  shadow.appendChild(wrap);

  let progress = loadProgress(DECK.storageKey);
  let history = loadHistory();
  let playbackRate = loadPlaybackRate();

  let screen = "home";
  let session = [];
  let idx = 0;
  let picked = null;
  let runStats = { sure: 0, guess: 0, miss: 0 };
  let currentChoices = [];
  let currentCorrectIndex = -1;
  let isWeakSession = false;
  let wordListGrade = "all";
  let wordListQuery = "";
  let wordListVisibleCount = WORDLIST_PAGE_SIZE;
  let wordListObserver = null;

  function dueFresh() {
    const today = todayString();
    return {
      dueCount: getDueQuestions(DECK.items, progress, today).length,
      freshCount: Math.min(getUnseenQuestions(DECK.items, progress).length, countRemainingNewSlots(progress)),
    };
  }

  function prepareVocabChoices() {
    const word = session[idx];
    const distractors = pickDistractors(WORDS, word, 3);
    const choices = shuffleArray([word.meaning, ...distractors.map((d) => d.meaning)]);
    currentChoices = choices;
    currentCorrectIndex = choices.indexOf(word.meaning);
  }

  function render() {
    if (screen === "home") {
      const { dueCount, freshCount } = dueFresh();
      wrap.innerHTML = renderHomeScreen({
        dueCount,
        freshCount,
        stageCounts: computeStageCounts(progress),
        learnedCount: Object.keys(progress.cards).length,
        newPerDay: progress.newPerDay,
        totalQuestions: DECK.items.length,
        deckTitle: DECK.title,
        deckEmoji: DECK.emoji,
        unitLabel: DECK.unitLabel,
        newUnitLabel: DECK.newUnitLabel,
        subtitle: DECK.subtitle,
        weakCount: getWeakItems(DECK.items, progress).length,
        hasWordList: true,
        playbackRate,
      });
    } else if (screen === "quiz") {
      const word = session[idx];
      wrap.innerHTML = renderVocabQuizScreen({
        word,
        index: idx,
        total: session.length,
        picked,
        choices: currentChoices,
        correctIndex: currentCorrectIndex,
      });
      if (picked !== null) {
        hostElement.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    } else if (screen === "stats") {
      wrap.innerHTML = renderStatsScreen({ stats: computeCategoryStats(DECK.items, progress) });
    } else if (screen === "done") {
      wrap.innerHTML = renderDoneScreen({
        sureCount: runStats.sure,
        guessCount: runStats.guess,
        missCount: runStats.miss,
      });
    } else if (screen === "graph") {
      wrap.innerHTML = renderGraphScreen({ history });
    } else if (screen === "wordlist") {
      wrap.innerHTML = renderWordListScreen({
        words: WORDS,
        progress,
        gradeFilter: wordListGrade,
        query: wordListQuery,
        visibleCount: wordListVisibleCount,
      });
      const searchInput = wrap.querySelector("#wordlist-search");
      if (searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      }
      if (wordListObserver) wordListObserver.disconnect();
      const sentinel = wrap.querySelector("#wordlist-sentinel");
      if (sentinel) {
        wordListObserver = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) loadMoreWordList();
        });
        wordListObserver.observe(sentinel);
      }
    }
  }

  function loadMoreWordList() {
    const total = filterWords(WORDS, wordListGrade, wordListQuery).length;
    if (wordListVisibleCount >= total) return;
    wordListVisibleCount = Math.min(wordListVisibleCount + WORDLIST_PAGE_SIZE, total);
    render();
  }

  function goHome() {
    screen = "home";
    render();
  }

  function goGraph() {
    screen = "graph";
    render();
  }

  function goWordList() {
    screen = "wordlist";
    wordListVisibleCount = WORDLIST_PAGE_SIZE;
    render();
  }

  function setWordListGrade(grade) {
    wordListGrade = grade;
    wordListVisibleCount = WORDLIST_PAGE_SIZE;
    render();
  }

  function beginQuiz(items) {
    if (items.length === 0) {
      screen = "home";
      render();
      return;
    }
    session = items;
    idx = 0;
    picked = null;
    runStats = { sure: 0, guess: 0, miss: 0 };
    prepareVocabChoices();
    screen = "quiz";
    render();
  }

  function startSession() {
    const today = todayString();
    progress = resetDailyCountIfNeeded(progress, today);
    isWeakSession = false;
    beginQuiz(buildSession(DECK.items, progress, today));
  }

  function startWeakSession() {
    isWeakSession = true;
    beginQuiz(shuffleArray(getWeakItems(DECK.items, progress)));
  }

  function pickChoice(index) {
    if (picked !== null) return;
    picked = index;
    render();
    speak(session[idx].word);
  }

  function quitQuiz() {
    session = [];
    idx = 0;
    picked = null;
    screen = "home";
    render();
  }

  function gradeAnswer(outcome) {
    const today = todayString();
    const item = session[idx];
    progress = applyAnswer(progress, item.id, outcome, today);
    saveProgress(DECK.storageKey, progress);

    history = recordAnswer(history, today, computeMasteredCount(progress));
    saveHistory(history);
    bumpStreak();
    if (outcome !== "miss") cheer();

    runStats[outcome]++;
    if (!isWeakSession) session = requeueOnMiss(session, idx, outcome);

    idx++;
    picked = null;
    if (idx >= session.length) {
      screen = "done";
    } else {
      prepareVocabChoices();
    }
    render();
  }

  function setNewPerDay(value) {
    progress = { ...progress, newPerDay: value };
    saveProgress(DECK.storageKey, progress);
    render();
  }

  function setRate(rate) {
    playbackRate = rate;
    savePlaybackRate(playbackRate);
    render();
  }

  shadow.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "start") startSession();
    else if (action === "start-weak") startWeakSession();
    else if (action === "set-new-per-day") setNewPerDay(Number(target.dataset.value));
    else if (action === "set-rate") setRate(Number(target.dataset.rate));
    else if (action === "quit-quiz") quitQuiz();
    else if (action === "go-stats") {
      screen = "stats";
      render();
    } else if (action === "go-home") goHome();
    else if (action === "go-graph") goGraph();
    else if (action === "go-wordlist") goWordList();
    else if (action === "set-wordlist-grade") setWordListGrade(target.dataset.grade);
    else if (action === "pick") pickChoice(Number(target.dataset.index));
    else if (action === "grade") gradeAnswer(target.dataset.outcome);
    else if (action === "speak") speak(target.dataset.text);
  });

  shadow.addEventListener("input", (event) => {
    if (event.target.id === "wordlist-search") {
      wordListQuery = event.target.value;
      wordListVisibleCount = WORDLIST_PAGE_SIZE;
      render();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (screen !== "quiz" || picked !== null) return;
    if (/^[1-4]$/.test(event.key)) {
      pickChoice(Number(event.key) - 1);
    }
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("tab-words");
  if (host) mountWordDrill(host);
});
