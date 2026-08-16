# Ring In — Easy Breezy authoring guide (expansion wave)

Easy Breezy is for **older, casual players** — think grandparents at a family game night.
It must feel warm, nostalgic, and winnable. A 75-year-old who watches classic movies,
gardens, cooks, and reads the paper should get most clues right and feel great about it.

Everything must be 100% original writing from your own knowledge (you have real-show
metadata for calibration only — no clue text was extracted, never reproduce one).

## File format

JSON array of exactly **12 categories**, 5 clues each.
`e1-*.json` uses values [200, 400, 600, 800, 1000]; `e2-*.json` uses [400, 800, 1200, 1600, 2000].
Same shape as the main pack: `{ "name": …, "clues": [{ "clue", "response", "value" }] }`.

## Subject matter that works

Classic Hollywood and its stars, crooners/Motown/big band, classic TV (I Love Lucy through
M*A*S*H era), home & garden, cooking and comfort food, proverbs & old sayings, church and
holiday traditions, 20th-century American memories (five-and-dimes, drive-ins, milkmen),
famous landmarks, presidents people lived through, animals, simple geography.
AVOID: anything after ~2005, internet culture, obscure academia, gross-out topics.

## The gentleness rules

- Clues are SHORTER here: 50–90 characters. Simple sentence structure, no showing off.
- The answer should feel like a warm memory, not an exam. "Oh, I know this one!"
- Even the $1000 / $2000 row is only "solid trivia" — a regular person's proud moment,
  never a specialist's. Check the easy-tier answer list in `inspiration/easy.md`:
  MOST of your answers should live at that difficulty.
- One unambiguous best response, 1–3 words.
- Category names: ALL CAPS, gentle puns fine (SOUP'S ON, GARDEN VARIETY are taken — see
  `exclusion-names.txt`).
- No two clues in your file share a response.
- **Evergreen and rock-solid facts only** — every clue gets independently fact-checked.

## BANNED phrases (engine filters — one hit kills the category)

Never use: "seen here", "shown here", "heard here", "pictured", "depicted", "this song",
"audio clue", "video clue", "in this picture", "in the picture", "the following clip",
"sung here", "played here", "read the", "this painting shown", "this logo", "currently",
"to date", "as of now", "reigning", "incumbent", "is now called", "now stars",
"now plays", "newest", "most recently".
(Write "this tune", "this hit", "this 1962 single" instead of "this song".)

## Exemplar of the register

- $200: "This fruit keeps the doctor away when eaten daily, so the proverb says" → an apple
- $600: "Lucy and Ethel famously fell behind wrapping these sweets on a factory conveyor belt" → chocolates
- $1000: "This crooner, born Harry Lillis Crosby, dreamed of a white Christmas in 1942" → Bing Crosby

## Workflow (required)

1. Read `inspiration/easy.md` and `exclusion-names.txt`.
2. Write your 12 categories to the assigned output file.
3. Run `node validate-authoring.cjs <your-file>` and fix everything until it prints **OK**.
4. Re-read as a hostile fact-checker; fix anything shaky.
