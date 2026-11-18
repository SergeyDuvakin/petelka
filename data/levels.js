/* Сгенерировано из /workspace/petelka/levels.json (уровни 1–5) */
window.PETELKA_LEVELS = [
 {
  "id": 1,
  "item": "scarf",
  "name": "Первый шарф",
  "theme": "pastel",
  "width": 6,
  "height": 4,
  "balls": [
   {
    "color": "P",
    "amount": 14
   },
   {
    "color": "K",
    "amount": 14
   }
  ],
  "rows": [
   "P P P P P P",
   "K K K K K K",
   "P P P P P P",
   "K K K K K K"
  ],
  "motif": null,
  "newMechanic": "тап по клубку = петля; ряд готов",
  "intendedTrap": "нет",
  "targetTaps": 24
 },
 {
  "id": 2,
  "item": "scarf",
  "name": "Шарф «Полоска»",
  "theme": "pastel",
  "width": 6,
  "height": 5,
  "balls": [
   {
    "color": "K",
    "amount": 13
   },
   {
    "color": "L",
    "amount": 12
   },
   {
    "color": "P",
    "amount": 6
   }
  ],
  "rows": [
   "L L L L L L",
   "K ? ? ? ? K",
   "P P P P P P",
   "K ? K K ? K",
   "L L L L L L"
  ],
  "motif": null,
  "newMechanic": "свободная петля «?»",
  "intendedTrap": "потратить Лаванду на «?» — в верхнем ряду не хватит",
  "targetTaps": 30
 },
 {
  "id": 3,
  "item": "scarf",
  "name": "Шарф «Три цвета»",
  "theme": "pastel",
  "width": 6,
  "height": 4,
  "balls": [
   {
    "color": "K",
    "amount": 10
   },
   {
    "color": "P",
    "amount": 8
   },
   {
    "color": "T",
    "amount": 6
   }
  ],
  "rows": [
   "P P ? ? P P",
   "T ? T T ? T",
   "K K P P K K",
   "? T ? ? T ?"
  ],
  "motif": null,
  "newMechanic": "нехватка цвета",
  "intendedTrap": "Мята на «?» в рядах 1–2",
  "targetTaps": 24
 },
 {
  "id": 4,
  "item": "scarf",
  "name": "Шарф с блестящей каймой",
  "theme": "pastel",
  "width": 8,
  "height": 6,
  "balls": [
   {
    "color": "K",
    "amount": 14
   },
   {
    "color": "P",
    "amount": 10
   },
   {
    "color": "G",
    "amount": 24
   }
  ],
  "rows": [
   "G G G G G G G G",
   "G ? P ? ? P ? G",
   "G P ? ? ? ? P G",
   "G ? P ? ? P ? G",
   "G ? ? P P ? ? G",
   "G G G G G G G G"
  ],
  "motif": {
   "id": "rhomb",
   "color": "P"
  },
  "newMechanic": "люрекс (пряжа с блёстками) + ромб; слабина 0",
  "intendedTrap": "Люрекс на «?»: блестящая кайма верхнего ряда не довяжется",
  "targetTaps": 48
 },
 {
  "id": 5,
  "item": "mitten",
  "name": "Варежка «Полоски»",
  "theme": "nordic",
  "width": 7,
  "height": 6,
  "balls": [
   {
    "color": "K",
    "amount": 18
   },
   {
    "color": "C",
    "amount": 14
   },
   {
    "color": "F",
    "amount": 7
   },
   {
    "color": "H",
    "amount": 3
   }
  ],
  "rows": [
   "C C C C C C C",
   "? K K ? K K ?",
   "F F F F F F F",
   "? ? H H H ? ?",
   "C C C C C C C",
   "K K K K K K K"
  ],
  "motif": null,
  "newMechanic": "4-й клубок",
  "intendedTrap": "Клюква на «?»",
  "targetTaps": 42
 }
];
