/**
 * Username utilities for validation, generation, and resolution
 */

// Valid username regex: 3-20 chars, alphanumeric + underscore
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help',
  'runebolt', 'official', 'team', 'staff', 'mod', 'moderator',
  'api', 'www', 'app', 'mail', 'email', 'support', 'contact',
  'billing', 'security', 'legal', 'terms', 'privacy', 'about',
  'login', 'signup', 'register', 'auth', 'oauth', 'callback',
  'pay', 'payment', 'claim', 'wallet', 'bitcoin', 'dog',
  'null', 'undefined', 'nan', 'test', 'testing', 'demo',
]);

/**
 * Validate if a username is valid format
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;
  const normalized = username.toLowerCase().replace(/^@/, '');
  
  if (!USERNAME_REGEX.test(normalized)) return false;
  if (RESERVED_USERNAMES.has(normalized)) return false;
  if (normalized.startsWith('_') || normalized.endsWith('_')) return false;
  if (normalized.includes('__')) return false;
  
  return true;
}

/**
 * Normalize username (lowercase, remove @ prefix)
 */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().replace(/^@/, '');
}

/**
 * Generate a username suggestion based on a prefix
 */
export function generateUsername(prefix: string = 'user'): string {
  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 10);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${cleanPrefix}_${randomSuffix}`;
}

/**
 * Generate multiple username suggestions
 */
export function generateUsernameSuggestions(prefix: string = 'user', count: number = 3): string[] {
  const suggestions: string[] = [];
  const base = prefix.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 10);
  
  // Try base + random suffixes
  while (suggestions.length < count) {
    const suffix = Math.random().toString(36).substring(2, 6);
    const suggestion = `${base}_${suffix}`;
    if (!suggestions.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions;
}

/**
 * Format username with @ prefix for display
 */
export function formatUsername(username: string | null | undefined): string {
  if (!username) return '';
  const normalized = normalizeUsername(username);
  return `@${normalized}`;
}

/**
 * Create profile URL from username
 */
export function getProfileUrl(username: string): string {
  const normalized = normalizeUsername(username);
  return `https://runebolt.io/${normalized}`;
}

/**
 * Parse a recipient string to determine type and extract identifier
 * Returns: { type: 'username' | 'pubkey' | 'address', value: string }
 */
export function parseRecipient(input: string): { 
  type: 'username' | 'pubkey' | 'address' | 'unknown'; 
  value: string;
} {
  const trimmed = input.trim();
  
  // Check for username (starts with @ or contains @runebolt)
  if (trimmed.startsWith('@')) {
    return { type: 'username', value: normalizeUsername(trimmed) };
  }
  
  if (trimmed.includes('@runebolt.io')) {
    const username = trimmed.split('@')[0];
    return { type: 'username', value: normalizeUsername(username) };
  }
  
  // Check for Bitcoin address
  if (trimmed.startsWith('bc1') || trimmed.startsWith('1') || trimmed.startsWith('3')) {
    return { type: 'address', value: trimmed };
  }
  
  // Check for pubkey (64-66 hex chars)
  if (/^[0-9a-fA-F]{64,66}$/.test(trimmed)) {
    return { type: 'pubkey', value: trimmed };
  }
  
  // Might be a bare username without @
  if (isValidUsername(trimmed)) {
    return { type: 'username', value: normalizeUsername(trimmed) };
  }
  
  return { type: 'unknown', value: trimmed };
}
