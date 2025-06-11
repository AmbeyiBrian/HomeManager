import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const MaintenanceChart = ({ maintenanceData, loading = false }) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Maintenance Requests</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }
  const data = {
    labels: ['Open', 'In Progress', 'Completed', 'Closed'],
    datasets: [
      {
        data: [
          Number(maintenanceData?.open) || 0,
          Number(maintenanceData?.inProgress) || 0,
          Number(maintenanceData?.completed) || 0,
          Number(maintenanceData?.closed) || 0,
        ],
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
      return `rgba(255, 152, 0, ${safeOpacity})`;
    },
    labelColor: (opacity = 1) => {
      const safeOpacity = isNaN(opacity) ? 1 : opacity;
      return `rgba(0, 0, 0, ${safeOpacity})`;
    },
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e3e3e3',
      strokeWidth: 1,
    },
  };

  const totalRequests = data.datasets[0].data.reduce((sum, value) => sum + value, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maintenance Requests</Text>
      {totalRequests > 0 ? (
        <>
          <BarChart
            data={data}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            verticalLabelRotation={30}
            showValuesOnTopOfBars={true}
          />
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Requests</Text>
                <Text style={styles.summaryValue}>{totalRequests}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Resolution Rate</Text>
                <Text style={styles.summaryValue}>
                  {totalRequests > 0 
                    ? Math.round(((data.datasets[0].data[2] + data.datasets[0].data[3]) / totalRequests) * 100)
                    : 0}%
                </Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View style={styles.statusItem}>
                <View style={[styles.statusIndicator, { backgroundColor: '#FF5722' }]} />
                <Text style={styles.statusText}>Open: {data.datasets[0].data[0]}</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusIndicator, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.statusText}>In Progress: {data.datasets[0].data[1]}</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.statusText}>Completed: {data.datasets[0].data[2]}</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusIndicator, { backgroundColor: '#9E9E9E' }]} />
                <Text style={styles.statusText}>Closed: {data.datasets[0].data[3]}</Text>
              </View>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No maintenance data available</Text>
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
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
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
    color: '#FF9800',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    width: '48%',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#333',
  },
});

export default MaintenanceChart;
