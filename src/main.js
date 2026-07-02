import { createGame, currentPlayer, drawForCurrentPlayer, playCards } from "./game.js";
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
};

let state;
let selectedOrder = [];
let ui;

function showScreen(screen) {
  appState.screen = screen;
  ui.renderApp(appState, state, selectedOrder);
}

function startGame() {
  state = createGame(appState.localRules);
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

function draw() {
  drawForCurrentPlayer(state);
  selectedOrder = [];
  renderGame();
}

function setRule(name, value) {
  appState.localRules = { ...appState.localRules, [name]: value };
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
  applyPreset,
  showScreen,
  startGame,
});

showScreen("title");
