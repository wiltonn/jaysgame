/**
 * Utilities for generating unique join codes for matches
 */

/**
 * Characters allowed in join codes (alphanumeric, excluding ambiguous characters)
 * Excludes: 0, O, I, 1, l to avoid confusion
 */
const JOIN_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a random join code
 * @param length - Length of the join code (default: 6)
 * @returns Random join code (e.g., "A3B5K2")
 */
export function generateJoinCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * JOIN_CODE_CHARS.length);
    code += JOIN_CODE_CHARS[randomIndex];
  }
  return code;
}

/**
 * Validate join code format
 * @param code - Join code to validate
 * @returns True if valid format
 */
export function isValidJoinCode(code: string): boolean {
  if (!code || code.length !== 6) {
    return false;
  }

  // Check all characters are in allowed set
  return code.split('').every((char) => JOIN_CODE_CHARS.includes(char));
}

/**
 * Format join code for display (e.g., "ABC 123")
 * @param code - Join code to format
 * @returns Formatted join code
 */
export function formatJoinCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  return code;
}
