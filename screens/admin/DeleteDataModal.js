// components/DeleteDataModal.js

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, remove } from "firebase/database";
import { db } from "./../../firebase";

export default function DeleteDataModal({ visible, onClose }) {
  const [userId, setUserId] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);

  const handleDelete = async () => {
    if (!userId || !selectedOption) {
      Alert.alert("Error", "Please enter User ID and select an option.");
      return;
    }

    try {
      const basePath = `userData/${userId}`;
      if (selectedOption === "customers") {
        await remove(ref(db, `${basePath}/customers`));
      } else if (selectedOption === "transactions") {
        await remove(ref(db, `${basePath}/transactions`));
      } else if (selectedOption === "profile") {
        await remove(ref(db, `${basePath}/profile`));
      } else if (selectedOption === "all") {
        await remove(ref(db, basePath));
      }

      Alert.alert("Success", "Data deleted successfully!");
      setUserId("");
      setSelectedOption(null);
      onClose();
    } catch (err) {
      Alert.alert("Error", "Failed to delete data.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white p-6 rounded-t-3xl">
          <Text className="text-lg font-bold mb-4">Delete User Data</Text>

          <TextInput
            className="border border-gray-300 p-3 rounded-xl mb-4"
            placeholder="Enter User ID"
            value={userId}
            onChangeText={setUserId}
          />

          {["customers", "transactions", "profile", "all"].map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setSelectedOption(option)}
              className={`p-3 rounded-xl mb-2 ${
                selectedOption === option
                  ? "bg-red-600"
                  : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  selectedOption === option ? "text-white" : "text-gray-800"
                }`}
              >
                Delete {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}

          <View className="flex-row justify-between mt-4">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 mr-2 p-3 border border-gray-300 rounded-xl"
            >
              <Text className="text-center text-gray-600 font-bold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-1 ml-2 p-3 bg-red-600 rounded-xl"
            >
              <Text className="text-center text-white font-bold">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
