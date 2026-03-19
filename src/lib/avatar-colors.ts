// Generates a consistent, vibrant HSL color from a user's name.
// Used for avatar fallback backgrounds to give each user a unique color identity — like Slack.

const AVATAR_COLORS = [
  // Hand-picked vibrant colors that look great as avatar backgrounds
  { bg: "bg-rose-500",     text: "text-white" },
  { bg: "bg-pink-500",     text: "text-white" },
  { bg: "bg-fuchsia-500",  text: "text-white" },
  { bg: "bg-purple-500",   text: "text-white" },
  { bg: "bg-violet-500",   text: "text-white" },
  { bg: "bg-indigo-500",   text: "text-white" },
  { bg: "bg-blue-500",     text: "text-white" },
  { bg: "bg-sky-500",      text: "text-white" },
  { bg: "bg-cyan-500",     text: "text-white" },
  { bg: "bg-teal-500",     text: "text-white" },
  { bg: "bg-emerald-500",  text: "text-white" },
  { bg: "bg-green-600",    text: "text-white" },
  { bg: "bg-amber-500",    text: "text-white" },
  { bg: "bg-orange-500",   text: "text-white" },
  { bg: "bg-red-500",      text: "text-white" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getAvatarColor(name: string | null | undefined) {
  const n = (name || "?").toLowerCase().trim();
  const index = hashString(n) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// Returns combined className for AvatarFallback
export function avatarFallbackClass(name: string | null | undefined, extraClass = ""): string {
  const color = getAvatarColor(name);
  return `${color.bg} ${color.text} ${extraClass}`.trim();
}

// DiceBear avatar styles ranked by visual appeal for a collaboration tool
const DICEBEAR_STYLES = [
  "notionists-neutral",  // Clean, Notion-style illustrated faces
  "avataaars-neutral",   // Friendly, diverse avatars
  "lorelei-neutral",     // Artistic line-drawn faces
  "bottts-neutral",      // Fun robot avatars
] as const;

// Hex colors that pair well with DiceBear backgrounds
const DICEBEAR_BG_COLORS = [
  "c0aede", "b6e3f4", "d1d4f9", "ffd5dc", "ffdfbf",
  "a3e4d7", "aed6f1", "f9e79f", "fadbd8", "d5dbdb",
];

/**
 * Generate a DiceBear avatar URL for a user.
 * Uses the user's name as a deterministic seed so the same name always gets the same avatar.
 * Points to the public DiceBear API by default to ensure production stability in Azure.
 * Override with a local Docker instance via NEXT_PUBLIC_DICEBEAR_URL env var if desired.
 * @param name - The user's display name
 * @param style - Override the default DiceBear style (default: 'notionists-neutral')
 * @param size - Avatar size in px (default: 80)
 */
export function getDiceBearAvatar(
  name: string | null | undefined,
  style: string = DICEBEAR_STYLES[0],
  size: number = 80
): string {
  const baseUrl = process.env.NEXT_PUBLIC_DICEBEAR_URL || "https://api.dicebear.com";
  const seed = encodeURIComponent((name || "User").trim());
  const bgIndex = hashString((name || "?").toLowerCase().trim()) % DICEBEAR_BG_COLORS.length;
  const bgColor = DICEBEAR_BG_COLORS[bgIndex];
  return `${baseUrl}/9.x/${style}/svg?seed=${seed}&size=${size}&backgroundColor=${bgColor}&radius=50`;
}

/**
 * Generates a completely randomized DiceBear URL.
 * Spins through different styles, background colors, and randomized string seeds.
 * @param size - Avatar size in px
 */
export function getRandomDiceBearAvatar(size: number = 80): string {
  const baseUrl = process.env.NEXT_PUBLIC_DICEBEAR_URL || "https://api.dicebear.com";
  const randomStyle = DICEBEAR_STYLES[Math.floor(Math.random() * DICEBEAR_STYLES.length)];
  const randomBgIndex = Math.floor(Math.random() * DICEBEAR_BG_COLORS.length);
  const bgColor = DICEBEAR_BG_COLORS[randomBgIndex];
  const seed = Math.random().toString(36).substring(2, 9);
  return `${baseUrl}/9.x/${randomStyle}/svg?seed=${seed}&size=${size}&backgroundColor=${bgColor}&radius=50`;
}
