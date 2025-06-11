import React from 'react';

/**
 * Minimal version of useApi hook for debugging
 */
export const useApiMinimal = () => {
  return {
    endpoints: {
      payments: 'http://localhost:8000/api/payments/rent/',
    }
  };
};
