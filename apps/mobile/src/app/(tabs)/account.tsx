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
import { FloralSprig } from "@/components/ui/floral-sprig";
import { PillBadge } from "@/components/ui/pill-badge";
import { PrimaryButton } from "@/components/ui/primary-button";
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

  const userInitial = email ? email.charAt(0).toUpperCase() : "C";

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
        <View style={styles.headerAmbient}>
          <View style={styles.ambientHalo} />
          <FloralSprig size={38} />
          <Text style={styles.title}>Your Account</Text>
          <Text style={styles.headerCopy}>
            Your saved celebrations and export preferences.
          </Text>
        </View>

        <View style={styles.signedOutContainer}>
          <View
            style={[styles.signedOutCard, mobileTheme.shadows.cardElevated]}
          >
            <FloralSprig size={40} style={{ marginBottom: 12 }} />
            <Text style={styles.signedOutTitle}>Sign in to CherryQube</Text>
            <Text style={styles.signedOutCopy}>
              Sign in to manage your export credits, personalized creations, and
              account settings.
            </Text>
            <PrimaryButton
              label="Sign In"
              size="lg"
              variant="primary"
              style={{ width: "100%", marginTop: 8 }}
              onPress={() => router.push("/(modals)/sign-in")}
            />
          </View>

          <View style={[styles.linksCard, mobileTheme.shadows.card]}>
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
      <View style={styles.headerAmbient}>
        <View style={styles.ambientHalo} />
        <View style={styles.avatarRing}>
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
        </View>
        <Text style={styles.profileEmail} numberOfLines={1}>
          {email || "Signed-in creator"}
        </Text>
        <PillBadge
          label="Studio Member"
          variant="accent"
          size="sm"
          style={{ marginTop: 6 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Entitlements Card */}
        <View style={[styles.card, mobileTheme.shadows.card]}>
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
        <View style={[styles.card, mobileTheme.shadows.card]}>
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
        <View style={[styles.card, mobileTheme.shadows.card]}>
          <PrimaryButton
            label={isSigningOut ? "Signing out…" : "Sign Out"}
            size="md"
            variant="secondary"
            loading={isSigningOut}
            disabled={isSigningOut || isDeleting}
            onPress={handleSignOutPress}
            style={{ width: "100%" }}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Permanently delete account"
            onPress={handleDeleteAccountPress}
            disabled={isSigningOut || isDeleting}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>
              {isDeleting ? "Deleting account…" : "Delete Account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: mobileTheme.colors.canvas,
    flex: 1,
  },
  headerAmbient: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    overflow: "hidden",
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    position: "relative",
  },
  ambientHalo: {
    backgroundColor: mobileTheme.colors.palette.marigold + "22",
    borderRadius: 999,
    height: 220,
    position: "absolute",
    right: -40,
    top: -60,
    width: 220,
  },
  avatarRing: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.accentGold + "66",
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 2,
    height: 72,
    justifyContent: "center",
    marginBottom: 10,
    width: 72,
  },
  avatarInner: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: mobileTheme.radius.pill,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  avatarText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 24,
  },
  profileEmail: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    textAlign: "center",
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 26,
    marginTop: 10,
  },
  headerCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    textAlign: "center",
  },
  scrollContent: {
    gap: 14,
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    padding: 18,
  },
  cardSectionTitle: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },
  creditsRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 6,
  },
  creditsCount: {
    color: mobileTheme.colors.accent,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
  },
  creditsDescription: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingVertical: 2,
  },
  linkLabel: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
    fontSize: 15,
  },
  linkArrow: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
  },
  linkDivider: {
    backgroundColor: mobileTheme.colors.hairline,
    height: 1,
    marginVertical: 4,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
  },
  deleteButtonText: {
    color: mobileTheme.colors.status.failedText,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  signedOutContainer: {
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 16,
  },
  signedOutCard: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    padding: 24,
  },
  signedOutTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    marginBottom: 8,
    textAlign: "center",
  },
  signedOutCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  linksCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    padding: 16,
  },
});
