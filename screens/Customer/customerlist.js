import React, { useState, useRef, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, Modal, ScrollView, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, set, onValue, update } from 'firebase/database';
import { db } from '../../firebase';
import { AuthContext } from '../../screens/Auth/AuthContext';
import { sendWhatsAppMessage } from '../whatsapp';
import { remove } from 'firebase/database'; 


export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [confirmationStep, setConfirmationStep] = useState(0);
const { currentUser } = useContext(AuthContext);


const handleDeleteCustomer = (customer) => {
  if (customer.balance !== 0) {
    return Alert.alert("Cannot Delete", "Please clear the udhar before deleting this customer.");
  }

  Alert.alert(
    "Delete Customer",
    `Are you sure you want to delete ${customer.name}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const customerRef = ref(db, `userData/${currentUser.userId}/customers/${customer.id}`);
          remove(customerRef)
            .then(() => {
              setShowDetailModal(false);
              Alert.alert("Success", `${customer.name} has been deleted.`);
            })
            .catch((error) => {
              Alert.alert("Error", "Failed to delete customer: " + error.message);
            });
        }
      }
    ]
  );
};

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    balance: '',
    description: ''
  });

  // Filter customers based on search text
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
    customer.phone.includes(searchText)
  );

  useEffect(() => {
const customersRef = ref(db, `userData/${currentUser.userId}/customers`);
    onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customersArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value
        }));
        setCustomers(customersArray);
      } else {
        setCustomers([]);
      }
    });
  
   const transactionsRef = ref(db, `userData/${currentUser.userId}/transactions`);
onValue(transactionsRef, (snapshot) => {
  const data = snapshot.val();
  if (data) {
    const transactionsArray = Object.entries(data).map(([id, value]) => ({
      id,
      ...value
    }));

    // ✅ Add isAdvance based on cumulative balance
    const customerBalances = {};
    const enhancedTransactions = [];

    transactionsArray
      .sort((a, b) => parseInt(a.id) - parseInt(b.id)) // ascending order
      .forEach((tx) => {
        const customer = tx.customer;
        if (!customerBalances[customer]) customerBalances[customer] = 0;

        let isAdvance = false;
        const currentBalance = customerBalances[customer];

        if (tx.type === "udhar" || tx.type === "given") {
          customerBalances[customer] += tx.amount;
        } else if (tx.type === "paid" || tx.type === "received") {
          if (currentBalance <= 0) isAdvance = true;
          customerBalances[customer] -= tx.amount;
        }

        enhancedTransactions.push({
          ...tx,
          isAdvance: tx.isAdvance ?? isAdvance
        });
      });

    setTransactions(enhancedTransactions);
  } else {
    setTransactions([]);
  }
});

}, []);
const updateCustomerBalance = async (customerId, amount, type) => {
  const customerRef = ref(db, `userData/${currentUser.userId}/customers/${customerId}`);

  onValue(customerRef, (snapshot) => {
    const customerData = snapshot.val();
    if (!customerData) return;

    let currentBalance = customerData.balance || 0;
    let updatedBalance = currentBalance;

    if (type === 'udhar' || type === 'given') {
      updatedBalance += amount;
    } else if (type === 'received') {
      updatedBalance -= amount;
    }

    update(customerRef, { balance: updatedBalance });
  }, { onlyOnce: true });
};

  const handleAddCustomer = async () => {
  if (!newCustomer.name || !newCustomer.phone || !newCustomer.balance) {
    return Alert.alert("Error", "Name, phone and amount are required");
  }

  const customerId = Date.now().toString();
  const transactionId = Date.now().toString(); // You can make it more unique if needed

  // Step 1: Create Customer
  const customer = {
    name: newCustomer.name,
    phone: newCustomer.phone,
    balance: parseFloat(newCustomer.balance),
    createdDate: new Date().toISOString()
  };

  try {
    await set(ref(db, `userData/${currentUser.userId}/customers/${customerId}`), customer);

    // Step 2: Add Initial Transaction globally
    await set(ref(db, `userData/${currentUser.userId}/transactions/${transactionId}`), {
      customerId,
      customer: newCustomer.name,
      amount: parseFloat(newCustomer.balance),
      type: 'given',
      description: newCustomer.description || 'Initial udhar',
      date: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').reverse().join('-'),
      timestamp: new Date().toISOString()
    });
    await updateCustomerBalance(customerId, parseFloat(newCustomer.balance), 'given');


    setNewCustomer({ name: '', phone: '', balance: '', description: '' });
    setShowAddModal(false);
    Alert.alert("Success", "Customer added successfully");
  } catch (error) {
    Alert.alert("Error", "Failed to add customer: " + error.message);
  }
};

const confirmClearDues = async () => {
  if (!selectedCustomer) return;

  const clearedAmount = selectedCustomer.balance;
  const transactionId = Date.now().toString();

  const transaction = {
    id: transactionId, // ✅ Include the id inside the object
    customerId: selectedCustomer.id,
    customer: selectedCustomer.name,
    date: new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-'),
    amount: clearedAmount,
    type: 'received',
    description: 'Udhar cleared',
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Update balance
    await update(ref(db, `userData/${currentUser.userId}/customers/${selectedCustomer.id}`), {
      balance: 0
    });

    // 2. Add the transaction including its `id`
    await set(ref(db, `userData/${currentUser.userId}/transactions/${transactionId}`), transaction);

    setShowClearModal(false);
    setSelectedCustomer(null);
    setConfirmationStep(0);

    Alert.alert("Success", `All udhar cleared for ${selectedCustomer.name}`);
  } catch (error) {
    Alert.alert("Error", "Failed to clear udhar: " + error.message);
  }
};

  const handleClearDues = (customer) => {
    setSelectedCustomer(customer);
    setConfirmationStep(0);
    setShowClearModal(true);
  };

  const handleCustomerDetail = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const nextConfirmationStep = () => setConfirmationStep(1);

  const SlideToConfirm = ({ onConfirm }) => {
    const sliderWidth = 280;
    const buttonSize = 60;
    const maxSlide = sliderWidth - buttonSize;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Create progress value for interpolation
    const progress = slideAnim.interpolate({
      inputRange: [0, maxSlide],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          slideAnim.setOffset(slideAnim._value);
        },
        onPanResponderMove: (_, gestureState) => {
          const newValue = Math.max(0, Math.min(gestureState.dx, maxSlide));
          slideAnim.setValue(newValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          slideAnim.flattenOffset();
          const finalPosition = Math.max(0, Math.min(gestureState.dx, maxSlide));
          if (finalPosition > maxSlide * 0.8) {
            Animated.timing(slideAnim, {
              toValue: maxSlide,
              duration: 200,
              useNativeDriver: false,
            }).start(() => onConfirm());
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
          }
        },
      })
    ).current;

    return (
      <View className="items-center mb-6">
        <Text className="text-gray-600 text-sm mb-4 text-center">
          Slide to confirm clearing udhar
        </Text>
        
        <View 
          className="relative bg-gray-200 rounded-full"
          style={{ width: sliderWidth, height: buttonSize }}
        >
          <Animated.View
            className="absolute top-0 left-0 h-full bg-red-500 rounded-full"
            style={{
              width: slideAnim.interpolate({
                inputRange: [0, maxSlide],
                outputRange: [buttonSize, sliderWidth],
                extrapolate: 'clamp',
              }),
            }}
          />
          
          <View className="absolute inset-0 items-center justify-center">
            <Animated.Text 
              className="font-bold text-base"
              style={{ 
                color: progress.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: ['#6b7280', '#6b7280', 'white'],
                })
              }}
            >
              Slide to Clear Udhar
            </Animated.Text>
          </View>
          
          <Animated.View
            className="absolute top-0 left-0 bg-white rounded-full shadow-lg items-center justify-center border-2 border-gray-300"
            style={{
              width: buttonSize,
              height: buttonSize,
              transform: [{ translateX: slideAnim }],
            }}
            {...panResponder.panHandlers}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#6b7280" 
            />
          </Animated.View>
        </View>
      </View>
    );
  };

  const formatCurrency = (amount, type = 'udhar', isAdvance = false) => {
  const prefix = type === 'udhar' ? '-' : '+';
  const formatted = `${prefix}₹${Math.abs(amount).toLocaleString('en-IN')}`;

  let color = 'text-gray-600';
  if (type === 'udhar') color = 'text-red-600';
  if (type === 'received') color = 'text-green-600';
  if (isAdvance) color = 'text-green-500';

  return { text: formatted, color };
};



  const getTotalBalance = () => {
    return customers.reduce((total, customer) => total + customer.balance, 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity 
      className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 overflow-hidden"
      onPress={() => handleCustomerDetail(item)}
      activeOpacity={0.7}
    >
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4 bg-green-50">
              <Ionicons name="person" size={20} color="#009145" />
            </View>
            <View className="flex-1">
              
              <Text className="font-bold text-gray-900 text-base">{item.name}</Text>
              <Text className="text-sm text-gray-600 mt-1">{item.phone}</Text>
            <View className={`self-start px-3 py-1 rounded-full mt-2 ${item.balance < 0 ? "bg-green-100" : "bg-red-100"}`}>
  <Text className={`text-xs font-medium ${item.balance < 0 ? "text-green-700" : "text-red-700"}`}>
    {item.balance < 0 ? "Advance Amount" : "Udhar Amount"}
  </Text>
</View>

            </View>
          </View>
          <View className="items-end">
            {(() => {
  const { text, color } = formatCurrency(item.balance, item.balance > 0 ? 'udhar' : 'received');
  return <Text className={`font-bold text-lg ${color}`}>{text}</Text>;
})()}

            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                className="bg-green-500 px-3 py-1 rounded-full flex-row items-center"
                onPress={() => sendWhatsAppMessage({
  name: item.name,
  phone: item.phone,
  amount: item.balance
})}

              >
                <Ionicons name="logo-whatsapp" size={12} color="white" />
                <Text className="text-white text-xs font-medium ml-1">Send</Text>
              </TouchableOpacity>
              
              {item.balance > 0 && (
                <TouchableOpacity
                  className="bg-red-600 px-3 py-1 rounded-full"
                  onPress={() => handleClearDues(item)}
                >
                  <Text className="text-white text-xs font-medium">Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
    <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 pr-2">
          <Text className="text-2xl font-bold text-white leading-tight">
            Udhar Records
          </Text>
          <Text className="text-green-100 text-sm mt-0 leading-none">
            Manage your udhar customers
          </Text>
        </View>
        <TouchableOpacity 
          className="bg-white/20 p-2.5 rounded-2xl"
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  
  <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>


        <View className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-green-100 rounded-xl items-center justify-center mr-3">
              <Ionicons name="analytics" size={18} color="#009145" />
            </View>
            <Text className="text-lg font-bold text-gray-800">Total Udhar Amount</Text>
          </View>
         {(() => {
  const { text, color } = formatCurrency(
    getTotalBalance(),
    getTotalBalance() > 0 ? 'udhar' : 'received'
  );
  return <Text className={`text-2xl font-bold ${color}`}>{text}</Text>;
})()}

          <Text className="text-sm text-gray-600 mt-1">
            {customers.length} customers • {customers.filter(c => c.balance > 0).length} active udhar
          </Text>
        </View>

        <View className="mx-4 mt-4 bg-white rounded-2xl p-3 border border-gray-100">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mr-3">
              <Ionicons name="search" size={16} color="#8b5cf6" />
            </View>
            <Text className="text-sm font-bold text-gray-800">Search Customers</Text>
          </View>
          <View className="relative">
            <TextInput
              className="w-full px-4 py-2 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 pr-12 focus:border-[#009145]"
              placeholder="Search by name or phone..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
            />
            <View className="absolute right-3 top-2">
              <Ionicons name="search" size={20} color="#9ca3af" />
            </View>
          </View>
        </View>

        <View className="mt-6 mb-6">
          <View className="px-4 mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-indigo-100 rounded-xl items-center justify-center mr-3">
                <Ionicons name="people" size={18} color="#6366f1" />
              </View>
              <Text className="text-xl font-bold text-gray-800">All Customers</Text>
            </View>
          </View>
          
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCustomerItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <View className="w-16 h-16 bg-gray-100 rounded-2xl items-center justify-center mb-4">
                  <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-gray-500 text-center text-lg font-medium">
                  {searchText ? 'No customers found' : 'No customers added yet'}
                </Text>
                <Text className="text-gray-400 text-center text-sm mt-1">
                  {searchText ? 'Try searching with a different name' : 'Add your first udhar customer'}
                </Text>
              </View>
            }
          />
        </View>

        <View className="h-32" />
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-gray-50">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-white leading-tight">Add Udhar Customer</Text>
                  <Text className="text-green-100 text-sm mt-0 leading-none">Create new udhar entry</Text>
                </View>
                <TouchableOpacity 
                  className="bg-white/20 p-3 rounded-2xl"
                  onPress={() => setShowAddModal(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="px-4 mt-4 space-y-5">
              <View className="bg-white rounded-2xl p-3 border border-gray-100">
                <View className="flex-row items-center mb-2">
                  <View className="w-6 h-6 bg-purple-100 rounded-xl items-center justify-center mr-2">
                    <Ionicons name="person" size={16} color="#8b5cf6" />
                  </View>
                  <Text className="text-sm font-bold text-gray-800">Customer Name</Text>
                </View>
                <TextInput
                  className="w-full px-4 py-2 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
                  placeholder="Enter customer name"
                  placeholderTextColor="#9ca3af"
                  value={newCustomer.name}
                  onChangeText={(text) => setNewCustomer({...newCustomer, name: text})}
                />
              </View>

              <View className="bg-white rounded-2xl p-3 border border-gray-100">
                <View className="flex-row items-center mb-2">
                  <View className="w-6 h-6 bg-blue-100 rounded-xl items-center justify-center mr-2">
                    <Ionicons name="call" size={16} color="#3b82f6" />
                  </View>
                  <Text className="text-sm font-bold text-gray-800">Phone Number</Text>
                </View>
                <TextInput
                  className="w-full px-4 py-2 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
                  placeholder="Enter phone number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  value={newCustomer.phone}
                  onChangeText={(text) => setNewCustomer({...newCustomer, phone: text})}
                />
              </View>

              <View className="bg-white rounded-2xl p-3 border border-gray-100">
                <View className="flex-row items-center mb-2">
                  <View className="w-6 h-6 bg-green-100 rounded-xl items-center justify-center mr-2">
                    <Ionicons name="cash" size={16} color="#009145" />
                  </View>
                  <Text className="text-sm font-bold text-gray-800">Udhar Amount</Text>
                </View>
                <TextInput
                  className="w-full px-4 py-2 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
                  placeholder="Enter udhar amount (₹)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={newCustomer.balance}
                  onChangeText={(text) => setNewCustomer({...newCustomer, balance: text})}
                />
              </View>

              <View className="bg-white rounded-2xl p-3 border border-gray-100">
                <View className="flex-row items-center mb-2">
                  <View className="w-6 h-6 bg-green-100 rounded-xl items-center justify-center mr-2">
                    <Ionicons name="document-text" size={16} color="#16a34a" />
                  </View>
                  <Text className="text-sm font-bold text-gray-800">Description (Optional)</Text>
                </View>
                <TextInput
                  className="w-full px-4 py-2 text-base font-medium border border-gray-200 rounded-xl bg-gray-50 focus:border-[#009145]"
                  placeholder="What was the udhar for?"
                  placeholderTextColor="#9ca3af"
                  value={newCustomer.description}
                  onChangeText={(text) => setNewCustomer({...newCustomer, description: text})}
                />
              </View>

              <TouchableOpacity
                className="w-full bg-[#009145] py-5 rounded-3xl mt-6"
                onPress={handleAddCustomer}
                activeOpacity={0.9}
              >
                <Text className="text-white text-center font-bold text-lg">Add Udhar Customer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full border border-gray-300 py-5 rounded-3xl mt-3 mb-6"
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.9}
              >
                <Text className="text-gray-600 text-center font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View className="flex-1 bg-gray-50">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-white leading-tight">{selectedCustomer?.name}</Text>
                  <Text className="text-green-100 text-sm mt-0 leading-none">{selectedCustomer?.phone}</Text>
                </View>
                <TouchableOpacity 
                  className="bg-white/20 p-3 rounded-2xl"
                  onPress={() => setShowDetailModal(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100">
              <View className="items-center">
                <Text className="text-gray-600 text-sm">Total Udhar Amount</Text>
               {selectedCustomer && (() => {
  const { text, color } = formatCurrency(
    selectedCustomer.balance,
    selectedCustomer.balance > 0 ? 'udhar' : 'received'
  );
  return <Text className={`text-3xl font-bold ${color} mt-1`}>{text}</Text>;
})()}

              </View>
            </View>

            <View className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100">
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-blue-100 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="time" size={18} color="#3b82f6" />
                </View>
                <Text className="text-lg font-bold text-gray-800">Transaction History</Text>
              </View>
              
{transactions.filter(t => t.customerId === selectedCustomer?.id).length > 0 ? (
  transactions
    .filter(t => t.customerId === selectedCustomer?.id)
  .sort((a, b) => parseInt(b.id) - parseInt(a.id))

.map((txn) => {
  const { text, color } = formatCurrency(txn.amount, txn.type, txn.isAdvance);
  const label =
    txn.isAdvance
      ? "Advance"
      : txn.type === "udhar"
      ? "Udhar"
      : txn.type === "received"
      ? "Received"
      : txn.type === "paid"
      ? "Paid"
      : txn.type;
    

      return (
        <View
          key={txn.id}
          className="flex-row items-start justify-between py-3 border-b border-gray-100 last:border-b-0"
        >
          <View className="flex-1">
            <Text className="font-medium text-gray-900">
              {txn.description || "-"}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">
              {formatDate(txn.date)}
            </Text>
          </View>

          <View className="items-end">
            <Text className={`font-bold ${color}`}>{text}</Text>
            <View className={`mt-1 px-2 py-0.5 rounded-full 
              ${label === "Advance" || label === "Received" ? "bg-green-100" : "bg-red-100"}`}>
              <Text className={`text-xs font-medium 
                ${label === "Advance" || label === "Received" ? "text-green-700" : "text-red-700"}`}>
                {label}
              </Text>
            </View>
          </View>
        </View>
      );
    })
) : (
  <Text className="text-gray-500 text-center py-4">No transactions found</Text>
)}


            </View>

            <View className="mx-4 mt-4 space-y-3">
              <TouchableOpacity
                className="bg-green-500 py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => sendWhatsAppMessage({
  name: selectedCustomer?.name,
  phone: selectedCustomer?.phone,
  amount: selectedCustomer?.balance
})}

              >
                <Ionicons name="logo-whatsapp" size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Send WhatsApp Reminder</Text>
              </TouchableOpacity>
              
              {selectedCustomer?.balance > 0 && (
                <TouchableOpacity
                  className="bg-red-600 py-4 rounded-2xl"
                  onPress={() => {
                    setShowDetailModal(false);
                    setTimeout(() => handleClearDues(selectedCustomer), 300);
                  }}
                >
                  <Text className="text-white text-center font-bold text-lg">Clear All Udhar</Text>
                </TouchableOpacity>
              )}
              {selectedCustomer?.balance === 0 && (
  <TouchableOpacity
    className="bg-gray-800 py-4 rounded-2xl"
    onPress={() => handleDeleteCustomer(selectedCustomer)}
  >
    <Text className="text-white text-center font-bold text-lg">Delete Customer</Text>
  </TouchableOpacity>
)}

            </View>

            <View className="h-32" />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showClearModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClearModal(false)}
      >
        <View className="flex-1 bg-gray-50 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 border border-gray-100">
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="warning" size={40} color="#dc2626" />
              </View>
              <Text className="text-2xl font-bold text-gray-800 text-center">Clear All Udhar</Text>
              <Text className="text-gray-600 text-center mt-2">
                Are you sure you want to clear all udhar for
              </Text>
              <Text className="text-xl font-bold text-gray-800 text-center mt-1">
                {selectedCustomer?.name}?
              </Text>
            </View>

            <View className="bg-gray-50 rounded-2xl p-4 mb-6">
              <Text className="text-center text-gray-600 text-sm">Current Udhar Amount</Text>
              {selectedCustomer && (() => {
  const { text, color } = formatCurrency(
    selectedCustomer.balance,
    selectedCustomer.balance > 0 ? 'udhar' : 'received'
  );
  return <Text className={`text-center text-3xl font-bold mt-1 ${color}`}>{text}</Text>;
})()}

            </View>

            {confirmationStep === 0 ? (
              <>
                <View className="mb-6">
                  <Text className="text-center text-gray-600 text-base mb-4 leading-6">
                    This action will permanently clear all outstanding udhar for this customer. 
                    This cannot be undone.
                  </Text>
                  <View className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                    <View className="flex-row items-center">
                      <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                      <Text className="text-yellow-800 font-medium ml-2">
                        Make sure you have received the payment
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 bg-gray-200 py-4 rounded-2xl"
                    onPress={() => setShowClearModal(false)}
                  >
                    <Text className="text-gray-800 text-center font-bold text-lg">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-[#009145] py-4 rounded-2xl"
                    onPress={nextConfirmationStep}
                  >
                    <Text className="text-white text-center font-bold text-lg">Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <SlideToConfirm onConfirm={confirmClearDues} />
                <TouchableOpacity
                  className="bg-gray-200 py-4 rounded-2xl"
                  onPress={() => setConfirmationStep(0)}
                >
                  <Text className="text-gray-800 text-center font-bold text-lg">Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}