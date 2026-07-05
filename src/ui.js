import { colorName, detailLabelFor, labelFor } from "./deck.js";
import { canPlayCard, canPlayStack, currentPlayer, finalMatchWinner, topDiscard } from "./game.js";

const FLICK_MIN_DISTANCE = 40;
const FLICK_MAX_TIME = 500;
const FLICK_MAX_SIDE_DISTANCE = 80;

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
    resultNextRound: document.querySelector("#result-next-round"),
    resultHeading: document.querySelector("#result-heading"),
    resultMessage: document.querySelector("#result-message"),
    matchScorebar: document.querySelector("#match-scorebar"),
    modeLabel: document.querySelector("#mode-label"),
    cpuCount: document.querySelector("#cpu-count"),
    cpuHand: document.querySelector("#cpu-hand"),
    deckCount: document.querySelector("#deck-count"),
    discardCard: document.querySelector("#discard-card"),
    currentStatus: document.querySelector("#current-status"),
    currentColor: document.querySelector("#current-color"),
    turnLabel: document.querySelector("#turn-label"),
    penaltyLabel: document.querySelector("#penalty-label"),
    message: document.querySelector("#message"),
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
      cannotFinishWithHighScoreCard: document.querySelector("#rule-high-score-finish"),
    },
    matchSettings: {
      playerCount: [...document.querySelectorAll("input[name='player-count']")],
      totalRounds: [...document.querySelectorAll("input[name='total-rounds']")],
      doubleFinalOddRounds: document.querySelector("#double-final-odd-rounds"),
    },
  };

  if (!els.resultNextRound) {
    els.resultNextRound = document.createElement("button");
    els.resultNextRound.id = "result-next-round";
    els.resultNextRound.className = "primary-action";
    els.resultNextRound.type = "button";
    els.resultNextRound.textContent = "次の回戦へ";
    els.resultNextRound.hidden = true;
    els.resultRestart.parentElement.prepend(els.resultNextRound);
  }

  els.startSolo.addEventListener("click", handlers.startGame);
  els.openSettings.addEventListener("click", () => handlers.showScreen("settings"));
  els.openHowTo.addEventListener("click", () => handlers.showScreen("howToPlay"));
  els.settingsBack.addEventListener("click", () => handlers.showScreen("title"));
  els.howToBack.addEventListener("click", () => handlers.showScreen("title"));
  els.backTitle.addEventListener("click", () => handlers.showScreen("title"));
  els.restart.addEventListener("click", handlers.restart);
  els.resultRestart.addEventListener("click", handlers.restart);
  els.resultTitle.addEventListener("click", () => handlers.showScreen("title"));
  els.resultNextRound.addEventListener("click", handlers.nextRound);
  els.presetStandard.addEventListener("click", () => handlers.applyPreset("standard"));
  els.presetFamily.addEventListener("click", () => handlers.applyPreset("family"));
  els.presetWild.addEventListener("click", () => handlers.applyPreset("wild"));
  els.drawCard.addEventListener("click", handlers.draw);
  els.playStack.addEventListener("click", handlers.playSelected);

  Object.entries(els.rules).forEach(([name, input]) => {
    input.addEventListener("change", () => handlers.setRule(name, input.checked));
  });
  els.matchSettings.totalRounds.forEach((input) => {
    input.addEventListener("change", () => handlers.setMatchSetting("totalRounds", Number(input.value)));
  });
  els.matchSettings.playerCount.forEach((input) => {
    input.addEventListener("change", () => handlers.setMatchSetting("playerCount", Number(input.value)));
  });
  els.matchSettings.doubleFinalOddRounds.addEventListener("change", () => {
    handlers.setMatchSetting("doubleFinalOddRounds", els.matchSettings.doubleFinalOddRounds.checked);
  });

  return {
    renderApp(appState, gameState, selectedOrder = []) {
      renderScreens(els, appState.screen);
      renderRuleInputs(els, appState.localRules);
      renderMatchSettingInputs(els, appState.matchSettings);
      if (gameState) renderGame(els, gameState, selectedOrder, handlers);
      if (gameState) renderResult(els, gameState);
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

function renderMatchSettingInputs(els, matchSettings) {
  els.matchSettings.playerCount.forEach((input) => {
    input.checked = Number(input.value) === Number(matchSettings.playerCount || 2);
  });
  els.matchSettings.totalRounds.forEach((input) => {
    input.checked = Number(input.value) === Number(matchSettings.totalRounds);
  });
  els.matchSettings.doubleFinalOddRounds.checked = Boolean(matchSettings.doubleFinalOddRounds);
}

function renderGame(els, state, selectedOrder, handlers) {
  const player = state.players[0];
  const cpus = state.players.slice(1);
  const selectedSet = new Set(selectedOrder);
  const isPlayerTurn = currentPlayer(state) === player && !state.isGameOver;
  const selected = selectedCards(player.hand, selectedOrder);

  els.modeLabel.textContent = `${state.players.length}人対戦`;
  els.cpuCount.textContent = cpus.map((cpu) => `${cpu.name}: ${cpu.hand.length}枚`).join(" / ");
  els.cpuHand.innerHTML = cpuBackMarkup(cpus, currentPlayer(state));
  els.matchScorebar.textContent = `${state.matchState.currentRound}/${state.matchState.totalRounds}回戦　${scoreSummary(state)}`;
  els.deckCount.textContent = state.deck.length;
  renderCard(els.discardCard, topDiscard(state), true, state.currentColor);
  els.currentStatus.textContent = state.isGameOver
    ? `${state.winner}の勝ち`
    : `${colorName(state.currentColor)} / ${detailLabelFor(topDiscard(state))}`;
  els.currentColor.textContent = colorName(state.currentColor);
  els.turnLabel.textContent = state.isGameOver ? "終了" : currentPlayer(state).name;
  els.penaltyLabel.textContent = state.drawPenaltyCount > 0 ? `+${state.drawPenaltyCount}枚` : "なし";
  els.message.textContent = messageText(state);
  els.playerCount.textContent = `${player.hand.length}枚`;
  els.drawCard.disabled = !isPlayerTurn;
  els.drawLabel.textContent = state.drawPenaltyCount > 0 ? `${state.drawPenaltyCount}枚引く` : "1枚引く";
  els.playStack.disabled = !isPlayerTurn || !canPlayStack(state, selected);
  els.resultMessage.textContent = `${state.winner}の勝ちです。`;

  renderHand(els, state, player, selectedSet, selectedOrder, isPlayerTurn, handlers);
}

function renderResult(els, state) {
  if (!state.isGameOver) return;

  const matchState = state.matchState;
  const latest = matchState.roundResults.at(-1);
  if (!latest) return;

  els.resultHeading.textContent = matchState.isMatchOver ? `${matchState.totalRounds}回戦終了！` : `${latest.round}回戦終了`;
  els.resultNextRound.hidden = matchState.isMatchOver;
  els.resultRestart.hidden = !matchState.isMatchOver;
  els.resultTitle.hidden = false;

  if (matchState.isMatchOver) {
    const winnerIds = finalMatchWinner(matchState);
    const winnerNames = winnerIds.map((id) => playerNameById(state, id));
    const winnerText =
      winnerNames.length > 1 ? `同点優勝: ${winnerNames.join("、")}` : `合計得点が少ない${winnerNames[0]}の勝ち！`;
    els.resultMessage.innerHTML = `
      <span class="result-block-title">最終得点</span>
      ${state.players.map((player) => `<span>${player.name}: ${matchState.scores[player.id]}点</span>`).join("")}
      <strong>${winnerText}</strong>
    `;
    return;
  }

  els.resultMessage.innerHTML = `
    ${latest.multiplier > 1 ? `<strong>この回は点数2倍！</strong>` : ""}
    <span class="result-block-title">今回の点数</span>
    ${latest.players.map((result) => `<span>${scoreLine(result.name, result.baseScore, result.score, latest.multiplier)}</span>`).join("")}
    <span class="result-block-title">合計</span>
    ${latest.players.map((result) => `<span>${result.name}: ${result.total}点</span>`).join("")}
  `;
}

function scoreLine(label, baseScore, score, multiplier) {
  if (multiplier > 1) return `${label}: ${baseScore}点 x ${multiplier} = ${score}点`;
  return `${label}: ${score}点`;
}

function messageText(state) {
  if (state.message) return state.message;
  return state.actionLog?.[0] || "";
}

function scoreSummary(state) {
  return state.players.map((player) => `${player.name} ${state.matchState.scores[player.id] || 0}点`).join(" / ");
}

function playerNameById(state, id) {
  return state.players.find((player) => player.id === id)?.name || id;
}

function cpuBackMarkup(cpus, current) {
  if (cpus.length !== 1) {
    return cpus
      .map((cpu) => `<span class="cpu-extra ${current === cpu ? "active" : ""}">${cpu.name} ${cpu.hand.length}枚</span>`)
      .join("");
  }
  const count = cpus[0]?.hand.length || 0;
  const visible = Math.min(count, 5);
  const backs = Array.from({ length: visible }, () => `<div class="card back cpu-card-back" aria-hidden="true"></div>`);
  if (count > visible) backs.push(`<span class="cpu-extra">+${count - visible}</span>`);
  return backs.join("");
}

function renderHand(els, state, player, selectedSet, selectedOrder, isPlayerTurn, handlers) {
  els.playerHand.innerHTML = "";
  els.playerHand.dataset.count = player.hand.length;
  const selected = selectedCards(player.hand, selectedOrder);
  player.hand.forEach((card) => {
    const selectable = isSelectableCard(state, card, selected);
    const isSelected = selectedSet.has(card.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${cardClasses(card, isSelected, selectable, state.currentColor)} player-card`;
    button.disabled = !isPlayerTurn;
    button.innerHTML = cardMarkup(card, selectionIndex(card, selectedOrder));
    button.title = selectable ? "選べるカード" : "今は出せないカード";
    addCardControls(button, card, selectable, handlers);
    els.playerHand.append(button);
  });
}

function addCardControls(button, card, selectable, handlers) {
  let pointerStart = null;
  let skipNextClick = false;

  button.addEventListener("pointerdown", (event) => {
    pointerStart = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      pointerId: event.pointerId,
    };
    button.classList.add("dragging");
    button.setPointerCapture?.(event.pointerId);
  });

  button.addEventListener("pointercancel", () => {
    pointerStart = null;
    button.classList.remove("dragging");
  });

  button.addEventListener("pointerup", (event) => {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;

    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    const dt = Date.now() - pointerStart.time;
    const isUpFlick = dy < -FLICK_MIN_DISTANCE && Math.abs(dx) < FLICK_MAX_SIDE_DISTANCE && dt < FLICK_MAX_TIME;

    pointerStart = null;
    button.classList.remove("dragging");

    if (isUpFlick) {
      skipNextClick = true;
      event.preventDefault();
      event.stopPropagation();
      handlers.flickCard(card);
    }
  });

  button.addEventListener("click", () => {
    if (skipNextClick) {
      skipNextClick = false;
      return;
    }

    if (selectable) {
      handlers.toggleCard(card);
    } else {
      handlers.cardUnavailable();
    }
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
  element.className = `${cardClasses(card, false, true, activeColor, large)} field-card`;
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
  const label = labelFor(card);
  const labelClass = label.length > 2 ? "card-main long" : "card-main";
  return `${badge}<span class="card-sub">${sub}</span><strong class="${labelClass}">${label}</strong><small>${detailLabelFor(card)}</small>`;
}

function selectionIndex(card, selectedOrder) {
  const index = selectedOrder.indexOf(card.id);
  return index >= 0 ? index + 1 : null;
}
