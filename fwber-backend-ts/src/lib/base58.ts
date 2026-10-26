/**
 * Minimal base58 decoder (Bitcoin/Solana alphabet) — zero-dependency.
 *
 * Used by wallet-login signature verification to decode bs58-encoded
 * ed25519 public keys (32 bytes) and signatures (64 bytes). Deliberately
 * tiny: we only need decode (never encode), and adding a dependency for
 * ~30 lines is not worth the supply-chain surface (Muse's dep lessons).
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const ALPHABET_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET.charAt(i)] = i;

/**
 * Decode a base58 string to bytes. Returns null on any invalid character
 * (callers treat that as "bad signature", not an exception).
 */
export function base58Decode(input: string): Buffer | null {
  if (typeof input !== 'string' || input.length === 0) return null;

  // Count leading '1's -> leading zero bytes.
  let zeros = 0;
  while (zeros < input.length && input[zeros] === '1') zeros++;

  // log(256)/log(58) ~= 1.365
  const size = Math.ceil((input.length - zeros) * 1.365) + 1;
  const bytes = new Uint8Array(size);
  let length = 0;

  for (let i = zeros; i < input.length; i++) {
    const value = ALPHABET_MAP[input.charAt(i)];
    if (value === undefined) return null;

    let carry = value;
    let j = 0;
    for (let k = size - 1; k >= 0; k--, j++) {
      if (carry === 0 && j >= length) break;
      carry += 58 * bytes[k]!;
      bytes[k] = carry & 0xff;
      carry >>= 8;
    }
    length = j;
  }

  // Strip leading zeros from the decoded body.
  let start = size - length;
  while (start < size && bytes[start] === 0) start++;

  return Buffer.concat([Buffer.alloc(zeros), Buffer.from(bytes.slice(start))]);
}
