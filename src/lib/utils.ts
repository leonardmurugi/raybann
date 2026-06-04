/**
 * Utility function to conditionally join classnames
 * Filters out falsy values and joins with spaces
 */
export function cn(...inputs: any[]): string {
  return inputs.filter(Boolean).join(' ');
}
