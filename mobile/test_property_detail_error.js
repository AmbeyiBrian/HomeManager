#!/usr/bin/env node

// Test script to check for the propertyResponse error
console.log('Testing PropertyDetailScreen for propertyResponse error...\n');

// Start the Expo development server to see console output
const { spawn } = require('child_process');

console.log('Starting Expo development server...');
console.log('This will help us see the actual runtime error with propertyResponse\n');

const expo = spawn('npx', ['expo', 'start'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

expo.on('close', (code) => {
  console.log(`\nExpo server exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nStopping Expo server...');
  expo.kill('SIGINT');
  process.exit(0);
});

console.log('Instructions:');
console.log('1. Open the app on your device/emulator');
console.log('2. Navigate to Properties screen');
console.log('3. Tap on any property to open PropertyDetailScreen');
console.log('4. Check the console output for any propertyResponse errors');
console.log('5. Press Ctrl+C to stop when done\n');
