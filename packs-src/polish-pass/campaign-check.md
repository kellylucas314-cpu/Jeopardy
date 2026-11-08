# Campaign fact-check — public/data/campaign/chapters.json

Independent pass over all 165 clues (15 chapters x (5 era + 5 chapter + 1 final)).
Checked: facts (dates, names, quotes, first/only claims), single correct answer, clue/response
agreement, difficulty ladder, response words in clue, em dashes, length caps, banned engine phrases.
Only `clue` / `response` text was touched; names, values, order and every other field are unchanged.
`node scripts/check-campaign.cjs` prints "OK — campaign content passes" (8 remaining warnings, all
judgment calls on parenthetical alternates or unavoidable "this fort / this battle" patterns).

No em dashes in any clue or response. No banned media/dated phrases. No factual errors found in the
clues I left alone; every date, name and quotation I could verify checked out.

## Changes (before -> after, reason)

### Ch1 THE CADET FROM CORSICA, $200
- Before: "Born in Ajaccio in 1769, Napoleon was a native of this Mediterranean island, French for barely a year" -> Corsica
- After: "At 9 he was sent to school at Autun to learn this language, which he spoke with a Corsican accent all his life" -> French
- Reason: the category name (and chapter title) hands the player "Corsica"; a $200 should be easy, not a freebie. Autun, January 1779, age 9: verified.

### Ch2 PARIS UNDER THE TERROR, $600 <-> $1000 (swapped)
- $600 now: meter clue ("One ten-millionth of the distance from pole to equator...") ; $1000 now: Brumaire clue.
- Reason: ladder. "unit of length" defined by the meridian is a near-giveaway; the 'fog' month needs French vocabulary or knowing 18 Brumaire, a fair $1000.

### Ch2 TOULON, 1793, $600
- Before: "His guns took 'Little Gibraltar' in this month, a week before Christmas 1793" -> December
- After: "His guns took 'Little Gibraltar', the key to the harbor, on the 17th of this month in 1793" -> December
- Reason: "a week before Christmas" states the answer. Fort Mulgrave fell 17 Dec 1793: verified.

### Ch2 TOULON, 1793, $1000
- Before: "...praised Bonaparte's 'transcendent merit' from Toulon" (111 chars)
- After: "...praised Bonaparte's 'transcendent merit' at Toulon" (109 chars)
- Reason: over the 110-char hard cap on a $1000 row.

### Ch3 AROUND THE GLOBE, 1796, $1000
- Before: "Haydn's 1797 hymn for Emperor Francis supplies the melody of this country's national anthem, and it isn't Austria" (113)
- After: "Haydn's 1797 hymn for Emperor Francis is the tune of this country's national anthem, and it isn't Austria" (105)
- Reason: over the 110-char cap.

### Ch3 A WHIFF OF GRAPESHOT, $400
- Before: "His guns protected this legislature, ruler of France since 1792, as it finished a new constitution"
- After: "His guns protected this legislature, ruler of France since 1792, in its final weeks before the Directory"
- Reason: accuracy. The Constitution of Year III was adopted 22 Aug 1795 and ratified in September; on 13 Vendémiaire (5 Oct) the Convention was in its last three weeks, not finishing the text.

### Ch3 A WHIFF OF GRAPESHOT, $600
- Before: "...command of this army, named for the land it would invade" -> the Army of Italy
- After: "...command of this force, named for the land it would invade"
- Reason: response word "army" in the clue.

### Ch4 THE WIDER WORLD, 1797, $600 <-> $1000 (swapped)
- $600 now: Garnerin parachute; $1000 now: Bank of England gold suspension (24 years).
- Reason: ladder. "leapt from a balloon and drifted down beneath one of these" admits only one answer and was the easiest clue in the category.

### Ch6 final ROMAN ECHOES
- Before: "Like 'consul', the title Napoleon took in 1804 came from ancient Rome, where it first honored a victorious general" -> emperor (imperator)
- After: "Napoleon's 1804 title descends from this Latin word, the salute Roman legions gave a victorious general" -> imperator (emperor)
- Reason: "the title Napoleon took in 1804" is a one-step freebie for a Final; the Latin root is the real two-step riddle. "emperor" still accepted via the alternate.

### Ch9 1805: BEYOND THE BATTLEFIELD, $400 <-> $800 (swapped)
- $400 now: Hans Christian Andersen; $800 now: Fidelio.
- Reason: ladder. "Dane who wrote The Ugly Duckling" is far more universal than "Beethoven's only opera".

### Ch9 THE SUN OF AUSTERLITZ, $200 / $600 (swapped and reworded)
- $200 before: Czech Republic clue. $200 after: "In October 1805 Nelson smashed the French and Spanish fleets off this Spanish cape, dying in victory" -> Trafalgar
- $600 after: "Austerlitz, site of Napoleon's crushing victory of December 2, 1805, lies in this country today" -> the Czech Republic (Czechia)
- Reason: ladder. "Austerlitz is in this country today" is a trick (most people guess Austria), not a nearly-universal $200; Trafalgar is. Replaced "Weeks earlier" with the date since the clue no longer follows the Austerlitz row.

### Ch9 THE SUN OF AUSTERLITZ, $800
- Before: "...lure the allies down off these heights, which his troops then stormed" -> the Pratzen Heights
- After: "...lure the allies down off this plateau, which his troops then stormed" -> the Pratzen Heights (Pratzen Plateau)
- Reason: response word "heights" in the clue. (Checker now warns on "plateau", which is only in the added alternate.)

### Ch11 1809: THE WORLD AT THE ZENITH, $800 <-> $1000 (swapped)
- $800 now: Mephistopheles; $1000 now: Diedrich Knickerbocker.
- Reason: ladder. Faust's devil is better known than Irving's pen name.

### Ch12 1812: THE WORLD BEYOND RUSSIA, $600
- Before: "...in 1812 on publishing this pilgrimage poem" -> Childe Harold's Pilgrimage
- After: "...in 1812 on publishing the first cantos of this poem" -> Childe Harold's Pilgrimage (Childe Harold)
- Reason: response word "pilgrimage" in the clue; alternate added for the natural short answer.

### Ch12 THE RUSSIAN CAMPAIGN, $1000 (response only)
- Before: bulletin -> After: bulletins (bulletin)
- Reason: clue asks for "the 29th of these"; response should be plural.

### Ch13 MEANWHILE, 1814, $800
- Before: "In 1814 George Stephenson built 'Blücher', his first of these machines, for a colliery railway"
- After: "In 1814 George Stephenson built his first of these machines to haul coal at Killingworth colliery"
- Reason: the locomotive's name leaked "Blücher", the chapter category's $1000 answer, inside the same chapter's game.

### Ch13 THE BATTLE OF THE NATIONS, $600
- Before: "In mid-battle the troops of this German kingdom, Napoleon's ally, switched sides to the Coalition" -> Saxony
- After: "In mid-battle the troops of this German kingdom, Napoleon's ally and the battle's host, switched sides"
- Reason: specificity. Württemberg (also a kingdom and ally) cavalry defected at Leipzig too; "the battle's host" pins it to Saxony.

### Ch14 THE HUNDRED DAYS, $200 / $400 / $600 (rebuilt)
- $200 before: "Escaping Elba, Napoleon ruled France again for roughly this many days, as the episode's name says" -> 100 (removed)
- $200 after: Waterloo clue (was $400). $400 after: Wellington clue (was $600).
- $600 after (new): "As Napoleon marched on Paris in March 1815 this Bourbon king, restored only the year before, fled to Ghent" -> Louis XVIII (Louis the Eighteenth)
- Reason: the $200 was answered by the category name itself. Louis XVIII restored May 1814, fled Paris night of 19/20 March 1815 to Ghent: verified.

### Ch15 THE WORLD AFTER NAPOLEON, $1000
- Before: "...which this country had seized in 1801" (111) -> After: "...which this nation had seized in 1801" (109)
- Reason: over the 110-char cap.

### Ch15 SAINT HELENA & THE LEGEND, $200
- Before: "Napoleon died on May 5, 1821 on this remote island in the South Atlantic" -> Saint Helena
- After: "Napoleon died on May 5, 1821; the autopsy blamed a cancer of this organ, which had also killed his father" -> the stomach
- Reason: the category name (and chapter title) gives "Saint Helena". Antommarchi's autopsy found stomach cancer/ulcer; Carlo Buonaparte died of stomach cancer in 1785: verified.

## Verified and left alone (notable "first/only" and quote checks)
- Montgolfier first human flight 1783; Uranus first telescopic planet; Ceres first asteroid (1 Jan 1801); Pall Mall first gas-lit street 1807; Fidelio Beethoven's only opera; Leipzig largest European battle pre-1914; Borodino bloodiest single day; Amiens the only Franco-British peace 1793-1814; SS Savannah 1819; Haiti 1 Jan 1804.
- Quotes: "Forty centuries", "transcendent merit" (Augustin Robespierre), Voltaire's "neither holy, nor Roman", 29th Bulletin "health has never been better", Byron "awoke one morning", Cambronne ("supposedly"), last words ("reported"), Ney's iron cage.
- Dates: Louis XVI 21 Jan 1793; Marat 13 Jul 1793; Lodi/Arcole 1796; Campo Formio 1797 (Venice 697-1797 = 1,100 years); Marengo 14 Jun 1800; Concordat 1801; Code civil 21 Mar 1804; coronation 2 Dec 1804; Ulm 20 Oct 1805; Trafalgar 21 Oct 1805; Jena 14 Oct 1806; Tilsit Jul 1807; Wagram Jul 1809; Borodino 7 Sep 1812; Berezina Nov 1812; Six Days Feb 1814; Fontainebleau 20 Apr 1814; Bellerophon Jul 1815; Peterloo 1819; Champollion 1822; return of the ashes 1840.

## Still shaky (judgment calls, not changed)
1. Ch3 final "Soldiers, you are naked, ill fed..." — the 1796 proclamation text is widely quoted but many historians think it was composed later (Saint Helena). The clue says "told", not "attributed"; consider "is said to have told".
2. Ch2 era ladder is soft overall (Louis XVI, Marat, meter, conscription, Brumaire); conscription at $800 is close to a definition.
3. Ch8 chapter $1000 "the bee" and Ch13 final "bees" repeat an answer across chapters (allowed by the checker, but a player who did Ch8 gets Ch13's final for free).
4. Ch8 chapter $800: "unified body of civil law" with alternate "Civil Code" is a near-giveaway; primary answer Napoleonic Code is fine, left as is.
5. Ch3 chapter $1000 (Barras) mentions "Joséphine's lover", which reveals the $800 answer if the board is played out of order; harmless since "widow of a guillotined viscount" is unmistakable anyway.
6. Ch10 final NEITHER HOLY NOR ROMAN: category name plus clue spell out two of the three words; it is the category's gimmick, so left.
7. Ch14 era is on the easy side for Tier 5 (Switzerland "Alpine country", miners, grain).
8. Ch7 chapter $600 calls the Légion d'honneur badge a "white cross"; it is formally a five-armed white-enamelled star, though "cross" is common usage.
9. Ch5 era $600 (Volta, 1800) sits in a category named "...1798"; the era windows are loose by design.
