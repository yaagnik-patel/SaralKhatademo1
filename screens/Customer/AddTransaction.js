import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  FlatList,
  Modal,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, set, onValue, update, push } from "firebase/database";
import { db } from "../../firebase";
import { useContext } from "react";
import { off } from "firebase/database";
import { AuthContext } from "../../screens/Auth/AuthContext";

export default function AddTransaction({ navigation }) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("udhar");
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const { currentUser } = useContext(AuthContext);

  const fetchTransactions = () => {
  if (!currentUser) return;
  const transactionsRef = ref(db, `userData/${currentUser.userId}/transactions`);
  onValue(transactionsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const transactionsArray = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));
      transactionsArray.sort((a, b) => parseInt(b.id) - parseInt(a.id))
      setTransactions(transactionsArray);
    } else {
      setTransactions([]);
    }
  }, {
    onlyOnce: true
  });
};

  // New customer form data
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    description: "",
  });

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    customer: "",
    amount: "",
    note: "",
    type: "udhar"
  });

  useEffect(() => {
    if (!currentUser) return;

    // Load User-Specific Customers
    const customersRef = ref(db, `userData/${currentUser.userId}/customers`);
    const customersListener = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customersArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
          transactions: value.transactions || [],
        }));
        setCustomers(customersArray);
      } else {
        setCustomers([]);
      }
    });

    // Load User-Specific Transactions
    const transactionsRef = ref(
      db,
      `userData/${currentUser.userId}/transactions`
    );
    const transactionsListener = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const transactionsArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        transactionsArray.sort((a, b) => parseInt(b.id) - parseInt(a.id))
        setTransactions(transactionsArray);
      } else {
        setTransactions([]);
      }
    });

    return () => {
      off(customersRef);
      off(transactionsRef);
    };
  }, [currentUser]);

  // Filter customers for suggestions
  const filteredSuggestions = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerName.toLowerCase()) &&
      customer.name.toLowerCase() !== customerName.toLowerCase()
  );

  const normalize = (str) => str.trim().toLowerCase();
  const customerExists = customers.some(
    (customer) => normalize(customer.name) === normalize(customerName)
  );

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert("Error", "No user logged in");
      return;
    }

    if (!amount) {
      Alert.alert("Error", "Amount is required");
      return;
    }
    if (!customerName) {
      Alert.alert("Error", "Customer name is required");
      return;
    }

    const existingCustomer = customers.find(
      (customer) => customer.name.toLowerCase() === customerName.toLowerCase()
    );

    if (!existingCustomer) {
      Alert.alert(
        "Customer Not Found",
        `${customerName} is not available. Add this customer?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add Customer",
            onPress: () => {
              setNewCustomerData({ ...newCustomerData, name: customerName });
              setShowAddCustomerModal(true);
            },
          },
        ]
      );
      return;
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    try {
      const transactionId = Date.now().toString();
      const isAdvance = type === "paid" && (existingCustomer.balance || 0) <= 0;

const transactionData = {
  customer: customerName,
  customerId: existingCustomer.id,
  amount: parseFloat(amount),
  type,
  note,
  isAdvance, // ✅ ADD THIS
  date: istTime.toISOString().split("T")[0],
  timestamp: istTime.toISOString(),
};

      await set(
        ref(db, `userData/${currentUser.userId}/transactions/${transactionId}`),
        transactionData
      );

      // Update customer balance
      const currentBalance = existingCustomer.balance || 0;
      let newBalance = currentBalance;

if (type === "udhar") {
  newBalance += parseFloat(amount);
} else {
  newBalance -= parseFloat(amount);
}


await update(
  ref(db, `userData/${currentUser.userId}/customers/${existingCustomer.id}`),
  {
    balance: newBalance,
    lastTransaction: transactionData.date,
  }
);

      
      // Reset form
      setAmount("");
      setType("udhar");
      setNote("");
      setCustomerName("");
      setShowSuggestions(false);
fetchTransactions(); // ✅ Refresh transaction list after adding

      Alert.alert("Success", "Transaction added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add transaction: " + error.message);
    }
  };

  const handleSupportPress = () => {
    Alert.alert("Support", "Message sent to admin. Our team will contact you soon.");
  };

  const handleAddNewCustomer = async () => {
    if (!currentUser) {
      Alert.alert("Error", "No user logged in");
      return;
    }

    if (!newCustomerData.name || !newCustomerData.phone) {
      Alert.alert("Error", "Name and phone are required");
      return;
    }

    try {
      const customerId = Date.now().toString();
      const customerData = {
        name: newCustomerData.name,
        phone: newCustomerData.phone,
        balance: 0,
        createdDate: new Date().toISOString().split("T")[0],
      };

      await set(
        ref(db, `userData/${currentUser.userId}/customers/${customerId}`),
        customerData
      );

      setNewCustomerData({ name: "", phone: "", description: "" });
      setShowAddCustomerModal(false);

      Alert.alert("Success", "Customer added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add customer: " + error.message);
    }
  };

  const handleCustomerNameChange = (value) => {
    setCustomerName(value);
    setShowSuggestions(value.length > 0);
  };

  const selectSuggestion = (suggestion) => {
    setCustomerName(suggestion);
    setShowSuggestions(false);
  };

const formatCurrency = (amount, type, isAdvance = false) => {
  const prefix = type === "udhar" ? "-" : "+";
  const color = type === "udhar" ? "text-red-600" : isAdvance ? "text-green-600" : "text-green-600";
  return {
    text: `${prefix}₹${Math.abs(amount).toLocaleString("en-IN")}`,
    color,
  };
};


  // Edit transaction functions
  const openEditModal = (transaction) => {
    setSelectedTransaction(transaction);
    setEditFormData({
      customer: transaction.customer,
      amount: transaction.amount.toString(),
      note: transaction.note || "",
      type: transaction.type
    });
    setEditModalVisible(true);
  };

  const handleEditTransaction = async () => {
    if (!selectedTransaction || !currentUser) return;

    const { customer, amount, note, type } = editFormData;

    if (!customer.trim() || !amount.trim()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    try {
      const updates = {
        customer: customer.trim(),
        amount: numAmount,
        note: note.trim(),
        type: type,
        timestamp: selectedTransaction.timestamp,
        date: selectedTransaction.date
      };

      await update(ref(db, `userData/${currentUser.userId}/transactions/${selectedTransaction.id}`), updates);
      
      setEditModalVisible(false);
      setSelectedTransaction(null);
      Alert.alert("Success", "Transaction updated successfully!");
      fetchTransactions(); // <- refresh transaction list
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Error", "Failed to update transaction. Please try again.");
    }
  };

  // Swipeable Transaction Card Component
  const SwipeableTransactionCard = ({ item }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [isRevealed, setIsRevealed] = useState(false);

    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(translateX.__getValue());
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -80));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateX.flattenOffset();
        if (gestureState.dx < -15) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: false,
            friction: 6,
            tension: 50,
          }).start();
          setIsRevealed(true);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            friction: 7,
            tension: 40,
          }).start();
          setIsRevealed(false);
        }
      }
    });

    const resetCard = () => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      setIsRevealed(false);
    };
    
const { text, color } = formatCurrency(item.amount, item.type, item.isAdvance);

    return (
      <View className="mx-4 mb-3 relative">
        {/* Edit Button (Behind the card) */}
     <View className="absolute right-0 top-0 bottom-0 w-20 bg-green-600 rounded-r-2xl items-center justify-center">

          <TouchableOpacity
            onPress={() => {
              openEditModal(item);
              resetCard();
            }}
            className="items-center justify-center flex-1 w-full"
          >
            <Ionicons name="create-outline" size={24} color="white" />
            <Text className="text-white text-sm font-medium mt-1">Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Main Card */}
        <Animated.View
          style={[
            {
              transform: [{ translateX }],
            },
          ]}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={isRevealed ? resetCard : undefined}
            activeOpacity={isRevealed ? 0.7 : 1}
          >
            <View className="p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${
                      item.type === "udhar"
  ? "bg-red-50"
  : item.isAdvance
  ? "bg-blue-50"
  : "bg-green-50"

                    }`}
                  >
                    <Ionicons
                      name={item.type === "udhar" ? "arrow-down" : "arrow-up"}
                      size={20}
                      color={item.type === "udhar" ? "#dc2626" : "#16a34a"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-gray-900 text-base">
                      {item.customer}
                    </Text>
                    {item.note && (
                      <Text className="text-sm text-gray-600">{item.note}</Text>
                    )}
                    <Text className="text-xs text-gray-400">{item.date}</Text>
                  </View>
                </View>
                <View className="items-end">
                  
<Text className={`font-bold text-lg ${color}`}>{text}</Text>

                  <View className={`px-3 py-1 rounded-full mt-1 ${
  item.type === "udhar"
    ? "bg-red-100"
    : item.isAdvance
    ? "bg-green-100"
    : "bg-green-100"
}`}>
  <Text className={`text-xs font-medium capitalize ${
    item.type === "udhar"
      ? "text-red-700"
      : item.isAdvance
      ? "text-green-700"
      : "text-green-700"
  }`}>
    {item.isAdvance ? "Advance" : item.type}
  </Text>
</View>

                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderTransaction = ({ item }) => (
    <SwipeableTransactionCard item={item} />
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-2">
            <Text className="text-2xl font-bold text-white leading-tight ">
              Transaction Manager
            </Text>
            <Text className="text-green-100 text-sm mt-0 leading-none">
              Manage your daily transactions
            </Text>
          </View>
          <TouchableOpacity 
            className="bg-white/20 p-2.5 rounded-2xl"
            onPress={handleSupportPress}
          >
            <Ionicons name="headset-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Transaction Form */}
        <View className="px-4 mt-4 space-y-5">
          {/* Amount Input */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-3">
                <Ionicons name="cash" size={18} color="#009145" />
              </View>
              <Text className="text-base font-bold text-gray-800">Amount</Text>
            </View>
            <TextInput
              className="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
              placeholder="Enter amount (₹)"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Transaction Type Buttons */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-3">
                <Ionicons name="swap-horizontal" size={18} color="#009145" />
              </View>
              <Text className="text-base font-bold text-gray-800">
                Transaction Type
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 py-3 px-4 rounded-xl items-center justify-center border ${
                  type === "udhar"
                    ? "bg-red-600 border-red-600"
                    : "bg-gray-50 border-gray-200"
                }`}
                onPress={() => setType("udhar")}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="arrow-down"
                    size={16}
                    color={type === "udhar" ? "white" : "#6b7280"}
                  />
                  <Text
                    className={`text-base font-medium ${
                      type === "udhar" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    Udhar
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 px-4 rounded-xl items-center justify-center border ${
                  type === "paid"
                    ? "bg-green-600 border-green-600"
                    : "bg-gray-50 border-gray-200"
                }`}
                onPress={() => setType("paid")}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="arrow-up"
                    size={16}
                    color={type === "paid" ? "white" : "#6b7280"}
                  />
                  <Text
                    className={`text-base font-medium ${
                      type === "paid" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    Paid
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Name with Suggestions */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-3">
                <Ionicons name="person" size={18} color="#009145" />
              </View>
              <Text className="text-base font-bold text-gray-800">
                Customer Name
              </Text>
            </View>
            <View className="relative">
              <TextInput
                className="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 pr-12 focus:border-[#009145]"
                placeholder="Enter customer name"
                placeholderTextColor="#9ca3af"
                value={customerName}
                onChangeText={handleCustomerNameChange}
                onFocus={() => setShowSuggestions(customerName.length > 0)}
              />
              <View className="absolute right-4 top-4">
                <Ionicons
                  name={customerExists ? "checkmark-circle" : "search"}
                  size={23}
                  color={customerExists ? "#009145" : "#9ca3af"}
                />
              </View>
            </View>

            {/* Show warning if customer doesn't exist */}
            {customerName.length > 0 &&
              !customerExists &&
              filteredSuggestions.length === 0 && (
                <View className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="warning-outline"
                      size={16}
                      color="#f59e0b"
                    />
                    <Text className="text-yellow-800 text-sm ml-2 flex-1">
                      Customer not found in database. You'll be asked to add
                      them.
                    </Text>
                  </View>
                </View>
              )}

            {/* Suggestions Dropdown */}
           {showSuggestions && filteredSuggestions.length > 0 && (
  <View className="mt-3 bg-gray-50 border border-gray-200 rounded-xl max-h-40 overflow-hidden">
    <ScrollView>
      {filteredSuggestions.map((customer, index) => (
        <TouchableOpacity
          key={index}
          className="px-4 py-3 border-b border-gray-200 last:border-b-0 flex-row items-center justify-between"
          onPress={() => selectSuggestion(customer.name)}
        >
          <View>
            <Text className="text-gray-800 text-base font-medium">
              {customer.name}
            </Text>
            <Text className="text-gray-600 text-sm">
              {customer.phone}
            </Text>
          </View>

          {/* ✅ Updated Balance + Label */}
          <View className="items-end">
            <Text className={`font-bold text-sm ${customer.balance < 0 ? "text-green-600" : "text-red-600"}`}>
              {customer.balance < 0 ? "+" : "-"}₹{Math.abs(customer.balance || 0).toLocaleString("en-IN")}
            </Text>
            <Text className={`text-xs font-medium ${customer.balance < 0 ? "text-green-700" : "text-red-700"}`}>
              {customer.balance < 0 ? "Advance" : "Udhar"}
            </Text>
          </View>

        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
)}

          </View>

          {/* Note Input */}
          <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-3">
                <Ionicons name="document-text" size={18} color="#009145" />
              </View>
              <Text className="text-base font-bold text-gray-800">Note</Text>
            </View>
            <TextInput
              className="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
              placeholder="Add a note (optional)"
              placeholderTextColor="#9ca3af"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className="w-full bg-[#009145] py-4 rounded-2xl mt-6 shadow-lg shadow-green-500/20"
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            <Text className="text-white text-center font-bold text-lg">
              Save Transaction
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions Section */}
        <View className="mt-8 mb-6">
          <View className="px-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="time" size={18} color="#009145" />
                </View>
                <Text className="text-xl font-bold text-gray-800">
                  Recent Transactions
                </Text>
              </View>
              {transactions.length > 3 && (
                <TouchableOpacity 
                  onPress={() => navigation.navigate('RecentTransactions')}
                >
                  <Text className="text-[#009145] font-medium">View All</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-sm text-gray-600 mt-1">
              {transactions.length} total transactions
            </Text>
          </View>

          {/* Swipe Instruction */}
          {transactions.length > 0 && (
            <View className="mx-4 mb-2 p-2 bg-green-50 rounded-xl border border-green-200">
  <Text className="text-green-700 text-xs text-center">
    💡 Swipe left on any transaction to edit
  </Text>
</View>

            
          )}

          <FlatList
            data={transactions.slice(0, 3)}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-10">
                <View className="bg-gray-100 p-6 rounded-2xl mb-4">
                  <Ionicons name="receipt-outline" size={48} color="#6b7280" />
                </View>
                <Text className="text-gray-500 text-center text-lg font-medium">
                  No transactions yet
                </Text>
              </View>
            }
          />
        </View>

        {/* Bottom spacing */}
        <View className="h-32" />
      </ScrollView>

      {/* Add New Customer Modal */}
      <Modal
        visible={showAddCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddCustomerModal(false)}
      >
        <View className="flex-1 bg-gray-50">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-white leading-tight">
                    Add New Customer
                  </Text>
                  <Text className="text-green-100 text-sm mt-0 leading-none">
                    Quick customer setup
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-white/20 p-3 rounded-2xl"
                  onPress={() => setShowAddCustomerModal(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="px-4 mt-4 space-y-5">
              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="person" size={18} color="#8b5cf6" />
                  </View>
                  <Text className="text-base font-bold text-gray-800">
                    Customer Name
                  </Text>
                </View>
                <TextInput
                  className="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
                  placeholder="Enter customer name"
                  placeholderTextColor="#9ca3af"
                  value={newCustomerData.name}
                  onChangeText={(text) =>
                    setNewCustomerData({ ...newCustomerData, name: text })
                  }
                />
              </View>

              <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="call" size={18} color="#3b82f6" />
                  </View>
                  <Text className="text-base font-bold text-gray-800">
                    Phone Number
                  </Text>
                </View>
                <TextInput
                  className="w-full px-4 py-3 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
                  placeholder="Enter phone number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  value={newCustomerData.phone}
                  onChangeText={(text) =>
                    setNewCustomerData({ ...newCustomerData, phone: text })
                  }
                />
              </View>

              <TouchableOpacity
                className="w-full bg-[#009145] py-4 rounded-2xl mt-6 shadow-lg shadow-green-500/20"
                onPress={handleAddNewCustomer}
                activeOpacity={0.9}
              >
                <Text className="text-white text-center font-bold text-lg">
                  Add Customer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full border border-gray-300 py-4 rounded-2xl mt-3 mb-6"
                onPress={() => setShowAddCustomerModal(false)}
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
// Edit Transaction Modal (continued)
<Modal
  animationType="slide"
  transparent={true}
  visible={editModalVisible}
  onRequestClose={() => setEditModalVisible(false)}
>
  <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
    <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-2xl font-bold text-gray-900">Edit Transaction</Text>
        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-2">Customer Name</Text>
          <TextInput
            value={editFormData.customer}
            onChangeText={(text) => setEditFormData({ ...editFormData, customer: text })}
            placeholder="Enter customer name"
            className="border border-gray-300 rounded-2xl p-4 text-base"
          />
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-2">Amount</Text>
          <TextInput
            value={editFormData.amount}
            onChangeText={(text) => setEditFormData({ ...editFormData, amount: text })}
            placeholder="Enter amount"
            keyboardType="numeric"
            className="border border-gray-300 rounded-2xl p-4 text-base"
          />
        </View>

        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-2">Note (Optional)</Text>
          <TextInput
            value={editFormData.note}
            onChangeText={(text) => setEditFormData({ ...editFormData, note: text })}
            placeholder="Enter note"
            className="border border-gray-300 rounded-2xl p-4 text-base"
            multiline
            numberOfLines={3}
          />
        </View>

        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Transaction Type</Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => setEditFormData({ ...editFormData, type: 'udhar' })}
              className={`flex-1 py-4 rounded-2xl border-2 ${editFormData.type === 'udhar' ? 'bg-red-50 border-red-500' : 'bg-white border-gray-300'}`}
            >
              <Text className={`text-center font-semibold ${editFormData.type === 'udhar' ? 'text-red-700' : 'text-gray-700'}`}>Udhar (Credit)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setEditFormData({ ...editFormData, type: 'paid' })}
              className={`flex-1 py-4 rounded-2xl border-2 ${editFormData.type === 'paid' ? 'bg-green-50 border-green-500' : 'bg-white border-gray-300'}`}
            >
              <Text className={`text-center font-semibold ${editFormData.type === 'paid' ? 'text-green-700' : 'text-gray-700'}`}>Paid (Debit)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View className="flex-row space-x-3 mt-6">
        <TouchableOpacity
          onPress={() => setEditModalVisible(false)}
          className="flex-1 bg-gray-100 py-4 rounded-2xl"
        >
          <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleEditTransaction}
          className="flex-1 bg-[#009145] py-4 rounded-2xl"
        >
          <Text className="text-center text-white font-semibold">Update Transaction</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
</View>
  );
}