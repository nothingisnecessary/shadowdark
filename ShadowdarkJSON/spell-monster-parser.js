let tests =["2  tentacle  (near) +5 (1d8 + curse)",
"1 tail +5 (3d6)",
 "4 tentacle +5 (1d8 + latch)",
 "1 mind blast",
 "500 dirty smelly farts (fifty miles) +210 (3d6, stinky finger)",
 "4 greataxe +2 (1d10)",
 "1 spear (close/near) +2",
 "2 flaming warhammer +3 (1d10, ignites flammables)",
 "1 crossbow (far)",
 "3 slam +6 (2d6/3d6)",
 "1 touch +4 (1d8 + toxin + engulf)",
 "4 greatsword (near) +11 (1d12 + 2 + Moonbite properties)",
 "2 spell +5",
 "2d4 eyestalk ray",
 "1 bite (near) +13 (5d10 + sever + swallow)",
 "4 +3 vorpal bastard sword +9 (1d10 + lop)",
 "1 tail +5  (3d6)",
 "1 tail +5  (3d6)",
 "1 mace +1 (1d6)"
 ];
 
tests.forEach(o=> {
console.log(
  /^(?<qty>\d+(d\d+)?)\s*(?<name>(\+\d+)?[\w\s]*)\b(\s*)?(\((?<rng>([\w\s/]+))\)\s*)?(?<mod>[\+|\-]\d+)?(\s*)?[\(]?(?<dmg>\d+d\d+(\s\+\s\d+)?)?(\s*)?[\+,]?(\s)?(?<effect>[^\)][\w\s\+]*)?\)?/g.exec(o)?.groups)
});
  


// convert string to title case
function titleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function parseMonsters(text) {
  const alignments = {
    "C": "Chaotic",
    "L": "Lawful",
    "N": "Neutral"
  };
  const atkRegex = /([\+|\-]\d+)/;
  const dmgRegex = /\d+d\d+[\s+\w]*/g;
  const rngRegex = /\((\w+)\)/;
//  const attackRegex = /^(?<qty>\d+(d\d+)?)\s*(?<name>(\+\d+)?[\w\s]*)\b(\s*)?(\((?<rng>([\w\s/]+))\)\s*)?(?<mod>[\+|\-]\d+)?(\s*)?[\(]?(?<dmg>\d+d\d+(\s\+\s\d+)?)?(\s*)?[\+,]?(\s)?(?<effect>[^\)][\w\s\+]*)?\)?/g;
//const attackRegex = new RegExp(/^(?<qty>\\d+(d\\d+)?)\\s*(?<name>(\\+\\d+)?[\\w\\s]*)\\b(\\s*)?(\\((?<rng>([\\w\\s/]+))\\)\\s*)?(?<mod>[\\+|\\-]\\d+)?(\\s*)?[\\(]?(?<dmg>\\d+d\\d+(\\s\\+\\s\\d+)?)?(\\s*)?[\\+,]?(\\s)?(?<effect>[^\\)][\\w\\s\\+]*)?\\)?/g);

  const entries = [];
  let entry = [];
  let lines = text.split(/\n/);
  for (let l = 0; l < lines.length; ++l) {
    let line = lines[l]; ///.trim();
    if (!line?.length) continue; // skip dem empty lines

    // Find the first line containing the monster name
    // hacky assumption, but in book monsters begin with all-caps name.
    let isName = line.toUpperCase() === line && !line.match(/\d/);
    if (isName) {
      if (entry?.length) entries.push(entry.join("\n"));
      entry = [];
    }
    entry.push(line);
  }
  if (entry?.length) entries.push(entry.join("\n"));

  const monsters = [];
  let monster;
  let acLine = 0;

  entries.forEach(entry => {
    lines = entry.split(/\n/);
    for (let l = 0; l < lines.length; ++l) {
      let line = lines[l].trim();
      if (!line?.length) continue; // skip dem empty lines

      // Find the first line containing the monster name
      // hacky assumption, but in book monsters begin with all-caps name.
      let isName = line.toUpperCase() === line && !line.match(/\d/);
      if (isName) {
        // create new monster item and add to list
        monster = {
          name: titleCase(line),
          description: "",
          actions: [],
          stats: {}
        };
        monsters.push(monster);
        acLine = 0;
        continue;
      }

      // Assume AC is first stat. Everything between name and AC is Description text.
      // Hopefully there is no monster with "AC " in the description... shrug..
      if (acLine === 0) {
        if (line.startsWith('AC ')) {
          acLine = l;
        } else {
          if (monster.description.length) monster.description += " ";
          monster.description += line;
        }
      }

      if (acLine === 0) continue;
      if (!line.includes(".")) continue;
      else {
        monster.actions.push(line);
      }

      const slines = lines.slice(acLine).join(" ").split(/,/);
      for (let i = 0; i < slines.length; i++) {
        line = slines[i].trim(); // Trim leading and trailing whitespace for copy-paste issues	
        if (!line?.length) continue; // skip empty lines
        try {
          if (!monster.armorClass && line.startsWith('AC ')) {
            const [, AC, armor] = line.match(/AC (\d+)(?: \(([\w\s]+)\))?/);
            monster.armorClass = +AC;
            monster.armor = armor || "";
          } else if (!monster.maxHitPoints && line.startsWith('HP ')) {
            const [, HP] = line.match(/HP (\d+)/);
            monster.maxHitPoints = parseInt(HP, 10) || monster.name==="Hydra" ? 55 : 0; // hydra heads special case (5 heads)
          } else if (!monster.attacks && line.startsWith('ATK ')) {
            const [, attackText] = line.match(/ATK (.+)/);
            const attackStrings = attackText.split(/\bor\b|\band\b/).map(s => s.trim());
            const attacks = attackStrings.map(s => 
              /^(?<qty>\d+(d\d+)?)\s*(?<name>(\+\d+)?[\w\s]*)\b(\s*)?(\((?<rng>([\w\s/]+))\)\s*)?(?<mod>[\+|\-]\d+)?(\s*)?[\(]?(?<dmg>\d+d\d+(\s\+\s\d+)?)?(\s*)?[\+,]?(\s)?(?<effect>[^\)][\w\s\+]*)?\)?/g
              .exec(s)?.groups).filter(s=>s!==undefined);
            monster.attackText = attackText;
            monster.attacks = attacks.map(attack => {
              return {
                name: attack.name || "",
                qty: parseInt(attack.qty, 10),
                range: attack.rng || "",
                damage: attack.dmg || "",
                mod: parseInt(attack.mod, 10) || undefined
              };
            });
          } else if (!monster.stats.movement && line.toUpperCase().startsWith('MV ')) {
            monster.stats.movement = line.substring(3);
          } else if (!monster.stats.str_mod && line.toUpperCase().startsWith('S ')) {
            monster.stats.str_mod = parseInt(line.substring(2), 10) || 0;
          } else if (!monster.stats.dex_mod && line.toUpperCase().startsWith('D ')) {
            monster.stats.dex_mod = parseInt(line.substring(2), 10) || 0;
          } else if (!monster.stats.con_mod && line.toUpperCase().startsWith('C ')) {
            monster.stats.con_mod = parseInt(line.substring(2), 10) || 0;
          } else if (!monster.stats.int_mod && line.toUpperCase().startsWith('I ')) {
            monster.stats.int_mod = parseInt(line.substring(2), 10) || 0;
          } else if (!monster.stats.wis_mod && line.toUpperCase().startsWith('W ')) {
            monster.stats.wis_mod = parseInt(line.substring(2), 10) || 0;
          } else if (!monster.stats.cha_mod && line.toUpperCase().startsWith('CH ')) {
            monster.stats.cha_mod = parseInt(line.substring(3), 10) || 0;
          } else if (!monster.alignment && line.toUpperCase().startsWith('AL ')) {
            monster.alignment = alignments[line.substring(3)];
          } else if (!monster.level && line.toUpperCase().startsWith('LV ')) {
            monster.level = parseInt(line.substring(3), 10) || monster.name==="Hydra" ? 10 : 0; // hydra heads special case (5 heads)
            break; // done getting stats - get attack text next loop
          }
        }
        catch (ex) { 
          console.log(ex);
          console.log(monster); 
        }
      }
    }
  });
  monsters.forEach(m=>{if(m.actions?.length){m.actions = m.actions.join(" ")}});
  return monsters;
}


function parseSpells(text) {
  const spells = [];
  const paragraphs = text.split(/\n\n/);
  let currentSpell;
  for (let p = 0; p < paragraphs.length; ++p) {
    let paragraph = paragraphs[p].trim();
    const lines = paragraph.split(/\n/);
    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i].trim();
      if (!line) continue;
      if (!line.match(/^\d+$/)) {
        // hacky assumption, but in book spells begin with all-caps name.
        const isSpellName = line.toUpperCase() === line;
        if (isSpellName) {
          // create new spell item and add to list
          currentSpell = {
            name: titleCase(line),
            description: ""
          };
          spells.push(currentSpell);
        } else if (!currentSpell.tier) {
          // get spell tier number and eligible classes
          const res = line.split(',').map(item => item ? item.trim() : "");
          currentSpell.tier = parseInt(res[0].split(" ")[1], 10) || 1;
          currentSpell.dc = currentSpell.tier + 10;
          currentSpell.classes = res.splice(1).map(item => item.trim());
        } else if (!currentSpell.duration || !currentSpell.range) {
          // get duration and range
          const [key, value] = line.split(':').map(item => item ? item.trim() : "");
          if (key && value) {
            if (key.toLowerCase() === 'duration') {
              currentSpell.duration = value;
            } else if (key.toLowerCase() === 'range') {
              currentSpell.range = value;
            }
          }
        } else {
          // build description. todo: regex? meh.
          currentSpell.description += (currentSpell.description && !currentSpell.description.endsWith(".") ? " " : "") + line;
        }
      }
    }
    if (currentSpell.description &&
      paragraph.indexOf(currentSpell.name.toUpperCase()) !== 0 &&
      currentSpell.description.indexOf(paragraph) !== 0) {
      currentSpell.description =
        currentSpell.description.replace(paragraph, "\n\n" + paragraph);
    }
  }

  // try to parse damage and healing
  spells.forEach(spell => {
    spell.damage = parseProperty(spell.description, 'damage');
    spell.healing = parseProperty(spell.description, 'hit points');
  });

  return spells;
}

function parseProperty(description, property) {
  const regex = new RegExp(`(\\d+d\\d+)\\s${property}`, 'i');
  const match = description.match(regex);
  return match ? match[1] : '';
}

// Sample input without the page number
const input = `ACID ARROW 
Tier 2, wizard 
Duration: Focus 
Range: Far
You conjure a corrosive bolt that hits one foe, dealing 1d6 damage a round. The bolt remains in the target for as long as you focus.

ALARM
Tier 1, wizard
Duration: 1 day
Range: Close
You touch one object, such as a door threshold, setting a magical alarm on it. If any creature you do not designate while casting the spell touches or crosses past the object, a magical bell sounds in your head.

ALTER SELF
Tier 2, wizard
Duration: 5 rounds
Range: Self
You magically change your physical form, gaining one feature that modifies your existing anatomy.

For example, you can grow functional gills on your neck or bear claws on your fingers. This spell can’t grow wings or limbs.

ANIMATE DEAD
Tier 3, wizard
Duration: 1 day
Range: Close
You touch one humanoid's remains, and it rises as a zombie or skeleton under your control. The remains must have at least three limbs and its head intact.

The undead creature acts on your turn. After 1 day, the creature collapses into grave dust.
 
 	 
ANTIMAGIC SHELL 
Tier 5, wizard
Duration: Focus 
Range: Self
An invisible, near-sized cube of null-magic appears centered on you.

Within the cube, no spells can be cast. Magic items and spells have no effect in the zone, and no magic can enter.

The cube moves with you. Spells such as dispel magic have no effect on it.

Another antimagic shell does not affect this one.


ARCANE EYE
Tier 4, wizard 
Duration: Focus 
Range: Near
You conjure an invisible, grape- sized eye within range.

You can see through the eye. It can see in the dark out to near range, fly near on your turn, and squeeze through openings as narrow as a keyhole.

AUGURY 
Tier 2, priest 
Duration: Instant 
Range: Self
You interpret the meaning of supernatural portents and omens.

Ask the GM one question about a specific course of action. The GM says whether the action will lead to “weal” or “woe.”

BLESS
Tier 2, priest 
Duration: Instant 
Range: Close
One creature you touch gains a luck token.

BLIND/DEAFEN
Tier 2, priest 
Duration: Focus 
Range: Near
You utter a divine censure, blinding or deafening one creature you can see in range.

The creature has disadvantage on tasks requiring the lost sense.
 
 	 
BURNING HANDS 
Tier 1, wizard 
Duration: Instant 
Range: Close
You spread your fingers with thumbs touching, unleashing a circle of flame that roars out to a close area around where you stand.

Creatures within the area of effect take 1d6 damage, and flammable objects catch fire.

CHARM PERSON
Tier 1, wizard 
Duration: 1d8 days 
Range: Near
You magically beguile one humanoid of level 2 or less within near range, who regards you as a friend for the duration.

The spell ends if you or your allies do anything to hurt it that it notices.

The target knows you magically enchanted it after the spell ends.

CLEANSING WEAPON
Tier 2, priest
Duration: 5 rounds
Range: Close
One weapon you touch is wreathed in purifying flames. It deals an additional 1d4 damage (1d6 vs. undead) for the duration.

CLOUDKILL
Tier 4, wizard
Duration: 5 rounds
Range: Far
A putrid cloud of yellow poison fills a near-sized cube within range. It spreads around corners.

Creatures inside the cloud are blinded and take 2d6 damage at the beginning of their turns.

A creature of LV 9 or less that ends its turn fully inside the cloud dies.
 
 	 
COMMAND
Tier 3, priest 
Duration: Focus 
Range: Far
You issue a verbal command to one creature in range who can understand you. The command must be one word, such as “kneel.” The target obeys the command for as long as you focus.

If your command is ever directly harmful to the creature, it may make a CHA check vs. your last spellcasting check. On a success, the spell ends.


COMMUNE
Tier 4, priest 
Duration: Instant 
Range: Self
You seek your god's counsel. Ask the GM up to three yes or no questions. The GM truthfully answers "yes" or "no" to each.

If you cast this spell more than once in 24 hours, treat a failed spellcasting check for it as a critical failure instead.

CONFUSION
Tier 4, wizard 
Duration: Focus 
Range: Near
You mesmerize one creature you can see in range. The target can't take actions, and it moves in a random direction on its turn. If the target is LV 9+, it may make a WIS check vs. your last spellcasting check at the start of its turn to end the spell.

CONTROL WATER
Tier 4, priest, wizard 
Duration: Focus 
Range: Far
You move and shape water. You can cause a section of water up to 100 feet in width and depth to change shape, defy gravity, or flow in a different direction.
 
 	 
CREATE UNDEAD
Tier 5, wizard
Duration: 1 day
Range: Close
You conjure a vengeful undead creature to do your bidding.

When you cast this spell, you choose to summon either a wight or wraith. It appears next to you and is under your control.

The undead creature acts on your turn. After 1 day, it melts away into smoke.


CURE WOUNDS
Tier 1, priest 
Duration: Instant 
Range: Close
Your touch restores ebbing life.

Roll a number of d6s equal to 1 + half your level (rounded down). One target you touch regains that many hit points.

DETECT MAGIC
Tier 1, wizard 
Duration: Focus 
Range: Near
You can sense the presence of magic within near range for the spell's duration. If you focus for two rounds, you discern its general properties. Full barriers block this spell.

DETECT THOUGHTS
Tier 2, wizard Duration: Focus 
Range: Near
You peer into the mind of one creature you can see within range. Each round, you learn the target’s immediate thoughts.

On its turn, the target makes a WIS check vs. your last spellcasting check. If the target succeeds, it notices your presence in its mind and the spell ends.
 

 
 
 	 
DIMENSION DOOR
Tier 4, wizard 
Duration: Instant 
Range: Self
You teleport yourself and up to one other willing creature within close to any point you can see.

DISINTEGRATE
Tier 5, wizard 
Duration: Instant 
Range: Far
A green ray shoots from your finger and turns a creature or object into ash.

A target creature of LV 5 or less instantly dies. If it is LV 6+, it takes 3d8 damage instead.

A non-magical object up to the size of a large tree is destroyed.

DISPEL MAGIC
Tier 3, wizard 
Duration: Instant 
Range: Near
End one spell that affects one target you can see in range.

DIVINATION
Tier 4, wizard 
Duration: Instant 
Range: Self
You throw the divining bones or peer into the blackness between the stars, seeking a portent.

You can ask the GM one yes or no question. The GM truthfully answers "yes" or "no."

If you cast this spell more than once in 24 hours, treat a failed spellcasting check for it as a critical failure instead.

DIVINE VENGEANCE
Tier 5, priest
Duration: 10 rounds
Range: Self
You become the divine avatar of your god's wrath, wreathed in holy flames or a black aura of smoldering corruption.

For the spell's duration, you can fly a near distance, your weapons are magical, and you
have a +4 bonus to your weapon attacks and damage.
 
 	 
DOMINION
Tier 5, priest
Duration: 10 rounds
Range: Near
Mighty beings come to your aid.

The beings must have a combined total of 16 levels or less. Chaotic PCs summon demons/devils, and lawful or neutral PCs summon angels.

The beings act of free will to aid you on your turn. After 10 rounds, they return to their realms.

You cannot cast this spell again until you complete penance.

FABRICATE
Tier 3, wizard
Duration: 10 rounds
Range: Near
This spell can't target creatures.

You turn a tree-sized collection of raw materials into a finished work. For example, you convert a pile of bricks or rocks into
a bridge. The finished work converts back to raw materials when the spell ends.

FEATHER FALL
Tier 1, wizard 
Duration: Instant 
Range: Self
You may make an attempt to cast this spell when you fall.

Your rate of descent slows so that you land safely on your feet.

FIREBALL
Tier 3, wizard 
Duration: Instant 
Range: Far
You hurl a small flame that erupts into a fiery blast. All creatures in a near-sized cube around where the flame lands take 4d6 damage.

FIXED OBJECT
Tier 2, wizard
Duration: 5 rounds
Range: Close
An object you touch that weighs no more than 5 pounds becomes fixed in its current location. It can support up to 5,000 pounds of weight for the duration of the spell.
 
 	 
FLAME STRIKE
Tier 4, priest 
Duration: Instant 
Range: Far
You call down a holy pillar of fire, immolating one creature you can see within range. The target takes 2d6 damage.


FLOATING DISK
Tier 1, wizard
Duration: 10 rounds
Range: Near
You create a floating, circular disk of force with a concave center. It can carry up to 20 gear slots. It hovers at waist level and automatically stays within near of you. It can’t cross over drop- offs or pits taller than a human.

GASEOUS FORM
Tier 3, wizard
Duration: 10 rounds
Range: Self
You and your gear turn into a cloud of smoke for the spell's duration.

You can fly and pass through any gap that smoke could. You can sense the terrain and any movement around you out to a near distance.

You can't cast spells while in this form.

 	 
FLY
Tier 3, wizard
Duration: 5 rounds
Range: Self
Your feet lift from the ground, and you take to the air like a hummingbird. You can fly near for the spell's duration and are able to hover in place.

HEAL
Tier 5, priest 
Duration: Instant 
Range: Close
One creature you touch is healed to full hit points.

You cannot cast this spell again until you complete a rest.
 
 	 
HOLD MONSTER
Tier 5, wizard 
Duration: Focus 
Range: Near
You paralyze one creature you can see within range.
If the target is LV 9+, it may make a STR check vs. your last spellcasting check at the start of its turn to end the spell.

HOLY WEAPON
Tier 1, priest
Duration: 5 rounds
Range: Close
One weapon you touch is imbued with a sacred blessing. The weapon becomes magical and has +1 to attack and damage rolls for the duration.
 

 

HOLD PERSON
Tier 2, wizard 
Duration: Focus 
Range: Near
You magically paralyze one humanoid creature of LV 4 or less you can see within range.

HOLD PORTAL 
Tier 1, wizard
Duration: 10 rounds
Range: Near
You magically hold a portal closed for the duration. A creature must make a successful STR check vs. your spellcasting check to open the portal. The knock spell ends this spell.

ILLUSION
Tier 3, wizard 
Duration: Focus 
Range: Far
You create a convincing visible and audible illusion that fills up to a near-sized cube in range.

The illusion cannot cause harm, but creatures who believe the illusion is real react to it as though it were.

A creature who inspects the illusion from afar must pass a WIS check vs. your last spellcasting check to perceive the false nature of the illusion.

Touching the illusion also reveals its false nature.
 
 	 
INVISIBILITY
Tier 2, wizard
Duration: 10 rounds
Range: Close
A creature you touch becomes invisible for the spell’s duration.

The spell ends if the target attacks or casts a spell.
 
JUDGEMENT
Tier 5, priest
Duration: 5 rounds
Range: Close
You instantly banish a creature you touch, sending it and all possessions it carries to face the judgment of your god.

You can banish an intelligent creature of LV 10 or less.

When the creature returns in 5 rounds, it has been healed to full hit points if its deeds pleased your god. It has been reduced to 1 hit point if its deeds angered your god. If your god can't judge its actions, it is unchanged.

KNOCK
Tier 2, wizard 
Duration: Instant 
Range: Near
A door, window, gate, chest, or portal you can see within range instantly opens, defeating all mundane locks and barriers.

This spell creates a loud knock audible to all within earshot.
 
 	 
LAY TO REST 
Tier 3, priest 
Duration: Instant 
Range: Close
You instantly send an undead creature you touch to its final afterlife, destroying it utterly.

You can target an undead creature of LV 9 or less.

LEVITATE 
Tier 2, wizard 
Duration: Focus 
Range: Self
You can float a near distance vertically per round on your turn. You can also push against solid objects to move horizontally.

LIGHT 
Tier 1, priest, wizard 
Duration: 1 hour real time 
Range: Close
One object you touch glows with bright, heatless light, illuminating out to a near distance for 1 hour of real time.
 
LIGHTNING BOLT
Tier 3, wizard 
Duration: Instant 
Range: Far
You shoot a blue-white ray of lightning from your hands, hitting all creatures in a straight line out to a far distance.

Creatures struck by the lightning take 3d6 damage.

MAGE ARMOR
Tier 1, wizard
Duration: 10 rounds
Range: Self
An invisible layer of magical force protects your vitals. Your armor class becomes 14 (18 on a critical spellcasting check) for the spell’s duration.
 
 	 
MAGIC CIRCLE 
Tier 3, wizard 
Duration: Focus 
Range: Near
You conjure a circle of runes out to near-sized cube centered on yourself and name a type of creature (for example, demons).

For the spell’s duration, creatures of the chosen type cannot attack or cast a hostile spell on anyone inside the circle. The chosen creatures also can’t possess, compel, or beguile anyone inside the circle.


MAGIC MISSILE
Tier 1, wizard 
Duration: Instant 
Range: Far
You have advantage on your check to cast this spell.

A glowing bolt of force streaks from your open hand, dealing 1d4 damage to one target.

ASS CURE 
Tier 3, priest 
Duration: Instant 
Range: Near
All allies within near range of you regain 2d6 hit points.

MIRROR IMAGE
Tier 2, wizard
Duration: 5 rounds
Range: Self
You create a number of illusory duplicates of yourself equal to half your level rounded down (minimum 1). The duplicates surround you and mimic you.

Each time a creature attacks you, the attack misses and causes one of the duplicates to evaporate. If all of the illusions have disappeared, the spell ends.

MISTY STEP
Tier 2, wizard 
Duration: Instant 
Range: Self
In a puff of smoke, you teleport a near distance to an area you can see.
 
 	 
PASSWALL
Tier 4, wizard
Duration: 5 rounds
Range: Close
A tunnel of your height opens in a barrier you touch and lasts for the duration.

The passage can be up to near distance in length and must be in a straight line.


PILLAR OF SALT
Tier 4, priest 
Duration: Focus 
Range: Near
A creature you target turns into a statue made of hardened salt.

You can target a creature you can see of LV 5 or less.

If you successfully focus on this spell for 3 rounds in a row, the transformation becomes permanent.
 
PLANE SHIFT
Tier 5, priest, wizard 
Duration: Instant 
Range: Close
You fold space and time, transporting yourself and all willing creatures within close range to a location on another plane of your choice.

Unless you have been to your intended location before, you appear in a random place on the destination plane.
 
 	 
POLYMORPH
Tier 4, wizard
Duration: 10 rounds
Range: Close
You transform a creature you touch into another natural creature you choose of equal or smaller size. Any gear the target carries melds into its new form.

The target gains the creature's physical stats and features, but it retains its non-physical stats and features.

If the target goes to 0 hit points, it reverts to its true form at half its prior hit points.

You can target any willing creature with this spell, or an unwilling creature whose level is less than or equal to half your level rounded down (min. 1).

POWER WORD KILL
Tier 5, wizard 
Duration: Instant 
Range: Near
You utter the Word of Doom. One creature you target of LV 9 or less dies if it hears you.

Treat a failed spellcasting check for this spell as a critical failure, and roll the mishap with disadvantage.

PRISMATIC ORB
Tier 5, wizard 
Duration: Instant 
Range: Far
You send a strobing orb of energy streaking toward a target within range.

Choose an energy type from fire, cold, or electricity. The orb deals 3d8 damage and delivers a concussive blast of the chosen energy type.

If the energy type is anathema to the target's existence (for example, cold energy against a fire elemental), the orb deals double damage to it instead.
 
 
PROPHECY
Tier 5, priest 
Duration: Instant 
Range: Self
You commune directly with your god for guidance.

Ask the GM one question.
The GM answers the question truthfully using the knowledge your god possesses. Deities are mighty, but not omniscient.

You cannot cast this spell again until you complete penance.



PROTECTION FROM ENERGY
Tier 3, wizard 
Duration: Focus 
Range: Close
One creature you touch becomes impervious to the wild fury of the elements.

Choose fire, cold, or electricity. For the spell's duration, the target is immune to harm from energy of the chosen type.
 
PROTECTION FROM EVIL
Tier 1, priest, wizard 
Duration: Focus 
Range: Close
For the spell’s duration, chaotic beings have disadvantage
on attack rolls and hostile spellcasting checks against the target. These beings also can’t possess, compel, or beguile it.

When cast on an already- possessed target, the possessing entity makes a CHA check vs. the last spellcasting check. On a failure, the entity is expelled.
 
 	 
REBUKE UNHOLY
Tier 3, priest 
Duration: Instant 
Range: Near
You rebuke creatures who oppose your alignment, forcing them to flee. You must present a holy symbol to cast this spell.

If you are lawful or neutral, this spell affects demons, devils, and outsiders. If you are chaotic, this spell affects angels and natural creatures of the wild.

Affected creatures within near of you must make a CHA check vs. your spellcasting check. If a
creature fails by 10+ points and is equal to or less than your level, it is destroyed. Otherwise, on a fail, it flees from you for 5 rounds.

RESILIENT SPHERE
Tier 4, wizard
Duration: 5 rounds
Range: Close
You conjure a weightless, glassy sphere around you that extends out to close range.

For the spell's duration, nothing can pass through or crush the sphere.

You can roll the sphere a near distance on your turn.


 

 
REGENERATE 
Tier 4, priest 
Duration: Focus 
Range: Close
A creature you touch regains 1d4 hit points on your turn for the duration. This spell also regrows lost body parts.

RESTORATION
Tier 3, priest 
Duration: Instant 
Range: Close
With the touch of your hands, you expunge curses and illnesses. One curse, illness, or affliction of your choice affecting the target creature ends.
 
 
SCRYING
Tier 5, wizard 
Duration: Focus 
Range: Self
You look into a crystal ball or reflecting pool, calling up images of a distant place.

For the spell's duration, you can see and hear a creature or location you choose that is on the same plane.

This spell is DC 18 to cast if you try to scry on a creature or location that is unfamiliar to you.

Each round, creatures you view may make a WIS check vs. your last spellcasting check. On a success, they become aware of your magical observation.
 




SHAPECHANGE
Tier 5, wizard 
Duration: Focus 
Range: Self
You transform yourself and any gear you carry into another natural creature you've seen of level 10 or less. You assume the creature's physical stats and features, but you retain your non-physical stats and features (including INT, WIS, and CHA).

If you go to 0 HP while under the effects of this spell, you revert to your true form at 1 HP.
 

SENDING
Tier 3, wizard 
Duration: Instant 
Range: Unlimited
You send a brief, mental message to any creature with whom you are familiar who is on the same plane.
 
SHIELD OF FAITH
Tier 1, priest
Duration: 5 rounds
Range: Self
A protective force wrought of your holy conviction surrounds you. You gain a +2 bonus to your armor class for the duration.
 
 	 
SILENCE
Tier 2, wizard 
Duration: Focus 
Range: Far
You magically mute sound in a near cube within the spell’s range. Creatures inside the area are deafened, and any sounds they create cannot be heard.


SLEEP
Tier 1, wizard 
Duration: Instant 
Range: Near
You weave a lulling spell that fills a near-sized cube extending from you. Living creatures in the area of effect fall into a deep sleep if they are LV 2 or less.

Vigorous shaking or being injured wakes them.

SPEAK WITH DEAD
Tier 3, priest, wizard 
Duration: Instant 
Range: Close
A dead body you touch answers your questions in a distant, wheezing voice.

You can ask the dead body up to three yes or no questions (one at a time). The GM truthfully answers "yes" or "no" to each.

If you cast this spell more than once in 24 hours, treat a failed spellcasting check for it as a critical failure instead.


 
SMITE
Tier 2, priest 
Duration: Instant 
Range: Near
You call down punishing flames on a creature you can see within range. It takes 1d6 damage.

STONESKIN
Tier 4, wizard
Duration: 10 rounds
Range: Self
Your skin becomes like granite. For the spell's duration, your armor class becomes 17 (20 on a critical spellcasting check).
 
 
 
SUMMON EXTRAPLANAR
Tier 5, wizard 
Duration: Focus 
Range: Near
You reach into the outer planes, summoning forth a creature.

You summon an elemental or outsider of LV 7 or less. The
creature is under your control and acts on your turn.

If you lose focus on this spell, you lose control of the creature and it becomes hostile toward you and your allies.

You must pass a spellcasting check on your turn to return the creature to the outer planes.

TELEKINESIS
Tier 4, wizard 
Duration: Focus 
Range: Far
You lift a creature or object with your mind. Choose a target that weighs 1,000 pounds or less.

You can move it a near distance in any direction and hold it in place.

TELEPORT
Tier 5, wizard 
Duration: Instant 
Range: Close
You and any willing creatures you choose within close range teleport to a location you specify on your same plane.

You can travel to a known teleportation sigil or to a location you've been before. Otherwise, you have a 50% chance of arriving off-target.

TURN UNDEAD
Tier 1, priest 
Duration: Instant 
Range: Near
You rebuke undead creatures, forcing them to flee. You must present a holy symbol to cast this spell.

Undead creatures within near of you must make a CHA check vs. your spellcasting check. If a creature fails by 10+ points and is equal to or less than your level, it is destroyed. Otherwise, on a fail, it flees from you for 5 rounds.
 
 	 
WALL OF FORCE
Tier 4, wizard
Duration: 5 rounds
Range: Near
You lift your hands, conjuring a transparent wall of force.

The thin wall must be contiguous and can cover a near-sized area in width and length. You choose its shape.

Nothing on the same plane can physically pass through the wall.
 
WISH
Tier 5, wizard 
Duration: Instant 
Range: Self
This mighty spell alters reality.

Make a single wish, stating it as exactly as possible. Your wish occurs, as interpreted by the GM.

Treat a failed spellcasting check for this spell as a critical failure, and roll the mishap with disadvantage.


 	 
WEB
Tier 2, wizard
Duration: 5 rounds
Range: Far
You create a near-sized cube of sticky, dense spider web within the spell’s range. A creature stuck in the web can’t move and must succeed on a Strength check vs. your spellcasting check to free itself.

WRATH
Tier 4, priest
Duration: 10 rounds
Range: Self
Your weapons become magical +2 and deal an additional d8 damage for the spell's duration.

ZONE OF TRUTH
Tier 2, priest 
Duration: Focus 
Range: Near
You compel a creature you can see to speak truth. It can’t utter a deliberate lie while within range.
`;

// Parsing the spells
const parsedSpells = parseSpells(input);
console.log(JSON.stringify(parsedSpells, null, 2));
