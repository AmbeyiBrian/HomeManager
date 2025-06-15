// Constants for the auth context
export const LOCAL_STORAGE_KEYS = {
  USER_DATA: 'user_data',
  PROPERTIES: 'properties_data',
  UNITS: 'units_data',
  TENANTS: 'tenants_data',
  TICKETS: 'tickets_data',
  PAYMENTS: 'payments_data',
  NOTICES: 'notices_data',
  OFFLINE_QUEUE: 'offline_action_queue',
};

// Constants for storage
export const SECURE_STORE_MAX_SIZE = 2000; // Slightly below the 2048 limit to be safe
export const SENSITIVE_KEYS = ['token', 'user_data', 'offline_enabled', 'current_org_id'];
