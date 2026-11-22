# Source check of the recent shelf, Nov 12 2026

Kelly asked for a fact check of the new clues and chose "the riskiest 150 or so"
out of 710, not every clue. This is the record of what was read, what held up,
what was changed, and what is still unread.

## How it was done

- "Riskiest" means clues that rest on a number, a date, or a claim of first, most,
  only, oldest or record. Plain identifications ("this band reunited in 2025") were
  left for the second read.
- Each clue was turned into a plain statement and read against one English
  Wikipedia article, on Nov 12 2026. A statement counts as confirmed only when a
  sentence quoted from the page says it. The page reader sometimes adds its own
  summary of the part of a long page it did not show; that summary was wrong often
  enough (in both directions) that it was never used on its own.
- "In part" means the page confirmed the core of the clue and was silent on one
  detail, usually because the detail sits further down a long page than the reader
  showed. Those details are listed so they can be read later.
- The page reader allows 100 pages an hour. Two batches of 45 ran into that limit
  and read nothing; they were re-run later in smaller batches. Nothing was
  confirmed from memory to fill a gap.

## Result

About 180 statements were read against their pages (the 150 or so Kelly chose,
plus the re-reads).

| Outcome | Count |
|---|---|
| Confirmed by the page | 156 |
| Confirmed in part (core confirmed, one detail not in the text read) | 11 |
| Clue reworded because of the check | 4 |
| Fine as worded, but the page does not use the clue's own word | 4 |
| Page not read or did not settle it | 5 |
| Found wrong and left in | 0 |

Of the 156, 131 have the page's sentence on record below or in the batch
reports; 25 music statements rest on the reader's count for that batch
(section 3). No clue was found to name the wrong person, place, year or number.
The four rewordings were all a detail the page did not support.

## What was changed because of the check

| Clue | Was | Now | Why |
|---|---|---|---|
| RINGSIDE SEATS, Terence Crawford | "moved up two weight classes and beat Canelo Álvarez" | "this unbeaten Nebraskan outpointed Canelo Álvarez before a stadium crowd in Las Vegas" | The fight page shows one division up from his last title, not two. |
| Jane Goodall | "died in 2025 at 91 while on a speaking tour" | "died in October 2025 at 91" | The tour was not in the text read; the date and age were. |
| ADVANTAGE, NEXT GENERATION, Ash Barty | "weeks after winning her home major" | "two months after winning her home major" | Her page: "just two months after her Australian Open title". |
| HALFTIME REPORT, Kendrick Lamar | "performed 'Not Like Us' as the first solo hip-hop headliner" | "performed 'Not Like Us' at halftime, one week after the song won five Grammys" | The halftime show's page does not make the "first solo" claim; the Grammys and the show are both on pages read. |

The first two went in with commit 625ea9d, the rest with this log
(`source-check-edits-2026-11-12.json`, applied with `apply-edits.cjs`).

## Batches

### 1. Late 2025 and 2026 (written from the pages, then spot-checked)

Clues about late 2025 and 2026 were written from `facts-2025-2026.md`, which was
itself taken from ten Wikipedia pages (the 2025 and 2026 Oscars, Grammys, Emmys,
Tonys, Super Bowl LX, the 2026 Winter Olympics and World Cup, and others). Nine
further statements were spot-checked: seven confirmed (Sagrada Família the
tallest church on 30 Oct 2025; the Grand Egyptian Museum's full opening on
1 Nov 2025; the Stranger Things finale on 31 Dec 2025; Ohtani's three home runs
and ten strikeouts in one 2025 playoff game; the last penny struck on
12 Nov 2025; Klimt's Portrait of Elisabeth Lederer at $236.4 million; McConnell
the longest-serving Senate party leader) and two changed (Crawford, Goodall,
above).

### 2. Fifty round-one clues (the first eleven categories written)

42 confirmed. Among them: Pope Leo XIV the first American pope, May 2025;
Notre-Dame reopened Dec 2024; Assad fell Dec 2024; Sphere opened Sept 2023 with
U2; Adele's residency Nov 2022 to Nov 2024; Hackney Diamonds the Stones' first
album of new songs since 2005; Ozzy Osbourne's last show and death in July 2025;
Brock Purdy the last pick of 2022; Super Bowl LX 29 to 13; the coronation on
6 May 2023; the Stone of Scone's trip to London; Biles's three golds in Paris;
Sam Bankman-Fried's 25-year sentence; the Paddington sketch of 4 June 2022;
William Shatner's flight on 13 Oct 2021; the Starship booster catch on
13 Oct 2024.

Eight were not settled by the first pages. Four were re-read in batch 8
(Hinton and Hopfield's Nobel, Taylor Swift at Super Bowl LVIII, the Eiffel Tower
beach volleyball stadium, Chappell Roan). One was reworded in the second read
for another reason (Turning Red). Three are fine as worded but the page did not
use the clue's own word: Beyoncé's 2023 tour "took the name of" her album
Renaissance (the page says the album "was promoted with the Renaissance World
Tour"); Oasis "ended a 15-year feud" (the page gives the split in 2009 and the
reunion announced in August 2024, "almost 15 years to the date"); and SpaceX
caught the Starship booster "in midair" (the page says the booster "slowed to a
near hover" and "the arms then closed around the booster").

### 3. Music (38 statements)

25 read as consistent with their pages; the reader did not itemise them, so
they are listed here by subject, not by quote: As It Was 15 weeks at No. 1;
A Bar Song 19 weeks; Swift's fourth Album of the Year; Harry's House; What Was
I Made For?; Megan Thee Stallion Best New Artist; Missy Elliott's Rock Hall
first; hip-hop's 50th in 2023; Usher in Las Vegas; the 2022 halftime show at
SoFi; Un Verano Sin Ti; I Remember Everything; Swift's whole top ten; Blinding
Lights; ABBA's Voyage after 40 years; The Cure after 16; Adele's 30 after six;
Loreen and Sweden's seventh win; Switzerland 1956 and Nemo 2024; Doechii; Blue
Ivy Carter; Beyoncé at Coachella 2018; Blackpink at Coachella 2023; Cher's 2024
induction; Die with a Smile the top song of 2025.

Thirteen were not settled (wrong page served, or the budget ran out). All
thirteen were re-read in batch 8.

### 4. Film and television, first try (8 pages read before the limit)

6 confirmed: I'm Still Here the first
Brazilian-produced film to win an Oscar; The Super Mario Bros. Movie second for
2023; The Studio's comedy Emmy in 2025; Schitt's Creek's 2020 sweep; Sean
Baker's four Oscars in one night; Adrien Brody's win for The Brutalist. The rest
of this set was re-run as batch 6.

### 5. Sport and Formula 1 (two batches, 33 pages read)

27 confirmed. Formula 1: Verstappen's 19 wins in 2023; McLaren's 1.80-second
pit stop; the halo and Grosjean's 2020 crash; McLaren's 2024 constructors' title,
its first since 1998; Aston Martin's return after 61 years; Alpine's 2021
rename; Cadillac the first new constructor since Haas in 2016; Alonso. Other
sport: Barkley's 2,000 yards; Judge's American League record; Freeman's walk-off
grand slam; Dusty Baker's 2022 title; Acuña's 40-70 season; Giannis's 50 in
Game 6; Usyk undisputed; McDavid's 2024 Conn Smythe; Super Bowl LIX 40 to 22;
Soto's $765 million; Pujols's 700th; A'ja Wilson's fourth MVP; Lyles by 0.005;
Duplantis at 6.25 in Paris; Mickelson the oldest major winner; Haaland's 36;
Alcaraz the youngest No. 1; Charles III the oldest to accede; the 2024 double
cicada brood, first since 1803.

In part (4): Ohtani's $700 million contract and 50-50 season are quoted, the
month of signing was not; Lydia Ko's Paris gold "qualified her for the LPGA Hall
of Fame", the clue's "final point she needed" was not in the text; Djokovic and
Kiptum were re-read in batch 8.

Note on TEAM ORDERS #4: the clue calls Audi a "Volkswagen Group brand from
Ingolstadt". That is where the brand is based; the Formula 1 team's own bases
are Hinwil, Neuburg and Bicester. Fine as worded.

### 6. Film, television and sport re-run (20 pages, all read)

12 new confirmations, 14 with the two below: Troy Kotsur the first deaf male actor to win; Lilo &
Stitch at $1.038 billion; Terrifier 3 topping the box office; Shōgun's record
18 Emmys; Stereophonic's 13 Tony nominations, the most for a play; Michelle
Yeoh born in Ipoh and the first Asian Best Actress; the first NFL game on
Netflix on 25 Dec 2024 with Beyoncé at halftime; Tubi and Super Bowl LIX;
Freakier Friday 22 years on; Kim Ng hired 13 Nov 2020; South Carolina 38-0;
Caitlin Clark the all-time Division I scorer and first overall pick.

Also confirmed, counted here: Emilia Pérez "led with 13 nominations", which is
what the clue says; and Mahomes's third Super Bowl MVP, whose date is on the
Super Bowl LVIII page read in batch 8.

In part (4): Godzilla Minus One won Best Visual Effects ("the franchise's
first Oscar" was not in the text read); Hopkins won for The Father, and his age
of 83 came only from the reader's summary; Kupp was MVP of Super Bowl LVI and caught the game-winning touchdown,
"under two minutes left" is not quoted; Krzyzewski's five titles and 2022
retirement are quoted, "42 seasons" comes from counting the season table.

Changed (1): Barty, above.

### 7. News, science, art and more sport (25 pages, 24 read)

20 confirmed: Raducanu a qualifier who never dropped a set; Eileen Gu born in
San Francisco; Matsuyama the first Japanese man to win a major; Korda's five in
a row; Taylor against Serrano the first women's fight to headline Madison Square
Garden; Bonmatí's three Ballons d'Or; Leverkusen unbeaten; McCarthy's 15 ballots
and removal; Finland in NATO on 4 April 2023; Chandrayaan-3 near the south pole;
IM-1 the first private soft landing; ChatGPT's 100 million in two months; the
pig kidney at Massachusetts General; Vogtle 3 and 4; Comedian at $6.2 million
(with fees); Shot Sage Blue Marilyn at $195 million; Merdeka 118; Jimmy Carter
at 100; Amanda Gorman at the 2021 inauguration; George Santos the sixth member
expelled.

Not settled (3): U.S. inflation "about 9 percent in June" 2022 (the page read
gives "highest inflation rate since 1981" but not the figure); New River Gorge
as the 63rd national park (only in a cited headline; the December 2020 date is
quoted); Barbra Streisand's 970-page memoir (the address served her 1965 album,
not the book). Ledecky and Ovechkin were re-read in batch 8.

### 8. Re-reads (24 pages, 23 read)

Every statement the earlier batches left open was sent again with a better
page.

Confirmed (16): Drivers License "is the debut single" of Olivia Rodrigo; Leave
the Door Open won all four of its 2022 Grammys; Elton John's farewell tour "the
first tour in history to surpass $800 million, and $900 million" (the page tags
that sentence as needing a citation); SOS "atop the chart for ten non-consecutive
weeks" from 2022 to 2023 (13 in all, counting 2025, which is why the clue says
"across late 2022 and 2023"); Madonna's free concert on Copacabana Beach on
4 May 2024, before more than 1.6 million; Dolly Parton "initially declined the
honor" in 2022, and Rockstar came out on 17 Nov 2023; Jung Kook at the 2022 World
Cup opening ceremony; Wonka's "young chocolatier", 2023; Hinton left Google in
May 2023 "to freely speak out about the risks of AI" and shared the 2024 Nobel
Prize in Physics with John Hopfield; "a temporary stadium known as the Eiffel
Tower Stadium" for beach volleyball; Chappell Roan's album and Best New Artist
in February 2025; Brody's two Best Actor Oscars; Da'Vine Joy Randolph's
Supporting Actress Oscar; Djokovic's "record-breaking 23rd men's singles major
title overall, surpassing Rafael Nadal's all-time record"; Kiptum's 2:00:35
against a previous world record of 2:01:09, which makes it the first official
marathon under 2:01; and Ledecky's 800-metre win in Paris "was also her ninth
gold medal". (Brody's win was already counted in batch 4, so this batch adds 15
to the total. The same batch gave the date of Super Bowl LVIII, 11 February
2024, which settles the Mahomes clue counted in batch 6.)

In part (5): Taylor Swift's presence at Super Bowl LVIII (the page says only
that she and Kelce "attracted significant media attention prior to the game");
the year 2023 for Beyoncé passing Georg Solti (the page gives her 35 wins to his
31); Joni Mitchell's "debut performance at the ceremony" is quoted, her age of
80 is arithmetic from her birth date; Paul McCartney headlined Glastonbury 2022,
"a week after turning 80" is arithmetic too; Radcliffe's Tony is confirmed by
his own page (batch 4), the 2024 ceremony page listed him without marking the
winner in the text read.

Changed (1): Kendrick Lamar's halftime clue, above.

Not read (2): Willie Nelson's 90th birthday concerts at the Hollywood Bowl (no
page at the address tried) and Ovechkin's 895th goal (the Gretzky page as read
stops at his 1999 retirement; Ovechkin's own page was cut off at 2016).

## Still unread

- About 530 of the 710 clues were never in scope: they are identifications
  without a risky number or superlative, and they had the second read only.
- The "in part" details above.
- Five statements with no page read: Ovechkin's 895th goal (THE GOAT DEBATE #4),
  Willie Nelson's Hollywood Bowl birthday (STILL GOT IT #5), Streisand's 970
  pages (TELL-ALL #2), inflation at about 9 percent in June 2022 (THE DECADE'S
  BALANCE SHEET #5) and New River Gorge as park number 63 (PARK NUMBER 63). None
  of them was contradicted; they were simply not reached.
- The 25 music statements in section 3 have no quoted sentence on record.
