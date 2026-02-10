import React, { useState, useEffect, useContext, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Animated, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, onValue, off, update } from "firebase/database";
import { db } from "../../firebase";
import { AuthContext } from "../../screens/Auth/AuthContext";

export default function RecentTransactions({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState({
    customer: "",
    amount: "",
    note: "",
    type: "udhar"
  });
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [uniqueCustomers, setUniqueCustomers] = useState([]);
  const { currentUser } = useContext(AuthContext);

  // Month options
  const monthOptions = [
    { value: "all", label: "All Months" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
  ];

  // Date range options
  const dateRangeOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last7days", label: "Last 7 Days" },
    { value: "last30days", label: "Last 30 Days" },
    { value: "thisWeek", label: "This Week" },
    { value: "lastWeek", label: "Last Week" },
    { value: "thisMonth", label: "This Month" },
    { value: "lastMonth", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
  ];

  // Transaction type options
  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "udhar", label: "Udhar (Credit)" },
    { value: "paid", label: "Paid (Debit)" },
  ];
useEffect(() => {
  if (!currentUser) return;

  const transactionsRef = ref(db, `userData/${currentUser.userId}/transactions`);
  const transactionsListener = onValue(transactionsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const transactionsArray = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));

      // 🧠 Enhance transactions with isAdvance logic
      const customerBalances = {};
      const enhancedTransactions = [];

      transactionsArray
       .sort((a, b) => parseInt(b.id) - parseInt(a.id))
        .forEach((tx) => {
          const customer = tx.customer;
          if (!customerBalances[customer]) customerBalances[customer] = 0;

          const currentBalance = customerBalances[customer];
          let isAdvance = false;

          if (tx.type === 'udhar') {
            customerBalances[customer] += tx.amount;
          } else if (tx.type === 'paid') {
            if (currentBalance <= 0) {
              isAdvance = true;
            }
            customerBalances[customer] -= tx.amount;
          }
enhancedTransactions.push({
  ...tx,
  isAdvance: tx.isAdvance ?? isAdvance, // ✅ use stored isAdvance if available
});

        });
      setTransactions(enhancedTransactions);

      // 🔍 Update unique customer list for filters
      const customers = [...new Set(enhancedTransactions.map(t => t.customer))];
      setUniqueCustomers(customers);
    }
  });

  return () => off(transactionsRef);
}, [currentUser]);


  // Apply filters whenever transactions or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [transactions, selectedMonth, selectedCustomer, selectedType, selectedDateRange, customDateRange]);

  // Helper function to get date range boundaries
  const getDateRangeBoundaries = (rangeType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (rangeType) {
      case "today":
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      
      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: yesterday,
          end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      
      case "last7days":
        return {
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now
        };
      
      case "last30days":
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now
        };
      
      case "thisWeek":
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        return {
          start: thisWeekStart,
          end: now
        };
      
      case "lastWeek":
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return {
          start: lastWeekStart,
          end: lastWeekEnd
        };
      
      case "thisMonth":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: now
        };
      
      case "lastMonth":
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        return {
          start: lastMonthStart,
          end: lastMonthEnd
        };
      
      case "custom":
        if (customDateRange.startDate && customDateRange.endDate) {
          const startDate = new Date(customDateRange.startDate);
          const endDate = new Date(customDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          return {
            start: startDate,
            end: endDate
          };
        }
        return null;
      
      default:
        return null;
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by month (keep existing logic)
    if (selectedMonth !== "all") {
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.timestamp);
        return transactionDate.getMonth() === parseInt(selectedMonth);
      });
    }

    // Filter by date range
    if (selectedDateRange !== "all") {
      const dateRange = getDateRangeBoundaries(selectedDateRange);
      if (dateRange) {
        filtered = filtered.filter(transaction => {
          const transactionDate = new Date(transaction.timestamp);
          return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
        });
      }
    }

    // Filter by customer
    if (selectedCustomer !== "all") {
      filtered = filtered.filter(transaction => 
        transaction.customer === selectedCustomer
      );
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(transaction => 
        transaction.type === selectedType
      );
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedCustomer("all");
    setSelectedType("all");
    setSelectedDateRange("all");
    setCustomDateRange({ startDate: "", endDate: "" });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedMonth !== "all") count++;
    if (selectedCustomer !== "all") count++;
    if (selectedType !== "all") count++;
    if (selectedDateRange !== "all") count++;
    return count;
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
        // Keep original timestamp and date
        timestamp: selectedTransaction.timestamp,
        date: selectedTransaction.date
      };

      await update(ref(db, `userData/${currentUser.userId}/transactions/${selectedTransaction.id}`), updates);
      
      setEditModalVisible(false);
      setSelectedTransaction(null);
      Alert.alert("Success", "Transaction updated successfully!");
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Error", "Failed to update transaction. Please try again.");
    }
  };

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
          translateX.setValue(Math.max(gestureState.dx, -80)); // clamp
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

    return (
      <View className="mx-4 mb-3 mt-2 relative">
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
            <Text className="text-white text-xs font-medium mt-1">Edit</Text>
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
                      item.type === "udhar" ? "bg-red-50" : "bg-green-50"
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
                    <Text className="text-sm text-gray-600 mt-1">{item.note}</Text>
                    <Text className="text-xs text-gray-400 mt-1">{item.date}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text
  className={`font-bold text-lg ${
    item.type === "udhar"
      ? "text-red-600"
      : item.isAdvance
      ? "text-green-600"
      : "text-green-600"
  }`}
>
  {item.type === "udhar" ? "-" : "+"}
  {formatCurrency(item.amount)}
</Text>

                 <View className={`px-3 py-1 rounded-full mt-1 ${
  item.type === "udhar"
    ? "bg-red-100"
    : item.isAdvance
    ? "bg-green-100"
    : "bg-green-100"
}`}>

                   <Text
  className={`text-xs font-medium capitalize ${
    item.type === "udhar"
      ? "text-red-700"
      : item.isAdvance
      ? "text-green-700"
      : "text-green-700"
  }`}
>
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

  const renderFilterOption = (options, selectedValue, onSelect, title) => (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-800 mb-3">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row space-x-2">
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelect(option.value)}
              className={`px-4 py-2 rounded-full border ${
                selectedValue === option.value
                  ? "bg-[#009145] border-[#009145]"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedValue === option.value
                    ? "text-white"
                    : "text-gray-700"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-[#009145] pt-12 pb-4 px-6 rounded-b-3xl">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-center text-white">
            All Transactions
          </Text>
          <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
            <View className="relative">
              <Ionicons name="filter" size={24} color="white" />
              {getActiveFiltersCount() > 0 && (
                <View className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {getActiveFiltersCount()}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Swipe Instruction */}
      <View className="mx-4 mt-2 p-2 bg-green-50 rounded-xl border border-green-200">
        <Text className="text-green-700 text-xs text-center">
          💡 Swipe left on any transaction to edit
        </Text>
      </View>

      {/* Active Filters Indicator */}
      {getActiveFiltersCount() > 0 && (
        <View className="mx-4 mt-3 p-4 bg-green-50 rounded-2xl border border-green-200">
          <View className="space-y-2">
            <Text className="text-green-800 text-sm font-medium leading-relaxed">
              {getActiveFiltersCount()} filter(s) active • Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={clearFilters} className="self-start">
              <Text className="text-green-700 text-sm font-semibold underline">Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View className="items-center justify-center px-6 py-16">
            <View className="bg-gray-100 p-5 rounded-2xl mb-4">
              <Ionicons name="receipt-outline" size={44} color="#6b7280" />
            </View>
            <Text className="text-gray-600 text-center text-base font-medium">
              {getActiveFiltersCount() > 0 ? "No transactions match your filters." : "No transactions yet."}
            </Text>
            {getActiveFiltersCount() > 0 && (
              <TouchableOpacity onPress={clearFilters} className="mt-4">
                <Text className="text-[#009145] text-sm font-semibold underline">
                  Clear filters to show all
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <View className="bg-white rounded-t-3xl p-6 max-h-5/6">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Filter Transactions</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Date Range Filter */}
              {renderFilterOption(
                dateRangeOptions,
                selectedDateRange,
                setSelectedDateRange,
                "Filter by Date Range"
              )}

              {/* Custom Date Range Inputs */}
              {selectedDateRange === "custom" && (
                <View className="mb-6 p-4 bg-gray-50 rounded-2xl">
                  <Text className="text-base font-semibold text-gray-800 mb-3">Select Custom Date Range</Text>
                  <View className="space-y-3">
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-1">Start Date</Text>
                      <TextInput
                        value={customDateRange.startDate}
                        onChangeText={(text) => setCustomDateRange({...customDateRange, startDate: text})}
                        placeholder="YYYY-MM-DD"
                        className="border border-gray-300 rounded-xl p-3 text-base bg-white"
                      />
                    </View>
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-1">End Date</Text>
                      <TextInput
                        value={customDateRange.endDate}
                        onChangeText={(text) => setCustomDateRange({...customDateRange, endDate: text})}
                        placeholder="YYYY-MM-DD"
                        className="border border-gray-300 rounded-xl p-3 text-base bg-white"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Month Filter */}
              {renderFilterOption(
                monthOptions,
                selectedMonth,
                setSelectedMonth,
                "Filter by Month"
              )}

              {/* Customer Filter */}
              {renderFilterOption(
                [
                  { value: "all", label: "All Customers" },
                  ...uniqueCustomers.map(customer => ({
                    value: customer,
                    label: customer
                  }))
                ],
                selectedCustomer,
                setSelectedCustomer,
                "Filter by Customer"
              )}

              {/* Type Filter */}
              {renderFilterOption(
                typeOptions,
                selectedType,
                setSelectedType,
                "Filter by Type"
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row space-x-3 mt-6">
              <TouchableOpacity
                onPress={clearFilters}
                className="flex-1 bg-gray-100 py-4 rounded-2xl"
              >
                <Text className="text-center text-gray-700 font-semibold">
                  Clear All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                className="flex-1 bg-[#009145] py-4 rounded-2xl"
              >
                <Text className="text-center text-white font-semibold">
                  Apply Filters
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <View className="bg-white rounded-t-3xl p-6 max-h-5/6">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Edit Transaction</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Customer Name */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-800 mb-2">Customer Name</Text>
                <TextInput
                  value={editFormData.customer}
                  onChangeText={(text) => setEditFormData({...editFormData, customer: text})}
                  placeholder="Enter customer name"
                  className="border border-gray-300 rounded-2xl p-4 text-base"
                />
              </View>

              {/* Amount */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-800 mb-2">Amount</Text>
                <TextInput
                  value={editFormData.amount}
                  onChangeText={(text) => setEditFormData({...editFormData, amount: text})}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-2xl p-4 text-base"
                />
              </View>

              {/* Note */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-800 mb-2">Note (Optional)</Text>
                <TextInput
                  value={editFormData.note}
                  onChangeText={(text) => setEditFormData({...editFormData, note: text})}
                  placeholder="Enter note"
                  className="border border-gray-300 rounded-2xl p-4 text-base"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Transaction Type */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-800 mb-3">Transaction Type</Text>
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={() => setEditFormData({...editFormData, type: "udhar"})}
                    className={`flex-1 py-4 rounded-2xl border-2 ${
                      editFormData.type === "udhar"
                        ? "bg-red-50 border-red-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        editFormData.type === "udhar" ? "text-red-700" : "text-gray-700"
                      }`}
                    >
                      Udhar (Credit)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditFormData({...editFormData, type: "paid"})}
                    className={`flex-1 py-4 rounded-2xl border-2 ${
                      editFormData.type === "paid"
                        ? "bg-green-50 border-green-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        editFormData.type === "paid" ? "text-green-700" : "text-gray-700"
                      }`}
                    >
                      Paid (Debit)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row space-x-3 mt-6">
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                className="flex-1 bg-gray-100 py-4 rounded-2xl"
              >
                <Text className="text-center text-gray-700 font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditTransaction}
                className="flex-1 bg-[#009145] py-4 rounded-2xl"
              >
                <Text className="text-center text-white font-semibold">
                  Update Transaction
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}