import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentDetailsScreen = ({ route, navigation }) => {
  const { paymentId } = route.params;
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const { authState, isOffline } = useAuth();
  const { endpoints } = useApi();

  useEffect(() => {
    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    
    try {
      // Try to get from cache first if we're offline
      if (isOffline) {
        const cachedPayments = await AsyncStorage.getItem('cached_payments');
        if (cachedPayments) {
          const paymentsData = JSON.parse(cachedPayments);
          const paymentDetails = paymentsData.find(p => p.id === paymentId);
          if (paymentDetails) {
            setPayment(paymentDetails);
          } else {
            Alert.alert('Error', 'Payment details not found in offline cache');
          }
        }
        setLoading(false);
        return;
      }

      // Get payment details from API
      const response = await axios.get(endpoints.paymentDetail(paymentId), {
        headers: {
          'Authorization': `Token ${authState.token}`
        }
      });
      
      if (response.data) {
        // Process the data to match our UI structure
        const paymentData = response.data;
        const propertyName = paymentData.unit?.property_name || 'Unknown Property';
        const unitNumber = paymentData.unit?.unit_number || 'Unknown Unit';
        
        // Check if payment is overdue
        const today = new Date();
        const dueDate = new Date(paymentData.due_date);
        let status = paymentData.status;
        
        // If the payment is pending and past due date, mark it as overdue
        if (status === 'pending' && dueDate < today) {
          status = 'overdue';
        }
        
        const processedPayment = {
          id: paymentData.id.toString(),
          tenant_name: paymentData.tenant?.name || 'Unknown Tenant',
          tenant_id: paymentData.tenant?.id,
          property_name: propertyName,
          property_id: paymentData.unit?.property,
          unit_number: unitNumber,
          unit_id: paymentData.unit?.id,
          amount: paymentData.amount,
          due_date: paymentData.due_date,
          status: status,
          payment_method: paymentData.payment_method,
          payment_date: paymentData.payment_date,
          notes: paymentData.description,
          created_at: paymentData.created_at,
          updated_at: paymentData.updated_at,
          period_start: paymentData.period_start,
          period_end: paymentData.period_end,
          mpesa_reference: paymentData.mpesa_reference,
          receipt_number: paymentData.receipt_number,
        };
        
        setPayment(processedPayment);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payment details:', error);
      Alert.alert('Error', 'Failed to load payment details');
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#3498db';
      case 'completed': return '#2ecc71';
      case 'overdue': return '#e74c3c';
      case 'failed': return '#e74c3c';
      case 'processing': return '#f39c12';
      case 'initiated': return '#f1c40f';
      default: return '#95a5a6';
    }
  };
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'completed': return 'Paid';
      case 'overdue': return 'Overdue';
      case 'failed': return 'Failed';
      case 'processing': return 'Processing';
      case 'initiated': return 'Initiated';
      default: return status;
    }
  };
  
  const formatCurrency = (amount) => {
    return `KES ${amount.toLocaleString()}`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  const markAsPaid = async () => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot update payments while offline');
      return;
    }
    
    try {
      // Call the API to update payment status
      await axios.patch(
        endpoints.paymentDetail(paymentId), 
        {
          status: 'completed',
          payment_date: new Date().toISOString(),
          payment_method: 'cash'
        },
        {
          headers: {
            'Authorization': `Token ${authState.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update the payment state locally
      setPayment({
        ...payment,
        status: 'completed',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash'
      });
      
      // Update the cached payments
      const cachedPayments = await AsyncStorage.getItem('cached_payments');
      if (cachedPayments) {
        const paymentsData = JSON.parse(cachedPayments);
        const updatedPayments = paymentsData.map(p => {
          if (p.id === paymentId) {
            return {
              ...p,
              status: 'completed',
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'cash'
            };
          }
          return p;
        });
        
        await AsyncStorage.setItem('cached_payments', JSON.stringify(updatedPayments));
      }
      
      Alert.alert('Success', 'Payment has been marked as paid');
    } catch (error) {
      console.error('Error updating payment:', error);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }
  
  if (!payment) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>Payment not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={14} color="#fff" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.paymentIdContainer}>
          <Text style={styles.paymentIdLabel}>Payment ID</Text>
          <Text style={styles.paymentId}>#{payment.id}</Text>
        </View>
        
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(payment.status) }
        ]}>
          <Text style={styles.statusText}>{getStatusLabel(payment.status)}</Text>
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tenant Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{payment.tenant_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Property</Text>
          <Text style={styles.infoValue}>{payment.property_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Unit</Text>
          <Text style={styles.infoValue}>{payment.unit_number}</Text>
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Amount</Text>
          <Text style={styles.amountText}>{formatCurrency(payment.amount)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Due Date</Text>
          <Text style={[
            styles.infoValue,
            payment.status === 'overdue' && styles.overdueText
          ]}>{formatDate(payment.due_date)}</Text>
        </View>
        {payment.payment_date && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Date</Text>
            <Text style={styles.infoValue}>{formatDate(payment.payment_date)}</Text>
          </View>
        )}
        {payment.payment_method && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}>
              {payment.payment_method === 'mpesa' ? 'M-Pesa' : 
               payment.payment_method === 'bank_transfer' ? 'Bank Transfer' : 
               payment.payment_method === 'cash' ? 'Cash' : 
               payment.payment_method}
            </Text>
          </View>
        )}
        {payment.period_start && payment.period_end && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Period Start</Text>
              <Text style={styles.infoValue}>{formatDate(payment.period_start)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Period End</Text>
              <Text style={styles.infoValue}>{formatDate(payment.period_end)}</Text>
            </View>
          </>
        )}
        {payment.mpesa_reference && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>M-Pesa Reference</Text>
            <Text style={styles.infoValue}>{payment.mpesa_reference}</Text>
          </View>
        )}
        {payment.receipt_number && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Receipt Number</Text>
            <Text style={styles.infoValue}>{payment.receipt_number}</Text>
          </View>
        )}
      </View>
      
      {payment.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{payment.notes}</Text>
        </View>
      )}
      
      {payment.status !== 'completed' && !isOffline && (
        <TouchableOpacity 
          style={styles.markAsPaidButton} 
          onPress={markAsPaid}
        >
          <Text style={styles.markAsPaidText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offlineBanner: {
    backgroundColor: '#e74c3c',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  paymentIdContainer: {
    flex: 1,
  },
  paymentIdLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  paymentId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'right',
    flex: 2,
  },
  overdueText: {
    color: '#e74c3c',
  },
  notesText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  markAsPaidButton: {
    backgroundColor: '#2ecc71',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  markAsPaidText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentDetailsScreen;
