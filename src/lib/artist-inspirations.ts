/**
 * Popular artists shown in the UI. `referenceStyle` is sent to KIE (descriptors only —
 * we avoid celebrity names in API text because the lyrics endpoint can reject them).
 */
export type ArtistInspiration = {
  id: string;
  /** Shown in the app only */
  title: string;
  /** Vocal + production vocabulary for music `style` + lyrics prompt */
  referenceStyle: string;
  suggestedVocal?: "m" | "f";
};

const GENERIC: ArtistInspiration[] = [
  {
    id: "classic-vocalist",
    title: "Classic vocalist",
    referenceStyle: "clear lead vocal, timeless phrasing, memorable hooks",
  },
  {
    id: "modern-polished",
    title: "Modern polished",
    referenceStyle: "wide stereo mix, glossy production, tight vocal tuning",
  },
  {
    id: "raw-live",
    title: "Raw / live feel",
    referenceStyle: "room ambience, dynamic vocal, minimal polish",
  },
  {
    id: "harmony-rich",
    title: "Harmony-heavy",
    referenceStyle: "stacked harmonies, call-and-response, layered backing vocals",
  },
];

export const ARTISTS_BY_VIBE: Record<string, ArtistInspiration[]> = {
  rap: [
    {
      id: "wc-conscious",
      title: "West coast storyteller",
      referenceStyle: "west coast conscious rap; dense internal rhyme; cinematic pacing",
      suggestedVocal: "m",
    },
    {
      id: "melodic-rap-rnb",
      title: "Melodic rap + R&B hooks",
      referenceStyle: "melodic rap; R&B hooks; moody pads; crisp hi-hats",
      suggestedVocal: "m",
    },
    {
      id: "boom-bap",
      title: "Boom-bap lyricist",
      referenceStyle: "boom-bap drums; sample chops; punchline-heavy bars",
      suggestedVocal: "m",
    },
    {
      id: "southern-bounce",
      title: "Southern bounce",
      referenceStyle: "southern bounce; triplet flows; trunk-rattling 808s",
      suggestedVocal: "m",
    },
    {
      id: "femme-rap-power",
      title: "High-energy femme rap",
      referenceStyle: "fast cadence; attitude; club-ready bounce; sharp ad-libs",
      suggestedVocal: "f",
    },
  ],
  trap: [
    {
      id: "dark-melodic-trap",
      title: "Dark melodic trap",
      referenceStyle: "minor melodies; reverb-heavy 808s; half-time hi-hats",
      suggestedVocal: "m",
    },
    {
      id: "rage-trap",
      title: "Rage / distorted",
      referenceStyle: "distorted 808s; aggressive ad-libs; chaotic energy",
      suggestedVocal: "m",
    },
    {
      id: "plugg",
      title: "Plugg / airy",
      referenceStyle: "airy synths; soft 808 slides; whispery delivery",
      suggestedVocal: "m",
    },
    {
      id: "trap-soul",
      title: "Trap soul",
      referenceStyle: "trap drums; soul samples; sung-rap hybrid hooks",
      suggestedVocal: "m",
    },
  ],
  "hip-hop": [
    {
      id: "golden-era",
      title: "Golden-era sample flip",
      referenceStyle: "dusty samples; swing; playful rhyme schemes",
      suggestedVocal: "m",
    },
    {
      id: "neo-soul-hiphop",
      title: "Neo-soul hip-hop",
      referenceStyle: "warm keys; live bass; laid-back pocket",
      suggestedVocal: "m",
    },
    {
      id: "jazz-rap",
      title: "Jazz rap",
      referenceStyle: "walking bass; brushed drums; intricate rhyme patterns",
      suggestedVocal: "m",
    },
  ],
  pop: [
    {
      id: "radio-max",
      title: "Radio pop",
      referenceStyle: "big chorus lift; bright synths; tight vocal stacks",
      suggestedVocal: "f",
    },
    {
      id: "synth-pop-80s",
      title: "80s-inspired synth-pop",
      referenceStyle: "wide snare; analog synths; anthemic hooks",
      suggestedVocal: "f",
    },
    {
      id: "piano-pop",
      title: "Piano-driven pop",
      referenceStyle: "grand piano; emotional belt; minimal drums",
      suggestedVocal: "f",
    },
    {
      id: "dance-pop",
      title: "Dance-pop",
      referenceStyle: "four-on-the-floor; sidechain; earworm hooks",
      suggestedVocal: "f",
    },
  ],
  "r-and-b": [
    {
      id: "modern-rnb",
      title: "Modern R&B",
      referenceStyle: "airy pads; crisp snares; melismatic runs",
      suggestedVocal: "m",
    },
    {
      id: "alt-rnb",
      title: "Alt R&B",
      referenceStyle: "reverb tails; sparse beats; intimate falsetto",
      suggestedVocal: "m",
    },
    {
      id: "rnb-diva",
      title: "Power R&B",
      referenceStyle: "belted choruses; stacked harmonies; big ballad energy",
      suggestedVocal: "f",
    },
  ],
  soul: [
    {
      id: "motown-pocket",
      title: "Motown pocket",
      referenceStyle: "live band; horn stabs; tight backbeat",
      suggestedVocal: "m",
    },
    {
      id: "neo-soul-keys",
      title: "Neo-soul keys",
      referenceStyle: "electric piano; groove pocket; warm tape",
      suggestedVocal: "f",
    },
  ],
  indie: [
    {
      id: "indie-guitar",
      title: "Indie guitar jangle",
      referenceStyle: "jangly guitars; dry drums; conversational vocal",
      suggestedVocal: "m",
    },
    {
      id: "dream-pop",
      title: "Dream pop",
      referenceStyle: "shoegaze guitars; airy vocals; reverb washes",
      suggestedVocal: "f",
    },
  ],
  rock: [
    {
      id: "arena-rock",
      title: "Arena rock",
      referenceStyle: "big guitars; tom-heavy drums; anthem vocals",
      suggestedVocal: "m",
    },
    {
      id: "grunge-alt",
      title: "Grunge / alt",
      referenceStyle: "fuzz guitars; gritty vocal; dynamic quiet/loud",
      suggestedVocal: "m",
    },
    {
      id: "classic-blues-rock",
      title: "Blues-rock lead",
      referenceStyle: "blues scales; tube amp tone; expressive bends",
      suggestedVocal: "m",
    },
  ],
  punk: [
    {
      id: "pop-punk",
      title: "Pop-punk",
      referenceStyle: "fast downstrokes; driving drums; catchy shout hooks",
      suggestedVocal: "m",
    },
    {
      id: "hardcore-punk",
      title: "Hardcore punk",
      referenceStyle: "blast beats; aggressive vocals; raw energy",
      suggestedVocal: "m",
    },
  ],
  metal: [
    {
      id: "modern-metal",
      title: "Modern metal",
      referenceStyle: "tight double kicks; palm-muted riffs; scream/clean contrast",
      suggestedVocal: "m",
    },
    {
      id: "thrash",
      title: "Thrash",
      referenceStyle: "fast picking; aggressive vocals; tight rhythm section",
      suggestedVocal: "m",
    },
  ],
  electronic: [
    {
      id: "synthwave",
      title: "Synthwave",
      referenceStyle: "analog arps; sidechained pads; retro toms",
      suggestedVocal: "m",
    },
    {
      id: "dnb",
      title: "Drum & bass",
      referenceStyle: "rolling breaks; sub bass; airy vocal chops",
      suggestedVocal: "f",
    },
  ],
  edm: [
    {
      id: "future-bass",
      title: "Future bass",
      referenceStyle: "supersaws; vocal chops; emotional drops",
      suggestedVocal: "f",
    },
    {
      id: "big-room",
      title: "Big room",
      referenceStyle: "wide leads; festival drops; huge kick",
      suggestedVocal: "m",
    },
  ],
  house: [
    {
      id: "deep-house",
      title: "Deep house",
      referenceStyle: "warm basslines; swung hats; subtle vocal samples",
      suggestedVocal: "f",
    },
    {
      id: "tech-house",
      title: "Tech house",
      referenceStyle: "bouncy bass; percussive groove; club vocal chops",
      suggestedVocal: "m",
    },
  ],
  jazz: [
    {
      id: "swing-standards",
      title: "Swing standards",
      referenceStyle: "walking bass; brushed snare; scat-friendly phrasing",
      suggestedVocal: "m",
    },
    {
      id: "smooth-jazz",
      title: "Smooth jazz",
      referenceStyle: "sax leads; electric piano; polished tone",
      suggestedVocal: "m",
    },
  ],
  "lo-fi": [
    {
      id: "lofi-beats",
      title: "Lo-fi beats",
      referenceStyle: "crackly samples; soft kick; mellow vocal",
      suggestedVocal: "f",
    },
    {
      id: "chillhop",
      title: "Chillhop",
      referenceStyle: "jazzy chords; head-nod drums; relaxed delivery",
      suggestedVocal: "m",
    },
  ],
  country: [
    {
      id: "modern-country",
      title: "Modern country",
      referenceStyle: "big drums; telecaster twang; anthem storytelling",
      suggestedVocal: "m",
    },
    {
      id: "country-pop",
      title: "Country-pop crossover",
      referenceStyle: "polished mix; hooky chorus; acoustic strums",
      suggestedVocal: "f",
    },
  ],
  folk: [
    {
      id: "acoustic-story",
      title: "Acoustic storyteller",
      referenceStyle: "fingerpicked guitar; intimate vocal; natural room",
      suggestedVocal: "m",
    },
    {
      id: "indie-folk",
      title: "Indie folk harmony",
      referenceStyle: "light percussion; harmony stacks; earthy tone",
      suggestedVocal: "f",
    },
  ],
  reggae: [
    {
      id: "roots-reggae",
      title: "Roots reggae",
      referenceStyle: "one-drop drums; organ skank; conscious delivery",
      suggestedVocal: "m",
    },
    {
      id: "dancehall",
      title: "Dancehall",
      referenceStyle: "dembow rhythm; punchy snares; rhythmic patois flow",
      suggestedVocal: "m",
    },
  ],
  latin: [
    {
      id: "reggaeton",
      title: "Reggaeton",
      referenceStyle: "dembow groove; perreo bounce; modern pop hooks",
      suggestedVocal: "m",
    },
    {
      id: "salsa-pop",
      title: "Salsa / Latin pop",
      referenceStyle: "horn section; clave; energetic lead vocal",
      suggestedVocal: "f",
    },
  ],
  funk: [
    {
      id: "p-funk",
      title: "Funk groove",
      referenceStyle: "syncopated bass; clavinet; tight horn stabs",
      suggestedVocal: "m",
    },
    {
      id: "disco-funk",
      title: "Disco funk",
      referenceStyle: "four-on-the-floor; slap bass; string hits",
      suggestedVocal: "f",
    },
  ],
  blues: [
    {
      id: "delta-blues",
      title: "Blues guitar",
      referenceStyle: "slide guitar; shuffle groove; raw vocal",
      suggestedVocal: "m",
    },
    {
      id: "electric-blues",
      title: "Electric blues rock",
      referenceStyle: "tube overdrive; walking bass; expressive bends",
      suggestedVocal: "m",
    },
  ],
  gospel: [
    {
      id: "choir-gospel",
      title: "Choir gospel",
      referenceStyle: "big choir stacks; organ; uplifting dynamics",
      suggestedVocal: "f",
    },
    {
      id: "contemporary-gospel",
      title: "Contemporary gospel",
      referenceStyle: "modern drums; piano-driven; powerful lead",
      suggestedVocal: "m",
    },
  ],
};

export function getArtistsForVibe(vibeId: string): ArtistInspiration[] {
  return ARTISTS_BY_VIBE[vibeId] ?? GENERIC;
}

export function findArtist(
  vibeId: string,
  artistId: string
): ArtistInspiration | undefined {
  return getArtistsForVibe(vibeId).find((a) => a.id === artistId);
}
