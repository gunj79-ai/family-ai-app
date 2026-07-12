export interface PiiResult {
  redacted: string;
  map: Record<string, string>;
}

const EMAIL_RE    = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_RE    = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
const SSN_RE      = /\b\d{3}-\d{2}-\d{4}\b/g;
const ADDRESS_RE  = /\b\d{1,5}\s+\w+(\s\w+)?\s(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr)\b/gi;
const CARD_RE     = /\b(?:\d[ -]*?){13,16}\b/g;
// Partial placeholder pattern — used to detect split placeholders at chunk boundaries
const PARTIAL_RE  = /\[(?:PERSON|EMAIL|PHONE|SSN|ADDRESS|CARD_NUMBER)_?\d*$/;

export function stripPii(text: string, familyNames: string[]): PiiResult {
  let redacted = text;
  const map: Record<string, string> = {};
  let counter = 0;

  for (const name of familyNames) {
    if (name && name.length > 1 && redacted.includes(name)) {
      const placeholder = `[PERSON_${counter}]`;
      redacted = redacted.split(name).join(placeholder);
      map[placeholder] = name;
      counter++;
    }
  }

  redacted = redacted
    .replace(EMAIL_RE,   '[EMAIL]')
    .replace(PHONE_RE,   '[PHONE]')
    .replace(SSN_RE,     '[SSN]')
    .replace(ADDRESS_RE, '[ADDRESS]')
    .replace(CARD_RE,    '[CARD_NUMBER]');

  return { redacted, map };
}

export function restorePii(text: string, map: Record<string, string>): string {
  let restored = text;
  for (const [placeholder, original] of Object.entries(map)) {
    restored = restored.split(placeholder).join(original);
  }
  return restored;
}

// Carry-buffer restore — handles placeholders split across streaming chunks
export function createChunkRestorer(map: Record<string, string>) {
  let carry = '';
  return function restore(chunk: string): string {
    const text = carry + chunk;
    const partial = text.match(PARTIAL_RE);
    if (partial) {
      carry = partial[0];
      return restorePii(text.slice(0, text.length - carry.length), map);
    }
    carry = '';
    return restorePii(text, map);
  };
}
