import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Search, User } from 'lucide-react-native';
import { useViewMode } from '../../context/ViewModeContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export function HomeHeader({
  onSearch,
}: {
  generatedAt?: string;
  onSearch: () => void;
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { viewMode, setViewMode } = useViewMode();
  const { account, setAuthModal } = useAuth();
  const router = useRouter();

  return (
    <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(30,58,95,0.4)' : 'rgba(226,232,240,0.6)' }]}>
      <Image source={require('../../../assets/logo.png')} style={[styles.logo, { borderColor: isDark ? colors.borderAccent : colors.primaryLight }]} />
      <TouchableOpacity
        style={[styles.search, {
          backgroundColor: isDark ? 'rgba(15,29,48,0.7)' : '#FFFFFF',
          borderColor: isDark ? colors.border : colors.borderLight,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.15 : 0.04,
          shadowRadius: 6,
          elevation: 2,
        }]}
        onPress={onSearch}
        activeOpacity={0.7}
      >
        <Search size={16} color={colors.primary} />
        <Text style={{ color: colors.textMuted, fontSize: 13, marginLeft: 8, flex: 1, fontWeight: '500' }} numberOfLines={1}>
          {t('searchPlaceholder')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => (account ? router.push('/settings') : setAuthModal(true))}
        activeOpacity={0.7}
        style={[
          styles.userBtn,
          {
            backgroundColor: account ? colors.primary : isDark ? 'rgba(15,29,48,0.7)' : '#FFFFFF',
            borderColor: isDark ? colors.border : colors.borderLight,
          },
        ]}
        accessibilityLabel={account ? account.display_name : 'Sign in'}
      >
        {account ? (
          <Text style={styles.userInitial}>
            {(account.display_name || account.phone || 'U').slice(0, 1).toUpperCase()}
          </Text>
        ) : (
          <User size={16} color={colors.primary} />
        )}
      </TouchableOpacity>
      <View style={[styles.toggleContainer, {
        borderColor: isDark ? colors.border : colors.borderLight,
        backgroundColor: isDark ? 'rgba(15,29,48,0.7)' : '#FFFFFF',
      }]}>
        <TouchableOpacity
          onPress={() => setViewMode('detail')}
          activeOpacity={0.7}
          style={[
            styles.toggleBtn,
            { backgroundColor: viewMode === 'detail' ? colors.primary : 'transparent' },
          ]}
        >
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'detail' ? '#fff' : colors.textMuted },
          ]}>
            {t('dtl')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('overview')}
          activeOpacity={0.7}
          style={[
            styles.toggleBtn,
            { backgroundColor: viewMode === 'overview' ? colors.primary : 'transparent' },
          ]}
        >
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'overview' ? '#fff' : colors.textMuted },
          ]}>
            {t('ovr')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  toggleContainer: {
    flexDirection: 'column',
    borderWidth: 1.5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
