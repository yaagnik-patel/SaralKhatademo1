import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthContext } from '../screens/Auth/AuthContext';
import BottomTabs from './BottomTabs';
import Home from '../screens/Home';
import Login from '../screens/Login';
import AdminPanel from '../screens/admin/admin';
import RecentTransactions from '../screens/Customer/RecentTransactions';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { currentUser } = useContext(AuthContext);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!currentUser ? (
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="Login" component={Login} />
            </>
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={BottomTabs} />
              <Stack.Screen name="Admin" component={AdminPanel} />
              <Stack.Screen name="RecentTransactions" component={RecentTransactions} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
