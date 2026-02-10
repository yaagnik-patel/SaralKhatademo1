import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ref,
  onValue,
  update,
  set,
  remove,
  get,
} from "firebase/database";
import { db } from "./../../firebase";
import DeleteDataModal from "../../screens/admin/DeleteDataModal";

export default function AdminPanel() {
  const [deviceData, setDeviceData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newCredential, setNewCredential] = useState({
    email: "",
    password: "",
    userId: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDevices, setFilteredDevices] = useState([]);
const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "deviceUsage"), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const groupedByEmail = {};
        Object.entries(data).forEach(([deviceId, info]) => {
          const email = info.email || "unknown";
          if (!groupedByEmail[email]) groupedByEmail[email] = [];
          groupedByEmail[email].push({ deviceId, ...info });
        });
        const deviceArray = Object.entries(groupedByEmail);
        setDeviceData(deviceArray);
        setFilteredDevices(deviceArray);
      } else {
        setDeviceData([]);
        setFilteredDevices([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter devices based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDevices(deviceData);
    } else {
      const filtered = deviceData.filter(([email, devices]) =>
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        devices.some(device => 
          device.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.userId?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredDevices(filtered);
    }
  }, [searchQuery, deviceData]);

  const updateDevice = async (deviceId, fields) => {
    try {
      await update(ref(db, `deviceUsage/${deviceId}`), fields);
      Alert.alert("Success", "Device updated successfully.");
    } catch {
      Alert.alert("Error", "Could not update device.");
    }
  };

  const handleAddCredential = async () => {
    const { email, password, userId } = newCredential;
    if (!email || !password || !userId) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    try {
      await set(ref(db, `credentials/${userId}`), { email, password, userId });
      Alert.alert("Success", "Credential added successfully!");
      setNewCredential({ email: "", password: "", userId: "" });
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to add credential.");
    }
  };

  const handleLogoutDevice = async (deviceId) => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await remove(ref(db, `deviceUsage/${deviceId}`));
              Alert.alert("Success", "Device session removed successfully.");
            } catch {
              Alert.alert("Error", "Failed to logout device.");
            }
          },
        },
      ]
    );
  };

  const handleBlockDevice = async (deviceId, isBlocked) => {
    try {
      await update(ref(db, `deviceUsage/${deviceId}`), {
        blocked: !isBlocked,
        loggedIn: false,
      });
      Alert.alert("Success", `Device ${!isBlocked ? "blocked" : "unblocked"} successfully!`);
    } catch {
      Alert.alert("Error", "Could not block/unblock device.");
    }
  };

  const handleGrantAccess = async (deviceId, userId, isGranted) => {
    try {
      if (!isGranted) {
        // Single-device login: logout all other devices for user
        const snapshot = await get(ref(db, "deviceUsage"));
        const devices = snapshot.val() || {};

        const updates = {};
        Object.keys(devices).forEach((key) => {
          if (devices[key].userId === userId && key !== deviceId) {
            updates[`deviceUsage/${key}/loggedIn`] = false;
            updates[`deviceUsage/${key}/granted`] = false;
          }
        });

        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
      }

      await update(ref(db, `deviceUsage/${deviceId}`), {
        granted: !isGranted,
        loggedIn: !isGranted,
      });

      Alert.alert("Success", `Access ${!isGranted ? "granted" : "denied"} successfully!`);
    } catch {
      Alert.alert("Error", "Failed to update access.");
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "N/A";
    const date = new Date(iso);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTotalDevices = () => {
    return deviceData.reduce((total, [email, devices]) => total + devices.length, 0);
  };

  const getActiveDevices = () => {
    return deviceData.reduce((total, [email, devices]) => 
      total + devices.filter(d => !d.blocked && d.granted).length, 0
    );
  };

  const getBlockedDevices = () => {
    return deviceData.reduce((total, [email, devices]) => 
      total + devices.filter(d => d.blocked).length, 0
    );
  };

  const renderDeviceCard = (device) => (
    <View
      key={device.deviceId}
      className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm"
    >
      {/* Device Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="font-bold text-gray-900 text-lg">
            {device.deviceName || "Unknown Device"}
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            ID: {device.deviceId.substring(0, 8)}...
          </Text>
        </View>
        <View className="bg-gray-50 px-3 py-1 rounded-full">
          <Text className="text-xs text-gray-600 font-medium">
            {device.userId}
          </Text>
        </View>
      </View>

      {/* Device Info */}
      <View className="bg-gray-50 rounded-xl p-3 mb-3">
        <View className="flex-row items-center mb-2">
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-2">
            Login: {formatDate(device.loginTime)}
          </Text>
        </View>
      </View>

      {/* Status badges */}
      <View className="flex-row gap-2 mb-4">
        <View
          className={`px-3 py-1 rounded-full ${
            device.blocked ? "bg-red-100" : "bg-green-100"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              device.blocked ? "text-red-700" : "text-green-700"
            }`}
          >
            {device.blocked ? "Blocked" : "Active"}
          </Text>
        </View>
        <View
          className={`px-3 py-1 rounded-full ${
            device.granted ? "bg-blue-100" : "bg-orange-100"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              device.granted ? "text-blue-700" : "text-orange-700"
            }`}
          >
            {device.granted ? "Granted" : "Pending"}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => handleBlockDevice(device.deviceId, device.blocked)}
          className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center ${
            device.blocked ? "bg-green-100" : "bg-red-100"
          }`}
        >
          <Ionicons
            name={device.blocked ? "checkmark-circle" : "ban"}
            size={16}
            color={device.blocked ? "#16a34a" : "#dc2626"}
          />
          <Text
            className={`ml-2 text-sm font-medium ${
              device.blocked ? "text-green-700" : "text-red-700"
            }`}
          >
            {device.blocked ? "Unblock" : "Block"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleGrantAccess(device.deviceId, device.userId, device.granted)}
          className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center ${
            device.granted ? "bg-orange-100" : "bg-blue-100"
          }`}
        >
          <Ionicons
            name={device.granted ? "remove-circle" : "add-circle"}
            size={16}
            color={device.granted ? "#f97316" : "#3b82f6"}
          />
          <Text
            className={`ml-2 text-sm font-medium ${
              device.granted ? "text-orange-700" : "text-blue-700"
            }`}
          >
            {device.granted ? "Revoke" : "Grant"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleLogoutDevice(device.deviceId)}
          className="bg-gray-100 py-3 px-4 rounded-xl flex-row items-center justify-center"
        >
          <Ionicons name="log-out-outline" size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
        <Text className="text-2xl font-bold text-white text-center leading-tight">
          Admin Panel
        </Text>
        <Text className="text-sm text-green-100 text-center mt-0 leading-none">
          Manage Device Access & Security
        </Text>
      </View>

      {/* Stats Cards */}
      <View className="px-4 mt-4">
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-gray-900">
                  {getTotalDevices()}
                </Text>
                <Text className="text-sm text-gray-600">Total Devices</Text>
              </View>
              <View className="bg-blue-100 p-3 rounded-xl">
                <Ionicons name="phone-portrait" size={24} color="#3b82f6" />
              </View>
            </View>
          </View>

          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-green-600">
                  {getActiveDevices()}
                </Text>
                <Text className="text-sm text-gray-600">Active</Text>
              </View>
              <View className="bg-green-100 p-3 rounded-xl">
                <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              </View>
            </View>
          </View>

          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-red-600">
                  {getBlockedDevices()}
                </Text>
                <Text className="text-sm text-gray-600">Blocked</Text>
              </View>
              <View className="bg-red-100 p-3 rounded-xl">
                <Ionicons name="ban" size={24} color="#dc2626" />
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-gray-100 rounded-xl items-center justify-center mr-3">
              <Ionicons name="search" size={18} color="#6b7280" />
            </View>
            <TextInput
              className="flex-1 text-base font-medium text-gray-900"
              placeholder="Search devices, emails, or user IDs..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Device List */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {filteredDevices.length === 0 ? (
          <View className="items-center justify-center py-16">
            <View className="bg-gray-100 p-6 rounded-2xl mb-4">
              <Ionicons name="phone-portrait-outline" size={48} color="#6b7280" />
            </View>
            <Text className="text-gray-500 text-center text-lg font-medium">
              {searchQuery ? "No devices found" : "No devices registered"}
            </Text>
            <Text className="text-gray-400 text-center text-sm mt-2">
              {searchQuery ? "Try adjusting your search terms" : "Devices will appear here when users log in"}
            </Text>
          </View>
        ) : (
          filteredDevices.map(([email, devices]) => (
            <View key={email} className="mb-6">
              {/* Email Header */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-purple-100 rounded-xl items-center justify-center mr-3">
                      <Ionicons name="mail" size={20} color="#8b5cf6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-900">
                        {email}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {devices.length} device{devices.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <View className="bg-gray-50 px-3 py-1 rounded-full">
                    <Text className="text-xs text-gray-600 font-medium">
                      {devices.filter(d => d.granted).length}/{devices.length} Active
                    </Text>
                  </View>
                </View>
              </View>

              {/* Devices under this email */}
              {devices.map(renderDeviceCard)}
            </View>
          ))
        )}

        {/* Bottom spacing */}
        <View className="h-32" />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="absolute bottom-6 right-6 bg-[#009145] w-16 h-16 rounded-2xl justify-center items-center shadow-lg shadow-green-500/20"
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Add Credential Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-gray-50">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-white leading-tight">
                    Add Credential
                  </Text>
                  <Text className="text-green-100 text-sm mt-0 leading-none">
                    Create new user access
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-white/20 p-3 rounded-2xl"
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="px-4 mt-4 space-y-5">
              {/* Email Input */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="mail" size={18} color="#8b5cf6" />
                  </View>
                  <Text className="text-base font-bold text-gray-800">Email</Text>
                </View>
                <TextInput
                  className="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
                  placeholder="Enter email address"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newCredential.email}
                  onChangeText={(text) =>
                    setNewCredential({ ...newCredential, email: text })
                  }
                />
              </View>

              {/* Password Input */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-red-100 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="lock-closed" size={18} color="#dc2626" />
                  </View>
                  <Text className="text-base font-bold text-gray-800">Password</Text>
                </View>
                <View className="relative">
                  <TextInput
                    className="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 pr-12 focus:border-[#009145]"
                    placeholder="Enter password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={newCredential.password}
                    onChangeText={(text) =>
                      setNewCredential({ ...newCredential, password: text })
                    }
                  />
                  <TouchableOpacity
                    className="absolute right-4 top-4"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* User ID Input */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="person" size={18} color="#3b82f6" />
                  </View>
                  <Text className="text-base font-bold text-gray-800">User ID</Text>
                </View>
                <TextInput
                  className="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
                  placeholder="Enter user ID"
                  placeholderTextColor="#9ca3af"
                  value={newCredential.userId}
                  onChangeText={(text) =>
                    setNewCredential({ ...newCredential, userId: text })
                  }
                />
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                className="w-full bg-[#009145] py-4 rounded-2xl mt-6 shadow-lg shadow-green-500/20"
                onPress={handleAddCredential}
                activeOpacity={0.9}
              >
                <Text className="text-white text-center font-bold text-lg">
                  Add Credential
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full border border-gray-300 py-4 rounded-2xl mt-3 mb-6"
                onPress={() => setModalVisible(false)}
                activeOpacity={0.9}
              >
                <Text className="text-gray-600 text-center font-bold text-lg">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      {/* Delete Data Button */}
<TouchableOpacity
  onPress={() => setDeleteModalVisible(true)}
  className="absolute bottom-6 left-6 bg-red-600 w-16 h-16 rounded-2xl justify-center items-center shadow-lg shadow-red-500/20"
  activeOpacity={0.9}
>
  <Ionicons name="trash" size={26} color="white" />
</TouchableOpacity>

<DeleteDataModal
  visible={deleteModalVisible}
  onClose={() => setDeleteModalVisible(false)}
/>

    </View>
  );
}