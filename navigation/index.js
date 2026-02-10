import React from 'react';
import { useWindowDimensions } from 'react-native';
import BottomTabs from './BottomTabs';
import DrawerNav from './DrawerNav';

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return isMobile ? <BottomTabs /> : <DrawerNav />;
}
