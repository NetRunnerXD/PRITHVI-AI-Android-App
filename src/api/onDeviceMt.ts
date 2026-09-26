import { Platform } from 'react-native';

/** Eighth Schedule languages ML Kit actually ships (Google list, 2026-09). */
export const MLKIT_INDIC = new Set(['hi', 'bn', 'gu', 'kn', 'mr', 'ta', 'te', 'ur']);

const NUM = /(?:(?<=^)|(?<=\s)|(?<=\())-?\d+(?:\.\d+)?|(?<![A-Za-z0-9.])\d+(?:\.\d+)?/g;

function lockNumbers(text: string): { masked: string; held: string[] } {
  const held: string[] = [];
  const masked = text.replace(NUM, (m) => {
    held.push(m);
    return `⟦${held.length - 1}⟧`;
  });
  return { masked, held };
}

function restoreNumbers(text: string, held: string[]): string {
  let out = text;
  held.forEach((n, i) => {
    out = out.replace(new RegExp(`⟦\\s*${i}\\s*⟧`, 'g'), n);
  });
  return out;
}

function numbersOk(en: string, translated: string): boolean {
  const skip = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '2024', '2025', '2026', '2027', '2028']);
  const need = new Set((en.match(NUM) || []).filter((n) => !skip.has(n)));
  if (!need.size) return true;
  const have = new Set(translated.match(NUM) || []);
  for (const n of need) if (!have.has(n)) return false;
  return true;
}

async function mlkitTranslate(text: string, src: string, tgt: string): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const mod = await import('expo-translate-text');
    const { masked, held } = lockNumbers(text);
    const result = await mod.onTranslateTask({
      input: masked,
      sourceLangCode: src === 'auto' ? 'auto' : src,
      targetLangCode: tgt,
    });
    const body = Array.isArray(result.translatedTexts)
      ? result.translatedTexts.join('\n')
      : String((result as { translatedTexts?: string }).translatedTexts || '');
    if (!body.trim()) return null;
    const restored = restoreNumbers(body, held);
    if (held.length && restored.includes('⟦')) return null;
    return restored.trim();
  } catch {
    return null;
  }
}

async function myMemory(text: string, src: string, tgt: string): Promise<string | null> {
  try {
    const q = new URLSearchParams({
      q: text.trim().slice(0, 450),
      langpair: `${src === 'auto' ? 'Autodetect' : src}|${tgt}`,
    });
    const r = await fetch(`https://api.mymemory.translated.net/get?${q}`);
    if (!r.ok) return null;
    const data = await r.json();
    const piece = data?.responseData?.translatedText;
    const status = data?.responseStatus;
    if ((status !== 200 && status !== '200') || !piece) return null;
    if (String(piece).toLowerCase().startsWith('query length limit')) return null;
    return String(piece).trim() || null;
  } catch {
    return null;
  }
}

export function mlkitCanPair(src: string, tgt: string): boolean {
  const a = src.slice(0, 2).toLowerCase();
  const b = tgt.slice(0, 2).toLowerCase();
  if (a === b) return false;
  const ok = (c: string) => c === 'en' || MLKIT_INDIC.has(c);
  return ok(a) && ok(b);
}

export async function translateOnDevice(text: string, src: string, tgt: string): Promise<string | null> {
  const blob = (text || '').trim();
  if (!blob) return null;
  const s = (src || 'auto').slice(0, 2).toLowerCase();
  const t = tgt.slice(0, 2).toLowerCase();
  if (s === t) return blob;
  if (mlkitCanPair(s === 'au' ? 'auto' : s, t) || s === 'au') {
    const native = await mlkitTranslate(blob, s === 'au' ? 'auto' : s, t);
    if (native && (t === 'en' || numbersOk(blob, native))) return native;
  }
  const mm = await myMemory(blob, s === 'au' ? 'auto' : s, t);
  if (mm && (t === 'en' || numbersOk(blob, mm))) return mm;
  return null;
}

export async function questionToEnglish(message: string, locale: string): Promise<string | undefined> {
  const loc = (locale || 'en').slice(0, 2).toLowerCase();
  if (loc === 'en' || !message.trim()) return undefined;
  return (await translateOnDevice(message, loc, 'en')) || undefined;
}

export async function answerToLocale(english: string, locale: string): Promise<string> {
  const loc = (locale || 'en').slice(0, 2).toLowerCase();
  if (loc === 'en' || !english.trim()) return english;
  return (await translateOnDevice(english, 'en', loc)) || english;
}

export function clientMtPreferred(locale: string): boolean {
  return Platform.OS === 'android' && MLKIT_INDIC.has((locale || 'en').slice(0, 2).toLowerCase());
}
