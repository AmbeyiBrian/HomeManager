import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DashboardCard = ({ 
  title, 
  value, 
  icon, 
  color = '#2196F3', 
  subtitle, 
  trend, 
  onPress,
  loading = false 
}) => {
  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null;
    const numTrend = Number(trend);
    if (isNaN(numTrend)) return null;
    if (numTrend > 0) return 'trending-up';
    if (numTrend < 0) return 'trending-down';
    return 'remove';
  };
  const getTrendColor = () => {
    if (trend === undefined || trend === null) return '#666';
    const numTrend = Number(trend);
    if (isNaN(numTrend)) return '#666';
    if (numTrend > 0) return '#4CAF50';
    if (numTrend < 0) return '#F44336';
    return '#666';
  };
  
  const formatTrend = () => {
    if (trend === undefined || trend === null || isNaN(Number(trend))) return '';
    const absValue = Math.abs(Number(trend));
    const sign = Number(trend) > 0 ? '+' : '';
    return `${sign}${absValue}%`;
  };

  const CardContent = () => {
    const trendIconName = getTrendIcon(); // Calculate once

    return (
      <View style={[styles.container, { borderLeftColor: color }]}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <View style={styles.contentContainer}>
            <Text style={styles.title}>{title}</Text>
            {loading ? (
              <Text style={styles.loading}>Loading...</Text>
            ) : (
              <>
                <Text style={[styles.value, { color }]}>
                  {value !== undefined && value !== null ? String(value) : '0'}
                </Text>
                {subtitle && <Text style={styles.subtitle}>{String(subtitle)}</Text>}
              </>
            )}
          </View>
        </View>        {trend !== undefined && trend !== null && !loading && !isNaN(Number(trend)) && (
          <View style={styles.trendWrapper}>
            <View style={styles.trendContainer}>
              {trendIconName ? (
                <Ionicons
                  name={trendIconName}
                  size={12}
                  color={getTrendColor()}
                />
              ) : null}
              <Text style={[styles.trendText, { color: getTrendColor() }]}>
                {formatTrend()}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  touchable: {
    marginVertical: 5,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 5,
    marginHorizontal: 5,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    flex: 1,
    minHeight: 120,
    maxHeight: 140,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#999',
  },
  loading: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  trendWrapper: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
});

export default DashboardCard;
