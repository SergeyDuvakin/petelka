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
  "motif": {
   "id": "stripes",
   "color": "P",
   "bg": "K"
  },
  "newMechanic": "тап по клубку = петля; ряд готов",
  "intendedTrap": "нет",
  "targetTaps": 24
 },
 {
  "id": 2,
  "item": "scarf",
  "name": "Шарф «Зигзаг»",
  "theme": "pastel",
  "width": 6,
  "height": 8,
  "balls": [
   {
    "color": "K",
    "amount": 37
   },
   {
    "color": "L",
    "amount": 12
   }
  ],
  "rows": [
   "? ? ? ? ? ?",
   "K K K K K K",
   "K K L L K K",
   "K L K K L K",
   "L K K K K L",
   "K K L L K K",
   "K L K K L K",
   "L K K K K L"
  ],
  "motif": {
   "id": "zigzag",
   "color": "L",
   "bg": "K"
  },
  "newMechanic": "свободная петля «?» (только в нижней кайме, вдали от узора)",
  "intendedTrap": "потратить Лаванду на «?» в кайме — на верхний зигзаг не хватит",
  "targetTaps": 48
 },
 {
  "id": 3,
  "item": "scarf",
  "name": "Шарф «Тюльпан»",
  "theme": "pastel",
  "width": 7,
  "height": 7,
  "balls": [
   {
    "color": "K",
    "amount": 29
   },
   {
    "color": "P",
    "amount": 16
   },
   {
    "color": "T",
    "amount": 4
   }
  ],
  "rows": [
   "? ? ? ? ? ? ?",
   "K T K T K T K",
   "K K K T K K K",
   "K K P P P K K",
   "K P P P P P K",
   "K P P P P P K",
   "K P K P K P K"
  ],
  "motif": {
   "id": "tulip",
   "color": "P",
   "bg": "K"
  },
  "newMechanic": "нехватка цвета",
  "intendedTrap": "Мята на «?» в кайме — тюльпан останется без листьев",
  "targetTaps": 49
 },
 {
  "id": 4,
  "item": "scarf",
  "name": "Шарф «Звёздочка»",
  "theme": "pastel",
  "width": 7,
  "height": 8,
  "balls": [
   {
    "color": "K",
    "amount": 31
   },
   {
    "color": "P",
    "amount": 11
   },
   {
    "color": "G",
    "amount": 14
   }
  ],
  "rows": [
   "G G G G G G G",
   "? ? ? ? ? ? ?",
   "K K K K K K K",
   "K K P K P K K",
   "K K P P P K K",
   "K P P P P P K",
   "K K K P K K K",
   "G G G G G G G"
  ],
  "motif": {
   "id": "star",
   "color": "P",
   "bg": "K"
  },
  "newMechanic": "люрекс (пряжа с блёстками) + первый мотив; слабина 0",
  "intendedTrap": "Люрекс на «?»: верхняя блестящая кайма не довяжется",
  "targetTaps": 56
 },
 {
  "id": 5,
  "item": "mitten",
  "name": "Варежка «Ёлочка»",
  "theme": "nordic",
  "width": 7,
  "height": 8,
  "balls": [
   {
    "color": "K",
    "amount": 25
   },
   {
    "color": "C",
    "amount": 14
   },
   {
    "color": "H",
    "amount": 10
   },
   {
    "color": "F",
    "amount": 7
   }
  ],
  "rows": [
   "C C C C C C C",
   "? ? ? ? ? ? ?",
   "F F F F F F F",
   "K K K H K K K",
   "K H H H H H K",
   "K K H H H K K",
   "K K K H K K K",
   "C C C C C C C"
  ],
  "motif": {
   "id": "tree",
   "color": "H",
   "bg": "K"
  },
  "newMechanic": "4-й клубок",
  "intendedTrap": "Клюква на «?» в манжете — верхняя кайма без Клюквы",
  "targetTaps": 56
 }
];
