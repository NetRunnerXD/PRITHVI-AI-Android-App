export type Locale = 'en' | 'hi' | 'bn';

const RISK_NAME: Record<string, Record<Locale, string>> = {
  flood: { en: 'Flood Risk', hi: 'बाढ़ जोखिम', bn: 'বন্যা ঝুঁকি' },
  drought: { en: 'Drought Risk', hi: 'सूखा जोखिम', bn: 'খরা ঝুঁকি' },
  heat: { en: 'Heatwave Risk', hi: 'लू / गर्मी जोखिम', bn: 'দাবদাহ ঝুঁকি' },
  irrigation_need: { en: 'Irrigation Need', hi: 'सिंचाई आवश्यकता', bn: 'সেচের প্রয়োজনীয়তা' },
  air_quality: { en: 'Air Quality Risk', hi: 'वायु गुणवत्ता जोखिम', bn: 'বায়ু দূষণ ঝুঁকি' },
  livelihood: { en: 'Livelihood & Field Work', hi: 'आजीविका एवं कृषि कार्य', bn: 'জীবিকা ও কৃষিকাজ' },
  seismic: { en: 'Earthquake Activity', hi: 'भूकंपीय गतिविधि', bn: 'ভূমিকম্পের ঝুঁকি' },
  tsunami: { en: 'Tsunami Alert', hi: 'सुनामी चेतावनी', bn: 'সুনামি সতর্কতা' },
  cyclone: { en: 'Cyclone Risk', hi: 'चक्रवात जोखिम', bn: 'ঘূর্ণিঝড় ঝুঁকি' },
  lightning: { en: 'Lightning Risk', hi: 'वज्रपात जोखिम', bn: 'বজ্রপাত ঝুঁকি' },
  landslide: { en: 'Landslide Risk', hi: 'भूस्खलन जोखिम', bn: 'ভূমিধস ঝুঁকি' },
  storm: { en: 'Storm Surge Risk', hi: 'तूफ़ान जोखिम', bn: 'ঝড় ঝুঁকি' },
};

export function riskTitle(id: string, locale: Locale, fallback?: string): string {
  if (RISK_NAME[id]?.[locale]) return RISK_NAME[id][locale];
  return fallback || id;
}
