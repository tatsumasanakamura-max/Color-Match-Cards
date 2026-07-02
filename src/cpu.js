import { chooseBestColor, playableCards, playCards, drawForCurrentPlayer, canPlayStack } from "./game.js";

const priority = {
  drawTwo: 1,
  skip: 2,
  reverse: 3,
  wildDrawFour: 6,
  wild: 5,
};

export function takeCpuTurn(state) {
  if (state.isGameOver) return;
  const cpu = state.players[state.currentPlayerIndex];
  if (!cpu?.isCpu) return;

  const playable = playableCards(state, cpu);
  if (playable.length === 0) {
    drawForCurrentPlayer(state);
    return;
  }

  const cards = chooseCpuCards(state, playable, cpu.hand);
  const color = cards[cards.length - 1].type === "wild" ? chooseBestColor(cpu.hand.filter((card) => !cards.includes(card))) : null;
  playCards(state, cards, color);
}

function chooseCpuCards(state, playable, hand) {
  if (state.drawPenaltyCount > 0) {
    return [playable.sort((a, b) => penaltyPriority(a) - penaltyPriority(b))[0]];
  }

  const first = playable.sort((a, b) => cardPriority(a) - cardPriority(b))[0];
  if (state.localRules.sameNumberStack && first.type === "number") {
    const stack = hand.filter((card) => card.type === "number" && card.value === first.value).slice(0, 3);
    const ordered = orderStackForColor(stack, hand);
    if (canPlayStack(state, ordered)) return ordered;
  }
  return [first];
}

function cardPriority(card) {
  if (card.type === "number") return 4;
  return priority[card.value] ?? 10;
}

function penaltyPriority(card) {
  return card.value === "wildDrawFour" ? 1 : 2;
}

function orderStackForColor(stack, hand) {
  const colorCounts = hand.reduce((counts, card) => {
    counts[card.color] = (counts[card.color] || 0) + 1;
    return counts;
  }, {});
  return [...stack].sort((a, b) => (colorCounts[a.color] || 0) - (colorCounts[b.color] || 0));
}
