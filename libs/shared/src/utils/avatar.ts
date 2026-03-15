export const AVATAR_GRADIENTS: readonly (readonly [string, string])[] = [
  ['#FB923C', '#EF4444'],
  ['#4ADE80', '#14B8A6'],
  ['#60A5FA', '#6366F1'],
  ['#A78BFA', '#EC4899'],
  ['#FBBF24', '#F97316'],
  ['#34D399', '#06B6D4'],
  ['#F472B6', '#A855F7'],
  ['#38BDF8', '#8B5CF6'],
] as const;

/**
 * Get avatar gradient based on string (e.g., name or id).
 * Provides consistent color for the same input.
 */
export function getAvatarGradient(input: string): readonly [string, string] {
  if (!input) {
    return AVATAR_GRADIENTS[0]!;
  }

  const hash = input.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index]!;
}
