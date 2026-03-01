/**
 * Album seed generation: 5 words from BIP-39 list using crypto.randomBytes.
 * Call generateSeed() only from the POST /api/albums handler (work item 3.2).
 */

import crypto from 'node:crypto'
import { BIP39_WORDS } from './bip39-words.js'

const WORDS_COUNT = 5
// The word list has 2048 words. 2^11 = 2048, so we need 11 bits to pick one index (0..2047).
const BITS_PER_WORD = 11
// When we read 11 bits from the random number, this keeps only those 11 bits and throws away the rest, so we get a number between 0 and 2047 (one index into the word list).
const WORD_MASK = (1 << BITS_PER_WORD) - 1 // 0x7FF

/**
 * Returns a space-separated string of 5 words from the BIP-39 English list.
 * Uses crypto.randomBytes for secure random selection.
 *
 * How it works (step by step):
 * 1. Get 7 random bytes (56 bits) from the OS. Each byte is 8 bits.
 * 2. Treat those 56 bits as one big number n (we glue 4 bytes + 3 bytes because Node can't read 7 at once).
 * 3. We need 5 word indices. Each index is 0..2047 (the list has 2048 words), so we need 11 bits per index (2^11 = 2048). 5 × 11 = 55 bits, and we have 56, so we're good.
 * 4. Split n into 5 chunks of 11 bits: bits 55–45 → index0, bits 44–34 → index1, bits 33–23 → index2, bits 22–12 → index3, bits 11–1 → index4.
 * 5. For each index, look up BIP39_WORDS[index] and collect the five words.
 * 6. Return them joined by spaces, e.g. "apple zone quick river motion".
 *
 * Example (simplified). We picked a fake n so the five 11-bit chunks are 0, 1, 2, 3, 4—just to show the idea. In real runs each chunk is random (0..2047), so indices are not sequential; e.g. you might get 1923, 45, 1800, 7, 2041 and words like "ticket tide tornado toast zone".
 *   index0 = bits 55–45 → 0   → BIP39_WORDS[0]   = "abandon"
 *   index1 = bits 44–34 → 1   → BIP39_WORDS[1]   = "ability"
 *   index2 = bits 33–23 → 2   → BIP39_WORDS[2]   = "able"
 *   index3 = bits 22–12 → 3   → BIP39_WORDS[3]   = "about"
 *   index4 = bits 11–1  → 4   → BIP39_WORDS[4]   = "above"
 *   Result: "abandon ability able about above"
 */
export function generateSeed(): string {
  const bytes = crypto.randomBytes(7)
  // Node only lets us read up to 6 bytes at a time, so we read 4 bytes + 3 bytes and glue them together.
  // First 4 bytes become the "high" part; we shift them left by 24 bits (24n = BigInt 24) to make room for the low 3 bytes, then OR in the low part. Result: one 56-bit number.
  const n =
    (BigInt(bytes.readUIntBE(0, 4)) << 24n) | BigInt(bytes.readUIntBE(4, 3))
  const words: string[] = []
  for (let i = 0; i < WORDS_COUNT; i++) {
    // Take the i-th group of 11 bits from n (shift so that group is at the bottom), mask to 0..2047, then pick that word from the list.
    const index = Number((n >> (45n - BigInt(i) * BigInt(BITS_PER_WORD))) & BigInt(WORD_MASK))
    words.push(BIP39_WORDS[index])
  }
  return words.join(' ')
}
