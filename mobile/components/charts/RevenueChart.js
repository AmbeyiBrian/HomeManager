import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const RevenueChart = ({ revenueData, loading = false }) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Revenue Trends</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }
  // Ensure data is valid and safe
  const safeMonths = revenueData?.months || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const safeValues = (revenueData?.values || [20000, 25000, 22000, 28000, 32000, 30000])
    .map(value => Number(value) || 0);

  const data = {
    labels: safeMonths,
    datasets: [
      {
        data: safeValues,
        color: (opacity = 1) => {
          const safeOpacity = isNaN(opacity) ? 1 : opacity;
          return `rgba(76, 175, 80, ${safeOpacity})`;
        },
        strokeWidth: 3,
      },
    ],
  };
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => {
      const safeOpacity = isNaN(opacity) ? 1 : opacity;
      return `rgba(76, 175, 80, ${safeOpacity})`;
    },
    labelColor: (opacity = 1) => {
      const safeOpacity = isNaN(opacity) ? 1 : opacity;
      return `rgba(0, 0, 0, ${safeOpacity})`;
    },
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e3e3e3',
      strokeWidth: 1,
    },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Revenue Trends</Text>
      {data.datasets[0].data.length > 0 ? (
        <>
          <LineChart
            data={data}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current Month</Text>
              <Text style={styles.summaryValue}>
                ${(data.datasets[0].data[data.datasets[0].data.length - 1] || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Average</Text>
              <Text style={styles.summaryValue}>
                ${Math.round(data.datasets[0].data.reduce((a, b) => a + b, 0) / data.datasets[0].data.length).toLocaleString()}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No revenue data available</Text>
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default RevenueChart;
