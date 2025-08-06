import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f78e46621b1541d9b48adb410697914d',
  appName: 'reistoq-rebuild',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    BarcodeScanner: {
      shouldUseLibraryCamera: true,
      shouldScanInvertedQRCodes: false
    }
  }
};

export default config;