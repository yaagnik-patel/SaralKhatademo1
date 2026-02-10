import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AddTransaction from '../screens/Customer/AddTransaction';

const Drawer = createDrawerNavigator();

export default function DrawerNav() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }}>
      <Drawer.Screen name="Add Transaction" component={AddTransaction} />
    </Drawer.Navigator>
  );
}
