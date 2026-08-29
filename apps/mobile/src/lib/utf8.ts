/**
 * Hermes-safe UTF-8 byte↔string conversion.
 *
 * Hermes ships TextEncoder but no TextDecoder and no global Buffer, so sync
 * payloads and rustra JSON-engine responses convert in pure JS. The decoder
 * builds output in ~8KB chunks via `String.fromCharCode.apply` and joins
 * once — per-code-unit concatenation is O(n²)-ish on large bodies (a full
 * sync snapshot is ~13MB).
 */

const utf8Encoder = new TextEncoder();

const DECODE_CHUNK_SIZE = 8 * 1024;

/** Encodes a JS string to UTF-8 bytes without Buffer. */
export function encodeUtf8(text: string): Uint8Array {
  return utf8Encoder.encode(text);
}

/** Counts the UTF-8 byte length of a string without allocating the bytes. */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4; // surrogate pair encodes as one 4-byte sequence
        i += 1;
      } else {
        bytes += 3; // unpaired surrogate encodes as U+FFFD, like TextEncoder
      }
    } else bytes += 3;
  }
  return bytes;
}

/** Decodes UTF-8 bytes to a JS string without Buffer/TextDecoder. */
export function decodeUtf8(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const b = bytes[i];
    if (b < 0x80) {
      // Fast path: consecutive ASCII bytes join into one chunk.
      let asciiEnd = i + 1;
      while (
        asciiEnd < len &&
        asciiEnd - i < DECODE_CHUNK_SIZE &&
        bytes[asciiEnd] < 0x80
      ) {
        asciiEnd += 1;
      }
      chunks.push(
        String.fromCharCode.apply(
          null,
          bytes.subarray(i, asciiEnd) as unknown as number[],
        ),
      );
      i = asciiEnd;
    } else if ((b & 0xe0) === 0xc0) {
      chunks.push(String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f)));
      i += 2;
    } else if ((b & 0xf0) === 0xe0) {
      chunks.push(
        String.fromCharCode(
          ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f),
        ),
      );
      i += 3;
    } else if ((b & 0xf8) === 0xf0) {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const adj = cp - 0x10000;
      chunks.push(
        String.fromCharCode(0xd800 + (adj >> 10), 0xdc00 + (adj & 0x3ff)),
      );
      i += 4;
    } else {
      i += 1; // invalid lead byte — skip
    }
  }
  return chunks.join('');
}
