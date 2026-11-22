import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { mobileTheme } from "@/theme/theme";

export default function CreationsTab() {
  return <View style={styles.container}><Text style={styles.title}>My creations</Text><Text style={styles.copy}>Your saved cards and invitations will appear here.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(modals)/sign-in")}><Text style={styles.link}>Sign in</Text></Pressable></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: mobileTheme.colors.background, justifyContent: "center", padding: 24 }, title: { color: mobileTheme.colors.ink, fontFamily: "Fraunces_600SemiBold", fontSize: 30 }, copy: { color: mobileTheme.colors.ink, fontFamily: "Figtree_400Regular", fontSize: 16, lineHeight: 24, marginTop: 12 }, link: { color: mobileTheme.colors.accent, fontFamily: "Figtree_600SemiBold", fontSize: 16, marginTop: 24, textDecorationLine: "underline" } });
