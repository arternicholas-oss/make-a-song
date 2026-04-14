# App Store Connect — Listing Copy

Paste these values into App Store Connect → My Apps → Make a Song About You → iOS App → (Version) → App Information / Version Information.

---

## App Information (set once)

| Field | Value |
|---|---|
| **Bundle ID** | `com.makeasongaboutyou.app` |
| **SKU** | `makeasongaboutyou-ios-v1` |
| **Primary category** | Entertainment |
| **Secondary category** | Music |
| **Content rights** | Contains third-party content: **No** |
| **Age rating** | 12+ (Infrequent/Mild Profanity or Crude Humor — song lyrics may contain occasional edgy wording) |

### Privacy Policy URL
`https://makeasongaboutyou.com/privacy`

### Support URL
`https://makeasongaboutyou.com/support`

### Marketing URL (optional)
`https://makeasongaboutyou.com`

---

## Version Information (per release)

### Name (max 30 chars — currently 26)
```
Make a Song About You
```

### Subtitle (max 30 chars — currently 29)
```
Personalized AI song in 60 sec
```

### Promotional Text (max 170 chars — updateable without review)
```
Turn any story into a one-of-one song. Birthdays, anniversaries, weddings, proposals — answer a few questions and we'll write them a song that could only be about them.
```

### Description (max 4000 chars)
```
A personalized song written just for the person you love. In under 60 seconds.

Answer a few questions about someone — their quirks, your shared memories, the inside jokes — and we'll turn it into a real, produced song that could only ever be about them. Every song is genuinely one-of-one. No one else has it, no one else ever will.

HOW IT WORKS
1. Pick an occasion — birthday, anniversary, wedding, proposal, new baby, memorial, "just because," or anything else.
2. Pick a genre and a vibe — 70s love ballad, 90s R&B slow jam, country story song, pop anthem, hip-hop, gospel.
3. Tell us about them — the little things, the big things, what only you would know.
4. We write, record, and deliver the song to your inbox (or directly to them). Usually in under a minute.

PERFECT FOR
• Birthdays that need to actually feel special this year
• Anniversaries where "another card" won't cut it
• Weddings — play it for your first dance, or gift it to the couple
• Proposals — yes, people have used these to propose
• Memorials and tributes
• New baby announcements
• Teacher, coach, or mentor appreciation
• Just telling someone you love them in a way they'll remember

WHY IT WORKS
Most gifts wear out. A song made specifically for someone, about them, stays with them. You'll catch them playing it in the car two years later. That's the point.

EVERY SONG INCLUDES
• A full, produced track (vocals + instrumentation)
• Complete printable lyrics
• A shareable link with their name on it
• An optional "send from me" delivery to their email
• An animated lyric video you can share to TikTok, Instagram, or text them directly

PRICING
$14.99 per song. No subscription. No hidden tiers. One price, one song, yours forever.

BRAND MODE
Have a launch, a team to thank, or a campaign? Switch to Brand Mode for jingles, internal hype tracks, customer appreciation songs, and launch anthems.

PRIVACY
We only use the details you give us to write that one song. We don't sell your data, we don't train on your submissions, and we delete drafts you don't keep. The shareable links expire after 30 days unless you save the song to your account.

Made with care. Not automation slop.
```

### Keywords (max 100 chars — currently 98)
```
personalized song,custom song,ai song,song gift,birthday song,love song,lyric video,wedding song,song maker
```

### Support URL
`https://makeasongaboutyou.com/support`

### What's New in This Version (for subsequent versions)
```
• Initial release — write a one-of-one song about anyone you love, in under a minute.
• Pick from 6 genres and 8 occasions, or use Brand Mode for jingles & launch anthems.
• Every song comes with a shareable link and an animated lyric video.
```

---

## In-App Purchases
None. All purchases are web-based Stripe checkouts that complete in Safari View Controller. Per Apple's **Guideline 3.1.3(a) — Reader apps / digital content consumed on the web**, this is permitted because the song is delivered to the user's email and as a web link, not as a downloaded digital good consumed inside the app.

> ⚠️ **Reviewer note:** If Apple flags this under 3.1.1, the fallback is to either (a) remove all payment CTAs from inside the iOS app (leave "View previous songs" only, direct payment to Safari), or (b) implement Apple In-App Purchase at 70% of the $14.99 price. Decide before submitting.

---

## App Review Information

| Field | Value |
|---|---|
| **Sign-in required** | No — the flow is entirely anonymous until a user opts in to save their song. |
| **Demo account** | Not required. |
| **Review notes** | See below. |
| **Contact first name** | Nick |
| **Contact last name** | Arter |
| **Contact email** | arternicholas@gmail.com |
| **Contact phone** | _TODO: add a phone number App Review can call_ |

### Review Notes
```
Hi App Review team,

Make a Song About You generates personalized, one-of-one songs as gifts.

HOW TO TEST
1. Open the app.
2. Tap "Start a song."
3. Select "Birthday" → "Pop anthem" → fill out the questionnaire (any inputs work).
4. You'll reach a paywall at $14.99. You do NOT need to pay to evaluate the experience — the flow up to that point demonstrates the full app.
5. If you'd like to see the post-payment experience, please reply to this submission and we will comp you a test song link.

PAYMENT
Payment is via Stripe Checkout in Safari View Controller. The digital good (a song) is delivered via email and as a shareable web link hosted at https://makeasongaboutyou.com/song/[id]. It is not a digital good consumed inside the app. We believe this fits Guideline 3.1.3(a), but we're happy to adjust if you see it differently.

UGC / CONTENT
Users provide short text prompts describing a person. The prompts are filtered (we block obvious attempts at harassing-content generation) and the LLM that composes lyrics has safety training. Users can report generated songs via the "Report" link at the bottom of every song page, and we remove reported content within 24 hours. We do not allow user-to-user communication inside the app.

ACCOUNT DELETION
Users can email support@makeasongaboutyou.com to delete their account and all associated songs. This is also linked from the footer of every page.

Thank you!
— Nick
```

---

## Screenshots Required

| Device | Required size | How many | Notes |
|---|---|---|---|
| iPhone 6.9" (iPhone 16 Pro Max) | 1320 × 2868 | 3–10 | Primary display — do these first |
| iPhone 6.5" (iPhone 11 Pro Max) | 1284 × 2778 or 1242 × 2688 | 3–10 | Required fallback for older submissions |
| iPad 13" (iPad Pro M4) | 2064 × 2752 | 3–10 | Required if app supports iPad (ours does, WebView scales) |

**Screenshot plan (5 shots):**
1. Hero: "Answer a few questions. We'll write them a song." — landing page.
2. Occasion picker — show all 9 occasions laid out with emojis.
3. Genre picker — show the 6 genre cards with color gradients.
4. Questionnaire in progress — show a filled-out Q&A with the progress bar.
5. Finished song page — animated lyric video with Share / Download CTAs.

Screenshots are generated via the `capture-screenshots.js` Playwright script (see `app-store/screenshots/README.md`). Frame them in the Apple marketing templates from https://developer.apple.com/design/resources/ for a polish pass.

---

## App Privacy Questionnaire

Fill in the "App Privacy" section (Apple privacy nutrition labels) exactly as follows:

| Data Category | Collected? | Linked to User? | Used for Tracking? | Purposes |
|---|---|---|---|---|
| **Name** (of the song recipient) | Yes | No | No | App Functionality |
| **Email** (buyer + optional recipient) | Yes | Yes | No | App Functionality (song delivery), Customer Support |
| **Payment Info** | Yes (via Stripe) | Yes | No | Purchases |
| **User Content** (questionnaire answers → lyrics) | Yes | Yes | No | App Functionality |
| **Crash Data** | Yes | No | No | App Functionality |
| **Performance Data** (PostHog) | Yes | No | No | Analytics |
| **Product Interaction** (PostHog) | Yes | No | No | Analytics |

**We do NOT collect:** Precise location, coarse location, photos, video, audio recordings, contacts, health data, fitness data, sensitive info, advertising data, browsing history, search history, device ID for tracking.

**Third-party SDKs to declare:**
- Stripe (payment processing)
- Supabase (database + storage)
- Resend (email delivery, server-side only)
- PostHog (product analytics)
- Anthropic (LLM inference, server-side only)
