import { COLORS, createDeck, labelFor, shuffle } from "./deck.js";
import { createPlayer, drawCards, removeCards } from "./player.js";

export const defaultRules = {
  sameNumberStack: false,
  drawTwoStack: false,
  drawFourStack: false,
  drawTwoToDrawFourStack: false,
};

export function createGame(localRules = defaultRules) {
  const state = {
    players: [createPlayer("You"), createPlayer("CPU", true)],
    currentPlayerIndex: 0,
    direction: 1,
    deck: createDeck(),
    discardPile: [],
    currentColor: null,
    currentValue: null,
    isGameOver: false,
    winner: null,
    localRules: { ...defaultRules, ...localRules },
    drawPenaltyCount: 0,
    drawPenaltyType: null,
    message: "",
    shuffle,
  };

  state.players.forEach((player) => drawCards(state, player, 7));
  startDiscard(state);
  state.message = "Your turn. Play a matching card or draw.";
  return state;
}

export function currentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

export function topDiscard(state) {
  return state.discardPile[state.discardPile.length - 1];
}

export function canPlayCard(state, card) {
  if (state.isGameOver) return false;

  if (state.drawPenaltyCount > 0) {
    if (state.drawPenaltyType === "drawTwo") {
      return (
        (card.value === "drawTwo" && state.localRules.drawTwoStack) ||
        (card.value === "wildDrawFour" && state.localRules.drawTwoToDrawFourStack)
      );
    }
    if (state.drawPenaltyType === "drawFour") {
      return card.value === "wildDrawFour" && state.localRules.drawFourStack;
    }
    return false;
  }

  if (card.type === "wild") return true;
  return card.color === state.currentColor || card.value === state.currentValue;
}

export function playableCards(state, player = currentPlayer(state)) {
  return player.hand.filter((card) => canPlayCard(state, card));
}

export function canPlayStack(state, cards) {
  if (cards.length === 0) return false;
  if (cards.length === 1) return canPlayCard(state, cards[0]);
  if (!state.localRules.sameNumberStack) return false;
  if (state.drawPenaltyCount > 0) return false;
  if (cards.some((card) => card.type !== "number")) return false;
  if (!cards.every((card) => card.value === cards[0].value)) return false;
  return canPlayCard(state, cards[0]);
}

export function playCards(state, cards, chosenColor = null) {
  const player = currentPlayer(state);
  if (!canPlayStack(state, cards)) return { ok: false, needsColor: false, message: "Those cards cannot be played now." };
  const lastCard = cards[cards.length - 1];

  if (lastCard.type === "wild" && !COLORS.includes(chosenColor)) {
    return { ok: false, needsColor: true, message: "Choose the next color." };
  }

  removeCards(player, cards);
  state.discardPile.push(...cards);
  state.currentValue = lastCard.value;
  state.currentColor = lastCard.type === "wild" ? chosenColor : lastCard.color;
  applyCardEffect(state, lastCard);

  if (player.hand.length === 0) {
    state.isGameOver = true;
    state.winner = player.name;
    state.message = `${player.name} wins!`;
    return { ok: true, gameOver: true };
  }

  advanceTurn(state, shouldSkipNext(lastCard));
  state.message = `${player.name} played ${cards.map(labelFor).join(", ")}.`;
  return { ok: true };
}

export function drawForCurrentPlayer(state) {
  const player = currentPlayer(state);

  if (state.drawPenaltyCount > 0) {
    const count = state.drawPenaltyCount;
    drawCards(state, player, count);
    state.drawPenaltyCount = 0;
    state.drawPenaltyType = null;
    advanceTurn(state);
    state.message = `${player.name} drew ${count} penalty cards.`;
    return { drawn: count, penalty: true };
  }

  const [card] = drawCards(state, player, 1);
  if (card && canPlayCard(state, card)) {
    state.message = `${player.name} drew a playable card.`;
  } else {
    advanceTurn(state);
    state.message = `${player.name} drew a card.`;
  }
  return { drawn: card ? 1 : 0, card };
}

export function chooseBestColor(hand) {
  const counts = COLORS.map((color) => ({
    color,
    count: hand.filter((card) => card.color === color).length,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0]?.color || "red";
}

export function updateRules(state, localRules) {
  state.localRules = { ...state.localRules, ...localRules };
}

function startDiscard(state) {
  let card = state.deck.pop();
  while (card?.type === "wild") {
    state.deck.unshift(card);
    state.deck = shuffle(state.deck);
    card = state.deck.pop();
  }
  state.discardPile.push(card);
  state.currentColor = card.color;
  state.currentValue = card.value;
}

function applyCardEffect(state, card) {
  if (card.value === "drawTwo") {
    state.drawPenaltyCount += 2;
    state.drawPenaltyType = "drawTwo";
  }

  if (card.value === "wildDrawFour") {
    state.drawPenaltyCount += 4;
    state.drawPenaltyType = "drawFour";
  }
}

function shouldSkipNext(card) {
  return card.value === "skip" || card.value === "reverse";
}

function advanceTurn(state, skip = false) {
  const steps = skip ? 2 : 1;
  state.currentPlayerIndex = (state.currentPlayerIndex + steps * state.direction + state.players.length) % state.players.length;
}
