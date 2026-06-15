/**
 * Metadata Cleaner Utility
 * Specifically targets common noise in Indian/Tamil music download tags
 * like website names, "downloaded from", etc.
 */

const NOISE_PATTERNS = [
  /MassTamilan/gi,
  /Isaimini/gi,
  /Tamilway/gi,
  /Starmusiq/gi,
  /TamilVishwa/gi,
  /Kollysongs/gi,
  /Sensongs/gi,
  /Sensongsmp3/gi,
  /Pagalworld/gi,
  /Mr-Jatt/gi,
  /Raaga/gi,
  /Download/gi,
  /www\./gi,
  /\.com/gi,
  /\.net/gi,
  /\.one/gi,
  /\.org/gi,
  /\.info/gi,
  /\.in/gi,
  /\.co/gi,
  /\.vip/gi,
  /\.fm/gi,
  /\.dev/gi,
  /\[.*?(?:MassTamilan|Isaimini|Starmusiq|Tamilway|TamilVishwa|Kollysongs|Sensongs|Pagalworld|Mr-Jatt|Raaga|www\.|\.com|\.net|\.in|\.dev|\.co|\.vip|\.fm|\.info|\.one).*?\]/gi,
];

const SEPARATORS = [
  /\s*-\s*$/, // Trailing dashes
  /^\s*-\s*/, // Leading dashes
  /\s*::\s*/, // Double colons
  /\s*:\s*$/, // Trailing colons
  /\s*-\s*-+/, // Multiple dashes
];

export function cleanMetadataString(str: string | undefined | null): string {
  if (!str) return "";

  let cleaned = str;

  // 1. Remove specific noise patterns
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // 2. Clean up common delimiters used to attach website names
  cleaned = cleaned.replace(/::/g, " ");

  // 3. Remove leading/trailing non-alphanumeric noise (except basic punctuation)
  cleaned = cleaned.trim();

  // 4. Clean up multiple spaces and specific trailing separators
  for (const sep of SEPARATORS) {
    cleaned = cleaned.replace(sep, " ");
  }

  // 5. Final trim and cleanup
  cleaned = cleaned.replace(/\s\s+/g, " ").trim();

  // Handle specific case like "Dude-MassTamilan" -> "Dude"
  // If there's a trailing dash after removing noise, clean it
  cleaned = cleaned.replace(/\s*-+$/, "").trim();

  return cleaned;
}

/**
 * Specifically cleans search queries to improve online matches
 */
export function cleanSearchQuery(query: string): string {
  let cleaned = cleanMetadataString(query);

  // Further optimizations for search engines
  // Remove "Official", "Video", "Lyrics", "Song" etc if they clutter the query
  const searchNoise = [
    /\bOfficial\b/gi,
    /\bVideo\b/gi,
    /\bSong\b/gi,
    /\bLyrics\b/gi,
    /\bFull\b/gi,
    /\bHD\b/gi,
    /4K/gi,
    /\bAudio\b/gi,
  ];

  for (const pattern of searchNoise) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.replace(/\s\s+/g, " ").trim();
}
