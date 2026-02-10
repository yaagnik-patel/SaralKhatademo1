import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Animated
} from 'react-native';

export default function Home({ navigation }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setLogoVisible(true), 300);
    setTimeout(() => setIsLoaded(true), 800);
    setTimeout(() => setButtonsVisible(true), 1200);
  }, []);

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleGetStarted = () => {
    navigation.navigate('Signup');
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        
        {/* Animated Background Circles */}
        <View className="absolute inset-0 overflow-hidden">
          <View style={{ backgroundColor: '#009145' }} className="absolute -top-32 -left-32 w-64 h-64 rounded-full opacity-20" />
          <View style={{ backgroundColor: '#009145' }} className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full opacity-20" />
          <View style={{ backgroundColor: '#009145' }} className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-15" />
        </View>

        {/* Floating particles */}
        <View className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              className="absolute w-2 h-2 rounded-full opacity-30"
              style={{
                backgroundColor: '#009145',
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
              }}
            />
          ))}
        </View>

        {/* Main Content */}
        <View className="relative z-10 items-center max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl w-full">
          
          {/* Logo */}
          <View className={`mb-6 sm:mb-8 transition-all duration-1000 ${logoVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <View className="flex flex-col items-center">
              {/* Icon */}
              <View style={{ backgroundColor: '#009145' }} className="w-28 h-28 rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden">
                <View className="w-20 h-20 bg-white rounded-md flex items-center justify-center relative">
                  <View style={{ backgroundColor: '#009145' }} className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-md">
                    {[...Array(5)].map((_, idx) => (
                      <View key={idx} className="absolute w-0.5 h-1.5 bg-white rounded-full" style={{ top: `${10 + idx * 15}%`, left: '50%', transform: [{ translateX: -1 }] }} />
                    ))}
                  </View>
                  <Text style={{ color: '#009145' }} className="text-3xl font-bold z-10">₹</Text>
                </View>
              </View>

              <Text className="mt-2 text-5xl font-bold text-slate-800 text-center">SaralKhata</Text>
            </View>
          </View>

          {/* Text */}
          <View className={`mb-10 transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <View className="flex flex-row justify-center items-center gap-4 mb-6">
              {['    Easy ', ' Faster ', ' Trusted'].map((word, i) => (
                <View key={word} className="flex-row items-center space-x-1">
  {i !== 0 && (
    <View
      style={{ backgroundColor: '#009145' }}
      className="w-1.5 h-1.5 rounded-full"
    />
  )}
  <Text style={{ color: '#009145' }} className="font-bold text-xl">
    {word}.
  </Text>
</View>

              ))}
            </View>
            <Text className="text-gray-700 text-2xl font-semibold text-center">Your trusted accounting app</Text>
          </View>

          {/* Buttons */}
          <View className={`w-full space-y-4 transition-all duration-1000 delay-500 ${buttonsVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <TouchableOpacity
              onPress={handleGetStarted}
              style={{ backgroundColor: '#009145' }}
              className="w-full py-4 px-8 rounded-xl shadow-lg"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-center text-lg">Get Started →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              className="w-full py-4 px-8 rounded-xl border-2 bg-transparent"
              style={{ borderColor: '#009145' }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#009145' }} className="font-semibold text-center text-lg">Login</Text>
            </TouchableOpacity>
          </View>

          {/* Tagline */}
          <View className={`mt-10 transition-all duration-1000 delay-700 ${buttonsVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <Text className="text-gray-500 text-base text-center">Simple accounting made right</Text>
          </View>
        </View>

        {/* Footer Fade Effect */}
        <View className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent opacity-60" />
      </View>
    </ScrollView>
  );
}
