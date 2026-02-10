import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';

// Screens
import AddTransaction from '../screens/Customer/AddTransaction';
import Report from '../screens/Dashboard/Reports';
import Settings from '../screens/Settings';
import CustomerList from '../screens/Customer/customerlist';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Color theme from PDF
const colors = {
  primary: '#009145',      // Emerald Green
  secondary: '#1E2A38',    // Deep Navy Blue
  accent: '#57B784',       // Soft Teal
  background: '#F9FAFB',   // Whisper White
  surface: '#E5E7EB',      // Light Grey
  textDark: '#1F2937',     // Charcoal Black
  textLight: '#FFFFFF',    // Warm White
  danger: '#DC2626',       // Tomato Red
  success: '#10B981',      // Soft Green
};

// Stack Navigators for each tab
function TransactionStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="AddTransaction" component={AddTransaction} />
    </Stack.Navigator>
  );
}

function CustomerStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="CustomerList" component={CustomerList} />
    </Stack.Navigator>
  );
}

function ReportStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="Reports" component={Report} />
    </Stack.Navigator>
  );
}

function SettingStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="Profile" component={Profile} />
    </Stack.Navigator>
  );
}

// Animated Tab Item Component
const AnimatedTabItem = ({ route, index, isFocused, onPress, onLongPress, options, colors }) => {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1 : 0.9)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;
  const backgroundAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.15 : 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.spring(opacityAnim, {
        toValue: isFocused ? 1 : 0.7,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(backgroundAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.15 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
    ]).start();

    onPress();
  };

  const getIcon = () => {
    const color = isFocused ? colors.textLight : '#9CA3AF';
    const size = isFocused ? 28 : 24;

    switch (route.name) {
      case 'Transaction':
        return <MaterialIcons name="receipt" size={size} color={color} />;
      case 'Customer':
        return <Ionicons name="people" size={size} color={color} />;
      case 'Report':
        return <Feather name="bar-chart-2" size={size} color={color} />;
      case 'Setting':
        return <Feather name="settings" size={size} color={color} />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (route.name) {
      case 'Transaction':
        return 'Transaction';
      case 'Customer':
        return 'Customer';
      case 'Report':
        return 'Reports';
      case 'Setting':
        return 'Settings';
      default:
        return route.name;
    }
  };

  const interpolatedBackgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.primary],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      className="flex-1 items-center justify-center py-2"
      accessible={true}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      activeOpacity={0.7}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <Animated.View 
          className="items-center justify-center rounded-2xl"
          style={{
            width: isFocused ? 52 : 44,
            height: isFocused ? 52 : 44,
            backgroundColor: interpolatedBackgroundColor,
          }}
        >
          {getIcon()}
        </Animated.View>
      </Animated.View>
      
      <Text
        className="text-xs mt-2 font-semibold"
        style={{ 
          color: isFocused ? colors.primary : '#9CA3AF',
        }}
      >
        {getLabel()}
      </Text>
    </TouchableOpacity>
  );
};

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  }, []);

  return (
    <Animated.View 
      className="absolute bottom-0 left-0 right-0 bg-transparent px-4"
      style={{
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0],
            })
          }
        ],
        opacity: slideAnim,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Handle safe area
      }}
    >
      <View 
        className="bg-white rounded-3xl border-2 border-gray-100 mx-2" 
        style={{
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        }}
      >
        <View className="flex-row items-center justify-around px-2" style={{ height: 75 }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <AnimatedTabItem
                key={route.key}
                route={route}
                index={index}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                options={options}
                colors={colors}
              />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
};

export default function BottomTabs() {
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Transaction" component={TransactionStack} />
        <Tab.Screen name="Customer" component={CustomerStack} />
        <Tab.Screen name="Report" component={ReportStack} />
        <Tab.Screen name="Setting" component={SettingStack} />
      </Tab.Navigator>
    </View>
  );
}

// Alternative cleaner version with better spacing
export function BottomTabsClean() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          backgroundColor: colors.textLight,
          borderRadius: 28,
          height: 80,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          paddingHorizontal: 8,
          borderTopWidth: 0,
          borderWidth: 2,
          borderColor: '#E5E7EB',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { 
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 4,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = focused ? 32 : 26;
          const iconColor = focused ? colors.textLight : '#9CA3AF';
          
          switch (route.name) {
            case 'Transaction':
              return (
                <View 
                  style={{
                    width: focused ? 56 : 48,
                    height: focused ? 56 : 48,
                    borderRadius: focused ? 28 : 24,
                    backgroundColor: focused ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="receipt" size={iconSize} color={iconColor} />
                </View>
              );
            case 'Customer':
              return (
                <View 
                  style={{
                    width: focused ? 56 : 48,
                    height: focused ? 56 : 48,
                    borderRadius: focused ? 28 : 24,
                    backgroundColor: focused ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="people" size={iconSize} color={iconColor} />
                </View>
              );
            case 'Report':
              return (
                <View 
                  style={{
                    width: focused ? 56 : 48,
                    height: focused ? 56 : 48,
                    borderRadius: focused ? 28 : 24,
                    backgroundColor: focused ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="bar-chart-2" size={iconSize} color={iconColor} />
                </View>
              );
            case 'Setting':
              return (
                <View 
                  style={{
                    width: focused ? 56 : 48,
                    height: focused ? 56 : 48,
                    borderRadius: focused ? 28 : 24,
                    backgroundColor: focused ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="settings" size={iconSize} color={iconColor} />
                </View>
              );
            case 'Profile':
              return (
                <View 
                  style={{
                    width: focused ? 56 : 48,
                    height: focused ? 56 : 48,
                    borderRadius: focused ? 28 : 24,
                    backgroundColor: focused ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="person-circle" size={iconSize} color={iconColor} />
                </View>
              );
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen name="Transaction" component={TransactionStack} />
      <Tab.Screen name="Customer" component={CustomerStack} />
      <Tab.Screen name="Report" component={ReportStack} />
      <Tab.Screen name="Setting" component={SettingStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}