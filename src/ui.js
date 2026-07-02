import { colorName, detailLabelFor, labelFor } from "./deck.js";
import { canPlayCard, canPlayStack, currentPlayer, topDiscard } from "./game.js";

const ruleLabels = {
  sameNumberStack: "同じ数字まとめ出し",
  drawTwoStack: "+2重ね",
  drawFourStack: "色変え+4重ね",
  drawTwoToDrawFourStack: "+2に色変え+4",
};

export function createUI(handlers) {
  const els = {
    screens: {
      title: document.querySelector("#title-screen"),
      settings: document.querySelector("#settings-screen"),
      howToPlay: document.querySelector("#howto-screen"),
      game: document.querySelector("#game-screen"),
      result: document.querySelector("#result-screen"),
    },
    startSolo: document.querySelector("#start-solo"),
    openSettings: document.querySelector("#open-settings"),
    openHowTo: document.querySelector("#open-howto"),
    settingsBack: document.querySelector("#settings-back"),
    howToBack: document.querySelector("#howto-back"),
    presetStandard: document.querySelector("#preset-standard"),
    presetFamily: document.querySelector("#preset-family"),
    presetWild: document.querySelector("#preset-wild"),
    backTitle: document.querySelector("#back-title"),
    resultRestart: document.querySelector("#result-restart"),
    resultTitle: document.querySelector("#result-title"),
    resultMessage: document.querySelector("#result-message"),
    cpuCount: document.querySelector("#cpu-count"),
    cpuHand: document.querySelector("#cpu-hand"),
    deckCount: document.querySelector("#deck-count"),
    discardCard: document.querySelector("#discard-card"),
    currentStatus: document.querySelector("#current-status"),
    currentColor: document.querySelector("#current-color"),
    turnLabel: document.querySelector("#turn-label"),
    penaltyLabel: document.querySelector("#penalty-label"),
    penaltyBanner: document.querySelector("#penalty-banner"),
    penaltyDetail: document.querySelector("#penalty-detail"),
    penaltyHelp: document.querySelector("#penalty-help"),
    message: document.querySelector("#message"),
    actionLog: document.querySelector("#action-log"),
    activeRules: document.querySelector("#active-rules"),
    playerCount: document.querySelector("#player-count"),
    playerHand: document.querySelector("#player-hand"),
    drawCard: document.querySelector("#draw-card"),
    drawLabel: document.querySelector("#draw-label"),
    playStack: document.querySelector("#play-stack"),
    restart: document.querySelector("#restart"),
    colorDialog: document.querySelector("#color-dialog"),
    rules: {
      sameNumberStack: document.querySelector("#rule-same-number"),
      drawTwoStack: document.querySelector("#rule-draw-two"),
      drawFourStack: document.querySelector("#rule-draw-four"),
      drawTwoToDrawFourStack: document.querySelector("#rule-two-to-four"),
    },
  };

  els.startSolo.addEventListener("click", handlers.startGame);
  els.openSettings.addEventListener("click", () => handlers.showScreen("settings"));
  els.openHowTo.addEventListener("click", () => handlers.showScreen("howToPlay"));
  els.settingsBack.addEventListener("click", () => handlers.showScreen("title"));
  els.howToBack.addEventListener("click", () => handlers.showScreen("title"));
  els.backTitle.addEventListener("click", () => handlers.showScreen("title"));
  els.restart.addEventListener("click", handlers.restart);
  els.resultRestart.addEventListener("click", handlers.restart);
  els.resultTitle.addEventListener("click", () => handlers.showScreen("title"));
  els.presetStandard.addEventListener("click", () => handlers.applyPreset("standard"));
  els.presetFamily.addEventListener("click", () => handlers.applyPreset("family"));
  els.presetWild.addEventListener("click", () => handlers.applyPreset("wild"));
  els.drawCard.addEventListener("click", handlers.draw);
  els.playStack.addEventListener("click", handlers.playSelected);

  Object.entries(els.rules).forEach(([name, input]) => {
    input.addEventListener("change", () => handlers.setRule(name, input.checked));
  });

  return {
    renderApp(appState, gameState, selectedOrder = []) {
      renderScreens(els, appState.screen);
      renderRuleInputs(els, appState.localRules);
      if (gameState) renderGame(els, gameState, selectedOrder, handlers);
    },

    askColor() {
      return new Promise((resolve) => {
        const onClose = () => {
          els.colorDialog.removeEventListener("close", onClose);
          resolve(els.colorDialog.returnValue || "red");
        };
        els.colorDialog.addEventListener("close", onClose);
        els.colorDialog.showModal();
      });
    },
  };
}

function renderScreens(els, activeScreen) {
  Object.entries(els.screens).forEach(([name, screen]) => {
    screen.hidden = name !== activeScreen;
  });
}

function renderRuleInputs(els, rules) {
  Object.entries(els.rules).forEach(([name, input]) => {
    input.checked = Boolean(rules[name]);
  });
}

function renderGame(els, state, selectedOrder, handlers) {
  const player = state.players[0];
  const cpu = state.players[1];
  const selectedSet = new Set(selectedOrder);
  const isPlayerTurn = currentPlayer(state) === player && !state.isGameOver;
  const selected = selectedCards(player.hand, selectedOrder);

  els.cpuCount.textContent = `${cpu.hand.length}枚`;
  els.cpuHand.innerHTML = cpu.hand.map(() => `<div class="card back" aria-hidden="true"></div>`).join("");
  els.deckCount.textContent = state.deck.length;
  renderCard(els.discardCard, topDiscard(state), true, state.currentColor);
  els.currentStatus.textContent = state.isGameOver
    ? (state.winner === "CPU" ? "CPUの勝ち" : "あなたの勝ち")
    : `${colorName(state.currentColor)} / ${detailLabelFor(topDiscard(state))}`;
  els.currentColor.textContent = colorName(state.currentColor);
  els.turnLabel.textContent = state.isGameOver ? "終了" : currentPlayer(state).name;
  els.penaltyLabel.textContent = state.drawPenaltyCount > 0 ? `+${state.drawPenaltyCount}枚` : "なし";
  els.message.textContent = state.message;
  els.playerCount.textContent = `${player.hand.length}枚`;
  els.drawCard.disabled = !isPlayerTurn;
  els.drawLabel.textContent = state.drawPenaltyCount > 0 ? `${state.drawPenaltyCount}枚引く` : "1枚引く";
  els.playStack.disabled = !isPlayerTurn || !canPlayStack(state, selected);
  els.resultMessage.textContent = state.winner === "CPU" ? "CPUの勝ちです。" : "あなたの勝ちです。";

  renderPenalty(els, state);
  renderRules(els, state.localRules);
  renderLog(els, state.actionLog || []);
  renderHand(els, state, player, selectedSet, selectedOrder, isPlayerTurn, handlers);
}

function renderPenalty(els, state) {
  const active = state.drawPenaltyCount > 0;
  els.penaltyBanner.hidden = !active;
  els.penaltyDetail.textContent = `現在 +${state.drawPenaltyCount} 枚`;
  els.penaltyHelp.textContent = `出せるカードがなければ${state.drawPenaltyCount}枚引きます`;
}

function renderRules(els, rules) {
  const active = Object.entries(rules)
    .filter(([, enabled]) => enabled)
    .map(([name]) => ruleLabels[name]);
  els.activeRules.textContent = active.length ? `ON: ${active.join(" / ")}` : "ローカルルール: なし";
}

function renderLog(els, logs) {
  els.actionLog.innerHTML = logs.map((log) => `<li>${escapeHtml(log)}</li>`).join("");
}

function renderHand(els, state, player, selectedSet, selectedOrder, isPlayerTurn, handlers) {
  els.playerHand.innerHTML = "";
  const selected = selectedCards(player.hand, selectedOrder);
  player.hand.forEach((card) => {
    const playable = canPlayCard(state, card);
    const selectable = isSelectableCard(state, card, selected);
    const isSelected = selectedSet.has(card.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = cardClasses(card, isSelected, selectable, state.currentColor);
    button.disabled = !isPlayerTurn || !selectable;
    button.innerHTML = cardMarkup(card, selectionIndex(card, selectedOrder));
    button.title = selectable ? "選べるカード" : "今は出せないカード";
    button.addEventListener("click", () => handlers.toggleCard(card));
    els.playerHand.append(button);
  });
}

function isSelectableCard(state, card, selected) {
  if (canPlayCard(state, card)) return true;
  const first = selected[0];
  return (
    state.localRules.sameNumberStack &&
    state.drawPenaltyCount === 0 &&
    first?.type === "number" &&
    card.type === "number" &&
    card.value === first.value
  );
}

function selectedCards(hand, selectedOrder) {
  return selectedOrder.map((id) => hand.find((card) => card.id === id)).filter(Boolean);
}

function renderCard(element, card, large = false, activeColor = null) {
  element.className = cardClasses(card, false, true, activeColor, large);
  element.innerHTML = card ? cardMarkup(card) : "開始";
}

function cardClasses(card, selected, playable, activeColor, large = false) {
  const color = card?.type === "wild" ? activeColor || "wild" : card?.color || "neutral";
  return ["card", color, large ? "large" : "", selected ? "selected" : "", playable ? "playable" : "muted"]
    .filter(Boolean)
    .join(" ");
}

function cardMarkup(card, order = null) {
  if (!card) return "";
  const sub = card.type === "wild" ? detailLabelFor(card) : colorName(card.color);
  const badge = order ? `<span class="select-badge">${order}</span>` : "";
  return `${badge}<span class="card-sub">${sub}</span><strong>${labelFor(card)}</strong><small>${detailLabelFor(card)}</small>`;
}

function selectionIndex(card, selectedOrder) {
  const index = selectedOrder.indexOf(card.id);
  return index >= 0 ? index + 1 : null;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}
