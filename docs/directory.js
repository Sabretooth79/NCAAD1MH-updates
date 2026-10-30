// NCAA Division I men's hockey directory — 2026-27 season.
// Source for membership, conferences, cities and title years: Wikipedia,
// "List of NCAA Division I ice hockey programs" (63 programs for 2026-27;
// Mercyhurst dropped its program after 2025-26, Maryville joined).
// ESPN ids from the ESPN teams API (site.api.espn.com, fetched Oct 24, 2026).
// Team colors: full 63-team audit 2026-10-24 against each school's official
// brand/athletics guide — 31 entries corrected, 21 verified as-is, 11 kept
// but flagged UNVERIFIED-HEX (no official hex found: LIU, BEM, UML, SLU,
// MRVL, UAF, UAA, MNST, OMA, QUIN, RPI). Every view also carries the team's
// real ESPN logo image, so identity never rests on a hex value alone.
var DIRECTORY = [
 {key:"MICH",name:"Michigan",nick:"Wolverines",city:"Ann Arbor, Michigan",conf:"Big Ten",titles:[1948, 1951, 1952, 1953, 1955, 1956, 1964, 1996, 1998],espn:130,c1:"#00274C",c2:"#FFCB05",c3:"#FFFFFF"},
 {key:"AF",name:"Air Force",nick:"Falcons",city:"USAF Academy, Colorado",conf:"AHA",titles:[],espn:2005,c1:"#003594",c2:"#B2B4B2",c3:"#FFFFFF"},
 {key:"UAF",name:"Alaska Fairbanks",nick:"Nanooks",city:"Fairbanks, Alaska",conf:"Independent",titles:[],espn:298,c1:"#236192",c2:"#FFCD00",c3:"#FFFFFF"},
 {key:"UAA",name:"Alaska Anchorage",nick:"Seawolves",city:"Anchorage, Alaska",conf:"Independent",titles:[],espn:1,c1:"#00583D",c2:"#FFC425",c3:"#FFFFFF"},
 {key:"ASU",name:"Arizona State",nick:"Sun Devils",city:"Tempe, Arizona",conf:"NCHC",titles:[],espn:9,c1:"#8C1D40",c2:"#FFC627",c3:"#FFFFFF"},
 {key:"ARMY",name:"Army",nick:"Black Knights",city:"West Point, New York",conf:"AHA",titles:[],espn:349,c1:"#000000",c2:"#D3BC8D",c3:"#FFFFFF"},
 {key:"AUG",name:"Augustana",nick:"Vikings",city:"Sioux Falls, South Dakota",conf:"CCHA",titles:[],espn:2043,c1:"#041E42",c2:"#FFD200",c3:"#FFFFFF"},
 {key:"BEM",name:"Bemidji State",nick:"Beavers",city:"Bemidji, Minnesota",conf:"CCHA",titles:[],espn:132,c1:"#004D44",c2:"#FFFFFF",c3:"#000000"},
 {key:"BENT",name:"Bentley",nick:"Falcons",city:"Waltham, Massachusetts",conf:"AHA",titles:[],espn:2060,c1:"#0075BE",c2:"#FFFFFF",c3:"#000000"},
 {key:"BC",name:"Boston College",nick:"Eagles",city:"Chestnut Hill, Massachusetts",conf:"Hockey East",titles:[1949, 2001, 2008, 2010, 2012],espn:103,c1:"#8A100B",c2:"#B29D6C",c3:"#FFFFFF"},
 {key:"BU",name:"Boston University",nick:"Terriers",city:"Boston, Massachusetts",conf:"Hockey East",titles:[1971, 1972, 1978, 1995, 2009],espn:104,c1:"#CC0000",c2:"#FFFFFF",c3:"#000000"},
 {key:"BGSU",name:"Bowling Green",nick:"Falcons",city:"Bowling Green, Ohio",conf:"CCHA",titles:[1984],espn:189,c1:"#FD5000",c2:"#4F2C1D",c3:"#FFFFFF"},
 {key:"BRWN",name:"Brown",nick:"Bears",city:"Providence, Rhode Island",conf:"ECAC",titles:[],espn:225,c1:"#4E3629",c2:"#C00404",c3:"#FFFFFF"},
 {key:"CAN",name:"Canisius",nick:"Golden Griffins",city:"Buffalo, New York",conf:"AHA",titles:[],espn:2099,c1:"#0E2756",c2:"#FFBA00",c3:"#FFFFFF"},
 {key:"CLAR",name:"Clarkson",nick:"Golden Knights",city:"Potsdam, New York",conf:"ECAC",titles:[],espn:2137,c1:"#004E42",c2:"#FFCD00",c3:"#FFFFFF"},
 {key:"COLG",name:"Colgate",nick:"Raiders",city:"Hamilton, New York",conf:"ECAC",titles:[],espn:2142,c1:"#821019",c2:"#FFFFFF",c3:"#000000"},
 {key:"CC",name:"Colorado College",nick:"Tigers",city:"Colorado Springs, Colorado",conf:"NCHC",titles:[1950, 1957],espn:2144,c1:"#000000",c2:"#EAB337",c3:"#FFFFFF"},
 {key:"CONN",name:"UConn",nick:"Huskies",city:"Storrs, Connecticut",conf:"Hockey East",titles:[],espn:41,c1:"#000E2F",c2:"#FFFFFF",c3:"#000000"},
 {key:"COR",name:"Cornell",nick:"Big Red",city:"Ithaca, New York",conf:"ECAC",titles:[1967, 1970],espn:172,c1:"#B31B1B",c2:"#FFFFFF",c3:"#000000"},
 {key:"DART",name:"Dartmouth",nick:"Big Green",city:"Hanover, New Hampshire",conf:"ECAC",titles:[],espn:159,c1:"#00693E",c2:"#FFFFFF",c3:"#000000"},
 {key:"DEN",name:"Denver",nick:"Pioneers",city:"Denver, Colorado",conf:"NCHC",titles:[1958, 1960, 1961, 1968, 1969, 2004, 2005, 2017, 2022, 2024, 2026],espn:2172,c1:"#BA0C2F",c2:"#A89968",c3:"#FFFFFF"},
 {key:"FSU",name:"Ferris State",nick:"Bulldogs",city:"Big Rapids, Michigan",conf:"CCHA",titles:[],espn:2222,c1:"#BA0C2F",c2:"#FFC72C",c3:"#FFFFFF"},
 {key:"HAR",name:"Harvard",nick:"Crimson",city:"Cambridge, Massachusetts",conf:"ECAC",titles:[1989],espn:108,c1:"#A51C30",c2:"#FFFFFF",c3:"#000000"},
 {key:"HC",name:"Holy Cross",nick:"Crusaders",city:"Worcester, Massachusetts",conf:"AHA",titles:[],espn:107,c1:"#602D89",c2:"#FFFFFF",c3:"#000000"},
 {key:"LSS",name:"Lake Superior State",nick:"Lakers",city:"Sault Ste. Marie, Michigan",conf:"CCHA",titles:[1988, 1992, 1994],espn:285,c1:"#003087",c2:"#FFC61E",c3:"#FFFFFF"},
 {key:"LIN",name:"Lindenwood",nick:"Lions",city:"St. Charles, Missouri",conf:"Independent",titles:[],espn:2815,c1:"#000000",c2:"#B5A36A",c3:"#FFFFFF"},
 {key:"LIU",name:"Long Island",nick:"Sharks",city:"Brooklyn & Brookville, New York",conf:"Independent",titles:[],espn:110133,c1:"#69B3E7",c2:"#FFC72C",c3:"#FFFFFF"},
 {key:"ME",name:"Maine",nick:"Black Bears",city:"Orono, Maine",conf:"Hockey East",titles:[1993, 1999],espn:311,c1:"#082E58",c2:"#79BDE8",c3:"#FFFFFF"},
 {key:"MRVL",name:"Maryville",nick:"Saints",city:"Town and Country, Missouri",conf:"Independent",titles:[],espn:null,c1:"#A6192E",c2:"#FFFFFF",c3:"#000000"},
 {key:"MASS",name:"Massachusetts",nick:"Minutemen",city:"Amherst, Massachusetts",conf:"Hockey East",titles:[2021],espn:113,c1:"#881C1C",c2:"#FFFFFF",c3:"#000000"},
 {key:"UML",name:"UMass Lowell",nick:"River Hawks",city:"Lowell, Massachusetts",conf:"Hockey East",titles:[],espn:2349,c1:"#0067B9",c2:"#C8102E",c3:"#FFFFFF"},
 {key:"MRMK",name:"Merrimack",nick:"Warriors",city:"North Andover, Massachusetts",conf:"Hockey East",titles:[],espn:2771,c1:"#003767",c2:"#FFDD00",c3:"#FFFFFF"},
 {key:"MIA",name:"Miami",nick:"RedHawks",city:"Oxford, Ohio",conf:"NCHC",titles:[],espn:193,c1:"#C41230",c2:"#FFFFFF",c3:"#000000"},
 {key:"MSU",name:"Michigan State",nick:"Spartans",city:"East Lansing, Michigan",conf:"Big Ten",titles:[1966, 1986, 2007],espn:127,c1:"#18453B",c2:"#FFFFFF",c3:"#000000"},
 {key:"MTU",name:"Michigan Tech",nick:"Huskies",city:"Houghton, Michigan",conf:"CCHA",titles:[1962, 1965, 1975],espn:2392,c1:"#000000",c2:"#FFCD00",c3:"#FFFFFF"},
 {key:"MINN",name:"Minnesota",nick:"Golden Gophers",city:"Minneapolis, Minnesota",conf:"Big Ten",titles:[1974, 1976, 1979, 2002, 2003],espn:135,c1:"#7A0019",c2:"#FFCC33",c3:"#FFFFFF"},
 {key:"UMD",name:"Minnesota Duluth",nick:"Bulldogs",city:"Duluth, Minnesota",conf:"NCHC",titles:[2011, 2018, 2019],espn:134,c1:"#8E0A26",c2:"#FAB937",c3:"#FFFFFF"},
 {key:"MNST",name:"Minnesota State",nick:"Mavericks",city:"Mankato, Minnesota",conf:"CCHA",titles:[],espn:2364,c1:"#49306E",c2:"#FEBD11",c3:"#FFFFFF"},
 {key:"UNH",name:"New Hampshire",nick:"Wildcats",city:"Durham, New Hampshire",conf:"Hockey East",titles:[],espn:160,c1:"#003594",c2:"#FFFFFF",c3:"#000000"},
 {key:"NIA",name:"Niagara",nick:"Purple Eagles",city:"Lewiston, New York",conf:"AHA",titles:[],espn:315,c1:"#582C83",c2:"#FFFFFF",c3:"#000000"},
 {key:"UND",name:"North Dakota",nick:"Fighting Hawks",city:"Grand Forks, North Dakota",conf:"NCHC",titles:[1959, 1963, 1980, 1982, 1987, 1997, 2000, 2016],espn:155,c1:"#009A44",c2:"#FFFFFF",c3:"#000000"},
 {key:"NE",name:"Northeastern",nick:"Huskies",city:"Boston, Massachusetts",conf:"Hockey East",titles:[],espn:111,c1:"#C8102E",c2:"#000000",c3:"#FFFFFF"},
 {key:"NMI",name:"Northern Michigan",nick:"Wildcats",city:"Marquette, Michigan",conf:"CCHA",titles:[1991],espn:128,c1:"#095339",c2:"#FFC425",c3:"#FFFFFF"},
 {key:"ND",name:"Notre Dame",nick:"Fighting Irish",city:"Notre Dame, Indiana",conf:"Big Ten",titles:[],espn:87,c1:"#0C2340",c2:"#C99700",c3:"#FFFFFF"},
 {key:"OSU",name:"Ohio State",nick:"Buckeyes",city:"Columbus, Ohio",conf:"Big Ten",titles:[],espn:194,c1:"#BB0000",c2:"#666666",c3:"#FFFFFF"},
 {key:"OMA",name:"Omaha",nick:"Mavericks",city:"Omaha, Nebraska",conf:"NCHC",titles:[],espn:2437,c1:"#000000",c2:"#C8102E",c3:"#FFFFFF"},
 {key:"PSU",name:"Penn State",nick:"Nittany Lions",city:"University Park, Pennsylvania",conf:"Big Ten",titles:[],espn:213,c1:"#041E42",c2:"#FFFFFF",c3:"#000000"},
 {key:"PRIN",name:"Princeton",nick:"Tigers",city:"Princeton, New Jersey",conf:"ECAC",titles:[],espn:163,c1:"#FF671F",c2:"#000000",c3:"#FFFFFF"},
 {key:"PROV",name:"Providence",nick:"Friars",city:"Providence, Rhode Island",conf:"Hockey East",titles:[2015],espn:2507,c1:"#000000",c2:"#FFFFFF",c3:"#000000"},
 {key:"QUIN",name:"Quinnipiac",nick:"Bobcats",city:"Hamden, Connecticut",conf:"ECAC",titles:[2023],espn:2514,c1:"#0C2340",c2:"#FFB81C",c3:"#FFFFFF"},
 {key:"RPI",name:"Rensselaer",nick:"Engineers",city:"Troy, New York",conf:"ECAC",titles:[1954, 1985],espn:2528,c1:"#D22630",c2:"#FFFFFF",c3:"#000000"},
 {key:"RMU",name:"Robert Morris",nick:"Colonials",city:"Moon Township, Pennsylvania",conf:"AHA",titles:[],espn:2523,c1:"#011E41",c2:"#AA182C",c3:"#FFFFFF"},
 {key:"RIT",name:"RIT",nick:"Tigers",city:"Rochester, New York",conf:"AHA",titles:[],espn:178,c1:"#F76902",c2:"#000000",c3:"#FFFFFF"},
 {key:"SHU",name:"Sacred Heart",nick:"Pioneers",city:"Fairfield, Connecticut",conf:"AHA",titles:[],espn:2529,c1:"#CE1141",c2:"#FFFFFF",c3:"#000000"},
 {key:"SCSU",name:"St. Cloud State",nick:"Huskies",city:"St. Cloud, Minnesota",conf:"NCHC",titles:[],espn:2594,c1:"#CD1041",c2:"#000000",c3:"#FFFFFF"},
 {key:"SLU",name:"St. Lawrence",nick:"Saints",city:"Canton, New York",conf:"ECAC",titles:[],espn:2779,c1:"#A6192E",c2:"#FFFFFF",c3:"#FFFFFF"},
 {key:"STMN",name:"St. Thomas",nick:"Tommies",city:"Saint Paul, Minnesota",conf:"NCHC",titles:[],espn:2900,c1:"#510C76",c2:"#98999B",c3:"#FFFFFF"},
 {key:"STO",name:"Stonehill",nick:"Skyhawks",city:"Easton, Massachusetts",conf:"Independent",titles:[],espn:284,c1:"#582C83",c2:"#FFFFFF",c3:"#000000"},
 {key:"UNNY",name:"Union",nick:"Garnet Chargers",city:"Schenectady, New York",conf:"ECAC",titles:[2014],espn:2785,c1:"#7A0019",c2:"#FFFFFF",c3:"#000000"},
 {key:"UVM",name:"Vermont",nick:"Catamounts",city:"Burlington, Vermont",conf:"Hockey East",titles:[],espn:261,c1:"#154734",c2:"#FFD100",c3:"#FFFFFF"},
 {key:"WMU",name:"Western Michigan",nick:"Broncos",city:"Kalamazoo, Michigan",conf:"NCHC",titles:[2025],espn:2711,c1:"#532E1F",c2:"#F1C500",c3:"#FFFFFF"},
 {key:"WIS",name:"Wisconsin",nick:"Badgers",city:"Madison, Wisconsin",conf:"Big Ten",titles:[1973, 1977, 1981, 1983, 1990, 2006],espn:275,c1:"#C5050C",c2:"#FFFFFF",c3:"#000000"},
 {key:"YALE",name:"Yale",nick:"Bulldogs",city:"New Haven, Connecticut",conf:"ECAC",titles:[2013],espn:43,c1:"#00356B",c2:"#FFFFFF",c3:"#000000"},
];
// USCHO Men's Poll, Week 4, Oct 19, 2026 (ESPN rankings feed, id 10624).
// Records are as published in that poll; Michigan's 7th win (Oct 23) postdates it.
var USCHO_POLL = [
 {rank:1,key:"MICH",rec:"6-0",prev:2},
 {rank:2,key:"MSU",rec:"3-0",prev:3},
 {rank:3,key:"UND",rec:"4-0",prev:4},
 {rank:4,key:"DEN",rec:"2-2",prev:1},
 {rank:5,key:"WMU",rec:"4-0",prev:6},
 {rank:6,key:"WIS",rec:"4-0",prev:5},
 {rank:7,key:"PROV",rec:"3-0",prev:7},
 {rank:8,key:"QUIN",rec:"4-1",prev:8},
 {rank:9,key:"UMD",rec:"3-1-2",prev:9},
 {rank:10,key:"DART",rec:"0-0",prev:10},
 {rank:11,key:"MTU",rec:"5-1",prev:14},
 {rank:12,key:"CC",rec:"3-1",prev:12},
 {rank:13,key:"AUG",rec:"3-0-1",prev:15},
 {rank:14,key:"COR",rec:"0-0",prev:13},
 {rank:15,key:"BU",rec:"3-1",prev:11},
 {rank:16,key:"CONN",rec:"2-2",prev:17},
 {rank:17,key:"NE",rec:"2-1",prev:0},
 {rank:18,key:"BC",rec:"1-2",prev:16},
 {rank:19,key:"MASS",rec:"2-3-1",prev:19},
 {rank:20,key:"MRMK",rec:"2-1-1",prev:0},
];

// v32.41 schedule-aware team themes (Victor 2026-10-29): per-team verified
// scheme options. d = dark (home) scheme, l = light (away) scheme; each
// option is [background, text, accent] — the team's own verified colors
// (directory c1/c2/c3, plus the sourced second darks documented in the
// v32.41 build report). Option 1 of each scheme is primary. A second
// option exists ONLY where a real second color was verified — no shade
// was invented to fill a slot.
var TEAM_THEMES = {"MICH":{"d":[["#00274C","#FFCB05","#FFFFFF"]],"l":[["#FFCB05","#00274C","#00274C"],["#FFFFFF","#00274C","#00274C"]]},"AF":{"d":[["#003594","#B2B4B2","#FFFFFF"],["#002554","#B2B4B2","#FFFFFF"]],"l":[["#B2B4B2","#003594","#003594"],["#FFFFFF","#003594","#003594"]]},"UAF":{"d":[["#236192","#FFCD00","#FFFFFF"]],"l":[["#FFCD00","#236192","#236192"],["#FFFFFF","#236192","#236192"]]},"UAA":{"d":[["#00583D","#FFC425","#FFFFFF"]],"l":[["#FFC425","#00583D","#00583D"],["#FFFFFF","#00583D","#00583D"]]},"ASU":{"d":[["#8C1D40","#FFC627","#FFFFFF"]],"l":[["#FFC627","#8C1D40","#8C1D40"],["#FFFFFF","#8C1D40","#8C1D40"]]},"ARMY":{"d":[["#000000","#D3BC8D","#FFFFFF"]],"l":[["#D3BC8D","#000000","#000000"],["#FFFFFF","#000000","#000000"]]},"AUG":{"d":[["#041E42","#FFD200","#FFFFFF"]],"l":[["#FFD200","#041E42","#041E42"],["#FFFFFF","#041E42","#041E42"]]},"BEM":{"d":[["#004D44","#FFFFFF","#000000"]],"l":[["#FFFFFF","#004D44","#004D44"]]},"BENT":{"d":[["#0075BE","#FFFFFF","#000000"],["#000000","#FFFFFF","#0075BE"]],"l":[["#FFFFFF","#0075BE","#0075BE"]]},"BC":{"d":[["#8A100B","#B29D6C","#FFFFFF"]],"l":[["#B29D6C","#8A100B","#8A100B"],["#FFFFFF","#8A100B","#8A100B"]]},"BU":{"d":[["#CC0000","#FFFFFF","#000000"]],"l":[["#FFFFFF","#CC0000","#CC0000"]]},"BGSU":{"d":[["#FD5000","#4F2C1D","#FFFFFF"],["#4F2C1D","#FFFFFF","#FD5000"]],"l":[["#FFFFFF","#FD5000","#FD5000"]]},"BRWN":{"d":[["#4E3629","#C00404","#FFFFFF"],["#C00404","#FFFFFF","#4E3629"]],"l":[["#FFFFFF","#4E3629","#4E3629"]]},"CAN":{"d":[["#0E2756","#FFBA00","#FFFFFF"]],"l":[["#FFBA00","#0E2756","#0E2756"],["#FFFFFF","#0E2756","#0E2756"]]},"CLAR":{"d":[["#004E42","#FFCD00","#FFFFFF"]],"l":[["#FFCD00","#004E42","#004E42"],["#FFFFFF","#004E42","#004E42"]]},"COLG":{"d":[["#821019","#FFFFFF","#000000"]],"l":[["#FFFFFF","#821019","#821019"]]},"CC":{"d":[["#000000","#EAB337","#FFFFFF"]],"l":[["#EAB337","#000000","#000000"],["#FFFFFF","#000000","#000000"]]},"CONN":{"d":[["#000E2F","#FFFFFF","#000000"]],"l":[["#FFFFFF","#000E2F","#000E2F"]]},"COR":{"d":[["#B31B1B","#FFFFFF","#000000"]],"l":[["#FFFFFF","#B31B1B","#B31B1B"]]},"DART":{"d":[["#00693E","#FFFFFF","#000000"]],"l":[["#FFFFFF","#00693E","#00693E"]]},"DEN":{"d":[["#BA0C2F","#A89968","#FFFFFF"]],"l":[["#A89968","#000000","#BA0C2F"],["#FFFFFF","#BA0C2F","#BA0C2F"]]},"FSU":{"d":[["#BA0C2F","#FFC72C","#FFFFFF"]],"l":[["#FFC72C","#BA0C2F","#BA0C2F"],["#FFFFFF","#BA0C2F","#BA0C2F"]]},"HAR":{"d":[["#A51C30","#FFFFFF","#000000"]],"l":[["#FFFFFF","#A51C30","#A51C30"]]},"HC":{"d":[["#602D89","#FFFFFF","#000000"]],"l":[["#FFFFFF","#602D89","#602D89"]]},"LSS":{"d":[["#003087","#FFC61E","#FFFFFF"]],"l":[["#FFC61E","#003087","#003087"],["#FFFFFF","#003087","#003087"]]},"LIN":{"d":[["#000000","#B5A36A","#FFFFFF"]],"l":[["#B5A36A","#000000","#000000"],["#FFFFFF","#000000","#000000"]]},"LIU":{"d":[["#69B3E7","#FFC72C","#FFFFFF"]],"l":[["#FFC72C","#000000","#69B3E7"],["#FFFFFF","#000000","#69B3E7"]]},"ME":{"d":[["#082E58","#79BDE8","#FFFFFF"]],"l":[["#79BDE8","#082E58","#082E58"],["#FFFFFF","#082E58","#082E58"]]},"MRVL":{"d":[["#A6192E","#FFFFFF","#000000"]],"l":[["#FFFFFF","#A6192E","#A6192E"]]},"MASS":{"d":[["#881C1C","#FFFFFF","#000000"]],"l":[["#FFFFFF","#881C1C","#881C1C"]]},"UML":{"d":[["#0067B9","#C8102E","#FFFFFF"]],"l":[["#FFFFFF","#0067B9","#0067B9"]]},"MRMK":{"d":[["#003767","#FFDD00","#FFFFFF"]],"l":[["#FFDD00","#003767","#003767"],["#FFFFFF","#003767","#003767"]]},"MIA":{"d":[["#C41230","#FFFFFF","#000000"]],"l":[["#FFFFFF","#C41230","#C41230"]]},"MSU":{"d":[["#18453B","#FFFFFF","#000000"]],"l":[["#FFFFFF","#18453B","#18453B"]]},"MTU":{"d":[["#000000","#FFCD00","#FFFFFF"]],"l":[["#FFCD00","#000000","#000000"],["#FFFFFF","#000000","#000000"]]},"MINN":{"d":[["#7A0019","#FFCC33","#FFFFFF"]],"l":[["#FFCC33","#7A0019","#7A0019"],["#FFFFFF","#7A0019","#7A0019"]]},"UMD":{"d":[["#8E0A26","#FAB937","#FFFFFF"]],"l":[["#FAB937","#8E0A26","#8E0A26"],["#FFFFFF","#8E0A26","#8E0A26"]]},"MNST":{"d":[["#49306E","#FEBD11","#FFFFFF"]],"l":[["#FEBD11","#49306E","#49306E"],["#FFFFFF","#49306E","#49306E"]]},"UNH":{"d":[["#003594","#FFFFFF","#000000"]],"l":[["#FFFFFF","#003594","#003594"]]},"NIA":{"d":[["#582C83","#FFFFFF","#000000"]],"l":[["#FFFFFF","#582C83","#582C83"]]},"UND":{"d":[["#009A44","#FFFFFF","#000000"]],"l":[["#FFFFFF","#009A44","#009A44"]]},"NE":{"d":[["#C8102E","#000000","#FFFFFF"],["#000000","#FFFFFF","#C8102E"]],"l":[["#FFFFFF","#C8102E","#C8102E"]]},"NMI":{"d":[["#095339","#FFC425","#FFFFFF"]],"l":[["#FFC425","#095339","#095339"],["#FFFFFF","#095339","#095339"]]},"ND":{"d":[["#0C2340","#C99700","#FFFFFF"]],"l":[["#C99700","#0C2340","#0C2340"],["#FFFFFF","#0C2340","#0C2340"]]},"OSU":{"d":[["#BB0000","#666666","#FFFFFF"]],"l":[["#FFFFFF","#BB0000","#BB0000"]]},"OMA":{"d":[["#000000","#C8102E","#FFFFFF"]],"l":[["#FFFFFF","#000000","#000000"]]},"PSU":{"d":[["#041E42","#FFFFFF","#000000"]],"l":[["#FFFFFF","#041E42","#041E42"]]},"PRIN":{"d":[["#FF671F","#000000","#FFFFFF"],["#000000","#FF671F","#FFFFFF"]],"l":[["#FFFFFF","#000000","#FF671F"]]},"PROV":{"d":[["#000000","#FFFFFF","#000000"]],"l":[["#FFFFFF","#000000","#000000"]]},"QUIN":{"d":[["#0C2340","#FFB81C","#FFFFFF"]],"l":[["#FFB81C","#0C2340","#0C2340"],["#FFFFFF","#0C2340","#0C2340"]]},"RPI":{"d":[["#D22630","#FFFFFF","#000000"]],"l":[["#FFFFFF","#D22630","#D22630"]]},"RMU":{"d":[["#011E41","#AA182C","#FFFFFF"]],"l":[["#FFFFFF","#011E41","#011E41"]]},"RIT":{"d":[["#F76902","#000000","#FFFFFF"],["#000000","#F76902","#FFFFFF"]],"l":[["#FFFFFF","#F76902","#F76902"]]},"SHU":{"d":[["#CE1141","#FFFFFF","#000000"]],"l":[["#FFFFFF","#CE1141","#CE1141"]]},"SCSU":{"d":[["#CD1041","#000000","#FFFFFF"],["#000000","#FFFFFF","#CD1041"]],"l":[["#FFFFFF","#CD1041","#CD1041"]]},"SLU":{"d":[["#A6192E","#FFFFFF","#FFFFFF"]],"l":[["#FFFFFF","#A6192E","#A6192E"]]},"STMN":{"d":[["#510C76","#98999B","#FFFFFF"]],"l":[["#98999B","#510C76","#510C76"],["#FFFFFF","#510C76","#510C76"]]},"STO":{"d":[["#582C83","#FFFFFF","#000000"]],"l":[["#FFFFFF","#582C83","#582C83"]]},"UNNY":{"d":[["#7A0019","#FFFFFF","#000000"]],"l":[["#FFFFFF","#7A0019","#7A0019"]]},"UVM":{"d":[["#154734","#FFD100","#FFFFFF"]],"l":[["#FFD100","#154734","#154734"],["#FFFFFF","#154734","#154734"]]},"WMU":{"d":[["#532E1F","#F1C500","#FFFFFF"]],"l":[["#F1C500","#532E1F","#532E1F"],["#FFFFFF","#532E1F","#532E1F"]]},"WIS":{"d":[["#C5050C","#FFFFFF","#000000"]],"l":[["#FFFFFF","#C5050C","#C5050C"]]},"YALE":{"d":[["#00356B","#FFFFFF","#000000"]],"l":[["#FFFFFF","#00356B","#00356B"]]}};
