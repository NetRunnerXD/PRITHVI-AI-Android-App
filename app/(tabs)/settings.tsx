import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, LayoutAnimation, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Moon, Sun, Globe, MapPin, Eye, Info, LineChart, Database, User } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { useLocation } from '../../src/context/LocationContext';
import { useViewMode } from '../../src/context/ViewModeContext';
import { useTabVisibility } from '../../src/context/TabVisibilityContext';
import { useAuth } from '../../src/context/AuthContext';
import { TabSourcesCard } from '../../src/features/sources/TabSourcesCard';
import { patchAlertLocation, patchProfile } from '../../src/api/auth';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { isDark, toggleTheme, colors } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { location, requestGps, gpsError, usingGps } = useLocation();
  const { viewMode, setViewMode } = useViewMode();
  const { showAnalytics, setShowAnalytics, showData, setShowData } = useTabVisibility();
  const { account, setAccount, setAuthModal, signOut } = useAuth();
  const [acctName, setAcctName] = React.useState(account?.display_name || '');
  const [acctSms, setAcctSms] = React.useState(Boolean(account?.sms_opt_in));
  const [acctMsg, setAcctMsg] = React.useState('');

  React.useEffect(() => {
    setAcctName(account?.display_name || '');
    setAcctSms(Boolean(account?.sms_opt_in));
  }, [account]);

  const handleSetViewMode = (mode: 'detail' | 'overview') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(mode);
  };

  const handleToggleAnalytics = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAnalytics(!showAnalytics);
  };

  const handleToggleData = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowData(!showData);
  };

  const s = createStyles(colors, isDark);

  return (
    <LinearGradient colors={colors.backgroundGradient} style={s.safe}>
      <SafeAreaView style={s.safeInner}>
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          <Text style={s.header}>{t('settings')}</Text>

          <View style={[s.settingRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={[s.settingLabelRow, { marginBottom: 8 }]}>
              <View style={[s.iconBox, { backgroundColor: colors.primarySurface }]}>
                <User size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingLabel}>Account</Text>
                <Text style={s.settingDesc}>
                  {account
                    ? account.phone
                    : 'Optional. Weather works without an account. Sign in for SMS alerts at your saved place.'}
                </Text>
              </View>
            </View>
            {account ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={acctName}
                  onChangeText={setAcctName}
                  placeholder="Display name"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    borderWidth: 1.5,
                    borderColor: isDark ? colors.border : colors.borderLight,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: colors.text,
                    fontSize: 14,
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.settingDesc}>SMS weather alerts</Text>
                  <Switch
                    value={acctSms}
                    onValueChange={setAcctSms}
                    trackColor={{ false: colors.borderLight, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
                {account.location ? (
                  <Text style={s.settingDesc}>
                    Alert pin {account.location.place || account.location.district} · {account.location.lat?.toFixed(4)}, {account.location.lon?.toFixed(4)}
                  </Text>
                ) : (
                  <Text style={s.settingDesc}>No saved alert location yet</Text>
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity
                    style={s.toggleBtn}
                    onPress={() => {
                      void patchProfile({ display_name: acctName, sms_opt_in: acctSms })
                        .then((u) => {
                          setAccount(u);
                          setAcctMsg('Saved');
                        })
                        .catch((e) => setAcctMsg(String(e)));
                    }}
                  >
                    <Text style={s.toggleBtnTxt}>Save profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.toggleBtn}
                    onPress={() => {
                      if (location.lat == null || location.lon == null) return;
                      void patchAlertLocation({
                        lat: location.lat,
                        lon: location.lon,
                        place: location.place_name || location.district,
                        source: 'manual',
                      })
                        .then((u) => {
                          setAccount(u);
                          setAcctMsg('Alert location saved');
                        })
                        .catch((e) => setAcctMsg(String(e)));
                    }}
                  >
                    <Text style={s.toggleBtnTxt}>Save current pin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.toggleBtn, { borderColor: '#e11d48' }]}
                    onPress={() => void signOut()}
                  >
                    <Text style={[s.toggleBtnTxt, { color: '#e11d48' }]}>Sign out</Text>
                  </TouchableOpacity>
                </View>
                {acctMsg ? <Text style={s.settingDesc}>{acctMsg}</Text> : null}
              </View>
            ) : (
              <TouchableOpacity style={[s.toggleBtn, s.toggleBtnActive]} onPress={() => setAuthModal(true)}>
                <Text style={[s.toggleBtnTxt, s.toggleBtnTxtActive]}>Sign in</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Theme ── */}
          <TouchableOpacity style={s.settingRow} activeOpacity={0.7} onPress={toggleTheme}>
            <View style={s.settingLabelRow}>
              <View style={[s.iconBox, { backgroundColor: isDark ? colors.primarySurface : colors.primarySurface }]}>
                {isDark ? <Moon size={20} color={colors.primary} /> : <Sun size={20} color={colors.primary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingLabel}>Dark Mode</Text>
                <Text style={s.settingDesc}>
                  {isDark ? 'Dark cerulean theme active' : 'Light cerulean theme active'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={'#fff'}
            />
          </TouchableOpacity>

          {/* ── View Mode ── */}
          <View style={s.settingRow}>
            <View style={s.settingLabelRow}>
              <View style={[s.iconBox, { backgroundColor: colors.primarySurface }]}>
                <Eye size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingLabel}>Home Layout</Text>
                <Text style={s.settingDesc}>
                  {viewMode === 'overview' ? 'Summary cards (Overview mode)' : 'Full detail cards (Detail mode)'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={() => handleSetViewMode('detail')}
                style={[s.toggleBtn, viewMode === 'detail' && s.toggleBtnActive]}
              >
                <Text style={[s.toggleBtnTxt, viewMode === 'detail' && s.toggleBtnTxtActive]}>Detail</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSetViewMode('overview')}
                style={[s.toggleBtn, viewMode === 'overview' && s.toggleBtnActive]}
              >
                <Text style={[s.toggleBtnTxt, viewMode === 'overview' && s.toggleBtnTxtActive]}>Overview</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Show Analytics Tab ── */}
          <TouchableOpacity style={s.settingRow} activeOpacity={0.7} onPress={handleToggleAnalytics}>
            <View style={s.settingLabelRow}>
              <View style={[s.iconBox, { backgroundColor: colors.primarySurface }]}>
                <LineChart size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingLabel}>Show Analytics Tab</Text>
                <Text style={s.settingDesc}>
                  {showAnalytics ? 'Visible in bottom navigation bar' : 'Hidden from bottom navigation bar'}
                </Text>
              </View>
            </View>
            <Switch
              value={showAnalytics}
              onValueChange={handleToggleAnalytics}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={'#fff'}
            />
          </TouchableOpacity>

          {/* ── Show Data Tab ── */}
          <TouchableOpacity style={s.settingRow} activeOpacity={0.7} onPress={handleToggleData}>
            <View style={s.settingLabelRow}>
              <View style={[s.iconBox, { backgroundColor: colors.primarySurface }]}>
                <Database size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingLabel}>Show Data Tab</Text>
                <Text style={s.settingDesc}>
                  {showData ? 'Visible in bottom navigation bar' : 'Hidden from bottom navigation bar'}
                </Text>
              </View>
            </View>
            <Switch
              value={showData}
              onValueChange={handleToggleData}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={'#fff'}
            />
          </TouchableOpacity>

          {/* ── GPS ── */}
          <TouchableOpacity style={s.settingRow} activeOpacity={0.7} onPress={() => void requestGps()}>
            <View style={s.settingLabelRow}>
              <View style={[s.iconBox, { backgroundColor: colors.primarySurface }]}>
                <MapPin size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.settingLabel}>Use GPS Pin</Text>
                <Text style={s.settingDesc} numberOfLines={2}>
                  {gpsError || (usingGps ? location.label : `${location.label} — tap to locate`)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ── Language ── */}
          <View style={s.settingRow}>
            <View style={s.settingLabelRow}>
              <View style={[s.iconBox, { backgroundColor: colors.primarySurface }]}>
                <Globe size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingLabel}>Language</Text>
                <Text style={s.settingDesc}>
                  {currentLanguage === 'hi' ? 'Hindi — हिन्दी' : currentLanguage === 'bn' ? 'Bengali — বাংলা' : 'English'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['en', 'hi', 'bn'] as const).map(lang => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => changeLanguage(lang)}
                  style={[s.toggleBtn, currentLanguage === lang && s.toggleBtnActive]}
                >
                  <Text style={[s.toggleBtnTxt, currentLanguage === lang && s.toggleBtnTxtActive]}>
                    {lang.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── About ── */}
          <View style={[s.settingRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={[s.settingLabelRow, { marginBottom: 8 }]}>
              <View style={[s.iconBox, { backgroundColor: colors.primarySurface }]}>
                <Info size={20} color={colors.primary} />
              </View>
              <Text style={s.settingLabel}>About PRITHVI-AI</Text>
            </View>
            <Text style={[s.settingDesc, { paddingLeft: 0 }]}>
              India-only weather and hazard intelligence. Numbers come from the snapshot API, not the chat model.
            </Text>
          </View>

          <TabSourcesCard tab="settings" />

          {/* ── Version ── */}
          <Text style={s.version}>PRITHVI-AI v1.0.0 · SIH Cerulean Edition</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  safeInner: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 24, letterSpacing: -0.3 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : colors.borderLight,
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 6,
    elevation: isDark ? 0 : 2,
  },
  settingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    padding: 8,
    borderRadius: 12,
  },
  settingLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  settingDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : colors.borderLight,
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleBtnTxt: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  toggleBtnTxtActive: { color: '#fff' },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 24,
    fontWeight: '500',
  },
});
