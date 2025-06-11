import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Reusable CacheBanner component to show when data is loaded from cache
 * 
 * @param {boolean} visible - Whether to show the banner
 * @param {string} message - Custom message to display (optional)
 * @param {string} iconName - Custom icon name (optional)
 * @param {object} style - Custom styles to override default styling (optional)
 */
const CacheBanner = ({ 
  visible = false, 
  message = "Showing cached data", 
  iconName = "cloud-offline",
  style = {} 
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.cacheBanner, style]}>
      <Ionicons name={iconName} size={14} color="#fff" />
      <Text style={styles.cacheText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cacheBanner: {
    backgroundColor: '#bbbbbb',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cacheText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default CacheBanner;
