import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { useAuth } from '../context/AuthContext';
import { useQRIntegration } from '../hooks/useQRIntegration';
import { useApi } from '../hooks/useApi';
import { API_URL } from '../config/apiConfig';
import axios from 'axios';

const QRCodeManagerScreen = ({ route, navigation }) => {
  // State variables
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Hooks
  const { isOffline, fetchProperties: fetchPropertiesFromAuth, authState } = useAuth();
  const { generateUnitQR } = useQRIntegration();
  const { endpoints } = useApi();

  // References
  const qrRefs = useRef({});

  // Initial data loading
  useEffect(() => {
    fetchProperties();
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProperties(properties);
      setSearching(false);
      return;
    }

    setSearching(true);
    const lowerCaseQuery = searchQuery.toLowerCase();
    
    // Filter properties by name, address, or unit number
    const filtered = properties.filter(property => {
      const matchesProperty = property.name.toLowerCase().includes(lowerCaseQuery) || 
                             (property.address && property.address.toLowerCase().includes(lowerCaseQuery));
      
      // Also search in units if available
      const hasMatchingUnit = property.units && property.units.some(unit => 
        unit.unit_number.toString().toLowerCase().includes(lowerCaseQuery)
      );
      
      return matchesProperty || hasMatchingUnit;
    });
    
    setFilteredProperties(filtered);
    setSearching(false);
  }, [searchQuery, properties]);

  // Fetch all properties with their units
  const fetchProperties = async () => {
    try {
      setLoading(true);
      
      // Use the actual API to fetch properties
      const result = await fetchPropertiesFromAuth();
      
      if (result.success) {
        let propertiesData = result.data;
        
        // Fetch units for each property
        const propertiesWithUnits = await Promise.all(
          propertiesData.map(async (property) => {
            try {
              const unitsData = await fetchPropertyUnits(property.id);
              return {
                ...property,
                qr_code: `https://homemanager.app/tenant-portal/${property.id}`,
                units: unitsData
              };
            } catch (error) {
              console.error(`Error fetching units for property ${property.id}:`, error);
              return {
                ...property,
                qr_code: `https://homemanager.app/tenant-portal/${property.id}`,
                units: []
              };
            }
          })
        );
        
        setProperties(propertiesWithUnits);
        setFilteredProperties(propertiesWithUnits);
      } else {
        console.error('Failed to fetch properties:', result.error);
        Alert.alert('Error', 'Failed to load properties');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching properties with QR:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load properties');
    }
  };

  // Fetch units for a specific property
  const fetchPropertyUnits = async (propertyId) => {
    try {
      // Use the stored auth token
      const token = authState.token;
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await axios.get(endpoints.propertyUnits(propertyId), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const unitsData = response.data.results || response.data || [];
      
      // Add QR code URLs to units
      return unitsData.map(unit => ({
        ...unit,
        qr_code: `https://homemanager.app/tenant-portal/unit/${unit.id}`,
        name: unit.unit_number // Use unit_number as display name
      }));
      
    } catch (error) {
      console.error(`Error fetching units for property ${propertyId}:`, error);
      
      // If offline, return empty array
      if (authState.isOffline) {
        return [];
      }
      
      throw error;
    }
  };  // Fetch bulk QR codes at once from the API
  const fetchBulkQRCodes = async (unitIds) => {
    try {
      // Use the stored auth token
      const token = authState.token;
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Use the bulk QR codes endpoint with direct URL to ensure correct path
      const apiUrl = `${API_URL}/properties/qr-codes/bulk/?units=${unitIds.join(',')}`;
      console.log('Fetching bulk QR codes from:', apiUrl);
      
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching bulk QR codes:', error.response?.data || error.message || error);
      // Don't throw, just return empty array for graceful fallback
      return [];
    }
  };

  // Handle unit selection for multi-selection actions
  const toggleUnitSelection = (unit) => {
    if (selectedUnits.some(u => u.id === unit.id)) {
      setSelectedUnits(selectedUnits.filter(u => u.id !== unit.id));
    } else {
      setSelectedUnits([...selectedUnits, unit]);
    }
  };

  // Check if a unit is currently selected
  const isUnitSelected = (unitId) => {
    return selectedUnits.some(unit => unit.id === unitId);
  };  // Generate PDF with all selected QR codes
  const generatePDF = async () => {
    if (selectedUnits.length === 0) {
      Alert.alert('No Units Selected', 'Please select at least one unit to generate PDF');
      return;
    }

    setSaving(true);

    try {
      // Request necessary permissions
      if (Platform.OS === 'android') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant permission to save PDFs');
          setSaving(false);
          return;
        }
      }
      
      console.log(`Generating PDF for ${selectedUnits.length} units...`);      // Create HTML content for the PDF
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>HomeManager QR Codes</title>
          <style>
            body {
              font-family: 'Helvetica', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .qr-card {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
              text-align: center;
              width: 100%;
              box-sizing: border-box;
            }
            .property-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
              text-align: center;
              color: #2c3e50;
            }
            .unit-number {
              font-size: 16px;
              margin-bottom: 15px;
              text-align: center;
              color: #7f8c8d;
            }
            .qr-image {
              width: 200px;
              height: 200px;
              margin: 15px auto;
              display: block;
            }
            .instruction {
              font-size: 12px;
              text-align: center;
              color: #95a5a6;
              margin-top: 10px;
            }
            .footer {
              font-size: 10px;
              text-align: center;
              color: #bdc3c7;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #eee;
            }
            .card-container {
              display: block;
              width: 100%;
            }
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 10px;
              table-layout: fixed;
            }
            td {
              padding: 10px;
              vertical-align: top;
              width: 50%;
            }
            
            @media print {
              .qr-card {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
      `;// Try to use the bulk QR codes API if not offline
      let qrResults = [];
      
      if (!isOffline) {
        try {
          // Get all unit IDs
          const unitIds = selectedUnits.map(unit => unit.id);
          
          // Fetch bulk QR codes from API
          const bulkQRData = await fetchBulkQRCodes(unitIds);
          
          // Check if we got valid results
          if (Array.isArray(bulkQRData) && bulkQRData.length > 0) {
            // Process results
            qrResults = selectedUnits.map(unit => {
              const qrData = bulkQRData.find(qr => qr.unit_id === unit.id);
              const property = properties.find(prop => 
                prop.units && prop.units.some(u => u.id === unit.id)
              );
              
              return {
                unit,
                property,
                qrBase64: qrData?.qr_base64 || null
              };
            }).filter(result => result.qrBase64);
          } else {
            console.log('No QR codes returned from API, falling back to local generation');
            qrResults = [];
          }
        } catch (error) {
          console.log('Error fetching bulk QR codes, falling back to local generation:', error);
          // If bulk API fails, fall back to local generation
          qrResults = [];
        }
      }
      
      // If the bulk API didn't provide results, fall back to local generation
      if (qrResults.length === 0) {
        const qrPromises = selectedUnits.map(unit => {
          return new Promise((resolve) => {
            if (qrRefs.current[unit.id]) {
              qrRefs.current[unit.id].toDataURL((data) => {
                resolve({
                  unit,
                  property: properties.find(prop => 
                    prop.units && prop.units.some(u => u.id === unit.id)
                  ),
                  qrBase64: data
                });
              });
            } else {
              resolve(null);
            }
          });
        });

        qrResults = (await Promise.all(qrPromises)).filter(Boolean);
      }
      
      // Create a table with 2 columns for better layout on mobile PDF
      htmlContent += '<table><tr>';
      
      // Add each QR code to the HTML content
      qrResults.forEach((result, index) => {
        const { unit, property, qrBase64 } = result;
        
        // Start a new row every 2 items
        if (index % 2 === 0 && index > 0) {
          htmlContent += '</tr><tr>';
        }
        
        htmlContent += `
          <td style="width: 50%;">
            <div class="qr-card">
              <div class="property-name">${property ? property.name : 'Property'}</div>
              <div class="unit-number">Unit ${unit.unit_number}</div>
              <img class="qr-image" src="data:image/png;base64,${qrBase64}" />
              <div class="instruction">Scan to access your tenant portal</div>
            </div>
          </td>
        `;

        // Add page break after every 6 cards (3 rows)
        if ((index + 1) % 6 === 0 && index < qrResults.length - 1) {
          htmlContent += '</tr></table><div class="page-break"></div><table><tr>';
        }
      });
      
      // Close the table
      if (qrResults.length % 2 === 1) {
        // Add an empty cell if there's an odd number of items
        htmlContent += '<td></td>';
      }
      htmlContent += '</tr></table>';

      // Close the HTML
      htmlContent += `
          </div>
          <div class="footer">Generated by HomeManager App on ${new Date().toLocaleDateString()}</div>
        </body>
        </html>
      `;      // Generate PDF using expo-print
      console.log('Converting HTML to PDF...');
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595, // A4 width in points
        height: 842, // A4 height in points
        base64: false,
      });
      
      console.log('PDF generation complete. File saved at:', uri);
      
      // Generate a more user-friendly filename
      const fileName = `HomeManager_QRCodes_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      // Save file to a location where it can be shared
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri
      });
      
      // Save to media library or share
      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          await MediaLibrary.createAlbumAsync('HomeManager', asset, false);
          Alert.alert('Success', 'QR codes saved as PDF to your device');
        } catch (mediaError) {
          console.error('Error saving to media library:', mediaError);
          // Fallback to sharing if media library access fails
          await Sharing.shareAsync(fileUri);
        }
      } else {
        // On iOS, share the file
        await Sharing.shareAsync(fileUri);
      }
      
      setSelectedUnits([]);
      
      setSaving(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // More descriptive error message
      const errorMessage = 
        error.message && error.message.includes('permission')
          ? 'Permission denied. Please allow storage access in app settings.'
          : error.message || 'Unknown error occurred. Please try again.';
      
      Alert.alert(
        'PDF Generation Failed', 
        errorMessage,
        [{ text: 'OK' }]
      );
      
      setSaving(false);
    }
  };

  // Function to handle offline check and show appropriate message
  const checkOfflineStatus = () => {
    if (isOffline) {
      Alert.alert(
        'Offline Mode',
        'You are currently offline. QR codes will be generated locally.',
        [{ text: 'OK' }]
      );
      return true;
    }
    return false;
  };

  // Preview QR codes before generating PDF
  const previewQRCodes = () => {
    if (selectedUnits.length === 0) {
      Alert.alert('No Units Selected', 'Please select at least one unit to preview');
      return;
    }
    
    setModalVisible(true);
  };

  // Function to render QR code
  const renderQRCode = (item, size = 150) => {
    return (
      <View style={[styles.qrContainer, size < 150 && styles.qrContainerSmall]}>
        <QRCode
          value={item.qr_code}
          size={size}
          backgroundColor="white"
          color="#2c3e50"
          logoBackgroundColor="white"
          logo={{ uri: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path fill="#3498db" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>') }}
          logoSize={size < 150 ? 15 : 30}
          getRef={(ref) => (qrRefs.current[item.id] = ref)}
        />
      </View>
    );
  };

  // Render a Property card
  const renderPropertyItem = ({ item }) => {
    // Calculate property stats
    const totalUnits = item.units ? item.units.length : 0;
    const occupiedUnits = item.units ? item.units.filter(unit => unit.is_occupied).length : 0;
    const vacantUnits = totalUnits - occupiedUnits;
    
    return (
      <View style={styles.propertyCard}>
        <TouchableOpacity 
          style={styles.propertyHeader}
          onPress={() => {
            setSelectedProperty(selectedProperty?.id === item.id ? null : item);
          }}
        >
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>{item.name}</Text>
            <Text style={styles.propertyAddress}>{item.address}</Text>
          </View>
          <View style={styles.propertyStats}>
            <Text style={styles.statsText}>{totalUnits} units</Text>
            <Text style={[styles.statsText, { color: '#27ae60' }]}>{occupiedUnits} occupied</Text>
            <Text style={[styles.statsText, { color: '#e74c3c' }]}>{vacantUnits} vacant</Text>
            <Ionicons 
              name={selectedProperty?.id === item.id ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#7f8c8d" 
            />
          </View>
        </TouchableOpacity>
        
        {/* Expanded view showing units */}        {selectedProperty?.id === item.id && item.units && item.units.length > 0 && (
          <View style={styles.unitsContainer}>
            <View style={styles.unitSelectionHeader}>
              <Text style={styles.unitSelectionTitle}>Units ({item.units.length})</Text>
              <TouchableOpacity 
                style={styles.selectAllButton}
                onPress={() => toggleSelectAllUnits(item)}
              >
                <Text style={styles.selectAllText}>
                  {areAllUnitsSelected(item) ? "Deselect All" : "Select All"}
                </Text>
                <Ionicons 
                  name={areAllUnitsSelected(item) ? "checkbox" : "square-outline"} 
                  size={18} 
                  color="#3498db" 
                  style={{marginLeft: 5}}
                />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={item.units}
              keyExtractor={(unit) => unit.id.toString()}
              renderItem={({ item: unit }) => (
                <TouchableOpacity 
                  style={[
                    styles.unitCard,
                    isUnitSelected(unit.id) && styles.selectedUnitCard
                  ]}
                  onPress={() => toggleUnitSelection(unit)}
                >
                  <View style={styles.unitHeader}>
                    <Text style={styles.unitLabel}>Unit {unit.unit_number}</Text>
                    {isUnitSelected(unit.id) && (
                      <View style={styles.selectedCheckmark}>
                        <Ionicons name="checkmark-circle" size={20} color="#3498db" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.unitInfo}>
                    <Text style={styles.unitDetail}>
                      {unit.bedrooms} bed • {unit.bathrooms} bath
                    </Text>
                    <Text style={styles.unitDetail}>
                      KES {unit.monthly_rent?.toLocaleString() || 'N/A'}/month
                    </Text>
                    <Text style={[styles.unitStatus, { 
                      color: unit.is_occupied ? '#e74c3c' : '#27ae60' 
                    }]}>
                      {unit.is_occupied ? 'Occupied' : 'Vacant'}
                    </Text>
                  </View>
                  
                  {renderQRCode(unit)}
                </TouchableOpacity>
              )}
              numColumns={2}
              contentContainerStyle={styles.unitsList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
        
        {/* Show message if no units */}
        {selectedProperty?.id === item.id && (!item.units || item.units.length === 0) && (
          <View style={styles.noUnitsContainer}>
            <Text style={styles.noUnitsText}>No units found for this property</Text>
          </View>
        )}
      </View>
    );
  };

  // PDF Preview Modal
  const renderPreviewModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>QR Code Preview</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.previewContainer}>
            {selectedUnits.length > 0 ? (
              <FlatList
                data={selectedUnits}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewPropertyName}>
                      {properties.find(p => p.units?.some(u => u.id === item.id))?.name || 'Property'}
                    </Text>
                    <Text style={styles.previewUnitNumber}>Unit {item.unit_number}</Text>
                    {renderQRCode(item, 150)}
                    <Text style={styles.previewInstruction}>
                      Scan to access tenant portal
                    </Text>
                  </View>
                )}
                contentContainerStyle={styles.previewList}
              />
            ) : (
              <View style={styles.emptyPreview}>
                <Ionicons name="document-text-outline" size={60} color="#ddd" />
                <Text style={styles.emptyPreviewText}>
                  Select units to preview QR codes
                </Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={[
              styles.downloadButton,
              (saving || selectedUnits.length === 0) && styles.disabledButton
            ]}
            onPress={generatePDF}
            disabled={saving || selectedUnits.length === 0}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text style={styles.downloadButtonText}>
                  Download PDF ({selectedUnits.length} QR {selectedUnits.length === 1 ? 'Code' : 'Codes'})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Toggle selection of all units for a property
  const toggleSelectAllUnits = (property) => {
    if (!property || !property.units || property.units.length === 0) return;
    
    // Check if all units from this property are already selected
    const propertyUnitIds = property.units.map(unit => unit.id);
    const allSelected = propertyUnitIds.every(id => selectedUnits.some(unit => unit.id === id));
    
    if (allSelected) {
      // If all are selected, deselect all units from this property
      setSelectedUnits(selectedUnits.filter(unit => !propertyUnitIds.includes(unit.id)));
    } else {
      // If not all are selected, select all units from this property
      // First remove any already selected units from this property to avoid duplicates
      const filteredSelection = selectedUnits.filter(unit => !propertyUnitIds.includes(unit.id));
      // Then add all units from this property
      setSelectedUnits([...filteredSelection, ...property.units]);
    }
  };

  // Check if all units of a property are selected
  const areAllUnitsSelected = (property) => {
    if (!property || !property.units || property.units.length === 0) return false;
    return property.units.every(unit => selectedUnits.some(selected => selected.id === unit.id));
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  // Render empty state
  if (properties.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="qr-code" size={60} color="#ddd" />
        <Text style={styles.emptyText}>No properties found</Text>
        <Text style={styles.emptySubtext}>
          Add properties to generate QR codes for them
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={14} color="#fff" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
      
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#7f8c8d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties or units..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#95a5a6"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={18} color="#7f8c8d" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Selected units action bar */}
      {selectedUnits.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedUnits.length} {selectedUnits.length === 1 ? 'unit' : 'units'} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.selectionAction}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="eye-outline" size={20} color="#3498db" />
              <Text style={styles.actionText}>Preview</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.selectionAction}
              onPress={generatePDF}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#3498db" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#3498db" />
                  <Text style={styles.actionText}>Generate PDF</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.selectionAction}
              onPress={() => setSelectedUnits([])}
            >
              <Ionicons name="close-outline" size={20} color="#e74c3c" />
              <Text style={[styles.actionText, { color: '#e74c3c' }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Properties list */}
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderPropertyItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading && (
            <View style={styles.noSearchResults}>
              <Ionicons name="search" size={40} color="#ddd" />
              <Text style={styles.noResultsText}>No properties found</Text>
              {searchQuery.length > 0 && (
                <Text style={styles.noResultsSubtext}>
                  Try a different search term
                </Text>
              )}
            </View>
          )
        }
      />
      
      {/* Preview Modal */}
      {renderPreviewModal()}
    </SafeAreaView>
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
  searchContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 5,
  },
  selectionBar: {
    backgroundColor: '#ecf0f1',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  actionText: {
    fontSize: 12,
    color: '#3498db',
    marginLeft: 4,
  },
  listContainer: {
    padding: 12,
    paddingTop: 4,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  propertyHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  propertyAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  propertyStats: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  unitsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    padding: 12,
  },
  unitsList: {
    padding: 4,
  },
  unitCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    margin: 4,
    flex: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    alignItems: 'center',
  },
  selectedUnitCard: {
    backgroundColor: '#e8f4fc',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  unitHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    textAlign: 'center',
  },
  selectedCheckmark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitInfo: {
    width: '100%',
    marginBottom: 12,
  },
  unitDetail: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
    textAlign: 'center',
  },
  unitStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  qrContainerSmall: {
    padding: 8,
  },
  noUnitsContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  noUnitsText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#7f8c8d',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  noSearchResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
  },
  previewContainer: {
    maxHeight: '70%',
  },
  previewList: {
    padding: 16,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  previewPropertyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  previewUnitNumber: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  previewInstruction: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 16,
  },
  emptyPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyPreviewText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  unitSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  unitSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#ecf0f1',
  },
  selectAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
});

export default QRCodeManagerScreen;
