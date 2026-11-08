# fresh-14 independent check (56 categories, 280 clues, Round 2 $400–$2000)

All 280 clues read against CHECK-BRIEF.md for accuracy, single answer, clue/response agreement, ladder, category fit, giveaways, length (100 cap on the top three rows, 110 on the bottom two) and banned phrases. Also ran a pack-wide scan for repeated responses and for one category's response appearing in another category's clue. `python3 validate.py fresh-14`: 0 errors, 0 warnings before and after. Ids, names, values, order and the `isDailyDouble` field are unchanged.

## Changes made (before → after, reason)

### Response / duplicate / agreement fixes
- HIGH C'S ADVENTURE $800: "Mimì, a seamstress with a telltale cough, charms a poet in this Puccini opera set in Paris' Latin Quarter" (La Bohème) → "A diva leaps from Rome's Castel Sant'Angelo after her painter lover is shot in this Puccini opera" (Tosca). Reason: La Bohème was a duplicate response with GRAND OPERA $400 in the same pack; Tosca is the same difficulty and keeps the Puccini slot.
- CONCRETE EVIDENCE $400: "Without cooling pipes, Hoover Dam's vast pour of this material would have taken a century to cool" (concrete) → "Without cooling pipes, the concrete in this 1930s Colorado River dam would need a century to cool" (Hoover Dam). Reason: the response was the category title's own word, a free answer; same fact, same row difficulty.
- STELLAR OBITUARIES $1200: response "a neutron star" → "neutron stars (a neutron star)". Reason: clue says "these city-sized stellar corpses" (plural).

### Length trims (top three rows over the 100-char cap; facts unchanged)
- HAT TRICKS $800 (103→93): "Sarah Bernhardt played a princess in the 1882 play..." → "Sarah Bernhardt starred in the 1882 play that gave this soft, pinch-crowned felt hat its name".
- PLANT DEFENSES & TRICKS $800 (107→92): "Brush its leaves and they fold up in seconds: ..." → "Its leaves fold up at a touch: this 'sensitive plant' shares its name with a brunch cocktail".
- PLUME & CIRCUMSTANCE $800 (106→96): "...appeared under the byline Richard Bachman, a cover for..." → "'Thinner' and 'The Running Man' bore the byline Richard Bachman, a cover for this Maine novelist".
- SILICON VALLEY GENESIS $800 (109→98): "A coin flip decided whose name came first in this company..." → "A coin flip set the name order of this company Bill and Dave started in a Palo Alto garage in 1939".
- READING THE ENEMY'S MAIL $800 (107→98): "...this German diplomat's 1917 telegram..." → "British codebreakers read this German's 1917 telegram offering Mexico an alliance against the U.S.".
- GREEK THINKERS $800 (108→92): "...and his Academy taught in Athens for centuries" → "His 'Republic' imagines philosopher-kings ruling a just city, and he founded Athens' Academy".
- ARIA READY? $800 (106→94): "The Queen of the Night hits stratospheric high F's in this Mozart opera..." → "The Queen of the Night's high F's soar in this Mozart opera featuring the birdcatcher Papageno".
- GREAT HALLS OF FIRE $800 (107→100): "...at this Harlem showplace in 1934, where acts still rub a lucky tree stump" → "Ella Fitzgerald won Amateur Night in 1934 at this Harlem showplace where acts rub a lucky tree stump".
- SMALL THINGS CONSIDERED $800 (104→99): "...with a tiny rolling tip" → "...for this writing tool with a rolling tip".
- RHETORIC & ROLL $800 (101→98): "deploys this figure" → "uses this figure".
- CONCRETE EVIDENCE $800 (104→100): "naming it for a stone quarried on an English isle" → "named for a stone quarried on an English isle".
- GRAND OPERA $800 (110→100): "...enslaved Ethiopian princess, premiered in Cairo in 1871" → "...enslaved Ethiopian princess for Cairo in 1871".
- SOUNDING OFF $800 (108→97): "As a colonial postmaster, Benjamin Franklin charted this warm current so mail ships could ride it to England" → "Postmaster Benjamin Franklin charted this warm current so mail ships could ride it toward England".
- JARGON BELLS $800 (104→95): "from the German for 'leading motive'" → "German for 'leading motive'".
- POET'S CORNER OFFICE $800 (105→98): "Illinois' poet laureate for over 30 years, this 'We Real Cool' writer..." → "Illinois' laureate for over 30 years, this 'We Real Cool' poet was the first Black Pulitzer winner".
- OPENING LINES $800 (104→92): "single men in possession of good fortunes" → "single men with good fortunes".
- ODD DUCKS $800 (110→97): "has survived exposure to outer space" → "has survived open space".
- RENAISSANCE FAIR $800 (102→96): "The Uffizi's crowds flock" → "Uffizi crowds flock".
- ROUTE AWAKENING $800 (102→97): "China's coveted fabric westward" → "China's prized fabric west".
- THE JET SET $800 (107→96): "The age of airship travel ended when this German passenger zeppelin burned..." → "Passenger airship travel ended when this German zeppelin burned at Lakehurst, New Jersey in 1937".
- SMALL SCREEN, BIG UNIVERSE $800 (107→94): "chased aliens and conspiracies on this 1990s series where 'the truth is out there'" → "chased aliens on this 1990s series insisting 'the truth is out there'".
- PRISM BREAK $800 (101→95): "the color order flips" → "the colors flip".
- ALL'S FAIR IN WEIRD WAR $800 (102→96): "History's shortest war, in 1896, took Britain under an hour to beat..." → "In 1896 Britain beat this East African island sultanate in under an hour, history's shortest war".
- ANIMAL ESP $800 (102→97): "just beyond red light" → "beyond red light".
- ILL WINDS $800 (107→97): "These hot, dry autumn gusts roaring toward the Southern California coast are infamous for fanning wildfires" → "These hot, dry autumn gusts that roar toward the Southern California coast fan infamous wildfires".
- HISTORY IN A BLENDER $800 (104→99): "the arch Napoleon commissioned" → "the arch Napoleon ordered".
- FROM DELTA TO DETROIT $800 (108→95): "...first heard it from a slide guitarist at a Mississippi depot" → "W.C. Handy, the self-styled 'Father' of this genre, first heard it at a Mississippi train depot".
- GAME CHANGERS $800 (106→100): "took off when Johnny Carson tangled with Eva Gabor on TV in 1966" → "took off once Johnny Carson played it with Eva Gabor on TV".
- STELLAR OBITUARIES $800 (103→98): "In about 5 billion years the Sun will swell into this type of star, likely swallowing Mercury and Venus" → "In some 5 billion years the Sun will swell into this kind of star, likely eating Mercury and Venus".
- CLAWS CÉLÈBRES $800 (109→100): "from the London Zoo in 1882, and his name became a byword for 'huge'" → "from London's zoo in 1882, and his name came to mean 'huge'".
- FRETS ABOUT NOTHING $800 (102→97): "dubbed a 'jumping flea'" → "the 'jumping flea'".

No row swaps needed; no factual errors found that required replacing a detail.

## Facts verified and left alone (the non-obvious ones)
Galveston 1900 (~8,000 dead, deadliest U.S. natural disaster); Oresteia the only surviving complete trilogy; Sardou's "Fédora" 1882 with Bernhardt; Lock & Co. "Coke" 1849; Pound's "In a Station of the Metro"; Mrs. Malaprop's "pineapple of politeness" and aunt status; Pollyanna 1913; Trilby 1894; Mimosa pudica; Churchill 13 May 1940 first Commons speech as PM; Truth at Akron 1851; Bryan 1896; Thinner/Running Man as Bachman; Alcott as A.M. Barnard; Bickerstaff/Partridge; Google's 1998 Menlo Park garage; HP coin flip 1939; traitorous eight/Fairchild; Moore 1965; ARPANET UCLA→SRI 1969; Lotus 25 monocoque and 78/79 ground effect; W25 paint-scraping legend; BT46B Swedish GP 1978; DFV debut win Zandvoort 1967, last win 1983; Name of the Rose as Eco's debut novel; The Stranger 1942; Tin Drum 1959; Zimmermann 1917; Midway "AF" ruse; Venona/Fuchs; Huygens 1656; Day of Two Noons 18 Nov 1883; Harrison a Yorkshire carpenter; Anansi's price (hornets, python, leopard); Eshu's two-colored hat; Kind of Blue 1959, Time Out, A Love Supreme (rec. 1964, rel. 1965), Fables of Faubus, Coleman's plastic alto; Oak→Java 1995; BASIC 1964; Backus/FORTRAN; McCarthy/LISP 1958; Queen of the Night F6; Rusalka 1901; Hyatt Regency 114 dead; Quebec Bridge 1907/1916; molasses flood 21 dead; Tay Bridge 1879; Carnegie Hall 1891; Apollo Tree of Hope; Ryman 1892; CBGB acronym; Festspielhaus 1876; brunch 1895 Beringer; smog 1905; gerrymander 1812; chortle; Biro; Priestley/rubber 1770; Hunt's $15 debt/$400 sale; Goldman 1937; Aspdin 1824; Edison concrete houses; pozzolana/Pozzuoli; Aida Cairo 1871; Wozzeck 1925; Carnegie ~2,500 libraries; Hopkins $7M; Peabody housing/museums; HMS Challenger 1875; Tharp; Hess/Arnold Guyot; film dates (2006/2002/1988/2000/1925); encore vs bis; melisma; tritone; Tennyson 1850–92; Brooks Illinois laureate 1968–2000, Pulitzer 1950; Dryden 1668; Duffy 2009 (341 yrs); Harjo 2019; Panama southeast transit; Grand Canal ~1,100 mi from the Sui; Kaiser-Wilhelm-Kanal; narwhal tusk to ~9–10 ft; Turritopsis dohrnii; hoatzin wing claws; Life of Pi 2002; Atwood/Evaristo 2019; Golden Man Booker 2018; Midnight's Children Booker of Bookers; Gehrig 2,130 (benched 2 May 1939); DiMaggio 56; Ripken 6 Sept 1995; Celtics 1959–66; Moses 122 straight; Michelangelo's "Syrian bow" sonnet; Masaccio d. ~27; Mantegna Camera degli Sposi oculus; Great Ocean Road by returned WWI servicemen; Khunjerab 4,693 m ≈ 15,400 ft; Concorde to 2003; Hindenburg 1937; 747 1970; Yeager/Glamorous Glennis 1947; Comet 1952 square windows; Khan "Space Seed" 1967; Roddenberry Pan Am pilot; Majel Barrett roles; Prisoner 1967; secondary-rainbow violet outside; Cherenkov; Fraunhofer Bavarian; Emu War 1932; Anglo-Zanzibar 1896 (~40 min); Pig War 1859; Football War 1969; Scilly 1986; South Sea 1720/Newton quote (hedged "reportedly"); John Law; star-nosed mole 22 rays; Ivan IV first crowned tsar; Gordy's $800; Handy at Tutwiler depot; Johnson's 29 songs; Chess brothers Polish-born; Jenga/kujenga; Twister/Carson/Gabor 1966; Abbott/Candy Land; Bradley 1860; Magie 1904; Chandrasekhar limit ~1.4 solar masses; Phil since 1887; Jumbo 1882; Hachiko ~9 yrs; Cher Ami; Wojtek; al-'ud→lute; bouzouki in 1960s Irish folk; LHC 27 km; Bagger 288; Bertha 57.5 ft Seattle; Falkirk Wheel; Brown 1954, Miranda 1966, Plessy 1896, Gideon 1963, Schenck 1919.

## Still shaky / judgment calls (left as is)
- Wagner/Bayreuth recurs across HIGH C'S ADVENTURE $1200 (Wagner), GRAND OPERA $1200 (the Ring) and GREAT HALLS OF FIRE $2000 (Festspielhaus); distinct responses, so left, but a board builder should not seat those three together. Likewise the four opera/classical categories (HIGH C'S, ARIA READY?, GRAND OPERA, JARGON BELLS) in one pack.
- Cross-category name drops that hint at another category's response are all common words or low-row answers (Socrates/Plato/Aristotle in GREEK DRAMA and RENAISSANCE FAIR clues; "Python" in TRICKSTER TREAT; "brunch" in PLANT DEFENSES; "jumbo jet" in THE JET SET vs CLAWS CÉLÈBRES $800 Jumbo). Left alone.
- STORM WARNING $1600 "none form on the equator": strictly "within about 5 degrees of it"; the standard textbook phrasing is kept.
- Hoover Dam cooling is usually quoted as ~125 years uncooled; "a century" stands as the editor left it.
- Madam C.J. Walker "first self-made female millionaire" is a popular (Guinness) claim, hedged with "Called".
- Neutron-star teaspoon mass is quoted anywhere from millions to billions of tons; "a billion tons" is within the usual range.
- GRAND OPERA $1200 "15-hour" Ring: performances run roughly 15–17 hours; fine.
- Tennyson "42 years": 1850–1892 is 41 years 11 months; the round figure is the standard one.
- ANIMAL ESP $1200 response "electricity" (sharks sense electric fields) is a loose but standard phrasing; "electric fields" would also be accepted by any host.
