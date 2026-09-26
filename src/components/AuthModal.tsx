import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import {
  forgotPassword,
  gpsFix,
  loginAccount,
  registerAccount,
  resetPassword,
} from '../api/auth';

type Mode = 'signin' | 'register' | 'forgot' | 'reset';

export function AuthModal() {
  const { colors, isDark } = useTheme();
  const { authModal, setAuthModal, setAccount } = useAuth();
  const { location } = useLocation();
  const [mode, setMode] = useState<Mode>('signin');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sms, setSms] = useState(true);
  const [otp, setOtp] = useState('');
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const s = styles(colors, isDark);

  const close = () => {
    setErr('');
    setAuthModal(false);
  };

  const captureGps = async () => {
    setErr('');
    setGpsLoading(true);
    try {
      const fix = await gpsFix();
      if (!fix) {
        setErr('Could not read GPS. Allow location, or skip — optional.');
        return;
      }
      setGps(fix);
    } finally {
      setGpsLoading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      if (mode === 'signin') {
        if (!phone.trim() || !password) {
          setErr('Enter your mobile number and password');
          return;
        }
        const { user } = await loginAccount(phone, password);
        setAccount(user);
        close();
      } else if (mode === 'register') {
        if (!phone.trim() || !password) {
          setErr('Enter your mobile number and password');
          return;
        }
        if (password.length < 6) {
          setErr('Password must be at least 6 characters');
          return;
        }
        const { user } = await registerAccount({
          phone,
          password,
          display_name: name || undefined,
          sms_opt_in: sms,
          lat: gps?.lat,
          lon: gps?.lon,
          place: gps ? location.place_name || location.district : undefined,
          email: email || undefined,
        });
        setAccount(user);
        close();
      } else if (mode === 'forgot') {
        if (!phone.trim()) {
          setErr('Please enter your registered mobile number');
          return;
        }
        await forgotPassword(phone);
        setMode('reset');
      } else {
        if (!otp.trim() || !password) {
          setErr('Please enter the verification code and your new password');
          return;
        }
        const { user } = await resetPassword(phone, otp, password);
        setAccount(user);
        close();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={authModal} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
        <View style={s.card}>
          <TouchableOpacity style={s.close} onPress={close} hitSlop={12}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={s.brand}>
            <Image source={require('../../assets/logo.png')} style={s.logo} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>
                PRITHVI<Text style={{ color: colors.primary }}>-AI</Text>
              </Text>
              <Text style={s.sub}>
                {mode === 'signin'
                  ? 'Sign in for SMS weather alerts and saved plots'
                  : mode === 'register'
                    ? 'Create a profile for hyper-local alerts'
                    : 'Reset your password via SMS'}
              </Text>
            </View>
          </View>

          {mode !== 'reset' ? (
            <View style={s.seg}>
              <TouchableOpacity
                style={[s.segBtn, mode === 'signin' && s.segOn]}
                onPress={() => {
                  setErr('');
                  setMode('signin');
                }}
              >
                <Text style={[s.segTxt, mode === 'signin' && s.segTxtOn]}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.segBtn, mode === 'register' && s.segOn]}
                onPress={() => {
                  setErr('');
                  setMode('register');
                }}
              >
                <Text style={[s.segTxt, mode === 'register' && s.segTxtOn]}>Register</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            <View>
              <Text style={s.label}>Mobile</Text>
              <View style={s.phoneRow}>
                <Text style={s.cc}>+91</Text>
                <TextInput
                  style={s.inputFlex}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                />
              </View>
            </View>

            {mode === 'register' ? (
              <>
                <View>
                  <Text style={s.label}>Name</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Ramesh Kumar"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <View>
                  <Text style={s.label}>Email</Text>
                  <TextInput
                    style={s.input}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </>
            ) : null}

            {mode === 'reset' ? (
              <View>
                <Text style={s.label}>Verification code</Text>
                <TextInput
                  style={s.input}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                />
              </View>
            ) : null}

            {mode !== 'forgot' ? (
              <View>
                <View style={s.passHead}>
                  <Text style={s.label}>{mode === 'reset' ? 'New password' : 'Password'}</Text>
                  {mode === 'signin' ? (
                    <TouchableOpacity
                      onPress={() => {
                        setErr('');
                        setMode('forgot');
                      }}
                    >
                      <Text style={s.link}>Forgot?</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={s.phoneRow}>
                  <TextInput
                    style={s.inputFlex}
                    placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                    <Text style={s.link}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {mode === 'register' ? (
              <>
                <View style={s.smsRow}>
                  <Switch
                    value={sms}
                    onValueChange={setSms}
                    trackColor={{ false: colors.borderLight, true: colors.primary }}
                    thumbColor="#fff"
                  />
                  <Text style={s.smsTxt}>SMS weather alerts at this pin</Text>
                </View>
                <View style={s.gpsBox}>
                  <MapPin size={16} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.gpsTitle}>{gps ? 'GPS pinned' : 'Optional GPS'}</Text>
                    <Text style={s.gpsSub} numberOfLines={1}>
                      {gps
                        ? `${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}`
                        : 'Uses the current dashboard pin if skipped'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => void captureGps()} disabled={gpsLoading}>
                    <Text style={s.link}>{gpsLoading ? '…' : gps ? 'Update' : 'Get GPS'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {err ? <Text style={s.err}>{err}</Text> : null}

            <TouchableOpacity style={s.submit} onPress={() => void submit()} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitTxt}>
                  {mode === 'signin'
                    ? 'Sign in'
                    : mode === 'register'
                      ? 'Register'
                      : mode === 'forgot'
                        ? 'Send code'
                        : 'Update password'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={s.foot}>
              {mode === 'forgot' || mode === 'reset' ? (
                <TouchableOpacity
                  onPress={() => {
                    setErr('');
                    setMode('signin');
                  }}
                >
                  <Text style={s.link}>← Back to Sign in</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setErr('');
                    setMode(mode === 'signin' ? 'register' : 'signin');
                  }}
                >
                  <Text style={s.link}>
                    {mode === 'signin' ? "Don't have an account? Register" : 'Already registered? Sign in'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : colors.borderLight,
      maxHeight: '90%',
    },
    close: { position: 'absolute', right: 14, top: 14, zIndex: 2, padding: 4 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, paddingRight: 24 },
    logo: { width: 48, height: 48, borderRadius: 24 },
    title: { fontSize: 16, fontWeight: '800', color: colors.text },
    sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    seg: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(15,29,48,0.7)' : colors.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? colors.border : colors.borderLight,
    },
    segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    segOn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primaryLight },
    segTxt: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    segTxtOn: { color: colors.primary },
    label: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6, marginBottom: 4 },
    input: {
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : colors.borderLight,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : colors.borderLight,
      borderRadius: 12,
      paddingHorizontal: 12,
      gap: 8,
    },
    cc: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
    inputFlex: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 },
    passHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    link: { fontSize: 12, fontWeight: '700', color: colors.primary },
    smsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    smsTxt: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },
    gpsBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: isDark ? colors.border : colors.borderLight,
      borderRadius: 12,
      padding: 10,
    },
    gpsTitle: { fontSize: 12, fontWeight: '700', color: colors.text },
    gpsSub: { fontSize: 11, color: colors.textMuted },
    err: { color: '#e11d48', fontSize: 12, fontWeight: '600' },
    submit: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    submitTxt: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
    foot: { alignItems: 'center', paddingTop: 4 },
  });
