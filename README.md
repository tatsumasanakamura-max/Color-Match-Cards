# Color Match Cards

Color Match Cards is a browser card game inspired by color and value matching rules. It uses original naming, UI, and card artwork so it can be published as an independent GitHub Pages project.

## How to Run

Open `index.html` in a browser. No build step, package install, or server is required.

## How to Play

- You play against one CPU player.
- Each player starts with 7 cards.
- Match the top discard by color, number, action, or play a Wild card.
- If you cannot play, draw a card.
- Skip and Reverse both skip the other player in this 1 vs CPU version.
- The first player with no cards wins.

## Cards

- Colors: red, blue, yellow, green
- Numbers: 0-9
- Actions: Skip, Reverse, Draw Two
- Wilds: Wild, Wild Draw Four

## Local Rules

All local rules start OFF and can be toggled during play.

- Same number stack: play multiple number cards with the same number at once. The last card played sets the next required color or value.
- Draw Two stack: a Draw Two can be answered with another Draw Two. If not answered, the player draws the accumulated total.
- Wild Draw Four stack: a Wild Draw Four can be answered with another Wild Draw Four.
- Draw Two to Wild Draw Four: a Draw Two chain can be escalated with Wild Draw Four.

Important draw-chain rule: Wild Draw Four cannot be followed by Draw Two. Once a chain becomes a Wild Draw Four chain, only Wild Draw Four can be stacked.

## File Structure

```text
/
├── index.html
├── README.md
├── src/
│   ├── main.js
│   ├── game.js
│   ├── deck.js
│   ├── player.js
│   ├── cpu.js
│   └── ui.js
└── styles/
    └── style.css
```

## GitHub Pages

1. Open the GitHub repository page.
2. Open Settings.
3. Open Pages.
4. Set Source to Deploy from a branch.
5. Set Branch to `main` and Folder to `/root`.
6. Save.
7. Open the published URL shown by GitHub Pages.

## Test Checklist

- Play matching color, number, and action cards.
- Play Wild and choose the next color.
- Toggle Same number stack and play multiple number cards.
- Confirm Same number stack is unavailable when OFF.
- Stack Draw Two and Wild Draw Four penalties.
- Confirm Draw Two can become Wild Draw Four only when that local rule is ON.
- Confirm Wild Draw Four cannot be followed by Draw Two.
- Confirm CPU can play, draw, stack, and finish the game.
- Restart and play a fresh game.
- Check layout on phone, tablet, and desktop widths.
