import { canPlayCard, createGame, currentPlayer, drawForCurrentPlayer, playCards, startNextRound } from "./game.js";
import { takeCpuTurn } from "./cpu.js";
import { createUI } from "./ui.js";

const rulePresets = {
  standard: {
    sameNumberStack: false,
    drawTwoStack: false,
    drawFourStack: false,
    drawTwoToDrawFourStack: false,
  },
  family: {
    sameNumberStack: true,
    drawTwoStack: true,
    drawFourStack: true,
    drawTwoToDrawFourStack: false,
  },
  wild: {
    sameNumberStack: true,
    drawTwoStack: true,
    drawFourStack: true,
    drawTwoToDrawFourStack: true,
  },
};

const appState = {
  screen: "title",
  selectedMode: "soloCpu",
  localRules: { ...rulePresets.standard },
  matchSettings: {
    totalRounds: 1,
    doubleFinalOddRounds: false,
  },
};

let state;
let selectedOrder = [];
let ui;

function showScreen(screen) {
  appState.screen = screen;
  ui.renderApp(appState, state, selectedOrder);
}

function startGame() {
  state = createGame(appState.localRules, appState.matchSettings);
  selectedOrder = [];
  showScreen("game");
  renderGame();
}

function nextRound() {
  startNextRound(state);
  selectedOrder = [];
  showScreen("game");
  renderGame();
}

function renderGame() {
  ui.renderApp(appState, state, selectedOrder);

  if (appState.screen === "game" && !state?.isGameOver && currentPlayer(state).isCpu) {
    window.setTimeout(() => {
      if (appState.screen !== "game" || state?.isGameOver || !currentPlayer(state).isCpu) return;
      takeCpuTurn(state);
      selectedOrder = [];
      renderGame();
    }, 650);
  }

  if (state?.isGameOver && appState.screen === "game") {
    window.setTimeout(() => showScreen("result"), 500);
  }
}

function toggleCard(card) {
  if (selectedOrder.includes(card.id)) {
    selectedOrder = selectedOrder.filter((id) => id !== card.id);
  } else {
    selectedOrder = [...selectedOrder, card.id];
  }
  renderGame();
}

function cardUnavailable() {
  state.message = "このカードはまだ出せません。";
  renderGame();
}

async function playSelected() {
  const cards = selectedOrder
    .map((id) => state.players[0].hand.find((card) => card.id === id))
    .filter(Boolean);
  const needsColor = cards[cards.length - 1]?.type === "wild";
  const color = needsColor ? await ui.askColor() : null;
  const result = playCards(state, cards, color);

  if (!result.ok) state.message = result.message;
  selectedOrder = [];
  renderGame();
}

async function flickCard(card) {
  const player = state.players[0];
  const isPlayerTurn = currentPlayer(state) === player && !state.isGameOver;

  if (!isPlayerTurn) {
    state.message = "今は操作できません。";
    renderGame();
    return;
  }

  if (selectedOrder.length > 1 && selectedOrder.includes(card.id)) {
    await playSelected();
    return;
  }

  if (!canPlayCard(state, card)) {
    state.message = "このカードはまだ出せません。";
    renderGame();
    return;
  }

  const color = card.type === "wild" ? await ui.askColor() : null;
  const result = playCards(state, [card], color);

  if (!result.ok) state.message = result.message;
  selectedOrder = [];
  renderGame();
}

function draw() {
  drawForCurrentPlayer(state);
  selectedOrder = [];
  renderGame();
}

function setRule(name, value) {
  appState.localRules = { ...appState.localRules, [name]: value };
  ui.renderApp(appState, state, selectedOrder);
}

function setMatchSetting(name, value) {
  appState.matchSettings = { ...appState.matchSettings, [name]: value };
  ui.renderApp(appState, state, selectedOrder);
}

function applyPreset(name) {
  appState.localRules = { ...rulePresets[name] };
  ui.renderApp(appState, state, selectedOrder);
}

ui = createUI({
  draw,
  playSelected,
  restart: startGame,
  toggleCard,
  setRule,
  setMatchSetting,
  applyPreset,
  showScreen,
  startGame,
  nextRound,
  flickCard,
  cardUnavailable,
});

showScreen("title");
