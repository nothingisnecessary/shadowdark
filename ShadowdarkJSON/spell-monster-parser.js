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
  let acLine = 0;

  entries.forEach(entry => {
    lines = entry.split(/\n/);
    for (let l = 0; l < lines.length; ++l) {
      let line = lines[l].trim();
      if (!line?.length) continue; // skip dem empty lines

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
        monsters.push(monster);
        acLine = 0;
        continue;
      }

      // Assume AC is first stat. Everything between name and AC is Description text.
      // Hopefully there is no monster with "AC " in the description... shrug..
      if (acLine === 0) {
        if (/^AC \d+/.test(line)) {
          acLine = l;
        } else {
          if (monster.description.length) monster.description += " ";
          monster.description += line;
        }
      }

      if (acLine === 0) continue;

      // actions lines
      if (!monster.actions?.length)
      {
        const actionsLines = lines.slice(acLine).slice(lines.slice(acLine).findIndex(o=>/[Ll][Vv]\s[\d+|\*]$/.test(o))+1);
        monster.actions = parseActions(actionsLines);
      }

      // stat lines
      const statsLines = lines.slice(acLine).map(o=>o.trim()).join(" ").split(/,/);
      for (let i = 0; i < statsLines.length; i++) {
        const statsLine = statsLines[i].trim(); // Trim leading and trailing whitespace for copy-paste issues	
        if (!statsLine?.length) continue; // skip empty lines
        try {
          if (!monster.armorClass && statsLine.startsWith('AC ')) {
            const [, AC, armor] = statsLine.match(/AC (\d+)(?: \(([\w\s]+)\))?/);
            monster.armorClass = +AC;
            monster.armor = armor || "";
          } else if (!monster.maxHitPoints && statsLine.startsWith('HP ')) {
            const [, HP] = statsLine.match(/HP (\d+)/);
            monster.maxHitPoints = parseInt(HP, 10) || monster.name==="Hydra" ? 55 : 0; // hydra heads special case (5 heads)
          } else if (!monster.attacks && statsLine.startsWith('ATK ')) {
            const [, attackText] = statsLine.match(/ATK (.+)/);
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
          } else if (!monster.stats.movement && /^[Mm][Vv]\s[\(\s\w/]*[\w\)]$/.test(statsLine)) {
            monster.stats.movement = statsLine.substring(3);
          } else if (!monster.stats.str_mod && /^[Ss]\s[\+\-]*[\d]+$/.test(statsLine)) {
            monster.stats.str_mod = parseInt(statsLine.substring(2), 10) || 0;
          } else if (!monster.stats.dex_mod && /^[Dd]\s[\+\-]*[\d]+$/.test(statsLine)) {
            monster.stats.dex_mod = parseInt(statsLine.substring(2), 10) || 0;
          } else if (!monster.stats.con_mod && /^[Cc]\s[\+\-]*[\d]+$/.test(statsLine)) {
            monster.stats.con_mod = parseInt(statsLine.substring(2), 10) || 0;
          } else if (!monster.stats.int_mod && /^[Ii]\s[\+\-]*[\d]+$/.test(statsLine)) {
            monster.stats.int_mod = parseInt(statsLine.substring(2), 10) || 0;
          } else if (!monster.stats.wis_mod && /^[Ww]\s[\+\-]*[\d]+$/.test(statsLine)) {
            monster.stats.wis_mod = parseInt(statsLine.substring(2), 10) || 0;
          } else if (!monster.stats.cha_mod && /^[Cc][Hh]\s[\+\-]*[\d]+$/.test(statsLine)) {
            monster.stats.cha_mod = parseInt(statsLine.substring(3), 10) || 0;
          } else if (!monster.alignment && /^[Aa][Ll]\s+[\(\w\s]*[\w\)]$/.test(statsLine)) {
            monster.alignment = alignments[statsLine.substring(3)];
          } else if (!monster.level && /^[Ll][Vv]\s+(\*|\d+)$/.test(statsLine)) {
            monster.level = parseInt(statsLine.substring(3), 10) || monster.name==="Hydra" ? 10 : 0; // hydra heads special case (5 heads)
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
    const actionNameRegex = /^[A-Z][^.]*/;
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
  const regex = new RegExp(`(\\d+d\\d+)\\s${property}`, 'i');
  const match = description.match(regex);
  return match ? match[1] : '';
}
