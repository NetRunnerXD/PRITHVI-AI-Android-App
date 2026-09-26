import React, { useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardSnapshot, NowcastLiveResponse } from '../../types';
import { fmt, marineInland, warningByHazard } from './homeData';
import { cpcbCategory, getPollenAssessment, hhmm, pinAqi, seaState } from './scienceHelpers';
import {
  getAirLaymanSummary,
  getMarineLaymanSummary,
  getNowcastLaymanSummary,
  getSoilLaymanSummary,
  type Locale,
} from './laymanSummaries';
import { CardChrome, MiniTabs } from './CardChrome';
import { SummaryBlock, laymanToCard } from './SummaryBlock';
import { HourlyBarChart, HourlyLineChart } from './charts';

function locOf(lng: string): Locale {
  if (lng.startsWith('hi')) return 'hi';
  if (lng.startsWith('bn')) return 'bn';
  return 'en';
}

export { AirCard } from './AirQualityCard';
export { LandWeatherCard as SoilCard } from './LandWeatherCard';
export { MarineWeatherCard as MarineCard } from './MarineWeatherCard';
export { CycloneCard } from './CycloneCard';
export { SeismicCard } from './SeismicCard';
export { NowcastCard } from './NowcastCard';

