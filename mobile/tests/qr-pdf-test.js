import React from 'react';
import { Alert } from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import * as FileSystem from 'expo-file-system';

/**
 * Test function to validate PDF generation on a device
 * Run this test directly to check if PDF generation works correctly
 */
export const testPDFGeneration = async () => {
  try {
    console.log('Starting PDF generation test...');
    
    // Simple HTML content for test PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Helvetica; padding: 20px; }
          .header { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
          .test-box { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
          .footer { font-size: 10px; text-align: center; margin-top: 30px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">HomeManager PDF Test</div>
        <div class="test-box">
          <p>This is a test PDF generated to verify that PDF generation works correctly on this device.</p>
          <p>If you can read this text in the PDF, then the test was successful!</p>
          <p>Generated at: ${new Date().toLocaleString()}</p>
        </div>
        <div class="footer">HomeManager App PDF Generation Test</div>
      </body>
      </html>
    `;
    
    console.log('Converting HTML to PDF...');
    
    // Generate PDF
    const options = {
      html: htmlContent,
      fileName: `HomeManager_PDF_Test_${new Date().toISOString().slice(0, 10)}`,
      directory: 'Documents',
    };
    
    const file = await RNHTMLtoPDF.convert(options);
    
    if (file && file.filePath) {
      console.log('PDF generated successfully at:', file.filePath);
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(file.filePath);
      if (fileInfo.exists) {
        console.log('File exists! Size:', fileInfo.size, 'bytes');
        
        // Show success alert
        Alert.alert(
          'PDF Test Successful',
          `PDF generated successfully at ${file.filePath}`,
          [{ text: 'OK' }]
        );
        
        return {
          success: true,
          filePath: file.filePath,
          fileSize: fileInfo.size
        };
      } else {
        console.error('File does not exist even though generation reported success');
        Alert.alert('Error', 'File does not exist even though generation reported success');
        return { success: false, error: 'File does not exist' };
      }
    } else {
      console.error('Failed to generate PDF: No file path returned');
      Alert.alert('Error', 'Failed to generate PDF: No file path returned');
      return { success: false, error: 'No file path returned' };
    }
    
  } catch (error) {
    console.error('Error in PDF test:', error);
    Alert.alert('Error', `PDF test failed: ${error.message || 'Unknown error'}`);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Test QR code generation
 */
export const testQRGeneration = async () => {
  // Implementation depends on the specific QR library being used
  // This would be similar to how the QR codes are generated in the main app
};

// Export all test functions
export default {
  testPDFGeneration,
  testQRGeneration
};
