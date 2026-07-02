import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.royalbroiler',
  appName: 'Royal Broiler',
  webDir: 'dist',
  server: {
    // Hybrid shell: load the hosted web app so SSR + server functions keep working.
    url: 'https://royal-poultry-pro.lovable.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0B1A14',
  },
};

export default config;
