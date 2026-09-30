/**
 * Simple classnames utility
 */
export function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}
