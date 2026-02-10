// Updated Settings screen: Profile can be edited only once, with a clean info display afterward

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Switch,
  TextInput,
  Linking,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../screens/Auth/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function Settings() {
  const { currentUser, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  const [userProfile, setUserProfile] = useState({
    name: '',
    shopName: '',
    mobile: '',
    email: currentUser?.email || 'user@example.com',
    userId: currentUser?.userId || 'unknown',
    profileImage: null
  });

  const [profileExists, setProfileExists] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [appPreferences, setAppPreferences] = useState({
    currency: '₹',
    notifications: true
  });

  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const isAdmin = currentUser?.userId === 'admin001';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileRef = ref(db, `userData/${currentUser.userId}/profile`);
        const snapshot = await get(profileRef);
        const savedImage = await AsyncStorage.getItem('profileImage');

        if (snapshot.exists()) {
          const profileData = snapshot.val();
          setUserProfile((prev) => ({
            ...prev,
            name: profileData.name || '',
            shopName: profileData.shopName || '',
            mobile: profileData.phone || '',
            email: profileData.email || '',
            userId: profileData.userId || '',
            profileImage: savedImage || null
          }));
          setProfileExists(true);
        } else {
          setUserProfile((prev) => ({
            ...prev,
            email: currentUser.email,
            userId: currentUser.userId
          }));
          setProfileExists(false);
          setShowProfileModal(true);
        }
      } catch (error) {
        console.error('Profile load error:', error);
      }
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
    if (profileExists) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setUserProfile((prev) => ({ ...prev, profileImage: uri }));
      await AsyncStorage.setItem('profileImage', uri);
    }
  };

  const saveProfileToDatabase = async () => {
    const { name, shopName, mobile, email, userId } = userProfile;
    const profileRef = ref(db, `userData/${userId}/profile`);
    await set(profileRef, { name, shopName, phone: mobile, email, userId });
    Alert.alert("Saved", "Profile updated successfully!");
    setShowProfileModal(false);
    setProfileExists(true);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => logout()
      }
    ]);
  };

  const handleContactSupport = () => {
    const whatsappUrl = "whatsapp://send?phone=+919876543210&text=Hello, I need help with SaralKhata app";
    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert("Error", "WhatsApp is not installed on your device");
    });
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent, showArrow = true }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between p-4 bg-white border-b border-gray-100"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center flex-1">
        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
          <Ionicons name={icon} size={20} color="#6b7280" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-gray-900">{title}</Text>
          {subtitle && <Text className="text-sm text-gray-500 mt-1">{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || (showArrow && <Ionicons name="chevron-forward" size={20} color="#9ca3af" />)}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
          <Text className="text-2xl font-bold text-white">Settings</Text>
          <Text className="text-green-100 text-sm mt-1">Manage your app preferences</Text>
        </View>

        <View className="mt-4 bg-white">
          <SettingItem
            icon="person"
            title="Profile Settings"
            subtitle={`${userProfile.name} • ${userProfile.mobile}`}
            onPress={() => setShowProfileModal(true)}
          />
        </View>

        {isAdmin && (
          <View className="mt-4 bg-white">
            <SettingItem
              icon="settings"
              title="Admin Panel"
              subtitle="Manage app access and usage"
              onPress={() => navigation.navigate('Admin')}
            />
          </View>
        )}

        <View className="mt-4 bg-white">
          <SettingItem
            icon="notifications"
            title="Notifications"
            subtitle="Receive reminders"
            rightComponent={
              <Switch value={appPreferences.notifications}
                onValueChange={(val) => setAppPreferences(p => ({ ...p, notifications: val }))} />
            }
            showArrow={false}
          />
        </View>

        <View className="mt-4 bg-white">
          <SettingItem
            icon="language"
            title="App Language"
            subtitle={`Current: ${selectedLanguage}`}
            onPress={() => Alert.alert("Language", "Coming soon!")}
          />
        </View>

        <View className="mt-4 bg-white">
          <SettingItem
            icon="chatbubble-ellipses"
            title="Contact Support"
            subtitle="Get help via WhatsApp"
            onPress={handleContactSupport}
          />
        </View>

        <View className="mt-4 bg-white mb-10">
          <SettingItem
            icon="log-out"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
          />
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <ScrollView className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="items-center my-4">
            <View className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden items-center justify-center">
              {userProfile.profileImage ? (
                <Image
                  source={{ uri: userProfile.profileImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="camera" size={40} color="#6b7280" />
              )}
            </View>
            <Text className="text-lg font-semibold mt-4">{userProfile.name}</Text>
            <Text className="text-sm text-gray-500">{userProfile.shopName}</Text>
            <Text className="text-sm text-gray-500">{userProfile.mobile}</Text>
            <Text className="text-sm text-gray-500">{userProfile.email}</Text>
          </View>

          {!profileExists && (
            <View className="space-y-4 mt-4">
              <TouchableOpacity onPress={pickImage}>
                <Text className="text-center text-[#009145] font-medium">Tap to add/change profile photo</Text>
              </TouchableOpacity>
              <TextInput
                className="bg-white p-4 rounded-xl border border-gray-200"
                placeholder="Full Name"
                value={userProfile.name}
                onChangeText={(val) => setUserProfile({ ...userProfile, name: val })}
              />
              <TextInput
                className="bg-white p-4 rounded-xl border border-gray-200"
                placeholder="Shop Name"
                value={userProfile.shopName}
                onChangeText={(val) => setUserProfile({ ...userProfile, shopName: val })}
              />
              <TextInput
                className="bg-white p-4 rounded-xl border border-gray-200"
                placeholder="Mobile Number"
                keyboardType="phone-pad"
                value={userProfile.mobile}
                onChangeText={(val) => setUserProfile({ ...userProfile, mobile: val })}
              />

              <TouchableOpacity
                onPress={saveProfileToDatabase}
                className="w-full bg-[#009145] py-4 rounded-2xl mt-6"
              >
                <Text className="text-white text-center font-bold text-lg">Save Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setShowProfileModal(false)}
            className="w-full border border-gray-300 py-4 rounded-2xl mt-6 mb-10"
          >
            <Text className="text-center text-gray-600 font-semibold">Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}