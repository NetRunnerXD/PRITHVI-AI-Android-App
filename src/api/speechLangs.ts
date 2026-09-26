import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { MLKIT_INDIC } from './onDeviceMt';

export type AdvisorLang = {
  key: string;
  label: string;
  native: string;
  ietf: string;
};

/** UI + Advisor langs that also have an MT path (en + ML Kit Indic). */
export const ADVISOR_LANGS: AdvisorLang[] = [
  { key: 'en', label: 'EN', native: 'English', ietf: 'en-IN' },
  { key: 'hi', label: 'HI', native: 'हिन्दी', ietf: 'hi-IN' },
  { key: 'bn', label: 'BN', native: 'বাংলা', ietf: 'bn-IN' },
  { key: 'gu', label: 'GU', native: 'ગુજરાતી', ietf: 'gu-IN' },
  { key: 'mr', label: 'MR', native: 'मराठी', ietf: 'mr-IN' },
  { key: 'ta', label: 'TA', native: 'தமிழ்', ietf: 'ta-IN' },
  { key: 'te', label: 'TE', native: 'తెలుగు', ietf: 'te-IN' },
  { key: 'kn', label: 'KN', native: 'ಕನ್ನಡ', ietf: 'kn-IN' },
  { key: 'ur', label: 'UR', native: 'اردو', ietf: 'ur-IN' },
];

const SCRIPT_LANGS: { re: RegExp; langs: string[] }[] = [
  { re: /[\u0980-\u09FF]/, langs: ['bn'] },
  { re: /[\u0900-\u097F]/, langs: ['hi', 'mr'] },
  { re: /[\u0A80-\u0AFF]/, langs: ['gu'] },
  { re: /[\u0B80-\u0BFF]/, langs: ['ta'] },
  { re: /[\u0C00-\u0C7F]/, langs: ['te'] },
  { re: /[\u0C80-\u0CFF]/, langs: ['kn'] },
  { re: /[\u0600-\u06FF]/, langs: ['ur'] },
];

export function langMeta(key: string): AdvisorLang {
  return ADVISOR_LANGS.find((l) => l.key === key) || ADVISOR_LANGS[0];
}

export function detectSpeechLang(text: string, hint?: string): string {
  const clean = (text || '').trim();
  if (!clean) return hint || 'en';
  for (const row of SCRIPT_LANGS) {
    if (row.re.test(clean)) {
      if (hint && row.langs.includes(hint)) return hint;
      return row.langs[0];
    }
  }
  if (/[A-Za-z]/.test(clean)) {
    return 'en';
  }
  if (hint && (hint === 'en' || ADVISOR_LANGS.some((l) => l.key === hint))) return hint;
  return 'en';
}

export function normalizeLocaleKey(localeTag?: string): string {
  if (!localeTag) return 'en';
  const tag = localeTag.toLowerCase().replace('_', '-').trim();
  const prefix = tag.split('-')[0];
  const found = ADVISOR_LANGS.find((l) => l.key === prefix || l.ietf.toLowerCase() === tag);
  return found ? found.key : (prefix || 'en');
}

export type SpeechSupport = {
  voices: Voice[];
  sttLocales: string[];
  sttReady: boolean;
};

function localePrefix(tag: string): string {
  return (tag || '').toLowerCase().replace('_', '-').slice(0, 2);
}

export function voiceForLang(voices: Voice[], key: string): Voice | undefined {
  const want = langMeta(key).ietf.toLowerCase();
  const pref = localePrefix(want);
  return (
    voices.find((v) => (v.language || '').toLowerCase().replace('_', '-') === want) ||
    voices.find((v) => localePrefix(v.language || '') === pref)
  );
}

export function sttLocaleOk(sttLocales: string[], key: string): boolean {
  if (!sttLocales.length) return true;
  const want = localePrefix(langMeta(key).ietf);
  return sttLocales.some((l) => localePrefix(l) === want);
}

export async function probeSpeechSupport(): Promise<SpeechSupport> {
  let voices: Voice[] = [];
  try {
    voices = await Speech.getAvailableVoicesAsync();
  } catch {
    voices = [];
  }
  let sttLocales: string[] = [];
  let sttReady = false;
  try {
    const rec = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: {
        getSupportedLocales?: (o?: object) => Promise<{ locales?: string[]; installedLocales?: string[] }>;
        isRecognitionAvailable?: () => boolean;
      };
    };
    const mod = rec.ExpoSpeechRecognitionModule;
    sttReady = Boolean(mod);
    if (mod?.getSupportedLocales) {
      const pack = await mod.getSupportedLocales({});
      sttLocales = [...(pack.installedLocales || []), ...(pack.locales || [])];
    }
  } catch {
    sttReady = false;
  }
  return { voices, sttLocales, sttReady };
}

export function advisorLangsForDevice(support: SpeechSupport | null): AdvisorLang[] {
  const core = ADVISOR_LANGS.filter((l) => l.key === 'en' || l.key === 'hi' || l.key === 'bn');
  if (!support) return core;
  const extra = ADVISOR_LANGS.filter((l) => {
    if (core.some((c) => c.key === l.key)) return false;
    if (!MLKIT_INDIC.has(l.key) && l.key !== 'en') return false;
    const tts = voiceForLang(support.voices, l.key);
    if (Platform.OS === 'ios' && !tts) return false;
    if (support.voices.length && !tts) return false;
    return true;
  });
  return [...core, ...extra];
}
