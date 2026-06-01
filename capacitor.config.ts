import type { CapacitorConfig } from "@capacitor/cli";

const APP_URL = "https://apk-hub-six.vercel.app";

const config: CapacitorConfig = {
  appId: "com.apkhub.app",
  appName: "ApkHub",
  webDir: "dist/client",
  server: {
    url: APP_URL,
    cleartext: true,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#7c3aed",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
