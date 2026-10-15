import type { CentreId, DecorId, NightNumber, PrintId, StepId } from "../state/types";

// Every piece of UI text, in English and Gujarati. The UI shows one language at a time (the EN | ગુ
// toggle in the header). Both tables have exactly the same keys: TypeScript checks the Gujarati one
// against the English one, so a missing translation is a build error.

export type Lang = "en" | "gu";

/** Why the selected song can't play. */
export type SongErrorKey = "ytBlocked" | "ytUnavailable" | "ytInvalid" | "ytFailed" | "ytNoApi" | "ytNoResponse";

const en = {
  // Intro (§5.14). The greeting and the button read the same in both languages.
  introAria: "Welcome to Raas Mandal",
  introTitle: "ચાલો ગરબે રમીએ",
  introSubtitle: "(Chalo garbe ramiye)",
  introEnter: "Enter / ચાલો",
  introSkip: "Skip",

  // Header and stage
  playGarba: "Play garba",
  language: "Language",
  preview: "Preview",
  stageAria: "Animated garba circles",
  pickSong: "Pick a song to start the garba",
  panelAria: "Build your garba",
  narrowTitle: "Open Raas Mandal on a laptop",
  narrowBody: "The garba ground needs a wider screen. Open this page on a laptop or desktop, or make the window at least 1024 pixels wide.",

  // Night
  nightTitle: "Night",
  nightGroupAria: "Navratri night",
  nightLabel: (n: number, name: string) => `Night ${n} · ${name}`,
  nightInfo: (n: number, name: string, devi: string, date: string) => `<b>Night ${n} · ${name}</b> — Maa ${devi}, ${date}`,
  nights: {
    1: { name: "Orange", devi: "Shailaputri", date: "Sun 11 Oct" },
    2: { name: "White", devi: "Brahmacharini", date: "Mon 12 Oct" },
    3: { name: "Red", devi: "Chandraghanta", date: "Tue 13 Oct" },
    4: { name: "Royal blue", devi: "Kushmanda", date: "Wed 14 Oct" },
    5: { name: "Yellow", devi: "Skandamata", date: "Thu 15 Oct" },
    6: { name: "Green", devi: "Katyayani", date: "Fri 16 Oct" },
    7: { name: "Grey", devi: "Kalaratri", date: "Sat 17 Oct" },
    8: { name: "Purple", devi: "Mahagauri", date: "Sun 18 Oct" },
    9: { name: "Peacock green", devi: "Siddhidatri", date: "Mon 19 Oct" },
  } as Record<NightNumber, { name: string; devi: string; date: string }>,

  // Print
  printTitle: "Print",
  printGroupAria: "Print for all dancers",
  prints: {
    bandhani: { name: "Bandhani", about: "Bandhani from Kutch, Jamnagar." },
    patola: { name: "Patola", about: "Patola from Patan." },
    ajrakh: { name: "Ajrakh", about: "Ajrakh from Kutch." },
    abhla: { name: "Abhla bharat", about: "Abhla bharat from Kutch." },
  } as Record<PrintId, { name: string; about: string }>,

  // Circles, direction, arrangement
  circlesTitle: "Circles",
  circleCount: "Number of circles",
  fewerCircles: "Fewer circles",
  moreCircles: "More circles",
  rings: { single: "Circle", inner: "Inner", second: "Second", third: "Third", fourth: "Fourth", outer: "Outer" },
  setAll: "Set all",
  directionTitle: "Direction",
  anticlockwise: "Anticlockwise",
  clockwise: "Clockwise",
  directionAria: (ring: string) => `${ring} circle direction`,
  directionAllAria: "Set direction for all circles",
  arrangementTitle: "Arrangement",
  women: "Women",
  men: "Men",
  alternate: "Alternate",
  arrangementAria: (ring: string) => `${ring} circle dancers`,
  arrangementAllAria: "Set dancers for all circles",

  // Festive
  festiveTitle: "Festive",
  inCentre: "In the centre",
  betweenCircles: "Between the circles",
  centreAria: "Centrepiece",
  decorOnNote: "Decorations sit in their own lanes between the circles, so the dancers get a little smaller to make room.",
  decorOffNote: "Turn on any to decorate the gaps between the circles.",
  centres: {
    garbo: "Garbo",
    jyot: "Akhand jyot",
    mataji: "Mataji",
    mandvi: "Mandvi",
    pillar: "Light pillar",
    dhol: "Dhol stage",
    rangoli: "Rangoli",
  } as Record<CentreId, string>,
  decors: {
    diyas: "Row of diyas",
    garland: "Marigold garland",
    lights: "String lights",
    rangoliBorder: "Rangoli border",
  } as Record<DecorId, string>,

  // Music
  musicTitle: "Music",
  ytLink: "YouTube link",
  ytPlaceholder: "Paste a YouTube link",
  ytAdd: "Add YouTube link",
  ytBadLink: "That doesn't look like a YouTube link. Copy the video's address (for example https://www.youtube.com/watch?v=… or https://youtu.be/…) and paste it here.",
  ytEmpty: "Paste a YouTube link first.",
  songsAria: "Songs",
  removeSong: (title: string) => `Remove ${title}`,
  removeLink: "Remove this link",
  nowPlaying: "Now playing",
  playPreview: "Play preview",
  pausePreview: "Pause preview",
  songPosition: "Song position",
  status: {
    loading: "Loading…",
    cantPlayHere: "Can't play here",
    synced: (bpm: number) => `Synced · ${bpm} bpm`,
    notSynced: "Not synced yet",
  },
  errors: {
    ytBlocked: "This video's owner doesn't allow it to play on other sites. Try a different upload.",
    ytUnavailable: "That video isn't available: it may be private or removed.",
    ytInvalid: "That doesn't look like a valid YouTube video. Check the link.",
    ytFailed: "YouTube couldn't play this video. Try again, or try a different upload.",
    ytNoApi: "YouTube couldn't load. Check your internet connection, or that YouTube isn't blocked.",
    ytNoResponse: "YouTube didn't respond. Try again.",
  } as Record<SongErrorKey, string>,

  // Beat corrections and tap-to-sync
  tempo: "Tempo",
  tempoAria: "Tempo in beats per minute",
  reset: "Reset",
  resetTitle: "Clear this song's sync, back to 120 bpm",
  keepTapping: "Keep tapping on every beat…",
  needPlaying: "Play the song first, then tap on every beat.",
  syncedToTaps: "Synced to your taps. Keep tapping to refine it.",
  tapBeat: "Tap beat",
  tapBeatCount: (n: number, total: number) => `Tap beat · ${n} / ${total}`,
  syncedAt: (bpm: number) => `Synced at ${bpm} bpm. Tap again any time to refine it, or type a new tempo.`,
  notSyncedHint: (taps: number) => `Not synced yet: dancers keep a steady 120 bpm. Play the song, then tap on every beat (button or T key), starting on beat 1 of a bar. After ${taps} taps they lock on. Or type the tempo.`,

  // Steps
  stepsTitle: "Steps",
  stepGroup: "Steps",
  formationGroup: "Formations",
  addFromAria: (group: string) => `Add from ${group}`,
  addStepTitle: (name: string, feel: string) => `Add ${name} (${feel})`,
  sequenceAria: "Step sequence",
  noSteps: "No steps yet. Add one above.",
  bars: (n: number) => (n === 1 ? "1 bar" : `${n} bars`),
  shorter: "Shorter",
  longer: "Longer",
  removeStep: (name: string) => `Remove ${name}`,
  reorderStep: (name: string) => `Reorder ${name}`,
  reorderHint: "Drag to reorder, or press Alt+↑ / Alt+↓",
  movedTo: (name: string, pos: number, total: number) => `${name} moved to position ${pos} of ${total}`,
  steps: {
    beTaali: { name: "Be Taali", feel: "two claps" },
    tranTaali: { name: "Tran Taali", feel: "three claps" },
    dodhiyu: { name: "Dodhiyu", feel: "fast hop" },
    hinch: { name: "Hinch", feel: "6/8 sway" },
    fudardi: { name: "Fudardi", feel: "spin" },
    dandiya: { name: "Dandiya", feel: "pairs" },
    popatiyu: { name: "Popatiyu", feel: "parrot dip" },
    sanedo: { name: "Sanedo", feel: "Kutchi bounce" },
    hudo: { name: "Hudo", feel: "partner claps" },
    tippani: { name: "Tippani", feel: "stick strikes" },
    centreInOut: { name: "Into the centre & out", feel: "all circles" },
    partnerSwap: { name: "Partner swap", feel: "trade places" },
    walk: { name: "Walk", feel: "easy steps" },
    handFlow: { name: "Hand flow", feel: "arms only" },
  } as Record<StepId, { name: string; feel: string }>,

  // Play mode
  playControlsAria: "Play controls",
  firstDownbeat: "Starting on the first downbeat…",
  restart: "Restart",
  restartTitle: "Restart (R)",
  play: "Play",
  pause: "Pause",
  playPauseTitle: "Play/pause (Space)",
  backToBuild: "Back to build",
  backToBuildTitle: "Back to build (Esc)",
};

export type Strings = typeof en;

const gu: Strings = {
  // Intro (§5.14)
  introAria: "રાસ મંડળમાં સ્વાગત છે",
  introTitle: "ચાલો ગરબે રમીએ",
  introSubtitle: "(Chalo garbe ramiye)",
  introEnter: "Enter / ચાલો",
  introSkip: "છોડો",

  // Header and stage
  playGarba: "ગરબા રમો",
  language: "ભાષા",
  preview: "પૂર્વાવલોકન",
  stageAria: "રમતા ગરબાના ગોળ",
  pickSong: "ગરબા શરૂ કરવા ગીત પસંદ કરો",
  panelAria: "તમારા ગરબા ગોઠવો",
  narrowTitle: "રાસ મંડળ લેપટોપ પર ખોલો",
  narrowBody: "ગરબાના ચોક માટે મોટી સ્ક્રીન જોઈએ. આ પેજ લેપટોપ કે ડેસ્કટોપ પર ખોલો, અથવા વિન્ડો ઓછામાં ઓછી 1024 પિક્સેલ પહોળી કરો.",

  // Night
  nightTitle: "નોરતું",
  nightGroupAria: "નવરાત્રીનું નોરતું",
  nightLabel: (n, name) => `નોરતું ${n} · ${name}`,
  nightInfo: (n, name, devi, date) => `<b>નોરતું ${n} · ${name}</b> — મા ${devi}, ${date}`,
  nights: {
    1: { name: "નારંગી", devi: "શૈલપુત્રી", date: "રવિ, 11 ઑક્ટો" },
    2: { name: "સફેદ", devi: "બ્રહ્મચારિણી", date: "સોમ, 12 ઑક્ટો" },
    3: { name: "લાલ", devi: "ચંદ્રઘંટા", date: "મંગળ, 13 ઑક્ટો" },
    4: { name: "રોયલ બ્લૂ", devi: "કૂષ્માંડા", date: "બુધ, 14 ઑક્ટો" },
    5: { name: "પીળો", devi: "સ્કંદમાતા", date: "ગુરુ, 15 ઑક્ટો" },
    6: { name: "લીલો", devi: "કાત્યાયની", date: "શુક્ર, 16 ઑક્ટો" },
    7: { name: "રાખોડી", devi: "કાલરાત્રિ", date: "શનિ, 17 ઑક્ટો" },
    8: { name: "જાંબલી", devi: "મહાગૌરી", date: "રવિ, 18 ઑક્ટો" },
    9: { name: "મોરપીંછ લીલો", devi: "સિદ્ધિદાત્રી", date: "સોમ, 19 ઑક્ટો" },
  },

  // Print
  printTitle: "છાપ",
  printGroupAria: "બધા ખેલૈયાઓની છાપ",
  prints: {
    bandhani: { name: "બાંધણી", about: "કચ્છ, જામનગરની બાંધણી." },
    patola: { name: "પટોળું", about: "પાટણનું પટોળું." },
    ajrakh: { name: "અજરખ", about: "કચ્છનું અજરખ." },
    abhla: { name: "આભલા ભરત", about: "કચ્છનું આભલા ભરત." },
  },

  // Circles, direction, arrangement
  circlesTitle: "ગોળ",
  circleCount: "ગોળની સંખ્યા",
  fewerCircles: "ઓછા ગોળ",
  moreCircles: "વધુ ગોળ",
  rings: { single: "ગોળ", inner: "અંદરનો", second: "બીજો", third: "ત્રીજો", fourth: "ચોથો", outer: "બહારનો" },
  setAll: "બધા",
  directionTitle: "દિશા",
  anticlockwise: "ઘડિયાળથી ઊલટું",
  clockwise: "ઘડિયાળની જેમ",
  directionAria: (ring) => `${ring} ગોળની દિશા`,
  directionAllAria: "બધા ગોળની દિશા",
  arrangementTitle: "ગોઠવણ",
  women: "સ્ત્રીઓ",
  men: "પુરુષો",
  alternate: "વારાફરતી",
  arrangementAria: (ring) => `${ring} ગોળના ખેલૈયા`,
  arrangementAllAria: "બધા ગોળના ખેલૈયા",

  // Festive
  festiveTitle: "શણગાર",
  inCentre: "વચ્ચે",
  betweenCircles: "ગોળની વચ્ચે",
  centreAria: "વચ્ચેનો શણગાર",
  decorOnNote: "શણગાર ગોળની વચ્ચે પોતાની જગ્યામાં રહે છે, એટલે ખેલૈયા જગ્યા કરવા થોડા નાના થાય છે.",
  decorOffNote: "ગોળ વચ્ચેની જગ્યા શણગારવા કોઈ પણ પસંદ કરો.",
  centres: {
    garbo: "ગરબો",
    jyot: "અખંડ જ્યોત",
    mataji: "માતાજી",
    mandvi: "માંડવી",
    pillar: "થાંભલો",
    dhol: "ઢોલ",
    rangoli: "રંગોળી",
  },
  decors: {
    diyas: "દીવા",
    garland: "તોરણ",
    lights: "લાઇટ",
    rangoliBorder: "રંગોળી",
  },

  // Music
  musicTitle: "સંગીત",
  ytLink: "YouTube લિંક",
  ytPlaceholder: "YouTube લિંક પેસ્ટ કરો",
  ytAdd: "YouTube લિંક ઉમેરો",
  ytBadLink: "આ YouTube લિંક લાગતી નથી. વીડિયોનું સરનામું (જેમ કે https://www.youtube.com/watch?v=… અથવા https://youtu.be/…) કૉપિ કરીને અહીં પેસ્ટ કરો.",
  ytEmpty: "પહેલાં YouTube લિંક પેસ્ટ કરો.",
  songsAria: "ગીતો",
  removeSong: (title) => `${title} કાઢો`,
  removeLink: "આ લિંક કાઢો",
  nowPlaying: "હવે વાગે છે",
  playPreview: "ગીત ચલાવો",
  pausePreview: "ગીત થોભાવો",
  songPosition: "ગીતમાં સ્થાન",
  status: {
    loading: "લોડ થાય છે…",
    cantPlayHere: "અહીં વાગી શકતું નથી",
    synced: (bpm) => `તાલ મળ્યો · ${bpm} bpm`,
    notSynced: "હજી તાલ મેળવ્યો નથી",
  },
  errors: {
    ytBlocked: "આ વીડિયોના માલિક તેને બીજી સાઇટ પર વગાડવા દેતા નથી. બીજો અપલોડ અજમાવો.",
    ytUnavailable: "આ વીડિયો ઉપલબ્ધ નથી: તે ખાનગી હોઈ શકે અથવા કાઢી નખાયો હોય.",
    ytInvalid: "આ સાચો YouTube વીડિયો લાગતો નથી. લિંક તપાસો.",
    ytFailed: "YouTube આ વીડિયો વગાડી ન શક્યું. ફરી પ્રયાસ કરો, અથવા બીજો અપલોડ અજમાવો.",
    ytNoApi: "YouTube લોડ ન થયું. ઇન્ટરનેટ કનેક્શન તપાસો, અથવા YouTube બ્લૉક તો નથી ને તે જુઓ.",
    ytNoResponse: "YouTube તરફથી જવાબ ન આવ્યો. ફરી પ્રયાસ કરો.",
  },

  // Beat corrections and tap-to-sync
  tempo: "લય",
  tempoAria: "દર મિનિટે તાલ (bpm)",
  reset: "મૂળ પ્રમાણે",
  resetTitle: "આ ગીતનો તાલ ભૂંસો, પાછું 120 bpm",
  keepTapping: "દરેક તાલ પર ટૅપ કરતા રહો…",
  needPlaying: "પહેલાં ગીત ચલાવો, પછી દરેક તાલ પર ટૅપ કરો.",
  syncedToTaps: "તમારા ટૅપ સાથે તાલ મળી ગયો. વધુ ચોક્કસ કરવા ટૅપ કરતા રહો.",
  tapBeat: "તાલ પર ટૅપ કરો",
  tapBeatCount: (n, total) => `તાલ પર ટૅપ · ${n} / ${total}`,
  syncedAt: (bpm) => `${bpm} bpm પર તાલ મળ્યો. વધુ ચોક્કસ કરવા ગમે ત્યારે ફરી ટૅપ કરો, અથવા નવી લય લખો.`,
  notSyncedHint: (taps) => `હજી તાલ મેળવ્યો નથી: ખેલૈયા 120 bpm પર રમે છે. ગીત ચલાવો, પછી તાલના પહેલા ઠેકાથી શરૂ કરીને દરેક તાલ પર ટૅપ કરો (બટન અથવા T કી). ${taps} ટૅપ પછી તાલ પકડાઈ જશે. અથવા લય લખો.`,

  // Steps
  stepsTitle: "સ્ટેપ્સ",
  stepGroup: "સ્ટેપ્સ",
  formationGroup: "રચના",
  addFromAria: (group) => `${group}માંથી ઉમેરો`,
  addStepTitle: (name, feel) => `${name} ઉમેરો (${feel})`,
  sequenceAria: "સ્ટેપ્સનો ક્રમ",
  noSteps: "હજી કોઈ સ્ટેપ નથી. ઉપરથી એક ઉમેરો.",
  bars: (n) => `${n} આવર્તન`,
  shorter: "ટૂંકું",
  longer: "લાંબું",
  removeStep: (name) => `${name} કાઢો`,
  reorderStep: (name) => `${name}નો ક્રમ બદલો`,
  reorderHint: "ક્રમ બદલવા ખેંચો, અથવા Alt+↑ / Alt+↓ દબાવો",
  movedTo: (name, pos, total) => `${name} હવે ${total}માંથી ${pos} નંબરે`,
  steps: {
    beTaali: { name: "બે તાળી", feel: "બે વાર તાળી" },
    tranTaali: { name: "ત્રણ તાળી", feel: "ત્રણ વાર તાળી" },
    dodhiyu: { name: "દોઢિયું", feel: "ઝડપી ઠેકો" },
    hinch: { name: "હીંચ", feel: "6/8 ઝૂલો" },
    fudardi: { name: "ફુદરડી", feel: "ગોળ ફરવું" },
    dandiya: { name: "દાંડિયા", feel: "જોડીમાં" },
    popatiyu: { name: "પોપટિયું", feel: "પોપટ જેવું નમવું" },
    sanedo: { name: "સનેડો", feel: "કચ્છી ઠેકો" },
    hudo: { name: "હુડો", feel: "જોડીમાં તાળી" },
    tippani: { name: "ટિપ્પણી", feel: "લાકડીના ઠપકા" },
    centreInOut: { name: "અંદર-બહાર", feel: "બધા ગોળ" },
    partnerSwap: { name: "જોડી બદલો", feel: "જગ્યા બદલો" },
    walk: { name: "ચાલ", feel: "હળવાં પગલાં" },
    handFlow: { name: "હાથની લહેર", feel: "ફક્ત હાથ" },
  },

  // Play mode
  playControlsAria: "રમતનાં બટન",
  firstDownbeat: "પહેલા ઠેકા પર શરૂ થશે…",
  restart: "ફરી શરૂ કરો",
  restartTitle: "ફરી શરૂ કરો (R)",
  play: "ચલાવો",
  pause: "થોભાવો",
  playPauseTitle: "ચલાવો/થોભાવો (Space)",
  backToBuild: "પાછા જાઓ",
  backToBuildTitle: "પાછા જાઓ (Esc)",
};

export const STRINGS: Readonly<Record<Lang, Strings>> = { en, gu };
