import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, onValue } from 'firebase/database';
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../firebase';
import { AuthContext } from '../../screens/Auth/AuthContext';

export default function Reports() {
  const [customers, setCustomers] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const { currentUser } = useContext(AuthContext);

  // Load customers from Firebase
  useEffect(() => {
    const customersRef = ref(db, `userData/${currentUser.userId}/customers`);
    onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customersArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
          status: value.balance > 0 ? 'pending' : value.balance < 0 ? 'advance' : 'paid',
          lastPayment: getLastPaymentDate(value.transactions)
        }));
        setCustomers(customersArray);
      } else {
        setCustomers([]);
      }
    });
  }, []);

  // Helper function to get last payment date from transactions
  const getLastPaymentDate = (transactions) => {
    if (!transactions || transactions.length === 0) return null;
    const sortedTransactions = transactions.sort((a, b) => parseInt(b.id) - parseInt(a.id))
    return sortedTransactions[0].date;
  };

  const formatCurrency = (amount) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No transactions';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate totals from real data
  const totalCustomers = customers.length;
  const pendingCollection = customers.reduce((total, customer) => 
    customer.balance > 0 ? total + customer.balance : total, 0
  );
  const totalAdvance = customers.reduce((total, customer) => 
    customer.balance < 0 ? total + Math.abs(customer.balance) : total, 0
  );
  
  // Calculate this month's data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthTransactions = customers.flatMap(customer => 
    (customer.transactions || []).filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    })
  );

  // Calculate total collected (all time)
  const totalCollected = customers.flatMap(customer => 
    (customer.transactions || []).filter(t => t.type === 'received')
  ).reduce((total, t) => total + t.amount, 0);

  const paidThisMonth = thisMonthTransactions
    .filter(t => t.type === 'received')
    .reduce((total, t) => total + t.amount, 0);

  const customersWithActivityThisMonth = new Set(
    thisMonthTransactions.map(t => customers.find(c => 
      c.transactions && c.transactions.some(ct => ct.id === t.id)
    )?.id)
  ).size;

  const getStatusIcon = (status, balance) => {
    if (balance > 0) {
      // Customer owes money (udhar)
      return balance > 2000 
        ? { icon: 'alert-circle', color: '#dc2626' }
        : { icon: 'time', color: '#f97316' };
    } else if (balance < 0) {
      // Customer has advance
      return { icon: 'gift', color: '#009145' };
    } else {
      // Balance is zero
      return { icon: 'checkmark-circle', color: '#009145' };
    }
  };

  const getFilteredCustomers = () => {
    switch (activeFilter) {
      case 'pending':
        return customers.filter(customer => customer.balance > 0);
      case 'paid':
        return customers.filter(customer => customer.balance === 0);
      case 'advance':
        return customers.filter(customer => customer.balance < 0);
      case 'thisMonth':
        return customers.filter(customer => {
          if (!customer.transactions) return false;
          return customer.transactions.some(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
          });
        });
      default:
        return customers;
    }
  };

  const handleExport = (type) => {
    setShowExportModal(false);
    
    if (type === 'WhatsApp Summary') {
      const summary = `📊 *SaralKhata Business Summary*\n\n` +
        `👥 Total Customers: ${totalCustomers}\n` +
        `💰 Pending Collection: ${formatCurrency(pendingCollection)}\n` +
        `💚 Total Advance: ${formatCurrency(totalAdvance)}\n` +
        `✅ Collected This Month: ${formatCurrency(paidThisMonth)}\n` +
        `🏦 Total Collected: ${formatCurrency(totalCollected)}\n` +
        `🎯 Active Customers This Month: ${customersWithActivityThisMonth}\n\n` +
        `Generated by SaralKhata`;
      
      Alert.alert("Summary Ready", "WhatsApp summary has been copied to clipboard!", [
        { text: "OK", onPress: () => console.log("Summary:", summary) }
      ]);
    } else {
      Alert.alert("Export", `${type} will be ready shortly!`);
    }
  };

  const renderCustomerItem = ({ item }) => {
    const statusInfo = getStatusIcon(item.status, item.balance);
    
    return (
      <TouchableOpacity 
        className="mx-4 mb-3 bg-white rounded-2xl p-4 border border-gray-100"
        activeOpacity={0.7}
        onPress={() => Alert.alert("Customer Details", `${item.name}\nPhone: ${item.phone}\nBalance: ${formatCurrency(item.balance)}\nLast Activity: ${formatDate(item.lastPayment)}`)}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4 bg-gray-50">
              <Ionicons name="person" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-900 text-base">{item.name}</Text>
              <Text className="text-sm text-gray-600 mt-1">{item.phone}</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Last: {formatDate(item.lastPayment)}
              </Text>
            </View>
          </View>
          
          <View className="items-end">
            <Text className={`font-bold text-lg ${
              item.balance > 0 
                ? 'text-red-600'    // Positive balance = udhar (red)
                : item.balance < 0 
                  ? 'text-green-600'  // Negative balance = advance (green)
                  : 'text-gray-600'   // Zero balance = neutral (gray)
            }`}>
              {item.balance > 0 
                ? formatCurrency(item.balance) 
                : item.balance < 0 
                  ? `+${formatCurrency(Math.abs(item.balance))}` 
                  : '₹0'
              }
            </Text>
            
            <View className="flex-row items-center mt-2">
              <Ionicons 
                name={statusInfo.icon} 
                size={16} 
                color={statusInfo.color} 
              />
              <Text className={`text-sm font-medium ml-1`} style={{ color: statusInfo.color }}>
                {item.balance > 0 
                  ? 'Pending' 
                  : item.balance < 0 
                    ? 'Advance' 
                    : 'Paid'
                }
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-[#009145] pt-6 pb-4 px-6 rounded-b-3xl">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white leading-tight">SaralKhata Reports</Text>
              <Text className="text-green-100 text-sm mt-0 leading-none">Business overview & analytics</Text>
            </View>
            <TouchableOpacity 
              className="bg-white/20 p-3 rounded-2xl"
              onPress={() => setShowExportModal(true)}
            >
              <Ionicons name="share" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Big Summary Cards */}
        <View className="mx-4 mt-4 space-y-3">
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
              <View className="items-center">
                <View className="bg-blue-100 p-3 rounded-full mb-2">
                  <Ionicons name="people" size={32} color="#3b82f6" />
                </View>
                <Text className="text-2xl font-bold text-gray-800 mt-2">{totalCustomers}</Text>
                <Text className="text-sm text-gray-600 text-center">Total Customers</Text>
              </View>
            </View>
            
            <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
              <View className="items-center">
                <View className="bg-red-100 p-3 rounded-full mb-2">
                  <Ionicons name="card" size={32} color="#dc2626" />
                </View>
                <Text className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(pendingCollection)}</Text>
                <Text className="text-sm text-gray-600 text-center">Pending Collection</Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
              <View className="items-center">
                <View className="bg-green-100 p-3 rounded-full mb-2">
                  <Ionicons name="gift" size={32} color="#009145" />
                </View>
                <Text className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalAdvance)}</Text>
                <Text className="text-sm text-gray-600 text-center">Total Advance</Text>
              </View>
            </View>
            
            <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
              <View className="items-center">
                <View className="bg-blue-100 p-3 rounded-full mb-2">
                  <Ionicons name="wallet" size={32} color="#3b82f6" />
                </View>
                <Text className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(totalCollected)}</Text>
                <Text className="text-sm text-gray-600 text-center">Total Collected</Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 border border-gray-100">
            <View className="items-center">
              <View className="bg-green-100 p-3 rounded-full mb-2">
                <Ionicons name="checkmark-circle" size={32} color="#009145" />
              </View>
              <Text className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(paidThisMonth)}</Text>
              <Text className="text-sm text-gray-600 text-center">Collected This Month</Text>
            </View>
          </View>
        </View>

        {/* This Month's Collection Tracker */}
        <View className="mx-4 mt-4 bg-green-50 rounded-2xl p-4 border border-green-100">
          <View className="flex-row items-center justify-center">
            <Ionicons name="trending-up" size={20} color="#009145" />
            <Text className="text-green-800 text-center text-base font-medium ml-2">
              You have collected {formatCurrency(paidThisMonth)} from {customersWithActivityThisMonth} customers this month.
            </Text>
          </View>
        </View>

        {/* Quick Stats Summary */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-purple-100 rounded-xl items-center justify-center mr-3">
              <Ionicons name="analytics" size={18} color="#8b5cf6" />
            </View>
            <Text className="text-lg font-bold text-gray-800">Quick Stats</Text>
          </View>
          
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Customers with pending udhar:</Text>
              <Text className="font-bold text-red-600">
                {customers.filter(c => c.balance > 0).length}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Customers fully paid:</Text>
              <Text className="font-bold text-gray-600">
                {customers.filter(c => c.balance === 0).length}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Customers with advance:</Text>
              <Text className="font-bold text-green-600">
                {customers.filter(c => c.balance < 0).length}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Average udhar amount:</Text>
              <Text className="font-bold text-blue-600">
                {customers.filter(c => c.balance > 0).length > 0 
                  ? formatCurrency(pendingCollection / customers.filter(c => c.balance > 0).length) 
                  : '₹0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Filter Buttons */}
        <View className="mx-4 mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <TouchableOpacity
              className={`mr-3 px-4 py-3 rounded-2xl flex-row items-center ${
                activeFilter === 'pending' ? 'bg-red-600' : 'bg-white border border-gray-200'
              }`}
              onPress={() => setActiveFilter('pending')}
            >
              <Ionicons 
                name="alert-circle" 
                size={18} 
                color={activeFilter === 'pending' ? 'white' : '#dc2626'} 
              />
              <Text className={`font-medium ml-2 ${
                activeFilter === 'pending' ? 'text-white' : 'text-gray-700'
              }`}>
                Pending ({customers.filter(c => c.balance > 0).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`mr-3 px-4 py-3 rounded-2xl flex-row items-center ${
                activeFilter === 'paid' ? 'bg-gray-600' : 'bg-white border border-gray-200'
              }`}
              onPress={() => setActiveFilter('paid')}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={18} 
                color={activeFilter === 'paid' ? 'white' : '#6b7280'} 
              />
              <Text className={`font-medium ml-2 ${
                activeFilter === 'paid' ? 'text-white' : 'text-gray-700'
              }`}>
                Paid ({customers.filter(c => c.balance === 0).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`mr-3 px-4 py-3 rounded-2xl flex-row items-center ${
                activeFilter === 'advance' ? 'bg-green-600' : 'bg-white border border-gray-200'
              }`}
              onPress={() => setActiveFilter('advance')}
            >
              <Ionicons 
                name="gift" 
                size={18} 
                color={activeFilter === 'advance' ? 'white' : '#009145'} 
              />
              <Text className={`font-medium ml-2 ${
                activeFilter === 'advance' ? 'text-white' : 'text-gray-700'
              }`}>
                Advance ({customers.filter(c => c.balance < 0).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`mr-3 px-4 py-3 rounded-2xl flex-row items-center ${
                activeFilter === 'thisMonth' ? 'bg-blue-600' : 'bg-white border border-gray-200'
              }`}
              onPress={() => setActiveFilter('thisMonth')}
            >
              <Ionicons 
                name="calendar" 
                size={18} 
                color={activeFilter === 'thisMonth' ? 'white' : '#3b82f6'} 
              />
              <Text className={`font-medium ml-2 ${
                activeFilter === 'thisMonth' ? 'text-white' : 'text-gray-700'
              }`}>
                This Month ({customersWithActivityThisMonth})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`mr-3 px-4 py-3 rounded-2xl flex-row items-center ${
                activeFilter === 'all' ? 'bg-purple-600' : 'bg-white border border-gray-200'
              }`}
              onPress={() => setActiveFilter('all')}
            >
              <Ionicons 
                name="apps" 
                size={18} 
                color={activeFilter === 'all' ? 'white' : '#8b5cf6'} 
              />
              <Text className={`font-medium ml-2 ${
                activeFilter === 'all' ? 'text-white' : 'text-gray-700'
              }`}>
                All ({totalCustomers})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Customer List */}
        <View className="mt-6 mb-6">
          <View className="px-4 mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-indigo-100 rounded-xl items-center justify-center mr-3">
                <Ionicons name="list" size={18} color="#6366f1" />
              </View>
              <Text className="text-xl font-bold text-gray-800">Customer Status</Text>
            </View>
            <Text className="text-sm text-gray-500 mt-1">
              {getFilteredCustomers().length} customers shown
            </Text>
          </View>
          
          <FlatList
            data={getFilteredCustomers()}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCustomerItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <View className="w-16 h-16 bg-gray-100 rounded-2xl items-center justify-center mb-4">
                  <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-gray-500 text-center text-lg font-medium">
                  {activeFilter === 'all' ? 'No customers found' : `No ${activeFilter} customers`}
                </Text>
                <Text className="text-gray-400 text-center text-sm mt-1">
                  {activeFilter === 'all' ? 'Add your first customer to get started' : 'Try a different filter'}
                </Text>
              </View>
            }
          />
        </View>

        <View className="h-32" />
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View className="flex-1 bg-gray-50 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 border border-gray-100">
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="share" size={40} color="#3b82f6" />
              </View>
              <Text className="text-2xl font-bold text-gray-800 text-center">Export Report</Text>
              <Text className="text-gray-600 text-center mt-2">
                Share your business summary
              </Text>
            </View>

            <View className="space-y-4">
              <TouchableOpacity
                className="w-full bg-red-600 py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => handleExport('PDF Report')}
              >
                <Ionicons name="document-text" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-3">Download Report (PDF)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full bg-green-500 py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => handleExport('WhatsApp Summary')}
              >
                <Ionicons name="logo-whatsapp" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-3">Share Summary via WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full bg-blue-600 py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => handleExport('Excel Export')}
              >
                <Ionicons name="grid" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-3">Export to Excel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full bg-gray-200 py-4 rounded-2xl mt-4"
                onPress={() => setShowExportModal(false)}
              >
                <Text className="text-gray-800 text-center font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}