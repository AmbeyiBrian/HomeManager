# Pagination Fix Documentation

## Overview
This document describes the fixes implemented to resolve pagination issues in the HomeManager mobile app. The issue was that only the first 20 records were being loaded for tickets, payments, and notices without proper implementation of pagination to load more records.

## Problem Statement
After refactoring the code, the pagination functionality was broken in three key modules:
1. `maintenanceModule.js` (tickets)
2. `paymentModule.js` (payments)
3. `noticeModule.js` (notices)

The issue was that these modules were not properly:
- Handling pagination parameters
- Returning pagination metadata in responses
- Tracking and using the `nextPageUrl` from API responses

## Solution Implementation

### 1. Module Changes
Updated all three modules to:
- Accept and use pagination parameters (page, pageSize, and nextPageUrl)
- Handle filter parameters consistently
- Process and return pagination metadata from the API responses
- Cache only the first page of data for offline mode

### 2. Function Signature Updates
Updated function signatures to include pagination parameters:

```javascript
// Before
fetchAllTickets(forceRefresh)

// After
fetchAllTickets(forceRefresh, page, pageSize, status, propertyId, nextPageUrl)
```

### 3. Response Structure
Standardized the response structure to include pagination metadata:
```javascript
{
  success: true,
  data: [], // The actual data array
  fromCache: false,
  pagination: {
    hasNext: true/false,
    hasPrevious: true/false,
    currentPage: 1,
    totalCount: 100,
    totalPages: 5,
    nextPageUrl: "https://api.example.com/endpoint?page=2"
  }
}
```

### 4. Screen Updates
Modified the screens to properly:
- Track nextPageUrl state
- Use proper parameters when calling API functions
- Handle pagination correctly during initial load and when loading more items
- Properly append new items to existing lists
- Display loading indicators during pagination

## Affected Files
1. `maintenanceModule.js`
2. `paymentModule.js`
3. `noticeModule.js`
4. `TicketsScreen.js`
5. `PaymentsScreen.js`
6. `NoticesScreen.js`

## Testing
The pagination functionality should be tested by:
1. Loading each screen initially
2. Scrolling down to trigger loading more items
3. Verifying that additional items are loaded and appended correctly
4. Testing that filters work correctly with pagination
5. Verifying that pagination works correctly when switching between online and offline modes

## Best Practices
1. Always include and handle pagination parameters in API requests
2. Return standardized response objects with pagination metadata
3. Track nextPageUrl state in screens
4. Have proper loading states for initial load vs pagination
5. Handle errors properly during pagination
