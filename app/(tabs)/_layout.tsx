import { Tabs } from 'expo-router';
import { Home, LineChart, Map, Database, MessageSquare, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/context/ThemeContext';
import { useTabVisibility } from '../../src/context/TabVisibilityContext';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showAnalytics, showData } = useTabVisibility();

  return (
    <Tabs screenOptions={{
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.tabActive,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
      },
      tabBarStyle: {
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        height: Platform.OS === 'ios' ? 88 : 64,
        paddingTop: 6,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        ...(isDark ? {} : {
          shadowColor: '#0284C7',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        }),
      },
      tabBarItemStyle: {
        borderRadius: 12,
        marginHorizontal: 2,
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('analytics'),
          headerShown: false,
          href: showAnalytics ? '/analytics' : null,
          tabBarIcon: ({ color, size }) => <LineChart color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          title: t('maps'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Map color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          title: t('data'),
          headerShown: false,
          href: showData ? '/data' : null,
          tabBarIcon: ({ color, size }) => <Database color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('chat'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Settings color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
