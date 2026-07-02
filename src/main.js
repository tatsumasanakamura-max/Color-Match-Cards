import { createGame, currentPlayer, playCards, updateRules } from "./game.js";
import { takeCpuTurn } from "./cpu.js";
import { createUI } from "./ui.js";

let state;
let selectedIds = new Set();
let ui;

function startGame() {
  const rules = ui?.getRules() ?? {};
  state = createGame(rules);
  selectedIds = new Set();
  ui?.setRules(state.localRules);
  render();
}

function render() {
  ui.render(state, selectedIds);
  if (!state.isGameOver && currentPlayer(state).isCpu) {
    window.setTimeout(() => {
      takeCpuTurn(state);
      selectedIds = new Set();
      render();
    }, 650);
  }
}

function toggleCard(card) {
  if (selectedIds.has(card.id)) {
    selectedIds.delete(card.id);
  } else {
    selectedIds.add(card.id);
  }
  render();
}

async function playSelected() {
  const cards = state.players[0].hand.filter((card) => selectedIds.has(card.id));
  const needsColor = cards[cards.length - 1]?.type === "wild";
  const color = needsColor ? await ui.askColor() : null;
  const result = playCards(state, cards, color);
  if (!result.ok) state.message = result.message;
  selectedIds = new Set();
  render();
}

function draw() {
  import("./game.js").then(({ drawForCurrentPlayer }) => {
    drawForCurrentPlayer(state);
    selectedIds = new Set();
    render();
  });
}

function rulesChanged(name, value) {
  updateRules(state, { [name]: value });
  render();
}

ui = createUI({ draw, playSelected, restart: startGame, toggleCard, rulesChanged });
startGame();
