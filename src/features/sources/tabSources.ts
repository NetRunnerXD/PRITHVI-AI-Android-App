export type SourceTab = 'home' | 'analytics' | 'data' | 'map' | 'chat' | 'settings';

const EN: Record<SourceTab, string[]> = {
  home: [
    'Sky, rain, wind, soil, 7-day outlook: Open-Meteo forecast (fetched on this device, assembled on the API). Not a village rain-gauge.',
    'Next 6 hours: 0–2 h nowcast, 3–4 h blend, 5–6 h NWP. Past hours are model analysis, not a gauge.',
    'Air: CPCB National AQI (data.gov.in) when a station is near; otherwise Open-Meteo CAMS US AQI.',
    'Alerts: IMD CAP bulletins plus model thunderstorm/nowcast rows for this pin. Tsunami all-clear is hidden.',
    'Marine waves only if the pin is coastal (Open-Meteo marine). Inland shows empty — no invented swell.',
    'Quakes: USGS FDSN. Tsunami: INCOIS ITEWS. NASA POWER daily and 8-year climate stay off unless enabled.',
    'Irrigation litres: plot size × a small depth. The chat model does not invent millimetres, AQI, or rupees.',
  ],
  analytics: [
    'Charts use the same Open-Meteo hourly and daily series as Home.',
    'Nowcast: IMD INSAT-3D/3DS public IR JPEG, NASA GIBS IR + IMERG, Weatherbit lightning. Cells tracked; 15–60 min Lagrangian nowcast. Kalman fills between IR scenes.',
    'Locked hourly millimetres stay Open-Meteo. Satellite rain-rate is a separate estimate, not a gauge. Not MinuteCast / IMD Doppler millimetres.',
    'Optional member blend (ECMWF, GFS, GraphCast, ICON, UKMO) when this device seeds it. NASA POWER climate is off by default.',
  ],
  data: [
    'IMD CAP weather · CPCB air (data.gov.in) · INCOIS ITEWS tsunami · USGS seismic · Open-Meteo flood (GloFAS), marine and air.',
    'Cards are traffic-lights from the snapshot, not fortune-telling.',
    'Earthquake / sea cards only repeat official lists; they do not predict.',
    'Mandi prices: Agmarknet via data.gov.in, rupees per quintal. Empty mandi stays empty — no invented ₹.',
  ],
  map: [
    'Places: India gazetteer, then Open-Meteo India geocoding.',
    'Weather fields: Open-Meteo 13×25 mesh from this device, not Render.',
    'Radar / satellite IR: RainViewer from this device. GIBS true color, Himawari IR, IMERG: NASA WMS from this device.',
    'Bhuvan: API WMS proxy. Storm cells / past storm: /nowcast/storm-map (INSAT on the API). Past lightning: Weatherbit + Open-Meteo thunder hours.',
    'Storm cells and the pin stay India-only.',
  ],
  chat: [
    'Type any language. The question is translated to English for the model; the answer is translated back (on-device ML Kit on Android Indic, else server/MyMemory).',
    'The model only reads tool and snapshot numbers. It must not invent rain millimetres, AQI, or rupees.',
    'Hosted narrator on the API (Gemini, then Groq, when Ollama is not on this host).',
  ],
  settings: [
    'Theme, language, and layout stay on this device.',
    'Sign-in is optional (phone + password on the API) for SMS alerts at a saved pin.',
    'NASA POWER daily and 8-year climate stay off unless enabled. MOSDAC, data.gov.in, and LLM keys stay on the server.',
  ],
};

const HI: Record<SourceTab, string[]> = {
  home: [
    'आकाश, बारिश, हवा, मिट्टी, 7-दिन: Open-Meteo पूर्वानुमान (इस डिवाइस से, API पर जोड़ा जाता है)। गाँव का रेन-गेज नहीं।',
    'अगले 6 घंटे: 0–2 नाउकास्ट, 3–4 मिश्रण, 5–6 NWP। बीते घंटे मॉडल विश्लेषण हैं, गेज नहीं।',
    'वायु: पास स्टेशन हो तो CPCB राष्ट्रीय AQI (data.gov.in); नहीं तो Open-Meteo CAMS US AQI।',
    'चेतावनी: IMD CAP बुलेटिन और इस पिन के मॉडल गरज-तूफान/नाउकास्ट पंक्तियाँ।',
    'लहरें केवल तटीय पिन पर। अंतर्देशीय खाली — काल्पनिक लहर नहीं।',
    'भूकंप: USGS FDSN। सुनामी: INCOIS ITEWS। NASA POWER डिफ़ॉल्ट बंद।',
    'चैट मॉडल मिमी/AQI/₹ नहीं गढ़ता।',
  ],
  analytics: [
    'ग्राफ़ वही Open-Meteo घंटे/दिन श्रृंखला हैं जो होम पर है।',
    'नाउकास्ट: IMD INSAT IR JPEG, NASA GIBS IR + IMERG, Weatherbit बिजली। Kalman IR दृश्यों के बीच भरता है।',
    'लॉक घंटे के मिमी Open-Meteo रहते हैं। MinuteCast / IMD डॉपलर मिमी नहीं।',
    'सदस्य मिश्रण तब जब डिवाइस सीड करे। NASA POWER जलवायु डिफ़ॉल्ट बंद।',
  ],
  data: [
    'IMD CAP मौसम · CPCB वायु · INCOIS सुनामी · USGS भूकंप · Open-Meteo बाढ़/समुद्र/वायु।',
    'कार्ड स्नैपशॉट के ट्रैफ़िक-लाइट हैं, भविष्यवाणी नहीं।',
    'भूकंप/समुद्र कार्ड केवल आधिकारिक सूची दोहराते हैं।',
    'मंडी भाव: Agmarknet / data.gov.in, ₹/क्विंटल। खाली मंडी खाली रहती है।',
  ],
  map: [
    'जगह: भारत गज़ेटियर, फिर Open-Meteo भारत जियोकोड।',
    'मौसम क्षेत्र: इस डिवाइस से Open-Meteo जाल, Render नहीं।',
    'रडार/IR: RainViewer। GIBS/Himawari/IMERG: NASA WMS इस डिवाइस से।',
    'भूवन: API प्रॉक्सी। तूफान सेल: /nowcast/storm-map। पुरानी बिजली: Weatherbit + Open-Meteo।',
    'तूफान सेल और पिन केवल भारत।',
  ],
  chat: [
    'कोई भी भाषा लिखें। प्रश्न अंग्रेज़ी होकर मॉडल को जाता है; उत्तर आपकी भाषा में आता है।',
    'मॉडल केवल टूल/स्नैपशॉट के अंक पढ़ता है — मिमी, AQI या ₹ नहीं गढ़ता।',
    'API पर होस्टेड कथाकार (Gemini, फिर Groq)।',
  ],
  settings: [
    'थीम, भाषा और लेआउट इस डिवाइस पर रहते हैं।',
    'साइन-इन वैकल्पिक है — सहेजे पिन पर SMS के लिए।',
    'NASA POWER डिफ़ॉल्ट बंद। कुंजी सर्वर पर रहती हैं।',
  ],
};

const BN: Record<SourceTab, string[]> = {
  home: [
    'আকাশ, বৃষ্টি, হাওয়া, মাটি, ৭-দিন: Open-Meteo পূর্বাভাস (এই ডিভাইস থেকে, API-তে জোড়া)। গ্রামের বৃষ্টিমাপক নয়।',
    'আগামী ৬ ঘণ্টা: ০–২ নাউকাস্ট, ৩–৪ মিশ্রণ, ৫–৬ NWP। গত ঘণ্টা মডেল, গেজ নয়।',
    'বায়ু: কাছে স্টেশন থাকলে CPCB জাতীয় AQI (data.gov.in); নাহলে Open-Meteo CAMS US AQI।',
    'সতর্কতা: IMD CAP বুলেটিন ও এই পিনের মডেল বজ্রঝড়/নাউকাস্ট সারি।',
    'ঢেউ শুধু উপকূলীয় পিনে। অভ্যন্তরে খালি — কাল্পনিক ঢেউ নয়।',
    'ভূকম্প: USGS FDSN। সুনামি: INCOIS ITEWS। NASA POWER ডিফল্ট বন্ধ।',
    'চ্যাট মডেল মিমি/AQI/₹ তৈরি করে না।',
  ],
  analytics: [
    'গ্রাফ হোমের একই Open-Meteo ঘণ্টা/দিন সিরিজ।',
    'নাউকাস্ট: IMD INSAT IR JPEG, NASA GIBS IR + IMERG, Weatherbit বজ্রপাত। Kalman IR দৃশ্যের মাঝে ভরে।',
    'লক ঘণ্টার মিমি Open-Meteo থাকে। MinuteCast / IMD ডপলার মিমি নয়।',
    'সদস্য মিশ্রণ ডিভাইস সিড করলে। NASA POWER জলবায়ু ডিফল্ট বন্ধ।',
  ],
  data: [
    'IMD CAP আবহাওয়া · CPCB বায়ু · INCOIS সুনামি · USGS ভূকম্প · Open-Meteo বন্যা/সমুদ্র/বায়ু।',
    'কার্ড স্ন্যাপশটের ট্রাফিক-লাইট, ভাগ্যগণনা নয়।',
    'ভূকম্প/সমুদ্র কার্ড শুধু অফিসিয়াল তালিকা।',
    'মান্ডির দাম: Agmarknet / data.gov.in, ₹/কুইন্টাল। খালি মান্ডি খালি থাকে।',
  ],
  map: [
    'জায়গা: ভারত গেজেটিয়ার, পরে Open-Meteo ভারত জিওকোড।',
    'আবহাওয়া ক্ষেত্র: এই ডিভাইস থেকে Open-Meteo জাল, Render নয়।',
    'রাডার/IR: RainViewer। GIBS/Himawari/IMERG: NASA WMS এই ডিভাইস থেকে।',
    'ভুবন: API প্রক্সি। ঝড় সেল: /nowcast/storm-map। পুরনো বজ্রপাত: Weatherbit + Open-Meteo।',
    'ঝড় সেল ও পিন শুধু ভারত।',
  ],
  chat: [
    'যেকোনো ভাষায় লিখুন। প্রশ্ন ইংরেজি হয়ে মডেলে যায়; উত্তর আপনার ভাষায় ফেরে।',
    'মডেল শুধু টুল/স্ন্যাপশটের সংখ্যা পড়ে — মিমি, AQI বা ₹ তৈরি করে না।',
    'API-তে হোস্টেড বর্ণনাকারী (Gemini, তারপর Groq)।',
  ],
  settings: [
    'থিম, ভাষা ও লেআউট এই ডিভাইসে থাকে।',
    'সাইন-ইন ঐচ্ছিক — সেভ করা পিনে SMS-এর জন্য।',
    'NASA POWER ডিফল্ট বন্ধ। কি সার্ভারে থাকে।',
  ],
};

export function tabSourceLines(tab: SourceTab, lang: string): string[] {
  if (lang.startsWith('hi')) return HI[tab];
  if (lang.startsWith('bn')) return BN[tab];
  return EN[tab];
}
