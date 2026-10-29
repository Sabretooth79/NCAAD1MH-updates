// Michigan 2026-27 roster bios + verified headshots (v7).
// Source: mgoblue.com official 2026-27 roster — live page values where fetched
// today, otherwise the Sep 22, 2026 roster snapshot. Each photo is that
// player's own official roster headshot (Michigan Photography), matched by
// name + jersey number from the player's own roster card. Opponent players
// have no verified photo bundled: they render an initials placeholder,
// never a wrong photo.
const PLAYERS_MICH = {
 "J.P. Hurlbert": {
  "num": 2,
  "pos": "F",
  "cls": "Fr.",
  "height": "6' 0''",
  "weight": "191 lbs",
  "shoots": "R",
  "hometown": "Allen, Texas",
  "school": "Kamloops (WHL)",
  "photo": "players/JP_Hurlbert.jpg"
 },
 "Brandt Harper": {
  "num": 3,
  "pos": "D",
  "cls": "Fr.",
  "height": "6' 1''",
  "weight": "196 lbs",
  "shoots": "R",
  "hometown": "Tampa, Fla.",
  "school": "North Bay (OHL)",
  "photo": "players/Brandt_Harper.jpg"
 },
 "Asher Barnett": {
  "num": 4,
  "pos": "D",
  "cls": "So.",
  "height": "6' 1''",
  "weight": "197 lbs",
  "shoots": "L",
  "hometown": "Wilmette, Ill.",
  "school": "USNTDP",
  "photo": "players/Asher_Barnett.jpg"
 },
 "Dakoda Rh\u00e9aume-Mullen": {
  "num": 7,
  "pos": "D",
  "cls": "Jr.",
  "height": "6' 1''",
  "weight": "188 lbs",
  "shoots": "L",
  "hometown": "Northville, Mich.",
  "school": "USNTDP",
  "photo": "players/Dakoda_Rheaume-Mullen.jpg"
 },
 "Landon DuPont": {
  "num": 8,
  "pos": "D",
  "cls": "Fr.",
  "height": "6' 0''",
  "weight": "190 lbs",
  "shoots": "R",
  "hometown": "Calgary, Alb.",
  "school": "Everett (WHL)",
  "photo": "players/Landon_DuPont.jpg"
 },
 "Nick Moldenhauer": {
  "num": 9,
  "pos": "F",
  "cls": "Sr.",
  "height": "5' 10''",
  "weight": "180 lbs",
  "shoots": "R",
  "hometown": "Mississauga, Ont.",
  "school": "Chicago (USHL)",
  "photo": "players/Nick_Moldenhauer.jpg"
 },
 "Drew Schock": {
  "num": 10,
  "pos": "D",
  "cls": "So.",
  "height": "6' 0''",
  "weight": "179 lbs",
  "shoots": "L",
  "hometown": "Green Bay, Wis.",
  "school": "USNTDP",
  "photo": "players/Drew_Schock.jpg"
 },
 "Cole McKinney": {
  "num": 11,
  "pos": "F",
  "cls": "So.",
  "height": "6' 1''",
  "weight": "198 lbs",
  "shoots": "R",
  "hometown": "Lake Forest, Ill.",
  "school": "USNTDP",
  "photo": "players/Cole_McKinney.jpg"
 },
 "Aidan Park": {
  "num": 16,
  "pos": "F",
  "cls": "So.",
  "height": "6' 1''",
  "weight": "183 lbs",
  "shoots": "R",
  "hometown": "Playa Vista, Calif.",
  "school": "Green Bay (USHL)",
  "photo": "players/Aidan_Park.jpg"
 },
 "Garrett Schifsky": {
  "num": 17,
  "pos": "F",
  "cls": "Sr.",
  "height": "5' 9''",
  "weight": "186 lbs",
  "shoots": "R",
  "hometown": "Andover, Minn.",
  "school": "Waterloo (USHL)",
  "photo": "players/Garrett_Schifsky.jpg"
 },
 "Jayden Perron": {
  "num": 18,
  "pos": "F",
  "cls": "Sr.",
  "height": "5' 9''",
  "weight": "174 lbs",
  "shoots": "R",
  "hometown": "Winnipeg, Man.",
  "school": "North Dakota (NCAA)",
  "photo": "players/Jayden_Perron.jpg"
 },
 "Michael Hage": {
  "num": 19,
  "pos": "F",
  "cls": "Jr.",
  "height": "6' 1''",
  "weight": "199 lbs",
  "shoots": "R",
  "hometown": "Mississauga, Ont.",
  "school": "Chicago (USHL)",
  "photo": "players/Michael_Hage.jpg"
 },
 "Ben Robertson": {
  "num": 21,
  "pos": "D",
  "cls": "Sr.",
  "height": "6' 1''",
  "weight": "197 lbs",
  "shoots": "L",
  "hometown": "Potomac Falls, Va.",
  "school": "Cornell (NCAA)",
  "photo": "players/Ben_Robertson.jpg"
 },
 "Kason Muscutt": {
  "num": 22,
  "pos": "F",
  "cls": "So.",
  "height": "5' 11''",
  "weight": "176 lbs",
  "shoots": "L",
  "hometown": "Bossier City, La.",
  "school": "Sioux City (USHL)",
  "photo": "players/Kason_Muscutt.jpg"
 },
 "Miles Gust": {
  "num": 23,
  "pos": "D",
  "cls": "Jr.",
  "height": "5' 9''",
  "weight": "181 lbs",
  "shoots": "L",
  "hometown": "Chicago, Ill.",
  "school": "Muskegon (USHL)",
  "photo": "players/Miles_Gust.jpg"
 },
 "Malcolm Spence": {
  "num": 27,
  "pos": "F",
  "cls": "So.",
  "height": "6' 1''",
  "weight": "192 lbs",
  "shoots": "L",
  "hometown": "Mississauga, Ont.",
  "school": "Erie (OHL)",
  "photo": "players/Malcolm_Spence.jpg"
 },
 "Stephen Peck": {
  "num": 31,
  "pos": "G",
  "cls": "So.",
  "height": "6' 2''",
  "weight": "184 lbs",
  "shoots": "L",
  "hometown": "New York, N.Y.",
  "school": "Muskegon (USHL)",
  "photo": "players/Stephen_Peck.jpg"
 },
 "Julian Molinaro": {
  "num": 34,
  "pos": "G",
  "cls": "Jr.",
  "height": "5' 10''",
  "weight": "187 lbs",
  "shoots": "L",
  "hometown": "Mississauga, Ont.",
  "school": "Northern Michigan (NCAA)",
  "photo": "players/Julian_Molinaro.jpg"
 },
 "Will Horcoff": {
  "num": 44,
  "pos": "F",
  "cls": "Jr.",
  "height": "6' 5''",
  "weight": "201 lbs",
  "shoots": "L",
  "hometown": "Birmingham, Mich.",
  "school": "USNTDP",
  "photo": "players/Will_Horcoff.jpg"
 },
 "Josh Orrico": {
  "num": 68,
  "pos": "D",
  "cls": "Sr.",
  "height": "5' 9''",
  "weight": "176 lbs",
  "shoots": "R",
  "hometown": "Woodbridge, Ont.",
  "school": "Janesville (NAHL)",
  "photo": "players/Josh_Orrico.jpg"
 },
 "Jack Nesbitt": {
  "num": 71,
  "pos": "F",
  "cls": "Fr.",
  "height": "6' 5''",
  "weight": "192 lbs",
  "shoots": "L",
  "hometown": "Sarnia, Ont.",
  "school": "Windsor (OHL)",
  "photo": "players/Jack_Nesbitt.jpg"
 },
 "Jack Ivankovic": {
  "num": 72,
  "pos": "G",
  "cls": "So.",
  "height": "5' 11''",
  "weight": "170 lbs",
  "shoots": "L",
  "hometown": "Mississauga, Ont.",
  "school": "Brampton (OHL)",
  "photo": "players/Jack_Ivankovic.jpg"
 },
 "Cam Reid": {
  "num": 81,
  "pos": "D",
  "cls": "Fr.",
  "height": "6' 0''",
  "weight": "182 lbs",
  "shoots": "L",
  "hometown": "Aylmer, Ont.",
  "school": "Kitchener (OHL)",
  "photo": "players/Cam_Reid.jpg"
 },
 "Henry Mews": {
  "num": 88,
  "pos": "D",
  "cls": "So.",
  "height": "6' 0''",
  "weight": "188 lbs",
  "shoots": "R",
  "hometown": "Ottawa, Ont.",
  "school": "Sudbury (OHL)",
  "photo": "players/Henry_Mews.jpg"
 },
 "Adam Valentini": {
  "num": 92,
  "pos": "F",
  "cls": "So.",
  "height": "5' 10''",
  "weight": "187 lbs",
  "shoots": "L",
  "hometown": "Toronto, Ont.",
  "school": "Chicago (USHL)",
  "photo": "players/Adam_Valentini.jpg"
 },
 "Kieren Dervin": {
  "num": 95,
  "pos": "F",
  "cls": "Fr.",
  "height": "6' 2''",
  "weight": "179 lbs",
  "shoots": "L",
  "hometown": "Gloucester, Ont.",
  "school": "Kingston (OHL)",
  "photo": "players/Kieren_Dervin.jpg"
 },
 "Nic Sima": {
  "num": 96,
  "pos": "F",
  "cls": "Fr.",
  "height": "6' 3''",
  "weight": "201 lbs",
  "shoots": "R",
  "hometown": "Mississauga, Ont.",
  "school": "Ottawa (OHL)",
  "photo": "players/Nic_Sima.jpg"
 }
};
