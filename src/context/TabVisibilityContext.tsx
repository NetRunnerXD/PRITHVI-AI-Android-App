import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SHOW_ANALYTICS = 'prithvi.show_analytics_tab';
const KEY_SHOW_DATA = 'prithvi.show_data_tab';

interface TabVisibilityContextProps {
  showAnalytics: boolean;
  setShowAnalytics: (show: boolean) => void;
  showData: boolean;
  setShowData: (show: boolean) => void;
}

const TabVisibilityContext = createContext<TabVisibilityContextProps | undefined>(undefined);

export const TabVisibilityProvider = ({ children }: { children: ReactNode }) => {
  // Hidden by default as per requirement
  const [showAnalytics, setShowAnalyticsState] = useState<boolean>(false);
  const [showData, setShowDataState] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedAnalytics, savedData] = await Promise.all([
          AsyncStorage.getItem(KEY_SHOW_ANALYTICS),
          AsyncStorage.getItem(KEY_SHOW_DATA),
        ]);
        if (savedAnalytics !== null) {
          setShowAnalyticsState(savedAnalytics === 'true');
        }
        if (savedData !== null) {
          setShowDataState(savedData === 'true');
        }
      } catch (err) {
        console.warn('Failed to load tab visibility settings:', err);
      }
    })();
  }, []);

  const setShowAnalytics = (show: boolean) => {
    setShowAnalyticsState(show);
    AsyncStorage.setItem(KEY_SHOW_ANALYTICS, String(show)).catch(() => {});
  };

  const setShowData = (show: boolean) => {
    setShowDataState(show);
    AsyncStorage.setItem(KEY_SHOW_DATA, String(show)).catch(() => {});
  };

  return (
    <TabVisibilityContext.Provider
      value={{
        showAnalytics,
        setShowAnalytics,
        showData,
        setShowData,
      }}
    >
      {children}
    </TabVisibilityContext.Provider>
  );
};

export const useTabVisibility = () => {
  const context = useContext(TabVisibilityContext);
  if (!context) {
    throw new Error('useTabVisibility must be used within a TabVisibilityProvider');
  }
  return context;
};
