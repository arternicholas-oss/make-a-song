import type { PersonalAnswers, BrandAnswers, Answers } from './types'

// ─── GENRE STYLES ─────────────────────────────────────────────────────────────

export const GENRE_LABELS: Record<string, string> = {
  '70s_love_song': '70s Soul',
  '90s_rb':        '90s R&B',
  'country':       'Country',
  'hip_hop':       'Hip-Hop Tribute',
  'pop_anthem':    'Pop Anthem',
  'gospel':        'Gospel',
  'indie_folk':    'Indie Folk',
}

const GENRE_STYLES: Record<string, string> = {
  '70s_love_song': `Write in the style of 1970s soul and singer-songwriter pop. Warm, unhurried, melodic, intimate.
Velvet guitar lines, Rhodes piano, a vocal that takes its time. Flowing ABAB or AABB rhyme scheme.
Imagery: warmth, road trips, seasons, soft light, analog nostalgia. Avoid modern slang.`,

  '90s_rb': `Write in the style of 1990s R&B. Smooth, rhythmically driven, confident, celebratory.
Silky groove, layered harmonies, a chorus that sticks. AABB with internal rhymes.
Groove-forward with punchy chorus lines. Warm but with swagger.`,

  'country': `Write in the style of classic country storytelling. Honest, grounded, conversational.
Front-porch narrative, steady acoustic heartbeat, concrete detail.
Strong narrative verses, singalong chorus, concrete imagery (trucks, porches, home cooking, small towns).
AABB rhyme scheme. Warm without cliché.`,

  'hip_hop': `Write in the style of a celebratory hip-hop tribute.
Punchy bars, internal rhymes, name-dropping specific details.
Affectionate celebratory energy. Each line should land with confidence.
Include a melodic hook for the chorus.`,

  'pop_anthem': `Write in the style of a modern pop anthem. Big, soaring, hook-forward.
Arena-scale drums, an exploding chorus, a bridge that gives chills.
Verse builds, pre-chorus creates tension, chorus explodes.
Memorable repetitive hook. AABB or ABAB rhyme.`,

  'gospel': `Write in the style of contemporary gospel — uplifting, powerful, soulful.
Full choir energy, Hammond organ swell, call-and-response phrasing.
Rich imagery of light, grace, blessing, gratitude.
Chorus should feel like a congregation singing together.
Call-and-response energy in the bridge.`,

  'indie_folk': `Write in the style of modern indie folk. Intimate, acoustic, emotionally honest.
Fingerpicked guitar, a single close vocal, strings that bloom on the bridge. Sparse arrangement — every word carries weight.
Imagery: windows, handwriting, quiet rooms, small everyday sacred moments.
Plainspoken lyrics, gentle internal rhymes, avoid bombast. The quiet song that says the loudest thing.`,
}

// ─── PERSONAL PROMPT ─────────────────────────────────────────────────────────

export function buildPersonalPrompt(a: PersonalAnswers): string {
  const toneStyle: Record<string, string> = {
    romantic:  'Every line should feel earned and sincere. Deep devotion. Intimate. Nothing ironic.',
    heartfelt: 'Warm, genuine appreciation. Love in the broad human sense — gratitude, pride, tenderness.',
    playful:   'Witty and warm. Affectionate teasing. Inside-joke energy. Light humor that never stings.',
    funny:     'Write like a roast speech set to music. Punchy, irreverent, lovingly brutal. Never mean-spirited.',
  }

  const details = [
    `Recipient: ${a.recipient_name}`,
    a.sender_name       ? `Written by: ${a.sender_name}` : null,
    `Occasion: ${a.occasion.replace(/_/g, ' ')}`,
    `Relationship: ${a.relationship}`,
    `Three words that describe them: ${[a.word1, a.word2, a.word3].filter(Boolean).join(', ')}`,
    `What makes them special: ${a.what_makes_special}`,
    a.favorite_memory   ? `Favorite memory: ${a.favorite_memory}` : null,
    a.something_funny   ? `Something funny about them: ${a.something_funny}` : null,
    a.catchphrase       ? `Their catchphrase: "${a.catchphrase}"` : null,
    a.hobby             ? `Hobby/passion: ${a.hobby}` : null,
    a.city              ? `City/place: ${a.city}` : null,
  ].filter(Boolean).join('\n')

  const toneLabel = a.tone === 'funny' ? 'Funny / Roast' : a.tone.charAt(0).toUpperCase() + a.tone.slice(1)

  return `You are a professional songwriter writing a personalized song. Every line must feel like it could ONLY have been written for this specific person. Weave their real details naturally — never feel generic.

GENRE: ${GENRE_LABELS[a.genre]}
${GENRE_STYLES[a.genre]}

TONE: ${toneLabel}
${toneStyle[a.tone]}

PERSONAL DETAILS:
${details}

OUTPUT FORMAT — return ONLY this structure, no preamble, no explanation:

TITLE: [Evocative title that references the recipient or a key detail about them]

[VERSE 1]
[4-6 lines. Establish who this person is. Use their three words and what makes them special.]

[CHORUS]
[4 lines. Emotionally resonant. Recipient's name appears here. This is the heart of the song.]

[VERSE 2]
[4-6 lines. A specific memory, hobby, or place. Ground it in real detail.]

[CHORUS]
[Repeat chorus — exact if romantic/heartfelt, varied if playful/funny.]

[BRIDGE]
[2-4 lines. Emotional peak or punchline. Include sender name if provided.]

[OUTRO]
[2-3 lines. Closing call-back or final image. Leave them feeling something.]`
}

// ─── BRAND PROMPT ────────────────────────────────────────────────────────────

export function buildBrandPrompt(a: BrandAnswers): string {
  const toneStyle: Record<string, string> = {
    bold:    'High energy, confident, punchy. Think Super Bowl commercial energy. Every line should make you want to stand up.',
    warm:    'Friendly, community-rooted, sincere. Think local business that everyone loves. Warm without being cheesy.',
    premium: 'Polished, aspirational, minimal words but maximum weight. Think luxury brand campaign. Less is more.',
    fun:     'Catchy, upbeat, slightly silly in a charming way. Think earworm jingle energy. Should make people smile.',
  }

  const details = [
    `Brand name: ${a.brand_name}`,
    `Industry: ${a.brand_industry}`,
    `What they do: ${a.brand_what}`,
    a.brand_tagline        ? `Tagline / slogan: "${a.brand_tagline}"` : null,
    a.brand_audience       ? `Target audience: ${a.brand_audience}` : null,
    a.brand_vibe           ? `Brand personality: "${a.brand_vibe}"` : null,
    a.brand_differentiator ? `What makes them different: ${a.brand_differentiator}` : null,
    a.brand_location       ? `Location / market: ${a.brand_location}` : null,
    a.brand_cta            ? `Key message / call to action: ${a.brand_cta}` : null,
  ].filter(Boolean).join('\n')

  return `You are a professional jingle and brand anthem writer. Write a memorable theme song that captures this brand's identity. The song must feel custom-made — not generic marketing copy.

GENRE: ${GENRE_LABELS[a.genre]}
${GENRE_STYLES[a.genre]}

BRAND TONE: ${a.brand_tone}
${toneStyle[a.brand_tone]}

BRAND DETAILS:
${details}

RULES:
- The brand name MUST appear in the chorus
- Reference their specific industry, audience, or differentiator naturally
- Never use generic business clichés ("quality you can trust", "we're the best")
- Make it something people would actually enjoy hearing
- If a tagline is provided, weave it into the hook or outro

OUTPUT FORMAT — return ONLY this structure, no preamble, no explanation:

TITLE: [Song title — brand name or creative play on it]

[VERSE 1]
[4-6 lines. Who this brand is and what they stand for.]

[CHORUS]
[4 lines. Brand name appears here. This is the hook.]

[VERSE 2]
[4-6 lines. The audience, the experience, what it feels like to be their customer.]

[CHORUS]
[Repeat — can vary slightly to build energy.]

[BRIDGE]
[2-4 lines. The brand's promise or mission. Most emotionally direct moment.]

[OUTRO]
[2-3 lines. Closing — echo the tagline or call to action if provided.]`
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export function buildPrompt(answers: Answers): string {
  if (answers.occasion === 'brand') {
    return buildBrandPrompt(answers as BrandAnswers)
  }
  return buildPersonalPrompt(answers as PersonalAnswers)
}

// ─── PARSER ──────────────────────────────────────────────────────────────────

export function parseSong(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const song = { title: '', sections: [] as { label: string; lines: string[] }[] }
  let current: { label: string; lines: string[] } | null = null

  for (const line of lines) {
    if (line.startsWith('TITLE:')) {
      song.title = line.replace('TITLE:', '').trim()
    } else if (/^\[.+\]$/.test(line)) {
      current = { label: line.replace(/[\[\]]/g, '').trim(), lines: [] }
      song.sections.push(current)
    } else if (current && line) {
      current.lines.push(line)
    }
  }

  return song
}

// ─── SONG ID GENERATOR ────────────────────────────────────────────────────────

export function generateSongId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `sng_${rand}`
}
