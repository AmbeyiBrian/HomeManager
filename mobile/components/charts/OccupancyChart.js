import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const OccupancyChart = ({ occupancyData, loading = false }) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Property Occupancy</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const data = [
    {
      name: 'Occupied',
      population: occupancyData?.occupied || 0,
      color: '#4CAF50',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Vacant',
      population: occupancyData?.vacant || 0,
      color: '#FF9800',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Maintenance',
      population: occupancyData?.maintenance || 0,
      color: '#F44336',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
  ];

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  const total = data.reduce((sum, item) => sum + item.population, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Property Occupancy</Text>
      {total > 0 ? (
        <>
          <PieChart
            data={data}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.colorIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statText}>Occupied: {occupancyData?.occupied || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.colorIndicator, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.statText}>Vacant: {occupancyData?.vacant || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.colorIndicator, { backgroundColor: '#F44336' }]} />
              <Text style={styles.statText}>Maintenance: {occupancyData?.maintenance || 0}</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No occupancy data available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    marginTop: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statText: {
    fontSize: 14,
    color: '#333',
  },
});

export default OccupancyChart;
