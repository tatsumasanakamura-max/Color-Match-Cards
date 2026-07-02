export function createPlayer(name, isCpu = false) {
  return { name, isCpu, hand: [] };
}

export function drawCards(state, player, count) {
  const drawn = [];
  for (let index = 0; index < count; index += 1) {
    if (state.deck.length === 0) recycleDiscardPile(state);
    if (state.deck.length === 0) break;
    const card = state.deck.pop();
    player.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

export function removeCards(player, cards) {
  const ids = new Set(cards.map((card) => card.id));
  player.hand = player.hand.filter((card) => !ids.has(card.id));
}

function recycleDiscardPile(state) {
  if (state.discardPile.length <= 1) return;
  const top = state.discardPile.pop();
  state.deck = state.shuffle(state.discardPile);
  state.discardPile = [top];
}
