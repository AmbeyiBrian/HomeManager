# Mobile App API Integration Documentation

## Overview

This document outlines the API integration structure in the HomeManager mobile app, documenting the endpoints used to communicate with the backend.

## Base API Configuration

The app uses the following base URLs for API requests:

```javascript
const API_BASE_URL = 'http://10.0.2.2:8000';
const API_URL = `${API_BASE_URL}/api`;
const API_USERS = `${API_URL}/users`;
const API_PROPERTIES = `${API_URL}/properties`;
const API_TENANTS = `${API_URL}/tenants`;
const API_MAINTENANCE = `${API_URL}/maintenance`;
const API_PAYMENTS = `${API_URL}/payments`;
const API_NOTICES = `${API_URL}/notices`;
const API_ORGANIZATIONS = `${API_URL}/organizations`;
```

> Note: In production environments, `API_BASE_URL` should be set to the actual server URL.

## API Endpoints by Feature

### Authentication

| Feature | Endpoint | Method |
|---------|----------|--------|
| Login | `${API_URL}/auth/token/` | POST |
| Refresh Token | `${API_URL}/auth/token/refresh/` | POST |
| Verify Token | `${API_URL}/auth/token/verify/` | POST |
| Current User | `${API_USERS}/me/` | GET |

### Organizations & Roles

| Feature | Endpoint | Method |
|---------|----------|--------|
| List Organizations | `${API_ORGANIZATIONS}/organizations/` | GET |
| Organization Details | `${API_ORGANIZATIONS}/organizations/{id}/` | GET |
| My Organizations | `${API_ORGANIZATIONS}/organizations/my-organizations/` | GET |
| List Roles | `${API_ORGANIZATIONS}/roles/` | GET |
| Role Details | `${API_ORGANIZATIONS}/roles/{id}/` | GET |
| Create Role | `${API_ORGANIZATIONS}/roles/` | POST |
| Update Role | `${API_ORGANIZATIONS}/roles/{id}/` | PATCH |
| Delete Role | `${API_ORGANIZATIONS}/roles/{id}/` | DELETE |
| List Memberships | `${API_ORGANIZATIONS}/memberships/` | GET |
| Create Membership | `${API_ORGANIZATIONS}/memberships/` | POST |
| Update Membership | `${API_ORGANIZATIONS}/memberships/{id}/` | PATCH |

### Properties & Units

| Feature | Endpoint | Method |
|---------|----------|--------|
| List Properties | `${API_PROPERTIES}/properties/` | GET |
| Property Details | `${API_PROPERTIES}/properties/{id}/` | GET |
| Property Units | `${API_PROPERTIES}/units/?property={id}` | GET |
| Property Rent Stats | `${API_PROPERTIES}/properties/{id}/rent_stats/` | GET |
| List Units | `${API_PROPERTIES}/units/` | GET |
| Unit Details | `${API_PROPERTIES}/units/{id}/` | GET |
| Available Units | `${API_PROPERTIES}/units/available/` | GET |
| Allocate Tenant | `${API_PROPERTIES}/units/{id}/allocate_tenant/` | POST |
| Reallocate Tenant | `${API_PROPERTIES}/units/{id}/allocate_tenant/` | PATCH |
| Deallocate Tenant | `${API_PROPERTIES}/units/{id}/deallocate_tenant/` | POST |

**Note on Allocation vs. Reallocation**: 
- POST to allocate_tenant sets `is_occupied=True`
- PATCH to allocate_tenant sets `is_occupied=False` - This indicates that a unit needs management attention after reallocation

### Tenants

| Feature | Endpoint | Method |
|---------|----------|--------|
| List Tenants | `${API_TENANTS}/tenants/` | GET |
| Tenant Details | `${API_TENANTS}/tenants/{id}/` | GET |
| Create Tenant | `${API_TENANTS}/tenants/` | POST |
| Update Tenant | `${API_TENANTS}/tenants/{id}/` | PATCH |
| Unit Tenants | `${API_TENANTS}/tenants/?unit={id}` | GET |
| Unit Leases | `${API_TENANTS}/leases/?unit={id}` | GET |
| Transfer Tenant | `${API_TENANTS}/tenants/{id}/transfer/` | POST |

### Maintenance

| Feature | Endpoint | Method |
|---------|----------|--------|
| List Tickets | `${API_MAINTENANCE}/tickets/` | GET |
| Ticket Details | `${API_MAINTENANCE}/tickets/{id}/` | GET |
| Property Tickets | `${API_MAINTENANCE}/tickets/?property={id}` | GET |
| Unit Tickets | `${API_MAINTENANCE}/tickets/?unit={id}` | GET |

### Payments

| Feature | Endpoint | Method |
|---------|----------|--------|
| List Payments | `${API_PAYMENTS}/rent-payments/` | GET |
| Payment Details | `${API_PAYMENTS}/rent-payments/{id}/` | GET |
| Unit Payments | `${API_PAYMENTS}/rent-payments/?unit={id}` | GET |

## Tenant Allocation, Deallocation, and Transfer Payloads

### Allocate Tenant
```json
{
  "tenant_id": 123,
  "lease_start_date": "2023-10-01", // Optional
  "lease_end_date": "2024-09-30",   // Optional
  "rent_amount": 1000,              // Optional, defaults to unit.monthly_rent
  "security_deposit": 1000          // Optional, defaults to unit.security_deposit
}
```

### Deallocate Tenant
```json
{
  "tenant_id": 123
}
```

### Transfer Tenant
```json
{
  "from_unit_id": 123,
  "to_unit_id": 456,
  "lease_start_date": "2023-10-01", // Optional
  "lease_end_date": "2024-09-30",   // Optional
  "rent_amount": 1000,              // Optional, defaults to unit.monthly_rent
  "security_deposit": 1000          // Optional, defaults to unit.security_deposit
}
```

## Offline Support

The app implements caching of API responses for offline use. When offline:

1. The app first checks for cached data
2. If available, the cached data is used
3. When back online, the app synchronizes offline changes

## Error Handling

The app uses axios interceptors to handle common API errors:

1. 401 Unauthorized: Attempts token refresh
2. Network errors: Queues actions for later execution
3. Server errors: Shows appropriate error messages

## Token Refresh Mechanism

The app automatically refreshes expired tokens:

1. When a 401 response is received, the app attempts to refresh the token
2. If refresh is successful, the original request is retried
3. If refresh fails, the user is logged out
