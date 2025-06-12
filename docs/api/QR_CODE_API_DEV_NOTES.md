# QR Code API Endpoints - Developer Notes

## Overview

This document provides information about the new QR code endpoints implemented to support the mobile app's QR Code Manager feature. These endpoints allow for bulk retrieval of QR codes for multiple units or for all units in a property.

## API Endpoints

### 1. Bulk QR Code Endpoint

```
GET /api/properties/qr-codes/bulk/?units=1,2,3,4
```

#### Purpose
Retrieve multiple QR codes at once for the specified unit IDs.

#### Implementation Details
- Located in `properties/views_qr.py`
- Function: `bulk_qr_codes()`
- Permission: `IsAuthenticated` - User must be logged in
- Query parameter: `units` - Comma-separated list of unit IDs
- Returns QR codes only for units the user has access to via their organization

#### Response Format
```json
[
  {
    "unit_id": 1,
    "property_id": 10,
    "unit_number": "101",
    "qr_base64": "base64_encoded_qr_code_image"
  },
  {
    "unit_id": 2,
    "property_id": 10,
    "unit_number": "102", 
    "qr_base64": "base64_encoded_qr_code_image"
  }
]
```

### 2. Property QR Codes Endpoint

```
GET /api/properties/{property_id}/qr-codes/
```

#### Purpose
Retrieve QR codes for all units in a specific property.

#### Implementation Details
- Located in `properties/views_qr.py`
- Function: `property_qr_codes()`
- Permissions: `IsAuthenticated` and either `IsPropertyManager` or `IsPropertyOwner`
- Path parameter: `property_id` - ID of the property
- Returns QR codes for all units in the property

#### Response Format
Same as Bulk QR Code endpoint.

## Testing

### Test Cases

1. Request QR codes for units in your organization
   - Expected: Return QR codes with 200 status

2. Request QR codes for units not in your organization
   - Expected: No QR codes should be returned for those units

3. Request QR codes with invalid unit IDs
   - Expected: 400 Bad Request response

4. Request QR codes while unauthenticated
   - Expected: 401 Unauthorized response

5. Request property QR codes without proper permissions
   - Expected: 403 Forbidden response

### Example cURL Request

```bash
curl -X GET "http://localhost:8000/api/properties/qr-codes/bulk/?units=1,2,3" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json"
```

## Dependencies

- `qrcode` Python package (already in requirements.txt)
- `BytesIO` from Python's `io` module
- `base64` from Python's standard library

## Optimization Notes

- QR codes are generated on-the-fly and not stored in the database
- Base64 encoding allows for direct embedding in PDFs or HTML
- QR code image quality settings (box_size, border) are optimized for printing
- Error correction level is set to L (lowest) for faster generation
