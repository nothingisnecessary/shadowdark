// Parsing monster actions

let tests =["2  tentacle  (near) +5 (1d8 + curse)",
"1 tail +5 (3d6)",
 "4 tentacle +5 (1d8 + latch)",
 "1 mind blast",
 "500 unstable gnomish grenades (fifty miles) +210 (3d6, tar sludge cover)",
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
