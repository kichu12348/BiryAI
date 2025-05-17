import { SafeAreaProvider } from "react-native-safe-area-context";
import Main from "./components/Main";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as NavigationBar from "expo-navigation-bar";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import { Platform } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    const setNav = async () => {
      if (Platform.OS === "android") {
        await NavigationBar.setBackgroundColorAsync("#000000");
        await NavigationBar.setButtonStyleAsync("light");
      }
    };
    setNav();
  }, []);

  useEffect(() => {
    async function checkForUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log("Update error:", error.message);
      }
    }
    checkForUpdates();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent />
      <Main />
    </SafeAreaProvider>
  );
}
