import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Payment Summary Modal Component
 * Displays a summary of payment statistics
 */
const PaymentSummaryModal = ({ visible, onClose, payments, formatCurrency }) => {
  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Summary</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.noDataText}>No payment data available</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Calculate summary statistics
  const totalAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const completedPayments = payments.filter(p => p.status === 'completed');
  const overduePayments = payments.filter(p => p.status === 'overdue');
  
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const completedAmount = completedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const overdueAmount = overduePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Summary</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Payments</Text>
            <Text style={styles.summaryValue}>{payments.length}</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>By Status</Text>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <View style={styles.summaryDetail}>
                <Text style={[styles.summaryValue, { color: '#3498db' }]}>
                  {formatCurrency(pendingAmount)}
                </Text>
                <Text style={styles.summaryCount}>
                  ({pendingPayments.length} payments)
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Completed</Text>
              <View style={styles.summaryDetail}>
                <Text style={[styles.summaryValue, { color: '#2ecc71' }]}>
                  {formatCurrency(completedAmount)}
                </Text>
                <Text style={styles.summaryCount}>
                  ({completedPayments.length} payments)
                </Text>
              </View>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Overdue</Text>
              <View style={styles.summaryDetail}>
                <Text style={[styles.summaryValue, { color: '#e74c3c' }]}>
                  {formatCurrency(overdueAmount)}
                </Text>
                <Text style={styles.summaryCount}>
                  ({overduePayments.length} payments)
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginVertical: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  summarySection: {
    marginTop: 16,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryDetail: {
    alignItems: 'flex-end',
  },
  summaryCount: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
});

export default PaymentSummaryModal;
