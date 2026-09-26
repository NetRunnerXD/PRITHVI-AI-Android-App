import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Mic,
  MicOff,
  RefreshCw,
  MapPin,
  ArrowUp,
  Copy,
  Share2,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { useLocation } from '../../src/context/LocationContext';
import { postChat } from '../../src/api/endpoints';
import { answerToLocale } from '../../src/api/onDeviceMt';
import { loadChat, saveChat } from '../../src/api/persist';
import { useReady } from '../../src/api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { LocationPicker } from '../../src/components/LocationPicker';
import { TabSourcesCard } from '../../src/features/sources/TabSourcesCard';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { detectSpeechLang, normalizeLocaleKey } from '../../src/api/speechLangs';
import { LinearGradient } from 'expo-linear-gradient';
import type { Location } from '../../src/types';
import type { ChatSseEvent } from '../../src/api/http';

type SpeechMod = {
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: () => Promise<{ granted?: boolean }>;
    start: (opts: {
      lang: string;
      interimResults?: boolean;
      continuous?: boolean;
      androidIntentOptions?: Record<string, any>;
    }) => void;
    stop: () => void;
    addListener: (ev: string, fn: (e: any) => void) => { remove: () => void };
  };
};
let SpeechRec: SpeechMod | null = null;
try {
  SpeechRec = require('expo-speech-recognition') as SpeechMod;
} catch {
  SpeechRec = null;
}

const LOCALE_OPTIONS = [
  { key: 'en', label: 'EN', ietf: 'en-IN', tts: 'en-IN' },
  { key: 'hi', label: 'HI', ietf: 'hi-IN', tts: 'hi-IN' },
  { key: 'bn', label: 'BN', ietf: 'bn-IN', tts: 'bn-IN' },
  { key: 'gu', label: 'GU', ietf: 'gu-IN', tts: 'gu-IN' },
  { key: 'mr', label: 'MR', ietf: 'mr-IN', tts: 'mr-IN' },
  { key: 'ta', label: 'TA', ietf: 'ta-IN', tts: 'ta-IN' },
  { key: 'te', label: 'TE', ietf: 'te-IN', tts: 'te-IN' },
  { key: 'kn', label: 'KN', ietf: 'kn-IN', tts: 'kn-IN' },
  { key: 'ur', label: 'UR', ietf: 'ur-IN', tts: 'ur-IN' },
] as const;

interface ChatBubble {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  content_en?: string;
  locale?: string;
  timestamp?: string;
  suggestions?: Suggestion[];
  insightBands?: { key?: string; category?: string; band?: string; meaning?: string }[];
  streaming?: boolean;
}

type Suggestion = {
  id?: string;
  label?: string;
  tab?: string;
  location?: Partial<Location>;
  center?: number[];
  zoom?: number;
};

function newConversationId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function istClock(): string {
  return (
    new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }) + ' IST'
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    const Clip = await import('expo-clipboard');
    await Clip.setStringAsync(text);
    return true;
  } catch {
    try {
      await Share.share({ message: text });
    } catch {
      /* ignore */
    }
    return false;
  }
}

function suggestionLabel(s: Suggestion, locale: string): string {
  const raw = s.label || s.id || '';
  const loc = (locale || 'en').slice(0, 2);
  if (loc === 'en') return raw;
  if (s.id === 'open-alerts' || /open alerts/i.test(raw)) {
    const place = raw.replace(/^open alerts for\s+/i, '').trim();
    if (loc === 'hi') return place && place !== raw ? `${place} के लिए अलर्ट खोलें` : 'अलर्ट खोलें';
    if (loc === 'bn') return place && place !== raw ? `${place}-এর জন্য সতর্কতা দেখুন` : 'সতর্কতা দেখুন';
  }
  if (s.id === 'focus-map' || /focus (?:the )?map/i.test(raw)) {
    const place = raw.replace(/^focus (?:the )?map on\s+/i, '').trim();
    if (loc === 'hi') return place && place !== raw ? `मानचित्र को ${place} पर केंद्रित करें` : 'मानचित्र पर केंद्रित करें';
    if (loc === 'bn') return place && place !== raw ? `মানচিত্র ${place}-এ ফোকাস করুন` : 'মানচিত্রে ফোকাস করুন';
  }
  if (s.id === 'open-forecast' || /forecast/i.test(raw)) {
    const place = raw.replace(/^(?:open the 7-day forecast for|show this date window on forecast for)\s+/i, '').trim();
    if (loc === 'hi') return place && place !== raw ? `${place} का 7-दिवसीय पूर्वानुमान` : '7-दिवसीय पूर्वानुमान';
    if (loc === 'bn') return place && place !== raw ? `${place}-এর ৭ দিনের পূর্বাভাস` : '৭ দিনের পূর্বাভাস';
  }
  if (s.id === 'open-nowcast' || /nowcast/i.test(raw)) {
    const place = raw.replace(/^open the 0–6 hour nowcast for\s+/i, '').trim();
    if (loc === 'hi') return place && place !== raw ? `${place} का नाउकास्ट (0-6 घंटे)` : '0-6 घंटे नाउकास्ट';
    if (loc === 'bn') return place && place !== raw ? `${place}-এর নাওকাস্ট (০-৬ ঘণ্টা)` : '০-৬ ঘণ্টা নাওকাস্ট';
  }
  if (s.id === 'open-risks' || /risk/i.test(raw)) {
    const place = raw.replace(/^open risk cards for\s+/i, '').trim();
    if (loc === 'hi') return place && place !== raw ? `${place} के जोखिम कार्ड` : 'जोखिम कार्ड खोलें';
    if (loc === 'bn') return place && place !== raw ? `${place}-এর ঝুঁকি কার্ড` : 'ঝুঁকি কার্ড দেখুন';
  }
  return raw;
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const { location, setLocation } = useLocation();
  const { colors, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const { data: ready } = useReady();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const cs = createStyles(colors, isDark);
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const [showEn, setShowEn] = useState(false);
  const [pickLoc, setPickLoc] = useState(false);
  const [notice, setNotice] = useState('');
  const [answerFor, setAnswerFor] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState(newConversationId);
  const [hydrated, setHydrated] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [detectedVoiceLang, setDetectedVoiceLang] = useState<string | null>(null);
  const shouldListenRef = useRef(false);
  const committedTextRef = useRef('');
  const lastSessionTextRef = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatBubble[]>([]);
  messagesRef.current = messages;

  const currentLocaleOption = LOCALE_OPTIONS.find((l) => l.key === currentLanguage) || LOCALE_OPTIONS[0];
  const voiceAvailable = SpeechRec != null;
  const live = ready?.ok !== false;
  const place = location.place_name || location.label.split(',')[0];
  const locus = answerFor && answerFor !== location.label ? answerFor : location.label;

  const presets = [
    {
      id: 'rain',
      title: t('presetRainTitle'),
      query: t('presetRainQuery', { place }),
    },
    {
      id: 'hazards',
      title: t('presetHazardsTitle'),
      query: t('presetHazardsQuery', { place }),
    },
    {
      id: 'outlook',
      title: t('presetOutlookTitle'),
      query: t('presetOutlookQuery', { place }),
    },
    {
      id: 'airQuality',
      title: t('presetAirQualityTitle'),
      query: t('presetAirQualityQuery', { place }),
    },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadChat();
      if (cancelled || !saved) {
        setHydrated(true);
        return;
      }
      if (Array.isArray(saved.messages) && saved.messages.length) {
        setMessages(saved.messages as ChatBubble[]);
      }
      if (saved.conversationId) setConversationId(saved.conversationId);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveChat({ conversationId, messages: messages.filter((m) => !m.streaming) });
  }, [hydrated, conversationId, messages]);

  useEffect(() => {
    setAnswerFor('');
  }, [location.id, location.lat, location.lon]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 120);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const startSpeechRecognition = useCallback(() => {
    if (!voiceAvailable || !SpeechRec) return;
    const mod = SpeechRec.ExpoSpeechRecognitionModule;
    const allIetfLangs = ['en-IN', 'hi-IN', 'bn-IN', 'gu-IN', 'mr-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ur-IN'];
    try {
      mod.start({
        lang: currentLocaleOption.tts,
        interimResults: true,
        continuous: true,
        androidIntentOptions: {
          EXTRA_ENABLE_LANGUAGE_SWITCH: 'balanced',
          EXTRA_ENABLE_LANGUAGE_DETECTION: true,
          EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES: allIetfLangs,
          EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES: allIetfLangs,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 60_000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 20_000,
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 15_000,
        },
      });
    } catch {
      /* ignore */
    }
  }, [voiceAvailable, currentLocaleOption.tts]);

  useEffect(() => {
    if (!voiceAvailable || !SpeechRec) return;
    const mod = SpeechRec.ExpoSpeechRecognitionModule;
    const subs = [
      mod.addListener('start', () => setIsListening(true)),
      mod.addListener('end', () => {
        if (lastSessionTextRef.current) {
          committedTextRef.current = committedTextRef.current
            ? `${committedTextRef.current} ${lastSessionTextRef.current}`.trim()
            : lastSessionTextRef.current.trim();
          lastSessionTextRef.current = '';
        }
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current) {
              startSpeechRecognition();
            } else {
              setIsListening(false);
            }
          }, 150);
        } else {
          setIsListening(false);
        }
      }),
      mod.addListener('error', (err: { error?: string }) => {
        const fatal = err?.error === 'not-allowed' || err?.error === 'audio-capture';
        if (fatal) {
          shouldListenRef.current = false;
          setIsListening(false);
          return;
        }
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current) startSpeechRecognition();
            else setIsListening(false);
          }, 250);
        } else {
          setIsListening(false);
        }
      }),
      mod.addListener('languagedetection', (e: { detectedLanguage?: string }) => {
        if (e?.detectedLanguage) {
          const norm = normalizeLocaleKey(e.detectedLanguage);
          setDetectedVoiceLang(norm);
        }
      }),
      mod.addListener('result', (e: { results?: { transcript?: string }[] }) => {
        const piece = e.results?.[0]?.transcript || '';
        if (piece) {
          lastSessionTextRef.current = piece;
          const base = committedTextRef.current ? `${committedTextRef.current} ` : '';
          const full = (base + piece).trim();
          setInput(full);
          const detected = detectSpeechLang(full);
          if (detected) setDetectedVoiceLang(detected);
        }
      }),
    ];
    return () => {
      shouldListenRef.current = false;
      committedTextRef.current = '';
      lastSessionTextRef.current = '';
      subs.forEach((s) => s.remove());
      try {
        mod.stop();
      } catch {
        /* ignore */
      }
      Speech.stop();
    };
  }, [voiceAvailable, startSpeechRecognition]);

  const toggleListening = async () => {
    if (!voiceAvailable || !SpeechRec) {
      Alert.alert('Voice input', 'Microphone needs a native build with speech recognition. Type your question instead.');
      return;
    }
    const mod = SpeechRec.ExpoSpeechRecognitionModule;
    if (isListening || shouldListenRef.current) {
      shouldListenRef.current = false;
      committedTextRef.current = '';
      lastSessionTextRef.current = '';
      try {
        mod.stop();
      } catch {
        /* ignore */
      }
      setIsListening(false);
    } else {
      try {
        Speech.stop();
        setSpeakingId(null);
        setDetectedVoiceLang(null);
        const perm = await mod.requestPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Voice input', 'Microphone permission denied.');
          return;
        }
        setInput('');
        committedTextRef.current = '';
        lastSessionTextRef.current = '';
        shouldListenRef.current = true;
        setIsListening(true);
        startSpeechRecognition();
      } catch {
        shouldListenRef.current = false;
        setIsListening(false);
      }
    }
  };

  const speakBubble = (id: string, text: string, locale?: string) => {
    if (speakingId === id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    const opt = LOCALE_OPTIONS.find((l) => l.key === (locale || currentLocaleOption.key)) || currentLocaleOption;
    Speech.stop();
    setSpeakingId(id);
    if (shouldListenRef.current && SpeechRec) {
      try {
        SpeechRec.ExpoSpeechRecognitionModule.stop();
      } catch {
        /* ignore */
      }
    }
    const resumeListen = () => {
      setSpeakingId(null);
      if (shouldListenRef.current) {
        setIsListening(true);
        startSpeechRecognition();
      }
    };
    Speech.speak(text, {
      language: opt.ietf,
      pitch: 1.0,
      rate: 0.9,
      onDone: resumeListen,
      onStopped: resumeListen,
      onError: resumeListen,
    });
  };

  const applySuggestion = useCallback(
    (s: Suggestion) => {
      const loc = s.location;
      if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
        setLocation({
          ...location,
          ...loc,
          lat: loc.lat,
          lon: loc.lon,
          label: loc.label || location.label,
        } as Location);
      }
      const tab = (s.tab || s.id || '').toLowerCase();
      if (tab.includes('map')) router.push('/maps');
      else if (tab.includes('analytic') || tab.includes('nowcast') || tab.includes('forecast')) router.push('/analytics');
      else if (tab.includes('data') || tab.includes('risk') || tab.includes('alert')) router.push('/data');
      else if (tab.includes('home')) router.push('/');
      else if (tab.includes('setting')) router.push('/settings');
    },
    [location, router, setLocation],
  );

  const cancelInFlight = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsPending(false);
    setNotice('');
    setMessages((prev) => prev.filter((m) => !m.streaming));
  };

  const clearThread = () => {
    if (!messages.length) return;
    Alert.alert(t('clearChat'), t('confirmClear'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('clearChat'),
        style: 'destructive',
        onPress: () => {
          cancelInFlight();
          Speech.stop();
          setMessages([]);
          setConversationId(newConversationId());
          setAnswerFor('');
          setSpeakingId(null);
        },
      },
    ]);
  };

  async function sendMessage(text: string, opts?: { regenerate?: boolean }) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
    const keepListen = shouldListenRef.current;
    committedTextRef.current = '';
    lastSessionTextRef.current = '';
    if (keepListen && SpeechRec) {
      try {
        SpeechRec.ExpoSpeechRecognitionModule.stop();
      } catch {
        /* ignore */
      }
    }

    const timeStr = istClock();
    const userId = `u-${Date.now()}`;
    const asstId = `a-${Date.now()}`;
    const prior = opts?.regenerate
      ? messagesRef.current.filter((m) => m.role === 'user' || m.id !== messagesRef.current[messagesRef.current.length - 1]?.id)
      : messagesRef.current;

    const history = prior
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m, i) => ({
        id: m.id || String(i),
        role: m.role as 'user' | 'assistant',
        content: m.role === 'assistant' ? m.content_en || m.content : m.content,
        content_en: m.content_en,
        locale: m.locale,
      }));

    const detectedFromText = detectSpeechLang(trimmed);
    const effectiveLocale =
      (detectedFromText !== 'en' ? detectedFromText : null) ||
      detectedVoiceLang ||
      detectedFromText ||
      currentLocaleOption.key;

    if (!opts?.regenerate) {
      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', content: trimmed, locale: effectiveLocale, timestamp: timeStr },
        { id: asstId, role: 'assistant', content: '', streaming: true, locale: effectiveLocale },
      ]);
    } else {
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== prev[prev.length - 1]?.id);
        return [...next, { id: asstId, role: 'assistant', content: '', streaming: true, locale: effectiveLocale }];
      });
    }
    setInput('');
    setIsPending(true);
    setNotice(t('synthesizing'));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const onEvent = (ev: ChatSseEvent) => {
      if (ev.type === 'notice' && typeof (ev as { message?: unknown }).message === 'string') {
        setNotice(String((ev as { message?: string }).message));
      }
      if (ev.type === 'meta' && typeof ev.question_en === 'string') {
        setMessages((prev) => {
          const idx = [...prev].reverse().findIndex((m) => m.role === 'user');
          if (idx < 0) return prev;
          const real = prev.length - 1 - idx;
          const copy = [...prev];
          copy[real] = { ...copy[real], content_en: ev.question_en };
          return copy;
        });
      }
      if (ev.type === 'meta' && ev.location && typeof ev.location === 'object' && ev.location.label) {
        setAnswerFor(ev.location.label);
      }
      if (ev.type === 'widget_patch' && ev.path === 'dashboard') {
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
      const piece =
        (ev.type === 'final' && ev.message?.content) ||
        ev.message?.content ||
        (typeof ev.delta === 'string' ? ev.delta : '') ||
        ev.content ||
        '';
      if (piece && ev.type !== 'notice') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId
              ? {
                  ...m,
                  content: ev.delta && m.content ? m.content + ev.delta : String(piece),
                  content_en: ev.message?.content_en || m.content_en,
                  streaming: ev.type !== 'final',
                }
              : m,
          ),
        );
      }
    };

    try {
      const result = await postChat(
        {
          message: trimmed,
          locale_hint: effectiveLocale,
          output_locale: effectiveLocale,
          location,
          history,
          stream: true,
          conversation_id: conversationId,
          regenerate: Boolean(opts?.regenerate),
        },
        { signal: ctrl.signal, onEvent },
      );
      const english = result.message?.content_en || result.text || '';
      const suggestions = (result.message?.suggestions || []) as Suggestion[];
      const insight = result.message?.insight as { bands?: ChatBubble['insightBands'] } | undefined;
      const ui = result.message?.ui as { op?: string; tab?: string; target?: string }[] | undefined;
      setNotice(t('translating'));
      const spokenText = await answerToLocale(english, effectiveLocale);
      const finalBubble: ChatBubble = {
        id: asstId,
        role: 'assistant',
        content: spokenText || english || 'No reply.',
        content_en: english,
        locale: effectiveLocale,
        timestamp: istClock(),
        suggestions,
        insightBands: insight?.bands,
        streaming: false,
      };
      setMessages((prev) => prev.map((m) => (m.id === asstId ? finalBubble : m)));
      if (speakOn && spokenText) speakBubble(asstId, spokenText, effectiveLocale);
      if (ui?.length) {
        for (const a of ui) {
          if (a.tab) applySuggestion({ tab: a.tab });
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Chat failed';
      if (err === 'Cancelled') {
        setMessages((prev) => prev.filter((m) => m.id !== asstId));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId
              ? {
                  id: asstId,
                  role: 'error',
                  content: `Could not reach the Advisor (${err}). Try again — the API may be waking up.`,
                  timestamp: istClock(),
                  streaming: false,
                }
              : m,
          ),
        );
      }
    } finally {
      abortRef.current = null;
      setIsPending(false);
      setNotice('');
      setDetectedVoiceLang(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      if (keepListen && shouldListenRef.current) {
        setTimeout(() => {
          if (shouldListenRef.current) {
            setIsListening(true);
            startSpeechRecognition();
          }
        }, 400);
      }
    }
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  return (
    <LinearGradient colors={colors.backgroundGradient} style={cs.safe}>
      <SafeAreaView style={cs.safeInner} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={cs.headerContainer}>
            <View style={cs.headerLeft}>
              <Image source={require('../../assets/logo.png')} style={cs.headerLogo} />
              <View style={cs.headerInfo}>
                <View style={cs.headerTitleRow}>
                  <Text style={[cs.headerTitle, { color: isDark ? '#38bdf8' : '#0369a1' }]}>PRITHVI-AI</Text>
                  <View style={[cs.onlineBadge, !live && { backgroundColor: '#fee2e2' }]}>
                    <Text style={[cs.onlineBadgeTxt, !live && { color: '#991b1b' }]}>{live ? 'LIVE' : 'OFF'}</Text>
                  </View>
                </View>
                <View style={cs.headerLocRow}>
                  <MapPin size={10} color={colors.textMuted} />
                  <Text style={cs.headerLocTxt} numberOfLines={1}>
                    {t('answeringFor')} {locus}
                  </Text>
                </View>
              </View>
            </View>
            <View style={cs.headerRight}>
              {currentLocaleOption.key !== 'en' ? (
                <TouchableOpacity onPress={() => setShowEn((v) => !v)} style={cs.iconBtn}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: showEn ? colors.primary : colors.textMuted }}>
                    EN
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => {
                  setSpeakOn((v) => {
                    if (v) {
                      Speech.stop();
                      setSpeakingId(null);
                    }
                    return !v;
                  });
                }}
                style={cs.iconBtn}
              >
                {speakOn ? <Volume2 size={18} color={colors.primary} /> : <VolumeX size={18} color={colors.textMuted} />}
              </TouchableOpacity>
              {lastUser && !isPending ? (
                <TouchableOpacity onPress={() => sendMessage(lastUser.content, { regenerate: true })} style={cs.iconBtn}>
                  <RotateCcw size={16} color={colors.text} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={clearThread} style={cs.iconBtn} disabled={!messages.length}>
                <RefreshCw size={18} color={messages.length ? colors.text : colors.border} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={cs.msgScroll}
            contentContainerStyle={cs.msgContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && !isPending ? (
              <View style={cs.empty}>
                <Text style={cs.emptyTitle}>{t('chatAssistTitle')}</Text>
                <Text style={cs.emptySub}>{t('chatAssistSub')}</Text>
                <View style={cs.presetList}>
                  {presets.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={cs.presetCard}
                      onPress={() => sendMessage(p.query)}
                      disabled={isPending}
                      activeOpacity={0.7}
                    >
                      <View style={cs.presetLeft}>
                        <View style={cs.presetDot} />
                        <Text style={cs.presetTitle}>{p.title}</Text>
                      </View>
                      <View style={cs.presetRight}>
                        <Text style={cs.presetAction}>{t('askAction')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <TabSourcesCard tab="chat" compact />
              </View>
            ) : null}

            {messages.map((msg) =>
              msg.role === 'user' ? (
                <View key={msg.id} style={cs.userBubbleWrapper}>
                  <View style={cs.userBubble}>
                    <Text style={cs.userText}>{msg.content}</Text>
                  </View>
                  <Text style={cs.userTimestamp}>{msg.timestamp}</Text>
                </View>
              ) : msg.role === 'error' ? (
                <View key={msg.id} style={cs.errorBubble}>
                  <Text style={cs.errorText}>{msg.content}</Text>
                </View>
              ) : (
                <View key={msg.id} style={cs.aiRowWrapper}>
                  <Image source={require('../../assets/logo.png')} style={cs.aiLogoLeft} />
                  <View style={cs.aiBubble}>
                    {msg.streaming && !msg.content ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={cs.aiFooterMeta}>{notice || t('synthesizing')}</Text>
                      </View>
                    ) : (
                      <Text style={cs.aiText}>
                        {showEn && msg.content_en ? msg.content_en : msg.content || notice}
                      </Text>
                    )}
                    {msg.insightBands?.length ? (
                      <View style={cs.bandRow}>
                        {msg.insightBands.slice(0, 6).map((b, i) => (
                          <View key={`${b.key || i}`} style={cs.band}>
                            <Text style={cs.bandTxt}>{(b.category || b.band || b.key) as string}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {msg.suggestions?.length ? (
                      <View style={cs.bandRow}>
                        {msg.suggestions.map((s, i) => (
                          <TouchableOpacity key={s.id || String(i)} style={cs.suggest} onPress={() => applySuggestion(s)}>
                            <Text style={cs.suggestTxt}>{suggestionLabel(s, currentLanguage)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                    {!msg.streaming ? (
                      <View style={cs.aiFooter}>
                        <Text style={cs.aiFooterMeta} numberOfLines={1}>
                          {place} · {(msg.locale || currentLocaleOption.key).toUpperCase()}
                          {msg.timestamp ? ` · ${msg.timestamp}` : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={async () => {
                              const ok = await copyText(showEn && msg.content_en ? msg.content_en : msg.content);
                              if (ok) Alert.alert(t('copied'));
                            }}
                            accessibilityLabel={t('copy')}
                          >
                            <Copy size={12} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => void Share.share({ message: msg.content })}
                            accessibilityLabel={t('share')}
                          >
                            <Share2 size={12} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              speakBubble(msg.id, showEn && msg.content_en ? msg.content_en : msg.content, msg.locale)
                            }
                            accessibilityLabel={speakingId === msg.id ? t('stopSpeak') : t('speakReply')}
                          >
                            {speakingId === msg.id ? (
                              <VolumeX size={12} color="#ef4444" />
                            ) : (
                              <Volume2 size={12} color={colors.textMuted} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              ),
            )}
          </ScrollView>

          {isPending ? (
            <TouchableOpacity onPress={cancelInFlight} style={cs.cancelBar}>
              <X size={14} color="#991b1b" />
              <Text style={cs.cancelTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={[cs.inputWrapper, { marginBottom: isKeyboardVisible ? 6 : 10 + Math.max(insets.bottom, 0) }]}>
            <TouchableOpacity onPress={toggleListening} style={cs.micBtn}>
              {isListening ? <MicOff size={20} color="#ef4444" /> : <Mic size={20} color={colors.textMuted} />}
            </TouchableOpacity>
            <TextInput
              style={cs.input}
              value={input}
              onChangeText={(val) => {
                setInput(val);
                committedTextRef.current = val;
                lastSessionTextRef.current = '';
              }}
              onFocus={() => {
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
              }}
              placeholder={isListening ? t('listening') : t('askAdvisor')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              multiline
              blurOnSubmit={false}
              onSubmitEditing={() => {
                if (Platform.OS !== 'ios') sendMessage(input);
              }}
            />
            <TouchableOpacity
              style={cs.targetBtn}
              onPress={() => setPickLoc(true)}
              onLongPress={() =>
                sendMessage(`Give a detailed weather summary for ${place}`)
              }
            >
              <MapPin size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[cs.sendBtn, (!input.trim() || isPending) && { backgroundColor: colors.border }]}
              onPress={() => sendMessage(input)}
              disabled={isPending || !input.trim()}
            >
              <ArrowUp size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <LocationPicker visible={pickLoc} onClose={() => setPickLoc(false)} />
    </LinearGradient>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    safe: { flex: 1 },
    safeInner: { flex: 1 },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    headerLogo: { width: 32, height: 32, borderRadius: 16 },
    headerInfo: { justifyContent: 'center', flex: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    onlineBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    onlineBadgeTxt: { fontSize: 8, fontWeight: '800', color: '#166534', letterSpacing: 0.5 },
    headerLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    headerLocTxt: { fontSize: 11, color: colors.textMuted, fontWeight: '500', flexShrink: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { padding: 4 },
    msgScroll: { flex: 1 },
    msgContent: { padding: 16, paddingBottom: 16, flexGrow: 1 },
    empty: { paddingTop: 20, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    emptySub: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 6 },
    presetList: { gap: 10 },
    presetCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(241, 245, 249, 0.85)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.75)',
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    presetLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      marginRight: 8,
    },
    presetDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#38bdf8',
    },
    presetTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    presetRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    presetAction: {
      fontSize: 13,
      fontWeight: '700',
      color: '#38bdf8',
    },
    userBubbleWrapper: { alignSelf: 'flex-end', marginBottom: 16, maxWidth: '80%' },
    userBubble: {
      backgroundColor: '#0369a1',
      borderRadius: 20,
      borderTopRightRadius: 4,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    userText: { fontSize: 14, color: '#fff', lineHeight: 20 },
    userTimestamp: { fontSize: 9, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
    aiRowWrapper: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 20, maxWidth: '92%' },
    aiLogoLeft: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginTop: 4,
    },
    aiBubble: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderTopLeftRadius: 4,
      padding: 16,
    },
    aiText: { fontSize: 14, color: colors.text, lineHeight: 22 },
    aiFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#f1f5f9',
    },
    aiFooterMeta: { fontSize: 9, color: colors.textMuted, flex: 1, marginRight: 8 },
    bandRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    band: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    bandTxt: { fontSize: 9, fontWeight: '700', color: colors.textMuted },
    suggest: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(14,165,233,0.35)',
      backgroundColor: 'rgba(14,165,233,0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    suggestTxt: { fontSize: 10, fontWeight: '700', color: '#0284c7' },
    errorBubble: {
      alignSelf: 'stretch',
      backgroundColor: isDark ? '#3f1d1d' : '#fef2f2',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? '#7f1d1d' : '#fecaca',
    },
    errorText: { fontSize: 13, color: isDark ? '#fecaca' : '#991b1b', lineHeight: 18 },
    cancelBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 6,
    },
    cancelTxt: { fontSize: 12, fontWeight: '700', color: '#991b1b' },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.card,
      borderRadius: 32,
      marginHorizontal: 12,
      paddingLeft: 16,
      paddingRight: 8,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    micBtn: { padding: 4, marginRight: 8, marginBottom: 6 },
    input: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 8, maxHeight: 120 },
    targetBtn: { padding: 8, marginRight: 4, marginBottom: 2 },
    sendBtn: {
      backgroundColor: '#0369a1',
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
  });
