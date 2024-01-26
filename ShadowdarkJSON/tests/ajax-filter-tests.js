const uri = `https://raw.githubusercontent.com/nothingisnecessary/shadowdark/main/ShadowdarkJSON/core-spells-and-monsters.json`;
var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
    const data = JSON.parse(this.responseText);
       console.log(data.version);
      console.log(`Found ${data.monsters.length} monsters`);
      console.log(`Found ${data.spells.length} spells`);
      const randomSpell = data.spells[Math.floor(Math.random() * data.spells.length)];
      const randomMonster = data.monsters[Math.floor(Math.random() * data.monsters.length)];
      console.log(`This spell seems handy: ${randomSpell.name} - ${randomSpell.description}`);
      console.log(`This monster seems scary! It has ${randomMonster.attacks?.length} attacks. ${randomMonster.name} - ${randomMonster.description}`);
      
      const brokenMonsters = data.monsters.filter(o=>!o.attacks).map(o=>o.name).join('; ');
      console.log(`These monsters have no attacks, that's weird: ${brokenMonsters}`);
    }
};
xhttp.open("GET", uri, true);
xhttp.send();
