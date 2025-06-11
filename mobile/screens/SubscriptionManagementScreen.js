import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const SubscriptionManagementScreen = ({ navigation, route }) => {
  const { organizationId, subscription } = route.params;
  const { 
    user, 
    fetchSubscription, 
    isValidSubscription,
    fetchSubscriptionPlans,
    fetchSubscriptionPayments,
    updateSubscriptionPlan,
    createSubscription,
    cancelSubscription
  } = useAuth();
  // State variables
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(subscription);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [error, setError] = useState(null);

  // Fetch subscription plans and payment history
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch available subscription plans using AuthContext
        const plansResult = await fetchSubscriptionPlans();
        
        if (plansResult.success && plansResult.data) {
          setPlans(plansResult.data);
        } else if (plansResult.error) {
          console.warn('Warning fetching plans:', plansResult.error.message);
        }

        // Fetch payment history using AuthContext
        const paymentsResult = await fetchSubscriptionPayments(organizationId);
        
        if (paymentsResult.success && paymentsResult.data) {
          setPaymentHistory(paymentsResult.data);
        } else if (paymentsResult.error) {
          console.warn('Warning fetching payment history:', paymentsResult.error.message);
        }
        
        // If we don't have the subscription data, fetch it using AuthContext
        if (!currentSubscription) {
          const subscriptionResult = await fetchSubscription(organizationId, true);
          
          if (subscriptionResult.success && subscriptionResult.data) {
            // Validate the subscription data
            if (isValidSubscription(subscriptionResult.data)) {
              setCurrentSubscription(subscriptionResult.data);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError(err.message || 'Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();  }, [organizationId]);
  
  // Function to handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      // Fetch all data with force refresh
      const [plansResult, paymentsResult, subscriptionResult] = await Promise.all([
        fetchSubscriptionPlans(),
        fetchSubscriptionPayments(organizationId),
        fetchSubscription(organizationId, true)
      ]);
      
      if (plansResult.success && plansResult.data) {
        setPlans(plansResult.data);
      }
      
      if (paymentsResult.success && paymentsResult.data) {
        setPaymentHistory(paymentsResult.data);
      }
      
      if (subscriptionResult.success && subscriptionResult.data) {
        if (isValidSubscription(subscriptionResult.data)) {
          setCurrentSubscription(subscriptionResult.data);
        }
      }
    } catch (err) {
      console.error('Error refreshing subscription data:', err);
      setError(err.message || 'Failed to refresh subscription data');
    } finally {
      setRefreshing(false);
    }
  };
  
  // Function to handle changing subscription plan
  const handleChangePlan = (plan) => {
    Alert.alert(
      'Change Subscription Plan',
      `Are you sure you want to switch to the ${plan.name} plan? You will be charged ${plan.price_monthly}/month.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setLoading(true);
              
              let result;
              
              // If we already have a subscription, update it
              if (currentSubscription) {
                result = await updateSubscriptionPlan(currentSubscription.id, plan.id);
              } else {
                // Otherwise create a new subscription
                result = await createSubscription(organizationId, plan.id);
              }

              if (!result.success) {
                throw new Error(result.error?.message || 'Failed to update subscription');
              }

              setCurrentSubscription(result.data);
              
              Alert.alert(
                'Success',
                `Successfully switched to the ${plan.name} plan.`
              );
            } catch (err) {
              console.error('Error updating subscription:', err);
              Alert.alert(
                'Error',
                err.message || 'Failed to update subscription. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  // Function to handle cancelling subscription
  const handleCancelSubscription = () => {
    if (!currentSubscription) {
      Alert.alert('Error', 'No active subscription to cancel.');
      return;
    }

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? Your service will continue until the end of the current billing period.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              const result = await cancelSubscription(currentSubscription.id);
              
              if (!result.success) {
                throw new Error(result.error?.message || 'Failed to cancel subscription');
              }

              setCurrentSubscription(result.data);
              
              Alert.alert(
                'Subscription Cancelled',
                'Your subscription has been cancelled. Access will remain active until the end of the current billing period.'
              );
            } catch (err) {
              console.error('Error cancelling subscription:', err);
              Alert.alert(
                'Error',
                err.message || 'Failed to cancel subscription. Please try again.'
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Function to render each payment in history
  const renderPaymentItem = ({ item }) => (
    <View style={styles.paymentItem}>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentDate}>
          {new Date(item.payment_date).toLocaleDateString()}
        </Text>
        <Text style={styles.paymentReference}>{item.reference || 'No reference'}</Text>
      </View>
      <View style={styles.paymentAmountContainer}>
        <Text style={styles.paymentAmount}>${item.amount.toFixed(2)}</Text>
        <Text style={[styles.paymentStatus, 
          item.status === 'completed' ? styles.statusCompleted : 
          item.status === 'failed' ? styles.statusFailed : styles.statusPending]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  // Render loading state
  if (loading && !currentSubscription && plans.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading subscription data...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorTitle}>Error Loading Data</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3498db']}
        />
      }
    >
      {/* Current Subscription Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Subscription</Text>
        
        {currentSubscription ? (
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <Text style={styles.subscriptionPlan}>{currentSubscription.plan_name}</Text>
              <View style={[
                styles.statusBadge, 
                currentSubscription.status === 'active' ? styles.statusActive :
                currentSubscription.status === 'canceled' ? styles.statusCanceled :
                currentSubscription.status === 'past_due' ? styles.statusPastDue :
                styles.statusTrialing
              ]}>
                <Text style={styles.statusText}>{currentSubscription.status.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.subscriptionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Start Date:</Text>
                <Text style={styles.detailValue}>
                  {currentSubscription.start_date ? new Date(currentSubscription.start_date).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Renewal Date:</Text>
                <Text style={styles.detailValue}>
                  {currentSubscription.next_billing_date ? new Date(currentSubscription.next_billing_date).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>${currentSubscription.amount_recurring?.toFixed(2) || '0.00'}/month</Text>
              </View>
            </View>
            
            {currentSubscription.status === 'active' && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelSubscription}
              >
                <Ionicons name="close-circle-outline" size={18} color="#e74c3c" style={styles.buttonIcon} />
                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.noSubscriptionContainer}>
            <Ionicons name="alert-circle-outline" size={40} color="#f39c12" />
            <Text style={styles.noSubscriptionText}>No active subscription found</Text>
          </View>
        )}
      </View>
      
      {/* Available Plans Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Plans</Text>
        
        {plans.length > 0 ? (
          plans.map(plan => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>${plan.price_monthly}/month</Text>
              </View>
              <Text style={styles.planDescription}>{plan.description}</Text>
              
              <TouchableOpacity
                style={[
                  styles.planButton,
                  currentSubscription && currentSubscription.plan_id === plan.id ? 
                    styles.currentPlanButton : styles.selectPlanButton
                ]}
                disabled={currentSubscription && currentSubscription.plan_id === plan.id}
                onPress={() => handleChangePlan(plan)}
              >
                <Text style={[
                  styles.planButtonText,
                  currentSubscription && currentSubscription.plan_id === plan.id ?
                    styles.currentPlanButtonText : styles.selectPlanButtonText
                ]}>
                  {currentSubscription && currentSubscription.plan_id === plan.id ? 
                    'Current Plan' : 'Select Plan'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.noPlansContainer}>
            <Text style={styles.noPlansText}>No subscription plans available</Text>
          </View>
        )}
      </View>
      
      {/* Payment History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        
        {paymentHistory.length > 0 ? (
          <FlatList
            data={paymentHistory}
            renderItem={renderPaymentItem}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="receipt-outline" size={40} color="#bdc3c7" />
            <Text style={styles.emptyStateText}>No payment history available</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f8fa',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f8fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f8fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionPlan: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: '#e3fcef',
  },
  statusCanceled: {
    backgroundColor: '#fbe9e7',
  },
  statusPastDue: {
    backgroundColor: '#fff8e1',
  },
  statusTrialing: {
    backgroundColor: '#e3f2fd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e74c3c',
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 6,
  },
  noSubscriptionContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noSubscriptionText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 8,
  },
  planCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
  },
  planInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  planDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  planButton: {
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectPlanButton: {
    backgroundColor: '#3498db',
  },
  currentPlanButton: {
    backgroundColor: '#ecf0f1',
  },
  planButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  selectPlanButtonText: {
    color: '#fff',
  },
  currentPlanButtonText: {
    color: '#7f8c8d',
  },
  noPlansContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noPlansText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  paymentReference: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  paymentStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: '#e3fcef',
    color: '#27ae60',
  },
  statusFailed: {
    backgroundColor: '#fbe9e7',
    color: '#e74c3c',
  },
  statusPending: {
    backgroundColor: '#fff8e1',
    color: '#f39c12',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 8,
  },
});

export default SubscriptionManagementScreen;
