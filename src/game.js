import { COLORS, colorName, createDeck, detailLabelFor, labelFor, shuffle } from "./deck.js";
import { createPlayer, drawCards, removeCards } from "./player.js";

export const defaultRules = {
  sameNumberStack: false,
  drawTwoStack: false,
  drawFourStack: false,
  drawTwoToDrawFourStack: false,
  cannotFinishWithHighScoreCard: false,
};

export const defaultMatchSettings = {
  playerCount: 2,
  totalRounds: 1,
  doubleFinalOddRounds: false,
};

export function createGame(localRules = defaultRules, matchSettings = defaultMatchSettings) {
  const players = createPlayers(matchSettings.playerCount);
  const state = {
    players,
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
    actionLog: [],
    shuffle,
    matchState: createMatchState(matchSettings, players),
  };

  state.players.forEach((player) => drawCards(state, player, 7));
  startDiscard(state);
  state.message = "あなたの番です。出せるカードを選ぶか、カードを引いてください。";
  addLog(state, "あなたの番です");
  return state;
}

export function startNextRound(state) {
  state.matchState.currentRound += 1;
  state.currentPlayerIndex = 0;
  state.direction = 1;
  state.deck = createDeck();
  state.discardPile = [];
  state.currentColor = null;
  state.currentValue = null;
  state.isGameOver = false;
  state.winner = null;
  state.drawPenaltyCount = 0;
  state.drawPenaltyType = null;
  state.message = "";
  state.actionLog = [];
  state.players.forEach((player) => {
    player.hand = [];
    drawCards(state, player, 7);
  });
  startDiscard(state);
  state.message = `${state.matchState.currentRound}/${state.matchState.totalRounds}回戦を開始しました。あなたの番です。`;
  addLog(state, `${state.matchState.currentRound}回戦開始`);
}

export function currentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

export function topDiscard(state) {
  return state.discardPile[state.discardPile.length - 1];
}

export function canPlayCard(state, card) {
  if (state.isGameOver) return false;

  // 累積ドロー中は、設定で許可された重ね出しだけを受け付ける。
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

  // 通常時は色・数字・効果の一致、または色変えカードを許可する。
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
  if (!canPlayStack(state, cards)) {
    return { ok: false, needsColor: false, message: "今はそのカードを出せません。" };
  }
  const lastCard = cards[cards.length - 1];

  if (!canFinishWithCards(state, player, cards)) {
    return { ok: false, needsColor: false, message: "10点以上のカードでは上がれません" };
  }

  if (lastCard.type === "wild" && !COLORS.includes(chosenColor)) {
    return { ok: false, needsColor: true, message: "次の色を選んでください。" };
  }

  removeCards(player, cards);
  state.discardPile.push(...cards);
  state.currentValue = lastCard.value;
  state.currentColor = lastCard.type === "wild" ? chosenColor : lastCard.color;
  applyCardEffect(state, lastCard);

  if (player.hand.length === 0) {
    state.isGameOver = true;
    state.winner = player.name;
    finishRound(state, player);
    state.message = `${player.name}の勝ちです。`;
    addLog(state, `${player.name}の手札がなくなりました`);
    return { ok: true, gameOver: true };
  }

  advanceAfterCard(state, lastCard);
  const playedText = cards.map(cardActionText).join("、");
  state.message = `${player.name}が${playedText}を出しました。`;
  addLog(state, `${player.name}が${playedText}を出しました${penaltySuffix(state)}`);
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
    state.message = `${player.name}は${count}枚引きました。`;
    addLog(state, `${player.name}は${count}枚引きました`);
    return { drawn: count, penalty: true };
  }

  const [card] = drawCards(state, player, 1);
  if (card && canPlayCard(state, card)) {
    state.message = `${player.name}は出せるカードを1枚引きました。`;
    addLog(state, `${player.name}は出せるカードを引きました`);
  } else {
    advanceTurn(state);
    state.message = `${player.name}は1枚引きました。`;
    addLog(state, `${player.name}は1枚引きました`);
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

export function getCardScore(card) {
  if (card.type === "number") return Number(card.value) || 0;
  if (card.value === "reverse") return 10;
  if (card.value === "skip") return 10;
  if (card.value === "drawTwo") return 15;
  if (card.value === "wild") return 20;
  if (card.value === "wildDrawFour") return 40;
  return 0;
}

export function canFinishWithCards(state, player, cards) {
  if (!state.localRules.cannotFinishWithHighScoreCard) return true;
  if (player.hand.length !== cards.length) return true;
  const lastCard = cards[cards.length - 1];
  return getCardScore(lastCard) < 10;
}

export function handScore(hand) {
  return hand.reduce((total, card) => total + getCardScore(card), 0);
}

export function finalMatchWinner(matchState) {
  const entries = Object.entries(matchState.scores);
  const minScore = Math.min(...entries.map(([, score]) => score));
  return entries.filter(([, score]) => score === minScore).map(([id]) => id);
}

function createPlayers(playerCountSetting) {
  const playerCount = [2, 3, 4].includes(Number(playerCountSetting)) ? Number(playerCountSetting) : 2;
  return Array.from({ length: playerCount }, (_, index) => {
    if (index === 0) return createPlayer("あなた", false, "player");
    return createPlayer(`CPU${index}`, true, `cpu${index}`);
  });
}

function createMatchState(matchSettings, players) {
  const totalRounds = [1, 3, 5].includes(Number(matchSettings.totalRounds)) ? Number(matchSettings.totalRounds) : 1;
  const scores = Object.fromEntries(players.map((player) => [player.id, 0]));
  return {
    totalRounds,
    currentRound: 1,
    doubleFinalOddRounds: Boolean(matchSettings.doubleFinalOddRounds),
    scores,
    roundResults: [],
    isMatchOver: false,
  };
}

function roundMultiplier(matchState) {
  if (!matchState.doubleFinalOddRounds) return 1;
  return matchState.currentRound === 3 || matchState.currentRound === 5 ? 2 : 1;
}

function finishRound(state, zeroHandPlayer) {
  const matchState = state.matchState;
  const multiplier = roundMultiplier(matchState);
  const playerResults = state.players.map((player) => {
    const baseScore = handScore(player.hand);
    const score = baseScore * multiplier;
    matchState.scores[player.id] = (matchState.scores[player.id] || 0) + score;
    return {
      id: player.id,
      name: player.name,
      baseScore,
      score,
      total: matchState.scores[player.id],
    };
  });

  matchState.isMatchOver = matchState.currentRound >= matchState.totalRounds;
  matchState.roundResults.push({
    round: matchState.currentRound,
    multiplier,
    players: playerResults,
    roundWinner: zeroHandPlayer.id,
  });
}

function addLog(state, text) {
  state.actionLog = [text, ...(state.actionLog || [])].slice(0, 3);
}

function cardActionText(card) {
  const color = card.type === "wild" ? "" : `${colorName(card.color)}の`;
  return `${color}${detailLabelFor(card) || labelFor(card)}`;
}

function penaltySuffix(state) {
  return state.drawPenaltyCount > 0 ? `（現在 +${state.drawPenaltyCount}枚）` : "";
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

function advanceAfterCard(state, card) {
  if (card.value === "skip") {
    advanceTurn(state, 2);
    return;
  }

  if (card.value === "reverse") {
    state.direction *= -1;
    advanceTurn(state, state.players.length === 2 ? 2 : 1);
    return;
  }

  advanceTurn(state, 1);
}

function advanceTurn(state, steps = 1) {
  state.currentPlayerIndex = (state.currentPlayerIndex + steps * state.direction + state.players.length) % state.players.length;
}
