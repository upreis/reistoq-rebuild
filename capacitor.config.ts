import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f78e46621b1541d9b48adb410697914d',
  appName: 'reistoq-rebuild',
  webDir: 'dist',
  server: {
    url: 'https://f78e4662-1b15-41d9-b48a-db410697914d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    BarcodeScanner: {
      shouldUseLibraryCamera: true,
      shouldScanInvertedQRCodes: false
    }
  }
};

export default config;