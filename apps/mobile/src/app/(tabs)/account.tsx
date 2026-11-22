import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  formatCreditBalance,
  performDeleteAccount,
  performSignOut,
  useDeleteAccount,
  useEntitlements,
} from "@/features/account";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import { useMobileUser } from "@/hooks/use-mobile-user";
import { WEB_ORIGIN } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

export default function AccountTab() {
  const { isSignedIn, signOut } = useMobileAuth();
  const { user } = useMobileUser();
  const queryClient = useQueryClient();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { data: entitlements, isLoading: isEntitlementsLoading } =
    useEntitlements(Boolean(isSignedIn));

  const deleteAccountMutation = useDeleteAccount();

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    "";

  const handleSignOutPress = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of CherryQube?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await performSignOut(signOut, queryClient);
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccountPress = () => {
    // Step 1: Initial warning
    Alert.alert(
      "Delete Account?",
      "Are you sure you want to delete your account? This will permanently remove your account and all associated data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: showSecondDeleteConfirmation,
        },
      ],
    );
  };

  const showSecondDeleteConfirmation = () => {
    // Step 2: Detailed second confirmation listing all purged items
    Alert.alert(
      "Confirm Permanent Deletion",
      "This action cannot be undone. It will immediately and permanently delete:\n\n" +
        "• All your creations and draft videos\n" +
        "• All guests and personalized links\n" +
        "• All rendered videos and posters\n" +
        "• All uploaded photos\n" +
        "• Your CherryQube account profile\n\n" +
        "Are you absolutely sure you want to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account Permanently",
          style: "destructive",
          onPress: executeAccountDeletion,
        },
      ],
    );
  };

  const executeAccountDeletion = async () => {
    setIsDeleting(true);
    try {
      await performDeleteAccount(
        () => deleteAccountMutation.mutateAsync(),
        signOut,
        queryClient,
      );
      router.replace("/(tabs)");
    } catch (error: unknown) {
      Alert.alert(
        "Deletion Failed",
        error instanceof Error
          ? error.message
          : "We could not delete your account right now. Please try again or contact support.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openExternalUrl = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      // Ignored
    }
  };

  if (!isSignedIn) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
        </View>
        <View style={styles.signedOutContainer}>
          <View style={styles.signedOutCard}>
            <Text style={styles.signedOutTitle}>Sign in to CherryQube</Text>
            <Text style={styles.signedOutCopy}>
              Sign in to manage your export credits, personalized creations, and
              account settings.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in with your account"
              onPress={() => router.push("/(modals)/sign-in")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </Pressable>
          </View>

          <View style={styles.linksCard}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="View Terms of Service"
              onPress={() => openExternalUrl(`${WEB_ORIGIN}/terms`)}
              style={styles.linkRow}
            >
              <Text style={styles.linkLabel}>Terms of Service</Text>
              <Text style={styles.linkArrow}>↗</Text>
            </Pressable>

            <View style={styles.linkDivider} />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="View Privacy Policy"
              onPress={() => openExternalUrl(`${WEB_ORIGIN}/privacy`)}
              style={styles.linkRow}
            >
              <Text style={styles.linkLabel}>Privacy Policy</Text>
              <Text style={styles.linkArrow}>↗</Text>
            </Pressable>

            <View style={styles.linkDivider} />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Contact Support"
              onPress={() => openExternalUrl("mailto:support@cherryqube.com")}
              style={styles.linkRow}
            >
              <Text style={styles.linkLabel}>Support</Text>
              <Text style={styles.linkArrow}>↗</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Signed in as</Text>
          <Text style={styles.emailText} numberOfLines={1}>
            {email || "Signed-in user"}
          </Text>
        </View>

        {/* Entitlements Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Export Credits</Text>
          <View style={styles.creditsRow}>
            {isEntitlementsLoading ? (
              <ActivityIndicator
                size="small"
                color={mobileTheme.colors.accent}
              />
            ) : (
              <Text style={styles.creditsCount}>
                {formatCreditBalance(entitlements?.balance)}
              </Text>
            )}
          </View>
          <Text style={styles.creditsDescription}>
            Credits allow watermark-free 1080p full HD exports. Free 720p
            watermarked exports are always unlimited.
          </Text>
        </View>

        {/* Legal & Support Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Information & Legal</Text>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Terms of Service in browser"
            onPress={() => openExternalUrl(`${WEB_ORIGIN}/terms`)}
            style={styles.linkRow}
          >
            <Text style={styles.linkLabel}>Terms of Service</Text>
            <Text style={styles.linkArrow}>↗</Text>
          </Pressable>

          <View style={styles.linkDivider} />

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy in browser"
            onPress={() => openExternalUrl(`${WEB_ORIGIN}/privacy`)}
            style={styles.linkRow}
          >
            <Text style={styles.linkLabel}>Privacy Policy</Text>
            <Text style={styles.linkArrow}>↗</Text>
          </Pressable>

          <View style={styles.linkDivider} />

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Contact Support via email"
            onPress={() => openExternalUrl("mailto:support@cherryqube.com")}
            style={styles.linkRow}
          >
            <Text style={styles.linkLabel}>Customer Support</Text>
            <Text style={styles.linkArrow}>↗</Text>
          </Pressable>
        </View>

        {/* Actions Card */}
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out of account"
            onPress={handleSignOutPress}
            disabled={isSigningOut || isDeleting}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutButtonText}>
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Text>
          </Pressable>

          <View style={styles.linkDivider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Permanently delete account"
            onPress={handleDeleteAccountPress}
            disabled={isSigningOut || isDeleting}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>
              {isDeleting ? "Deleting account..." : "Delete Account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border + "33",
    backgroundColor: mobileTheme.colors.surface,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 26,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "33",
  },
  cardSectionTitle: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    color: mobileTheme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emailText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 18,
    color: mobileTheme.colors.ink,
  },
  creditsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  creditsCount: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    color: mobileTheme.colors.accent,
  },
  creditsDescription: {
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: mobileTheme.colors.muted,
  },
  linkRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  linkLabel: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
    color: mobileTheme.colors.ink,
  },
  linkArrow: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
    color: mobileTheme.colors.muted,
  },
  linkDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: mobileTheme.colors.border + "33",
    marginVertical: 4,
  },
  signOutButton: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
    color: mobileTheme.colors.ink,
  },
  deleteButton: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
    color: mobileTheme.colors.status.failedText,
  },
  signedOutContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    gap: 20,
  },
  signedOutCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "33",
    alignItems: "center",
  },
  signedOutTitle: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    color: mobileTheme.colors.ink,
    marginBottom: 8,
    textAlign: "center",
  },
  signedOutCopy: {
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: mobileTheme.colors.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  primaryButton: {
    minHeight: 48,
    minWidth: 160,
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
    color: mobileTheme.colors.surface,
  },
  linksCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "33",
  },
});
