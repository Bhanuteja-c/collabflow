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
