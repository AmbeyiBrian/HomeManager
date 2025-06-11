// filepath: c:\Users\brian.ambeyi\PycharmProjects\HomeManager\mobile\screens\PaymentsScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentSummaryModal from '../components/PaymentSummaryModal';

// Check that PaymentSummaryModal is properly defined
// Continue with rest of the file...
