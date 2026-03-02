/**
 * Upload validation: MIME allowlist, magic-byte check, size/count limits.
 * Feature 6: Upload validation and security.
 */

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

const ALLOWED_SET = new Set<string>(ALLOWED_MIME_TYPES)

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500MB
export const MAX_FILES_PER_PREPARE = 25

/** 6.1 MIME allowlist: only the allowed image/video types are accepted. */
export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_SET.has(mimeType)
}

/**
 * 6.2 Magic-byte check: verifies the file’s raw header matches the declared MIME type.
 *
 * Reads the first bytes of the uploaded file (e.g. after download from Storage) and
 * compares them to known signatures for each allowed type (JPEG, PNG, WebP, GIF,
 * HEIC/HEIF, MP4, WebM). Used at finalize to reject files that claim one type but
 * have a different or executable signature, so we never trust client-declared MIME alone.
 *
 * @param buffer - First 512 bytes (or fewer) of the file
 * @param mimeType - Declared MIME from the prepare step (e.g. image/jpeg)
 * @returns true if the header matches the declared type, false otherwise
 */
export function checkMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false
  // Hex values (0xff, 0xd8, …) are the format’s “magic bytes”: the fixed byte sequence
  // at the start of the file that identifies its type (e.g. JPEG starts with FF D8 FF).
  switch (mimeType) {
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case 'image/png':
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      )
    case 'image/webp':
      // RIFF....WEBP
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      )
    case 'image/gif':
      // GIF87a or GIF89a
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
      )
    case 'image/heic':
    case 'image/heif':
      // ISO Base Media: ftyp at 4, then heic/heix/mif1/msf1 at 8
      if (
        buffer[4] !== 0x66 ||
        buffer[5] !== 0x74 ||
        buffer[6] !== 0x79 ||
        buffer[7] !== 0x70
      )
        return false
      const b8 = buffer[8]
      const b9 = buffer[9]
      const b10 = buffer[10]
      const b11 = buffer[11]
      return (
        (b8 === 0x68 && b9 === 0x65 && b10 === 0x69 && b11 === 0x63) || // heic
        (b8 === 0x68 && b9 === 0x65 && b10 === 0x69 && b11 === 0x78) || // heix
        (b8 === 0x6d && b9 === 0x69 && b10 === 0x66 && b11 === 0x31) || // mif1
        (b8 === 0x6d && b9 === 0x73 && b10 === 0x66 && b11 === 0x31) // msf1
      )
    case 'video/mp4':
      // ftyp at offset 4 (after 4-byte size)
      return (
        buffer[4] === 0x66 &&
        buffer[5] === 0x74 &&
        buffer[6] === 0x79 &&
        buffer[7] === 0x70
      )
    case 'video/webm':
      // EBML header
      return (
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3
      )
    default:
      return false
  }
}
