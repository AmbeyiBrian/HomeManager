# QR Code Manager Feature Documentation

## Overview

The QR Code Manager feature allows users to search, manage, and download QR codes in PDF format for HomeManager properties. Users can search through QR codes, select multiple units, and generate a nicely formatted PDF document with those QR codes for printing.

## Mobile App Features

### 1. QR Code Manager Screen (`QRCodeManagerScreen.js`)

- **Search Functionality**: Users can search for properties or units by name, address, or unit number
- **Multi-Selection Capability**: Users can select multiple units for PDF generation
- **Select All Feature**: Users can select/deselect all units in a property with one click
- **PDF Generation**: Selected QR codes can be exported as a formatted PDF document
- **Preview Functionality**: Users can preview QR codes before generating the PDF
- **Improved PDF Generation**: Enhanced error handling and formatting for reliable PDF output

### 2. Navigation

The QR Code Manager can be accessed from:
- **PropertyQRScreen**: Via the "Search & Download" button
- **PropertyDetailScreen**: Via the QR code action button
- **ProfileScreen**: In the account management section (for admins/owners)

## API Endpoints

Two key endpoints support the QR Code Manager feature:

### 1. Bulk QR Code Retrieval

```
GET /api/properties/qr-codes/bulk/?units=1,2,3,4
```

Returns multiple QR codes at once for the specified unit IDs.

#### Parameters:
- `units`: Comma-separated list of unit IDs

#### Response:
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

### 2. Property QR Code Retrieval

```
GET /api/properties/{property_id}/qr-codes/
```

Returns QR codes for all units in a specific property.

#### Parameters:
- `property_id`: ID of the property

#### Response:
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

## PDF Generation

The PDF is generated using `react-native-html-to-pdf` with the following features:
- Clean, card-based layout
- 2 QR codes per row for optimal space usage 
- Automatic page breaks every 6 QR codes
- Property and unit information included with each QR code
- Scan instructions included
- Automatic filename with date
- Enhanced error handling for reliable generation
- Fixed styling for consistent cross-platform display

## Offline Support

The feature works in offline mode by:
1. First attempting to use the bulk API endpoint when online
2. Falling back to local QR code generation when offline or if the API call fails
3. Displaying appropriate status messages to the user

## Required Dependencies

- react-native-pdf
- react-native-blob-util
- react-native-html-to-pdf
- react-native-print
- react-native-qrcode-svg

## Future Enhancements

Potential improvements to consider:
- Customizable PDF templates
- QR code categories or tags
- Batch printing options
- Email or share PDF directly from the app

## Usage Instructions

### Basic Usage
1. Navigate to the QR Code Manager screen
2. Browse or search for properties/units
3. Select individual units by tapping on them
4. Use the "Select All" button on a property to select/deselect all units at once
5. Preview selected QR codes or generate PDF directly
6. Share or save the generated PDF

### Selection Options
- **Individual Selection**: Tap on each unit to select/deselect
- **Select All**: Use the "Select All" button at the top of each property's units section
- **Clear Selection**: Use the "Clear" button in the selection bar at the top

### PDF Generation Tips
- For best results, keep selections under 50 units per PDF
- PDF generation may take longer for many QR codes
- The app will handle both online and offline generation automatically
