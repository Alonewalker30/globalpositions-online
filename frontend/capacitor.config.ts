import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.globalpositions.app',
  appName: 'GlobalPositions',
  webDir: 'dist',
  server: {
    // Points the app to the live Render backend — no local server needed
    url: 'https://globalpositions-online.onrender.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f0fdf4',
  },
  ios: {
    backgroundColor: '#f0fdf4',
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#f0fdf4',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
