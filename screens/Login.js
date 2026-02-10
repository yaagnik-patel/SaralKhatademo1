import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { getDatabase, ref, get, child, set, update } from "firebase/database";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../screens/Auth/AuthContext";
import * as Device from "expo-device";

export default function Login({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  const sanitizeDeviceId = (id) => id.replace(/[.#$[\]]/g, "_");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const dbRef = ref(getDatabase());
      const snapshot = await get(child(dbRef, "credentials"));

      if (!snapshot.exists()) {
        setError("No users found in database");
        setLoading(false);
        return;
      }

      const users = snapshot.val();
      const userEntries = Object.entries(users);
      const match = userEntries.find(
        ([, user]) =>
          user.email.toLowerCase() === email.toLowerCase() &&
          user.password === password
      );

      if (!match) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      const [userId, userData] = match;
      const isDemoUser =
        (userData.email === "demo1@saralkhata.com" ||
          userData.email === "demo2@saralkhata.com") &&
        userData.password === "demo123";

      const rawDeviceId = `${Device.osName}-${Device.osVersion}-${Device.modelName}`;
      const deviceId = sanitizeDeviceId(rawDeviceId);
      const deviceName = Device.modelName || "Unknown";
      const loginTime = new Date().toISOString();
      const db = getDatabase();

      if (!isDemoUser) {
        const thisDeviceSnap = await get(child(dbRef, `deviceUsage/${deviceId}`));
        const thisDevice = thisDeviceSnap.exists() ? thisDeviceSnap.val() : {};

        if (thisDevice.blocked) {
          setError("Access blocked for this device");
          setLoading(false);
          return;
        }

        const allDevicesSnap = await get(child(dbRef, "deviceUsage"));
        const allDevices = allDevicesSnap.exists() ? allDevicesSnap.val() : {};

        const otherDeviceLoggedIn = Object.entries(allDevices).find(
          ([key, device]) =>
            device.userId === userId &&
            key !== deviceId &&
            device.loggedIn === true &&
            device.granted === true
        );

        if (otherDeviceLoggedIn) {
          setError("You're already logged in on another device.");
          setLoading(false);
          return;
        }

        if (thisDevice.granted === false) {
          setError("Access denied by admin");
          setLoading(false);
          return;
        }

        const updates = {};
        Object.entries(allDevices).forEach(([key, device]) => {
          if (device.userId === userId && key !== deviceId) {
            updates[`deviceUsage/${key}/loggedIn`] = false;
            updates[`deviceUsage/${key}/granted`] = false;
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
      }

      await set(ref(db, `deviceUsage/${deviceId}`), {
        userId,
        email: userData.email,
        deviceName,
        loginTime,
        blocked: false,
        granted: true,
        loggedIn: true,
      });

      await login(userId);
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View className="flex items-center justify-center px-6 py-8">
      <View className="w-full max-w-sm mb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="self-start bg-white/20 rounded-full p-2 w-10 h-10 items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#009145" />
        </TouchableOpacity>
      </View>

      <View className="bg-white/90 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-[#009145]/20">
        <View className="items-center mb-8">
          <View className="bg-[#009145] rounded-full p-4 mb-4">
            <Ionicons name="calculator" size={32} color="white" />
          </View>
          <Text className="text-3xl font-bold text-[#009145] mb-2">SaralKhata</Text>
          <Text className="text-[#009145] text-center text-sm font-medium">
            Welcome back to your trusted accounting app
          </Text>
        </View>

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <View className="flex-row items-center">
              <Ionicons name="warning" size={16} color="#ef4444" />
              <Text className="text-red-600 text-sm font-medium ml-2">{error}</Text>
            </View>
          </View>
        ) : null}

        <View className="mb-5">
          <Text className="text-[#009145] text-sm font-semibold mb-3">Email Address</Text>
          <View className="relative">
            <View className="absolute left-4 top-4 z-10">
              <Ionicons name="mail-outline" size={20} color="#009145" />
            </View>
            <TextInput
              className="w-full pl-12 pr-4 py-4 border-2 border-[#009145]/40 rounded-xl bg-white/80 text-[#064e3b] font-medium focus:border-[#009145]"
              placeholder="Enter your email"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-[#009145] text-sm font-semibold mb-3">Password</Text>
          <View className="relative">
            <View className="absolute left-4 top-4 z-10">
              <Ionicons name="lock-closed-outline" size={20} color="#009145" />
            </View>
            <TextInput
              className="w-full pl-12 pr-12 py-4 border-2 border-[#009145]/40 rounded-xl bg-white/80 text-[#064e3b] font-medium focus:border-[#009145]"
              placeholder="Enter your password"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={togglePasswordVisibility}
              className="absolute right-4 top-4"
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#009145"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.9}
          className={`w-full py-4 rounded-xl shadow-lg ${
            loading ? "bg-emerald-300" : "bg-[#009145]"
          }`}
        >
          <View className="flex-row items-center justify-center">
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Login</Text>
            )}
          </View>
        </TouchableOpacity>

        <View className="mt-8 items-center">
          <Text className="text-[#009145] text-sm mb-3 font-medium">
            Don't have an account?
          </Text>
          <TouchableOpacity
            onPress={() => {
              const phoneNumber = "7046145944";
              const message = encodeURIComponent(
                "Hi, I want to use the SaralKhata app. Please share the details."
              );
              const url = `https://wa.me/${phoneNumber}?text=${message}`;
              Linking.openURL(url);
            }}
            className="bg-[#e6f9f1] px-6 py-3 rounded-xl border border-[#009145]/40"
            activeOpacity={0.8}
          >
            <Text className="text-[#009145] font-semibold text-sm">Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
