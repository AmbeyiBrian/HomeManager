import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid,
  useTheme,
  alpha
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const AnalyticsCharts = ({ dashboardData = {} }) => {
  const theme = useTheme();

  // Early return if no data - but still render charts with default values
  if (!dashboardData) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="textSecondary">
          Loading analytics data...
        </Typography>
      </Box>
    );
  }

  // Revenue Chart Data
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue Collected',
        data: [850000, 920000, 780000, 1100000, 950000, 1200000],
        backgroundColor: alpha(theme.palette.primary.main, 0.8),
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Expected Revenue',
        data: [1000000, 1000000, 1000000, 1000000, 1000000, 1000000],
        backgroundColor: alpha(theme.palette.grey[400], 0.3),
        borderColor: theme.palette.grey[400],
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };
  // Occupancy Rate Chart Data
  const occupancyData = {
    labels: ['Occupied', 'Vacant'],
    datasets: [
      {
        data: [dashboardData?.kpis?.occupiedUnits || 0, dashboardData?.kpis?.vacantUnits || 0],
        backgroundColor: [
          theme.palette.success.main,
          theme.palette.warning.main
        ],
        borderColor: [
          theme.palette.success.dark,
          theme.palette.warning.dark
        ],
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  };

  // Maintenance Tickets Trend
  const maintenanceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'New Tickets',
        data: [12, 8, 15, 6],
        borderColor: theme.palette.error.main,
        backgroundColor: alpha(theme.palette.error.main, 0.1),
        tension: 0.4,
        fill: true,
        pointBackgroundColor: theme.palette.error.main,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
      {
        label: 'Resolved Tickets',
        data: [10, 12, 8, 14],
        borderColor: theme.palette.success.main,
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        tension: 0.4,
        fill: true,
        pointBackgroundColor: theme.palette.success.main,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      }
    ]
  };

  // Chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: alpha(theme.palette.divider, 0.1)
        },
        ticks: {
          callback: function(value) {
            return 'KES ' + (value / 1000000).toFixed(1) + 'M';
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12
          }
        }
      }
    },
    cutout: '70%'
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 20,
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: alpha(theme.palette.divider, 0.1)
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* Revenue Chart */}
      <Grid item xs={12} lg={8}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            height: 350,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 2
            }}
          >
            Revenue Analytics
          </Typography>
          <Box sx={{ height: 280 }}>
            <Bar data={revenueData} options={barOptions} />
          </Box>
        </Paper>
      </Grid>

      {/* Occupancy Chart */}
      <Grid item xs={12} lg={4}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            height: 350,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.02)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 2,
              textAlign: 'center'
            }}
          >
            Unit Occupancy
          </Typography>
          <Box sx={{ height: 220, position: 'relative' }}>
            <Doughnut data={occupancyData} options={doughnutOptions} />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -60%)',
                textAlign: 'center'
              }}
            >              <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                {dashboardData?.kpis?.occupancyRate || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Occupancy
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>

      {/* Maintenance Trends */}
      <Grid item xs={12}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 3, 
            height: 300,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.02)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 2
            }}
          >
            Maintenance Tickets Trend
          </Typography>
          <Box sx={{ height: 220 }}>
            <Line data={maintenanceData} options={lineOptions} />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AnalyticsCharts;
