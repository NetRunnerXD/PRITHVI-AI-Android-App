import React from 'react';
import { View } from 'react-native';
import type { DashboardSnapshot, NowcastLiveResponse } from '../../types';
import { AirCard, SoilCard, MarineCard, CycloneCard, SeismicCard, NowcastCard } from './HazardCards';

export function HazardStrip({
  dash,
  nowcast,
}: {
  dash: DashboardSnapshot;
  nowcast?: NowcastLiveResponse;
}) {
  return (
    <View>
      <AirCard dash={dash} />
      <SoilCard dash={dash} />
      <MarineCard dash={dash} />
      <CycloneCard dash={dash} />
      <SeismicCard dash={dash} />
      <NowcastCard dash={dash} nowcast={nowcast} />
    </View>
  );
}
