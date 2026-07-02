import { colorName, labelFor } from "./deck.js";
import { canPlayCard, canPlayStack, currentPlayer, topDiscard } from "./game.js";

export function createUI(handlers) {
  const els = {
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

  els.drawCard.addEventListener("click", handlers.draw);
  els.playStack.addEventListener("click", handlers.playSelected);
  els.restart.addEventListener("click", handlers.restart);
  Object.entries(els.rules).forEach(([name, input]) => {
    input.addEventListener("change", () => handlers.rulesChanged(name, input.checked));
  });

  return {
    render(state, selectedIds = new Set()) {
      const player = state.players[0];
      const cpu = state.players[1];
      const isPlayerTurn = currentPlayer(state) === player && !state.isGameOver;

      els.cpuCount.textContent = cpu.hand.length;
      els.cpuHand.innerHTML = cpu.hand.map(() => `<div class="card back" aria-hidden="true"></div>`).join("");
      els.deckCount.textContent = state.deck.length;
      renderCard(els.discardCard, topDiscard(state), true, state.currentColor);
      els.currentStatus.textContent = state.isGameOver ? `${state.winner} wins` : `${colorName(state.currentColor)} / ${labelFor(topDiscard(state))}`;
      els.currentColor.textContent = colorName(state.currentColor);
      els.turnLabel.textContent = state.isGameOver ? "Finished" : currentPlayer(state).name;
      els.penaltyLabel.textContent = state.drawPenaltyCount > 0 ? `Current +${state.drawPenaltyCount}` : "None";
      els.message.textContent = state.message;
      els.playerCount.textContent = `${player.hand.length} cards`;
      els.drawCard.disabled = !isPlayerTurn;
      els.playStack.disabled = !isPlayerTurn || !canPlayStack(state, selectedCards(player.hand, selectedIds));

      els.playerHand.innerHTML = "";
      player.hand.forEach((card) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = cardClasses(card, selectedIds.has(card.id), canPlayCard(state, card), state.currentColor);
        button.disabled = !isPlayerTurn;
        button.innerHTML = cardMarkup(card);
        button.addEventListener("click", () => handlers.toggleCard(card));
        els.playerHand.append(button);
      });
    },

    getRules() {
      return Object.fromEntries(Object.entries(els.rules).map(([name, input]) => [name, input.checked]));
    },

    setRules(rules) {
      Object.entries(els.rules).forEach(([name, input]) => {
        input.checked = Boolean(rules[name]);
      });
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

function selectedCards(hand, selectedIds) {
  return hand.filter((card) => selectedIds.has(card.id));
}

function renderCard(element, card, large = false, activeColor = null) {
  element.className = cardClasses(card, false, true, activeColor, large);
  element.innerHTML = card ? cardMarkup(card) : "Start";
}

function cardClasses(card, selected, playable, activeColor, large = false) {
  const color = card?.type === "wild" ? activeColor || "wild" : card?.color || "neutral";
  return ["card", color, large ? "large" : "", selected ? "selected" : "", playable ? "playable" : "muted"].join(" ");
}

function cardMarkup(card) {
  const sub = card.type === "wild" ? "Any color" : colorName(card.color);
  return `<span>${sub}</span><strong>${labelFor(card)}</strong>`;
}
