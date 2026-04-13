// ─── OCCASIONS ────────────────────────────────────────────────────────────────

export const OCCASIONS = [
  { id: 'birthday',    label: 'Birthday',        emoji: '🎂' },
  { id: 'anniversary', label: 'Anniversary',     emoji: '💍' },
  { id: 'wedding',     label: 'Wedding',         emoji: '💒' },
  { id: 'valentines',  label: "Valentine's",     emoji: '💌' },
  { id: 'mothers_day', label: "Mother's Day",    emoji: '🌸' },
  { id: 'fathers_day', label: "Father's Day",    emoji: '🎩' },
  { id: 'friendship',  label: 'Friendship',      emoji: '🤝' },
  { id: 'roast',       label: 'Roast',           emoji: '🎤' },
  { id: 'memorial',    label: 'In Memory Of',     emoji: '🕊️' },
  { id: 'pet',         label: 'For My Pet',       emoji: '🐾' },
  { id: 'just_because',label: 'Just Because',     emoji: '✨' },
  { id: 'brand',       label: 'Brand / Business', emoji: '🏢', isBrand: true },
] as const

// ─── GENRES ───────────────────────────────────────────────────────────────────

export const GENRES = [
  {
    id: '70s_love_song',
    label: '70s Soul',
    tagline: 'Warm. Unhurried. Timeless.',
    desc: 'Velvet guitars, a Rhodes piano, and a lyric that takes its time. Melodic, intimate, built to last.',
    sample: '"You light up the ordinary like it\'s sacred ground…"',
  },
  {
    id: '90s_rb',
    label: '90s R&B',
    tagline: 'Smooth. Rhythmic. Celebratory.',
    desc: 'Layered harmonies over a silky groove. A chorus that sticks and a bridge that swells.',
    sample: '"Every time you walk in the room, everything slows down…"',
  },
  {
    id: 'country',
    label: 'Country',
    tagline: 'Honest. Storied. Rooted.',
    desc: 'Front-porch storytelling with a steady acoustic heartbeat. Feels like home the first time you hear it.',
    sample: '"She\'s a dirt road and a Sunday morning, simple and right…"',
  },
  {
    id: 'hip_hop',
    label: 'Hip-Hop Tribute',
    tagline: 'Punchy. Name-dropping. Alive.',
    desc: 'Celebratory bars, specific callouts, and a hook that hits every time. Built for the shout-out.',
    sample: '"Let me tell you \'bout a legend, I\'ma break it down…"',
  },
  {
    id: 'pop_anthem',
    label: 'Pop Anthem',
    tagline: 'Big. Hook-forward. Unstoppable.',
    desc: 'Arena-scale drums, a soaring chorus, and a bridge that gives you chills. Radio-ready from line one.',
    sample: '"You were made for more than ordinary days…"',
  },
  {
    id: 'gospel',
    label: 'Gospel',
    tagline: 'Uplifting. Powerful. Soulful.',
    desc: 'Full choir energy with a Hammond organ swell. Sweeping, celebratory, rooted in deep gratitude.',
    sample: '"Every blessing in this life wears your face…"',
  },
  {
    id: 'indie_folk',
    label: 'Indie Folk',
    tagline: 'Intimate. Acoustic. Honest.',
    desc: 'Fingerpicked guitar, a single close vocal, and strings that bloom on the bridge. The quiet song that says the loudest thing.',
    sample: '"If I had one more song, I\'d spend it telling you…"',
  },
] as const

// ─── PERSONAL TONES ──────────────────────────────────────────────────────────

export const PERSONAL_TONES = [
  { id: 'romantic',  label: 'Romantic',      emoji: '❤️',  desc: 'Deep, intimate, devoted',             color: '#FF6B6B' },
  { id: 'heartfelt', label: 'Heartfelt',     emoji: '🥹',  desc: 'Warm, sincere, grateful',             color: '#FF9F43' },
  { id: 'playful',   label: 'Playful',       emoji: '😄',  desc: 'Witty, affectionate, fun',            color: '#6BCB77' },
  { id: 'funny',     label: 'Funny / Roast', emoji: '😂',  desc: 'Punchy, irreverent, lovingly brutal', color: '#C77DFF' },
] as const

// ─── BRAND TONES ─────────────────────────────────────────────────────────────

export const BRAND_TONES = [
  { id: 'bold',    label: 'Bold & Hype',        emoji: '🔥', desc: 'Energetic, confident, makes noise',     color: '#FF6B6B' },
  { id: 'warm',    label: 'Warm & Trustworthy', emoji: '🤝', desc: 'Friendly, approachable, community-feel', color: '#FF9F43' },
  { id: 'premium', label: 'Premium & Sleek',    emoji: '💎', desc: 'Polished, aspirational, luxury energy',  color: '#C77DFF' },
  { id: 'fun',     label: 'Playful & Fun',      emoji: '🎉', desc: 'Catchy, lighthearted, earworm energy',   color: '#6BCB77' },
] as const

// ─── RELATIONSHIPS ────────────────────────────────────────────────────────────

export const RELATIONSHIPS = [
  'Spouse / Partner', 'Mom', 'Dad', 'Best Friend',
  'Sibling', 'Colleague', 'Child', 'Grandparent', 'Other',
] as const

// ─── BRAND INDUSTRIES ────────────────────────────────────────────────────────

export const BRAND_INDUSTRIES = [
  'Restaurant / Food & Bev', 'Retail / E-commerce', 'Tech / SaaS',
  'Health & Wellness', 'Beauty / Fashion', 'Real Estate', 'Fitness / Gym',
  'Legal / Finance', 'Creative Agency', 'Nonprofit', 'Podcast / Media',
  'Music / Entertainment', 'Other',
] as const

// ─── GENRE COLORS ────────────────────────────────────────────────────────────

export const GENRE_COLORS: Record<string, { bg: string; accent: string; dot: string; grad: [string, string] }> = {
  '70s_love_song': { bg: '#FFF3E0', accent: '#FF9F43', dot: '#E65100', grad: ['#FF9F43', '#FF6B6B'] },
  '90s_rb':        { bg: '#F3E5F5', accent: '#C77DFF', dot: '#7B1FA2', grad: ['#C77DFF', '#FF6B9D'] },
  'country':       { bg: '#F1F8E9', accent: '#6BCB77', dot: '#2E7D32', grad: ['#6BCB77', '#FFD93D'] },
  'hip_hop':       { bg: '#E0F7FA', accent: '#4ECDC4', dot: '#00695C', grad: ['#4ECDC4', '#6BCB77'] },
  'pop_anthem':    { bg: '#FCE4EC', accent: '#FF6B9D', dot: '#C2185B', grad: ['#FF6B9D', '#C77DFF'] },
  'gospel':        { bg: '#FFFDE7', accent: '#FFD93D', dot: '#F57F17', grad: ['#FFD93D', '#FF9F43'] },
  'indie_folk':    { bg: '#EFF6F1', accent: '#7FB069', dot: '#3E5641', grad: ['#7FB069', '#D9BF77'] },
}

// ─── SURPRISE ME COMBOS ───────────────────────────────────────────────────────

export const SURPRISES = [
  { label: '70s Soul',              emoji: '💔', genre: '70s_love_song', tone: 'romantic'  },
  { label: 'Gospel Roast',        emoji: '🙌', genre: 'gospel',        tone: 'funny'     },
  { label: 'Hip-Hop Love Letter', emoji: '💌', genre: 'hip_hop',       tone: 'romantic'  },
  { label: 'Country Tearjerker',  emoji: '🤠', genre: 'country',       tone: 'heartfelt' },
  { label: 'Pop Anthem Roast',    emoji: '🎤', genre: 'pop_anthem',    tone: 'funny'     },
  { label: '90s R&B Forever',     emoji: '💜', genre: '90s_rb',        tone: 'heartfelt' },
] as const

// ─── TIKTOK CAPTIONS ─────────────────────────────────────────────────────────

export const TIKTOK_CAPTIONS: Record<string, (name: string) => string> = {
  birthday:    n => `I had an AI write a song for ${n}'s birthday and I can't stop crying 😭🎂 #MakeASong #BirthdaySong #AI`,
  anniversary: n => `Had a song written for our anniversary and they literally cried 😭💍 #MakeASong #AnniversaryGift #PersonalizedSong`,
  mothers_day: n => `Got ${n} the most personal Mother's Day gift ever — a song written just about her 🌸 #MakeASong #MothersDay`,
  fathers_day: n => `Dad's reaction when I played him his personalized song 😂🎩 #MakeASong #FathersDay #DadSong`,
  wedding:     n => `We had a song written for ${n}'s wedding and the room LOST it 💒 #MakeASong #WeddingSong`,
  valentines:  n => `Got ${n} a personalized song for Valentine's Day instead of flowers 💌 #MakeASong #ValentinesDay`,
  friendship:  n => `Had a song written about my best friend and she's never speaking to me again 😂🤝 #MakeASong #BestFriend`,
  roast:       n => `We roasted ${n} with a custom song at their party and the room did NOT survive 🎤 #MakeASong #Roast`,
  just_because:n => `Randomly had a song written about someone I love and now we're both crying ✨ #MakeASong #PersonalizedSong`,
  brand:       n => `We had an AI write a theme song for ${n} and it genuinely slaps 🔥🏢 #MakeASong #BrandSong #BusinessSong`,
}

// ─── GENRE LABELS ────────────────────────────────────────────────────────────

export const GENRE_LABELS: Record<string, string> = {
  '70s_love_song': '70s Soul',
  '90s_rb':        '90s R&B',
  'country':       'Country',
  'hip_hop':       'Hip-Hop Tribute',
  'pop_anthem':    'Pop Anthem',
  'gospel':        'Gospel',
  'indie_folk':    'Indie Folk',
}

// ─── PRICE ───────────────────────────────────────────────────────────────────

export const PRICE_DISPLAY = '$14.99'

// ─── LOADING LINES ────────────────────────────────────────────────────────────

export const PERSONAL_LOAD_LINES = [
  'Warming up the studio… 🎹',
  'Weaving in that memory you shared… ✍️',
  'Finding the perfect rhyme… 🎯',
  'Setting the groove… 🎸',
  'Polishing the chorus… ✨',
  'Almost there… 🎶',
]

export const BRAND_LOAD_LINES = [
  'Studying your brand voice… 🏢',
  'Crafting the perfect hook… 🎯',
  'Making it sound like a hit… 🎸',
  'Writing the chorus everyone will know… ✨',
  'Polishing the bridge… 🎹',
  'Almost there… 🎶',
]
