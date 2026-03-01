/**
 * Album seed generation: 5 words from BIP-39 list using crypto.randomBytes.
 * Call generateSeed() only from the POST /api/albums handler (work item 3.2).
 */

import crypto from 'node:crypto'
import { BIP39_WORDS } from './bip39-words.js'

const WORDS_COUNT = 5
const BITS_PER_WORD = 11
const WORD_MASK = (1 << BITS_PER_WORD) - 1 // 0x7FF

/**
 * Returns a space-separated string of 5 words from the BIP-39 English list.
 * Uses crypto.randomBytes for secure random selection.
 */
export function generateSeed(): string {
  const bytes = crypto.randomBytes(7)
  const n =
    (BigInt(bytes.readUIntBE(0, 4)) << 24n) | BigInt(bytes.readUIntBE(4, 3))
  const words: string[] = []
  for (let i = 0; i < WORDS_COUNT; i++) {
    const index = Number((n >> (45n - BigInt(i) * BigInt(BITS_PER_WORD))) & BigInt(WORD_MASK))
    words.push(BIP39_WORDS[index])
  }
  return words.join(' ')
}
