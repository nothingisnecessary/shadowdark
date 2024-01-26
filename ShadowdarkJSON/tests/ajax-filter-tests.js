const uri = `https://raw.githubusercontent.com/nothingisnecessary/shadowdark/main/ShadowdarkJSON/core-spells-and-monsters.json`;
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
    const data = JSON.parse(this.responseText);
      console.log(`ShadowdarkJSON version ${data.version}`);
      console.log(`Found ${data.monsters.length} monsters`);
      console.log(`Found ${data.spells.length} spells`);
      const randomSpell = data.spells[Math.floor(Math.random() * data.spells.length)];
      const dangerousMonsters = data.monsters.filter(o=>o.attacks?.length > 2);
      const randomMonster = dangerousMonsters[Math.floor(Math.random() * dangerousMonsters.length)];
      console.log(`This spell seems handy: ${randomSpell.name} - ${randomSpell.description}`);
      console.log(`This monster seems scary! It has ${randomMonster.attacks?.length} attacks. ${randomMonster.name}; ${randomMonster.description}`);
      
      const monstersWithoutAttacks = data.monsters.filter(o=>!o.attacks).map(o=>o.name).join('; ');
      if(monstersWithoutAttacks.length) console.log(`These monsters have no attacks, that's weird: ${monstersWithoutAttacks}`);
      else console.log("There are no monsters with missing attacks! yay.")
      const monstersMissingStats = data.monsters.filter(o=>
      	o.stats===undefined ||
        o.stats.str_mod===undefined ||
        o.stats.dex_mod===undefined ||
        o.stats.con_mod===undefined ||
        o.stats.int_mod===undefined ||
        o.stats.wis_mod===undefined ||
        o.stats.cha_mod===undefined ||
        o.maxHitPoints===undefined ||
        o.level===undefined ||
        o.alignment===undefined ||
        o.armorClass===undefined ||
        !o.movement
        ).map(o=>o.name).join('; ');
      if(monstersMissingStats.length) console.log(`These monsters are missing stats, that's bad: ${monstersMissingStats}`);
      else console.log("There are no monsters with missing stats! woot.")
    }
};
xhttp.open("GET", uri, true);
xhttp.send();
