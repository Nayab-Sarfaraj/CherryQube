import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "@/theme/theme";

export default function AccountTab() {
  return <View style={styles.container}><Text style={styles.title}>Account</Text><Text style={styles.copy}>Sign in to see your account and credit balance.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(modals)/sign-in")}><Text style={styles.link}>Sign in</Text></Pressable></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: mobileTheme.colors.background, justifyContent: "center", padding: 24 }, title: { color: mobileTheme.colors.ink, fontFamily: "Fraunces_600SemiBold", fontSize: 30 }, copy: { color: mobileTheme.colors.ink, fontFamily: "Figtree_400Regular", fontSize: 16, lineHeight: 24, marginTop: 12 }, link: { color: mobileTheme.colors.accent, fontFamily: "Figtree_600SemiBold", fontSize: 16, marginTop: 24, textDecorationLine: "underline" } });
