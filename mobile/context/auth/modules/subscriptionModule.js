import axios from 'axios';
import { API_BASE_URL, API_ORGANIZATIONS } from '../../../config/apiConfig';

export default function subscriptionModule(authState, setAuthState, { cacheDataForOffline, getCachedData, queueOfflineAction }) {  // Fetch the user's current subscription
  const fetchSubscription = async (organizationId, forceRefresh = false) => {
    console.log('💥 Fetching subscription for organization:', organizationId);
    console.log('💥 Are we offline:', authState.isOffline);
    
    try {
      setAuthState(prev => ({ ...prev, subscriptionLoading: true }));
      
      // If no organizationId provided, try to get it from authState
      const orgId = organizationId || 
                   (authState.currentOrganization && authState.currentOrganization.id) ||
                   (authState.user && authState.user.organization && authState.user.organization.id);
      
      if (!orgId) {
        console.log('💥 No organization ID available for subscription fetch');
        setAuthState(prev => ({ 
          ...prev, 
          subscriptionLoading: false,
          subscriptionError: 'No organization ID available'
        }));
        return {
          success: false,
          error: { message: 'No organization ID available for subscription fetch' }
        };
      }

      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cacheKey = `subscription_data_${orgId}`;
        const cachedData = await getCachedData(cacheKey);

        if (cachedData) {
          console.log('💥 Using cached subscription data');
          setAuthState(prev => ({ 
            ...prev, 
            subscription: cachedData, 
            subscriptionLoading: false,
            subscriptionError: null
          }));

          return {
            success: true,
            data: cachedData,
            fromCache: true
          };
        }
      }      if (!authState.isOffline) {
        try {
          // Using proper filter endpoint instead of a nonexistent "current" endpoint
          console.log(`💥 Making API call to ${API_ORGANIZATIONS}/subscriptions/?organization=${orgId}`);
          const response = await axios.get(`${API_ORGANIZATIONS}/subscriptions/?organization=${orgId}`);
          console.log('💥 API response structure:', JSON.stringify(Object.keys(response.data)));
          console.log('💥 API response data type:', typeof response.data);
          
          let subscription = null;
          
          // Try multiple ways to extract the subscription data
          if (response.data.results && response.data.results.length > 0) {
            console.log('💥 Found subscription in results array');
            subscription = response.data.results[0];
          } else if (response.data && typeof response.data === 'object' && response.data.id) {
            console.log('💥 Found subscription as direct object');
            subscription = response.data;
          } else if (Array.isArray(response.data) && response.data.length > 0) {
            console.log('💥 Found subscription in direct array');
            subscription = response.data[0];
          } else {
            // Try other fallback approaches
            console.log('💥 No direct subscription found, trying additional endpoints');
            
            try {
              // Try a different approach with organization ID in URL path
              // NOTE: This is only a fallback and may not work with all API configurations
              const directResponse = await axios.get(`${API_BASE_URL}/subscriptions/${orgId}/`);
              if (directResponse.data && directResponse.data.id) {
                console.log('💥 Found subscription via direct ID endpoint');
                subscription = directResponse.data;
              }
            } catch (directError) {
              console.log('💥 Direct subscription endpoint failed:', directError.message);
              // Continue to next approach
            }
          }
          
          if (subscription) {
            console.log('💥 Subscription found, validating...');
            
            if (!isValidSubscription(subscription)) {
              console.warn('Invalid subscription data:', subscription);
              throw new Error('Invalid subscription data received');
            }

            if (authState.offlineEnabled) {
              const cacheKey = `subscription_data_${orgId}`;
              await cacheDataForOffline(cacheKey, subscription);
              console.log('💥 Subscription cached for offline use');
            }

            setAuthState(prev => ({ 
              ...prev, 
              subscription: subscription, 
              subscriptionLoading: false,
              subscriptionError: null
            }));

            return {
              success: true,
              data: subscription
            };
          } else {
            console.log('💥 No subscription found for this organization');
            setAuthState(prev => ({ 
              ...prev, 
              subscription: null, 
              subscriptionLoading: false,
              subscriptionError: 'No subscription found'
            }));

            return {
              success: false,
              error: { message: 'No subscription found for this organization' }
            };
          }
        } catch (error) {
          console.error('Error fetching subscription from API:', error);
          setAuthState(prev => ({ 
            ...prev, 
            subscriptionLoading: false,
            subscriptionError: error.message,
          }));

          return {
            success: false,
            error: error.response?.data || { message: error.message }
          };
        }
      } else {
        return {
          success: false,
          error: { message: 'No internet connection and no cached subscription data available' },
          isOffline: true
        };
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData('subscription_data');
      
      if (cachedData) {
        setAuthState(prev => ({ 
          ...prev, 
          subscription: cachedData, 
          subscriptionLoading: false,
          subscriptionError: error.message
        }));
        
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          error: error.message
        };
      }
      
      // Update error state
      setAuthState(prev => ({ 
        ...prev, 
        subscriptionLoading: false,
        subscriptionError: error.message,
      }));
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Fetch available subscription plans
  const fetchSubscriptionPlans = async (forceRefresh = false) => {
    try {
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cachedData = await getCachedData('subscription_plans');
        
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            fromCache: true
          };
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        const response = await axios.get(`${API_BASE_URL}/subscriptions/plans/`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline('subscription_plans', data);
        }
        
        return {
          success: true,
          data,
          fromCache: false
        };
      }
      
      // If we're offline and have no cached data
      return {
        success: false,
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      
      // Try to get cached data as fallback
      const cachedData = await getCachedData('subscription_plans');
      
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Fetch subscription payment history
  const fetchSubscriptionPayments = async (organizationId, forceRefresh = false) => {
    try {
      // Get organization ID if not provided
      const orgId = organizationId || 
                  (authState.currentOrganization && authState.currentOrganization.id) ||
                  (authState.user && authState.user.organization && authState.user.organization.id);
      
      if (!orgId) {
        return {
          success: false,
          error: 'No organization ID available for payment history fetch'
        };
      }
      
      // If we're offline or we have cached data and aren't forcing refresh
      if ((authState.isOffline || !forceRefresh) && authState.offlineEnabled) {
        const cacheKey = `subscription_payments_${orgId}`;
        const cachedData = await getCachedData(cacheKey);
        
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            fromCache: true
          };
        }
      }
      
      // If we're online, make the API call
      if (!authState.isOffline) {
        const response = await axios.get(`${API_ORGANIZATIONS}/subscriptions/payments/?organization=${orgId}`);
        const data = response.data.results || response.data || [];
        
        // Cache the data for offline use
        if (authState.offlineEnabled) {
          await cacheDataForOffline(`subscription_payments_${orgId}`, data);
        }
        
        return {
          success: true,
          data,
          fromCache: false
        };
      }
      
      // If we're offline and have no cached data
      return {
        success: false,
        error: 'No cached data available while offline'
      };
    } catch (error) {
      console.error('Error fetching subscription payments:', error);
      
      // Try to get cached data as fallback
      const orgId = organizationId || 
                  (authState.currentOrganization && authState.currentOrganization.id) ||
                  (authState.user && authState.user.organization && authState.user.organization.id);
      
      if (orgId) {
        const cachedData = await getCachedData(`subscription_payments_${orgId}`);
        
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            fromCache: true,
            error: error.message
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Create a new subscription
  const createSubscription = async (organizationId, planId, paymentMethodId) => {
    try {
      if (authState.isOffline) {
        return {
          success: false,
          error: 'Cannot create subscription while offline'
        };
      }
      
      // Ensure we have an organization ID
      if (!organizationId) {
        organizationId = authState.currentOrganization?.id || 
                       (authState.user && authState.user.organization && authState.user.organization.id);
                       
        if (!organizationId) {
          console.error('No organization ID available for subscription creation');
          return {
            success: false,
            error: { message: 'No organization ID available for subscription creation' }
          };
        }
      }
      
      const response = await axios.post(`${API_ORGANIZATIONS}/subscriptions/`, {
        organization: organizationId,
        plan: planId,
        payment_method_id: paymentMethodId
      });
      
      // Cache the new subscription
      if (authState.offlineEnabled) {
        const cacheKey = `subscription_data_${organizationId}`;
        await cacheDataForOffline(cacheKey, response.data);
      }
      
      // Update the subscription state
      setAuthState(prev => ({ 
        ...prev, 
        subscription: response.data
      }));
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  // Update subscription plan
  const updateSubscriptionPlan = async (subscriptionId, planId) => {
    try {
      if (authState.isOffline) {
        return {
          success: false,
          error: 'Cannot update subscription while offline'
        };
      }
      
      // Need an actual subscription ID to update
      if (!subscriptionId) {
        console.error('No subscription ID provided for update');
        return {
          success: false,
          error: 'No subscription ID provided'
        };
      }
      
      const response = await axios.patch(`${API_BASE_URL}/subscriptions/${subscriptionId}/`, {
        plan: planId
      });
      
      // Get organization ID from subscription response
      const orgId = typeof response.data.organization === 'object' ? 
        response.data.organization.id : response.data.organization;
      
      // Update the subscription state
      await fetchSubscription(orgId, true);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Cancel subscription
  const cancelSubscription = async (subscriptionId, reason = '') => {
    try {
      if (authState.isOffline) {
        return {
          success: false,
          error: 'Cannot cancel subscription while offline'
        };
      }
      
      // Need an actual subscription ID to cancel
      if (!subscriptionId) {
        console.error('No subscription ID provided for cancellation');
        return {
          success: false,
          error: 'No subscription ID provided for cancellation'
        };
      }
      
      const response = await axios.post(`${API_ORGANIZATIONS}/subscriptions/${subscriptionId}/cancel/`, {
        reason
      });
      
      // Get organization ID from subscription response
      const orgId = typeof response.data.organization === 'object' ? 
        response.data.organization.id : response.data.organization;
      
      // Update cached data
      if (authState.offlineEnabled && orgId) {
        const cacheKey = `subscription_data_${orgId}`;
        await cacheDataForOffline(cacheKey, response.data);
      }
      
      // Update the subscription state if this is the current organization's subscription
      if (orgId && authState.currentOrganization && authState.currentOrganization.id === orgId) {
        setAuthState(prev => ({ 
          ...prev, 
          subscription: response.data 
        }));
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  };
  
  // Check if subscription is valid
  const isValidSubscription = (subscription) => {
    if (!subscription) {
      return false;
    }
    
    // Must have an ID
    if (!subscription.id) {
      return false;
    }
    
    // Must have a status
    if (!subscription.status) {
      return false;
    }
    
    // Must have some form of plan information
    if (!subscription.plan && !subscription.plan_id && !subscription.plan_details) {
      return false;
    }
    
    // Check subscription status if provided
    if (subscription.status === 'active' || 
        subscription.status === 'trialing') {
      return true;
    }
    
    // If status is anything else, it's not an active subscription
    return false;
  };
  
  return {
    fetchSubscription,
    fetchSubscriptionPlans,
    fetchSubscriptionPayments,
    createSubscription,
    updateSubscriptionPlan,
    cancelSubscription,
    isValidSubscription
  };
}
