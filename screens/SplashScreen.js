import React, { useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

export default function SaralKhataSplash() {
  const isTablet = screenWidth > 640;
  const isLarge = screenWidth > 768;

  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const glow = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const dots = Array.from({ length: 3 }, () => useSharedValue(0));
  const particles = Array.from({ length: 6 }, () => ({
    translateY: useSharedValue(0),
    opacity: useSharedValue(0.2),
  }));

  useEffect(() => {
    scale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) });
    rotate.value = withTiming(1, { duration: 1000 });
    glow.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1
    );

    textOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    subtitleOpacity.value = withDelay(1400, withTiming(1, { duration: 600 }));

    dots.forEach((dot, i) => {
      dot.value = withRepeat(
        withSequence(
          withDelay(i * 150, withTiming(-10, { duration: 300 })),
          withTiming(0, { duration: 300 })
        ),
        -1
      );
    });

    particles.forEach((p, i) => {
      p.translateY.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 2000 + i * 100 }),
          withTiming(0, { duration: 2000 + i * 100 })
        ),
        -1
      );
      p.opacity.value = withTiming(0.5, { duration: 1200 });
    });
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value * 360}deg` },
      { scale: glow.value },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      {/* Particles */}
      {particles.map((p, i) => {
        const style = useAnimatedStyle(() => ({
          opacity: p.opacity.value,
          transform: [{ translateY: p.translateY.value }],
        }));
        return (
          <Animated.View
            key={i}
            className="absolute w-2 h-2 rounded-full bg-green-400"
            style={[style, { left: `${10 + i * 12}%`, top: `${15 + i * 7}%` }]}
          />
        );
      })}

      {/* Logo */}
      <Animated.View style={logoStyle} className="mb-10 items-center justify-center">
        <View
          className="absolute bg-green-700 rounded-2xl"
          style={{
            width: isLarge ? 140 : isTablet ? 120 : 100,
            height: isLarge ? 140 : isTablet ? 120 : 100,
            opacity: 0.15,
            top: -10,
            left: -10,
          }}
        />
        <View
          className="bg-green-600 items-center justify-center rounded-2xl"
          style={{
            width: isLarge ? 120 : isTablet ? 100 : 80,
            height: isLarge ? 120 : isTablet ? 100 : 80,
          }}
        >
          <View className="bg-white items-center justify-center rounded-lg" style={{ width: '60%', height: '70%' }}>
            <View className="absolute left-1.5 top-2 bottom-2 justify-between">
              {[...Array(6)].map((_, i) => (
                <View key={i} className="w-1 h-1 bg-green-600 rounded-full my-0.5" />
              ))}
            </View>
            <Text
              className={`font-bold ml-2 text-green-600 ${
                isLarge ? 'text-2xl' : isTablet ? 'text-xl' : 'text-lg'
              }`}
            >
              ₹
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Brand text */}
      <Animated.View style={textStyle}>
        <Text
          className={`font-black text-center text-gray-900 ${
            isLarge ? 'text-6xl' : isTablet ? 'text-5xl' : 'text-4xl'
          }`}
        >
          SaralKhata
        </Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={subtitleStyle} className="mt-3">
        <Text
          className={`text-center font-semibold text-gray-800 ${
            isLarge ? 'text-xl' : isTablet ? 'text-lg' : 'text-base'
          }`}
        >
          Smart. Simple. Accounting.
        </Text>
        <Text
          className={`text-center uppercase tracking-widest text-green-500 ${
            isLarge ? 'text-sm' : 'text-xs'
          } mt-1`}
        >
          Making Business Easy
        </Text>
      </Animated.View>

      {/* Loading dots */}
      <View className="flex-row space-x-2 mt-10">
        {dots.map((dot, i) => {
          const style = useAnimatedStyle(() => ({
            transform: [{ translateY: dot.value }],
          }));
          return (
            <Animated.View
              key={i}
              className={`bg-green-600 rounded-full ${
                isTablet ? 'w-3 h-3' : 'w-2.5 h-2.5'
              }`}
              style={style}
            />
          );
        })}
      </View>
    </View>
  );
}
