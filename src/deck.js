export const COLORS = ["red", "blue", "yellow", "green"];
export const VALUES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
export const ACTIONS = ["skip", "reverse", "drawTwo"];
export const WILD_VALUES = ["wild", "wildDrawFour"];

let cardId = 0;

export function createDeck() {
  const deck = [];

  COLORS.forEach((color) => {
    VALUES.forEach((value) => deck.push(createCard(color, value, "number")));
    VALUES.slice(1).forEach((value) => deck.push(createCard(color, value, "number")));
    ACTIONS.forEach((value) => {
      deck.push(createCard(color, value, "action"));
      deck.push(createCard(color, value, "action"));
    });
  });

  WILD_VALUES.forEach((value) => {
    for (let index = 0; index < 4; index += 1) {
      deck.push(createCard("wild", value, "wild"));
    }
  });

  return shuffle(deck);
}

export function createCard(color, value, type) {
  return { id: `card-${cardId++}`, color, value, type };
}

export function shuffle(cards) {
  const copy = [...cards];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function labelFor(card) {
  if (!card) return "";
  const labels = {
    skip: "休",
    reverse: "逆",
    drawTwo: "+2",
    wild: "色",
    wildDrawFour: "+4",
  };
  return labels[card.value] || card.value;
}

export function detailLabelFor(card) {
  if (!card) return "";
  const labels = {
    skip: "休み",
    reverse: "逆回り",
    drawTwo: "+2",
    wild: "色変え",
    wildDrawFour: "色変え+4",
  };
  return labels[card.value] || card.value;
}

export function colorName(color) {
  const names = { red: "赤", blue: "青", yellow: "黄", green: "緑", wild: "色変え" };
  return names[color] || color;
}
