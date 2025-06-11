import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ProgressChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const PaymentStatusChart = ({ paymentData, loading = false }) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Payment Status</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }
  const totalExpected = Number(paymentData?.totalExpected) || 0;
  const collected = Number(paymentData?.collected) || 0;
  const pending = Number(paymentData?.pending) || 0;
  const overdue = Number(paymentData?.overdue) || 0;

  const collectionRate = totalExpected > 0 ? Math.min(1, collected / totalExpected) : 0;
  const pendingRate = totalExpected > 0 ? Math.min(1, pending / totalExpected) : 0;
  const overdueRate = totalExpected > 0 ? Math.min(1, overdue / totalExpected) : 0;

  // Ensure rates are valid numbers
  const safeCollectionRate = isNaN(collectionRate) ? 0 : collectionRate;
  const safePendingRate = isNaN(pendingRate) ? 0 : pendingRate;
  const safeOverdueRate = isNaN(overdueRate) ? 0 : overdueRate;
  const data = {
    labels: ['Collected', 'Pending', 'Overdue'],
    data: [safeCollectionRate, safePendingRate, safeOverdueRate],
  };
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1, index = 0) => {
      const colors = ['rgba(76, 175, 80, ', 'rgba(255, 193, 7, ', 'rgba(244, 67, 54, '];
      const safeOpacity = isNaN(opacity) ? 1 : opacity;
      const safeIndex = isNaN(index) ? 0 : index;
      return colors[safeIndex % colors.length] + safeOpacity + ')';
    },
    labelColor: (opacity = 1) => {
      const safeOpacity = isNaN(opacity) ? 1 : opacity;
      return `rgba(0, 0, 0, ${safeOpacity})`;
    },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Status</Text>
      {totalExpected > 0 ? (
        <>
          <ProgressChart
            data={data}
            width={screenWidth - 60}
            height={220}
            strokeWidth={16}
            radius={32}
            chartConfig={chartConfig}
            hideLegend={false}
          />
          <View style={styles.summaryContainer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Expected</Text>
              <Text style={styles.totalValue}>${totalExpected.toLocaleString()}</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
                  <View>
                    <Text style={styles.statusLabel}>Collected</Text>
                    <Text style={styles.statusValue}>${collected.toLocaleString()}</Text>
                    <Text style={styles.statusPercent}>{Math.round(safeCollectionRate * 100)}%</Text>
                  </View>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, { backgroundColor: '#FFC107' }]} />
                  <View>
                    <Text style={styles.statusLabel}>Pending</Text>
                    <Text style={styles.statusValue}>${pending.toLocaleString()}</Text>
                    <Text style={styles.statusPercent}>{Math.round(safePendingRate * 100)}%</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, { backgroundColor: '#F44336' }]} />
                  <View>
                    <Text style={styles.statusLabel}>Overdue</Text>
                    <Text style={styles.statusValue}>${overdue.toLocaleString()}</Text>
                    <Text style={styles.statusPercent}>{Math.round(safeOverdueRate * 100)}%</Text>
                  </View>
                </View>
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, { backgroundColor: '#2196F3' }]} />
                  <View>
                    <Text style={styles.statusLabel}>Collection Rate</Text>                    <Text style={styles.statusValue}>{Math.round(safeCollectionRate * 100)}%</Text>
                    <Text style={styles.statusPercent}>
                      {safeCollectionRate >= 0.8 ? 'Excellent' : safeCollectionRate >= 0.6 ? 'Good' : 'Needs Attention'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No payment data available</Text>
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
  summaryContainer: {
    marginTop: 15,
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    gap: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statusPercent: {
    fontSize: 11,
    color: '#999',
  },
});

export default PaymentStatusChart;
