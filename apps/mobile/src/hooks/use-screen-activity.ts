import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

export function useScreenActivity() {
  const [isFocused, setIsFocused] = useState(true);
  const [isForeground, setIsForeground] = useState(
    AppState.currentState === "active",
  );

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setIsForeground(state === "active");
    });
    return () => subscription.remove();
  }, []);

  return {
    isFocused,
    isForeground,
    isActive: isFocused && isForeground,
  };
}
