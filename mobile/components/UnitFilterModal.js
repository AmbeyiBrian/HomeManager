import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * A reusable modal component for filtering available units
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Function} props.onApply - Function to call when filters are applied with the filter object
 * @param {Object} props.initialFilters - Initial filter values
 */
const UnitFilterModal = ({ visible, onClose, onApply, initialFilters = {} }) => {  // Filter state
  const [bedrooms, setBedrooms] = useState(initialFilters.bedrooms || '');
  const [bathrooms, setBathrooms] = useState(initialFilters.bathrooms || '');
  const [maxRent, setMaxRent] = useState(initialFilters.maxRent ? initialFilters.maxRent.toString() : '');
  const [maxSecurityDeposit, setMaxSecurityDeposit] = useState(initialFilters.maxSecurityDeposit ? initialFilters.maxSecurityDeposit.toString() : '');
  const [furnished, setFurnished] = useState(initialFilters.furnished || false);
    // Handle apply filters
  const handleApply = () => {
    const filters = {
      ...(bedrooms ? { bedrooms } : {}),
      ...(bathrooms ? { bathrooms } : {}),
      ...(maxRent ? { maxRent: parseFloat(maxRent) } : {}),
      ...(maxSecurityDeposit ? { maxSecurityDeposit: parseFloat(maxSecurityDeposit) } : {}),
      ...(furnished !== undefined ? { furnished } : {})
    };
    
    onApply(filters);
    onClose();
  };
    // Handle reset filters
  const handleReset = () => {
    setBedrooms('');
    setBathrooms('');
    setMaxRent('');
    setMaxSecurityDeposit('');
    setFurnished(false);
  };
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Available Units</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {/* Bedrooms Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Bedrooms</Text>
              <View style={styles.filterOptions}>
                {['1', '2', '3', '4+'].map((value) => (
                  <TouchableOpacity
                    key={`bed-${value}`}
                    style={[
                      styles.filterChip,
                      bedrooms === value && styles.filterChipActive
                    ]}
                    onPress={() => setBedrooms(bedrooms === value ? '' : value)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      bedrooms === value && styles.filterChipTextActive
                    ]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Bathrooms Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Bathrooms</Text>
              <View style={styles.filterOptions}>
                {['1', '1.5', '2', '2.5', '3+'].map((value) => (
                  <TouchableOpacity
                    key={`bath-${value}`}
                    style={[
                      styles.filterChip,
                      bathrooms === value && styles.filterChipActive
                    ]}
                    onPress={() => setBathrooms(bathrooms === value ? '' : value)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      bathrooms === value && styles.filterChipTextActive
                    ]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
              {/* Max Rent Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Maximum Monthly Rent</Text>
              <TextInput
                style={styles.textInput}
                value={maxRent}
                onChangeText={setMaxRent}
                placeholder="Enter maximum rent"
                keyboardType="numeric"
              />
            </View>
            
            {/* Max Security Deposit Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Maximum Security Deposit</Text>
              <TextInput
                style={styles.textInput}
                value={maxSecurityDeposit}
                onChangeText={setMaxSecurityDeposit}
                placeholder="Enter maximum security deposit"
                keyboardType="numeric"
              />
            </View>
            
            {/* Furnished Filter */}
            <View style={styles.filterSection}>
              <View style={styles.switchRow}>
                <Text style={styles.filterLabel}>Furnished Only</Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={furnished ? "#3498db" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={setFurnished}
                  value={furnished}
                />
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  filterChipText: {
    color: '#333',
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resetButtonText: {
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  applyButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3498db',
    flex: 1,
    marginLeft: 10,
  },
  applyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default UnitFilterModal;
