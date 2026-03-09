import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grandpa.creativeuniverse',
  appName: "Grandpa's Creative Universe",
  webDir: '.',
  server: {
    // Development: uncomment and set your IP for live reload
    // url: 'http://YOUR_IP:8080',
    // cleartext: true
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#FFF8E7',
    },
  },
};

export default config;
