import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobileTheme } from "@/theme/theme";

export default function CreationRoute() {
  const { renderId } = useLocalSearchParams<{ renderId?: string }>();
  return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.title}>Your video is rendering</Text><Text style={styles.copy}>We’ll keep checking its progress. Creation detail, playback, and sharing arrive in the next slice.</Text><Text style={styles.reference}>Render {renderId}</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: mobileTheme.colors.background }, content: { flex: 1, justifyContent: "center", padding: 24 }, title: { color: mobileTheme.colors.ink, fontFamily: "Fraunces_600SemiBold", fontSize: 30 }, copy: { color: mobileTheme.colors.ink, fontFamily: "Figtree_400Regular", fontSize: 16, lineHeight: 24, marginTop: 12 }, reference: { color: mobileTheme.colors.muted, fontFamily: "Figtree_400Regular", fontSize: 12, marginTop: 24 } });
