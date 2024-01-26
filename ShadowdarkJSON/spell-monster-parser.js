// decoder ring for parsing monster/NPC alignment codes
const alignments = {
  "C": "Chaotic",
  "L": "Lawful",
  "N": "Neutral"
};

// convert string to title case
let titleCase = function(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// parse monster from copy-and-paste book format to shadowdarklings-style format
let parseMonsters = function(text) {
  const entries = [];
  let entry = [];
  let lines = text.split(/\n/);
  for (let l = 0; l < lines.length; ++l) {
    let line = lines[l];
    if (!line?.length) continue; // skip empty lines

    // Find the first line containing the monster name
    let isName = /^[A-Z][A-Z\s,]*[A-Z]$/.test(line);
    if (isName) {
      if (entry?.length) entries.push(entry.join("\n"));
      entry = [];
    }
    entry.push(line);
  }
  if (entry?.length) entries.push(entry.join("\n"));

  const monsters = [];
  let monster;
  let acIndex = 0;

  entries.forEach(entry => {
    lines = entry.split(/\n/);
    for (let l = 0; l < lines.length; ++l) {
      let line = lines[l].trim();
      if (!line?.length) continue; // skip empty lines

      // Find the first line containing the monster name
      let isName = /^[A-Z][A-Z\s,]*[A-Z]$/.test(line);
      if (isName) {
        // create new monster item and add to list
        monster = {
          name: titleCase(line),
          description: "",
          actions: [],
          stats: {}
        };
        acIndex = 0;
        continue;
      }

      // Assume AC is first stat. Everything between name and AC is Description text.
      // Hopefully there is no monster with "AC " in the description... shrug..
      if (/^AC \d+/.test(line)) {
        acIndex = l;
        break; // found start of stat block; exit loop
      } else {
          if (monster.description.length) monster.description += " ";
          monster.description += line;
      }
    }

    // push monster only if found the stats block
    if (acIndex > 0)
    {
      monsters.push(monster);
    }
    else {
      console.log(`Unable to parse stats for ${monster.name}`);
      return; // parse next monster, skip forEach iteration
    }

    // stats come before actions - first stat is "AC" (armor class) and final stat is "LV" (level)
    // attacks are included in the stats block using "ATK"
    const statsAndActionsLines = lines.slice(acIndex);

    // find beginning of actions text
    const actionsIndex = statsAndActionsLines.findIndex(o=>/(^\d+|[Ll][Vv]\s(\d+|\*)(\/\d+)?)$/.test(o)) + 1;
    const actionsLines = statsAndActionsLines.slice(actionsIndex);
    monster.actions = parseActions(actionsLines);

    // slice out and parse stats from between monster description and actions
    const statsLines = statsAndActionsLines.slice(0, actionsIndex).map(o=>o.trim()).join(" ").split(/,/);
    for (let i = 0; i < statsLines.length; i++) {
      let statsLine = statsLines[i].trim(); // Trim leading and trailing whitespace for copy-paste issues	
      if (!statsLine?.length) continue; // skip empty lines
      try {
        if (!monster.armorClass && statsLine.startsWith('AC ')) {
          const [, AC, armor] = statsLine.match(/AC (\d+)(?: \(([\w\s]+)\))?/);
          monster.armorClass = +AC;
          monster.armor = armor || "";
        } else if (!monster.maxHitPoints && /^[Hh][Pp]\s(\*|\d+)(\/\d+)?$/.test(statsLine)) {
          // if there is a rare case of multi-value like 4/5 grab the first number (ex: elementals don't have separate lesser/greater stats in the book)
          const hp = /^[Hh][Pp]\s(?<hp>\*|\d+)(\/\d+)?$/.exec(statsLine).groups?.hp || "";
          monster.maxHitPoints = parseInt(hp, 10) || (monster.name==="Hydra" ? 55 : 0); // hydra heads special case (5 heads)
        } else if (!monster.attacks && statsLine.startsWith('ATK ')) {
              // hacky fix for Azer (and other stat blocks that have comma in the ATK section)
          if(/^\s+[^A-Z]/.test(statsLines[i+1]))
          {
            statsLine += ' + ' + statsLines[i+1]; // restore comma
          }
          const [, attackText] = statsLine.match(/ATK (.+)/);
          const attackStrings = attackText.split(/\bor\b|\band\b/).map(s => s.trim());
          const attacks = attackStrings.map(s => 
            /^(?<qty>\d+(d\d+)?)\s*(?<name>(\+\d+)?[\w\s]*)\b(\s*)?(\((?<rng>([\w\s/]+))\)\s*)?(?<mod>[\+|\-]\d+)?(\s*)?[\(]?(?<dmg>(\d+[Dd]\d+|\d+)(\s\+\s\d+)?)?(\/\d+[Dd]\d+)?(\s*)?[\+,]?(\s+)?(?<effect>[^\)][\w\s\+]*)?\)?/g
            .exec(s)?.groups).filter(s=>s!==undefined);
          monster.attackText = attackText;
          monster.attacks = attacks.map(attack => {
            return {
              name: titleCase(attack.name || ""),
              qty: parseInt(attack.qty, 10),
              range: attack.rng || "",
              damage: attack.dmg || "",
              mod: parseInt(attack.mod, 10) || undefined,
              effect: attack.effect || ""
            };
          });
        } else if (!monster.movement && /^[Mm][Vv]\s[\(\s\w/]*[\w\)]$/.test(statsLine)) {
          monster.movement = statsLine.substring(3);
        } else if (!monster.stats.str_mod && /^[Ss]\s[\+\-]+[\d]+$/.test(statsLine)) {
          monster.stats.str_mod = parseInt(statsLine.substring(2), 10) || 0;
          monster.stats.STR = Math.max(1, 10 + 2 * monster.stats.str_mod); // derive core stat
        } else if (!monster.stats.dex_mod && /^[Dd]\s[\+\-]+[\d]+$/.test(statsLine)) {
          monster.stats.dex_mod = parseInt(statsLine.substring(2), 10) || 0;
          monster.stats.DEX = Math.max(1, 10 + 2 * monster.stats.dex_mod); // derive core stat
        } else if (!monster.stats.con_mod && /^[Cc]\s[\+\-]+[\d]+$/.test(statsLine)) {
          monster.stats.con_mod = parseInt(statsLine.substring(2), 10) || 0;
          monster.stats.CON = Math.max(1, 10 + 2 * monster.stats.con_mod); // derive core stat
        } else if (!monster.stats.int_mod && /^[Ii]\s[\+\-]+[\d]+$/.test(statsLine)) {
          monster.stats.int_mod = parseInt(statsLine.substring(2), 10) || 0;
          monster.stats.INT = Math.max(1, 10 + 2 * monster.stats.int_mod); // derive core stat
        } else if (!monster.stats.wis_mod && /^[Ww]\s[\+\-]+[\d]+$/.test(statsLine)) {
          monster.stats.wis_mod = parseInt(statsLine.substring(2), 10) || 0;
          monster.stats.WIS = Math.max(1, 10 + 2 * monster.stats.wis_mod); // derive core stat
        } else if (!monster.stats.cha_mod && /^[Cc][Hh]\s[\+\-]+[\d]+$/.test(statsLine)) {
          monster.stats.cha_mod = parseInt(statsLine.substring(3), 10) || 0;
          monster.stats.CHA = Math.max(1, 10 + 2 * monster.stats.cha_mod); // derive core stat
        } else if (!monster.alignment && /^[Aa][Ll]\s+[\(\w\s]*[\w\)]$/.test(statsLine)) {
          monster.alignment = alignments[statsLine.substring(3)];
        } else if (!monster.level && /^[Ll][Vv]\s(\*|\d+)(\/\d+)?$/.test(statsLine)) {
          // if there is a rare case of multi-value like 4/5 grab the first number (ex: elementals don't have separate lesser/greater stats in the book)
          const levelText = /^[Ll][Vv]\s(?<level>\*|\d+)(\/\d+)?$/.exec(statsLine).groups?.level || "";
          monster.level = parseInt(levelText, 10) || (monster.name==="Hydra" ? 10 : 0); // hydra heads special case (5 heads)
          break; // done getting stats - get attack text next loop
        }
      }
      catch (ex) { 
        console.log(ex);
        console.log(monster); 
      }
    }
  });
  return monsters;
}
		
let parseActions = function(inputArray) {
  const result = [];

  for (let i = 0; i < inputArray.length; i++) {
    const actionObject = {
      name: '',
      description: ''
    };

    // action name
    const actionNameRegex = /^[A-Z][^A-Z][^.]*/;
    const actionNameMatch = inputArray[i].match(actionNameRegex);
    if (actionNameMatch) {
      actionObject.name = actionNameMatch[0].trim();
    }

    // description
    const descriptionRegex = /\..*?(\.|$)/;
    const descriptionMatch = inputArray[i].match(descriptionRegex);
    if (descriptionMatch) {
      actionObject.description = inputArray[i].substring(descriptionMatch.index + 1).trim();

      // concatenate subsequent lines for description
      let j = i + 1;
      while (j < inputArray.length && !actionNameRegex.test(inputArray[j])) {
        actionObject.description += ' ' + inputArray[j].trim();
        j++;
      }

      i = j - 1; // skip processed lines
    }

    // sanity check - add only if both name and description are not empty
    if (actionObject.name !== '' && actionObject.description !== '') {
      result.push(actionObject);
    }
  }		
  return result;
};

let parseFeatures = function(inputArray) {
  const result = [];
  for (let i = 0; i < inputArray.length; i++) {
    const feature = {
      name: '',
      description: ''
    };

    // feature name
    const featureNameRegex = /^[A-Z][^.]*/;
    const featureNameMatch = inputArray[i].match(featureNameRegex);
    if (featureNameMatch) {
      feature.name = featureNameMatch[0].trim();
    }

    // description
    const descriptionRegex = /\..*?(\.|$)/;
    const descriptionMatch = inputArray[i].match(descriptionRegex);
    if (descriptionMatch) {
      feature.description = inputArray[i].substring(descriptionMatch.index + 1).trim();

      // concatenate subsequent lines for description
      let j = i + 1;
      while (j < inputArray.length && !featureNameRegex.test(inputArray[j])) {
        feature.description += ' ' + inputArray[j].trim();
        j++;
      }
      i = j - 1; // skip processed lines
    }
    // sanity check - add only if both name and description are not empty
    if (feature.name !== '' && feature.description !== '') {
      result.push(feature);
    }
  }
  return result;
};

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
      if (!/^\d+$/.test(line)) {
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
  const regex = new RegExp(`(\\d+[Dd]\\d+)\\s${property}`, 'i');
  const match = description.match(regex);
  return match ? match[1] : '';
}
