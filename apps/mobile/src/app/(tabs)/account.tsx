import { FloralSprig } from "@/components/ui/floral-sprig";
import { PillBadge } from "@/components/ui/pill-badge";
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
import Svg, { Path } from "react-native-svg";

function DocumentIcon({
  size = 18,
  color = mobileTheme.colors.quietInk,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Path d="M14 2v6h6" />
      <Path d="M16 13H8" />
      <Path d="M16 17H8" />
      <Path d="M10 9H8" />
    </Svg>
  );
}

function ShieldIcon({
  size = 18,
  color = mobileTheme.colors.quietInk,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  );
}

function SupportIcon({
  size = 18,
  color = mobileTheme.colors.quietInk,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
  );
}

function SparkleStar({
  size = 13,
  color = mobileTheme.colors.palette.marigold,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </Svg>
  );
}

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

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.ambientGlow} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Header */}
        <View style={styles.header}>
          <View style={styles.kickerRow}>
            <FloralSprig
              size={22}
              color={mobileTheme.colors.accent}
              accentColor={mobileTheme.colors.palette.marigold}
            />
            <Text style={styles.kickerText}>CREATOR STUDIO</Text>
          </View>
          <Text style={styles.title}>Your Account</Text>
          <Text style={styles.subtitle}>
            Celebrations, seasonal themes & export studio.
          </Text>
        </View>

        {/* Hero Card: Signed Out vs Signed In */}
        {!isSignedIn ? (
          <View style={[styles.heroCard, mobileTheme.shadows.cardElevated]}>
            <View style={styles.medallionWrap}>
              <View style={styles.medallion}>
                <FloralSprig
                  size={36}
                  color={mobileTheme.colors.accent}
                  accentColor={mobileTheme.colors.palette.marigold}
                />
              </View>
            </View>

            <Text style={styles.heroCardTitle}>Preserve your celebrations</Text>
            <Text style={styles.heroCardCopy}>
              Sign in to keep greeting cards, personalize video invitations, and
              sync guest lists across web & mobile.
            </Text>

            {/* Studio Perks */}
            <View style={styles.perksContainer}>
              <View style={styles.perkRow}>
                <SparkleStar />
                <Text style={styles.perkText}>
                  Watermark-free 1080p exports
                </Text>
              </View>
              <View style={styles.perkRow}>
                <SparkleStar />
                <Text style={styles.perkText}>
                  Unique per-guest RSVP links & WhatsApp sharing
                </Text>
              </View>
              <View style={styles.perkRow}>
                <SparkleStar />
                <Text style={styles.perkText}>
                  Cloud draft restoration & private media storage
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in or create account"
              onPress={() => router.push("/(modals)/sign-in")}
              style={({ pressed }) => [
                styles.primaryCta,
                pressed && styles.primaryCtaPressed,
              ]}
            >
              <Text style={styles.primaryCtaText}>
                Sign In or Create Account
              </Text>
              <Text style={styles.primaryCtaArrow}>→</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.profileCard, mobileTheme.shadows.cardElevated]}>
            <View style={styles.profileTopRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              </View>
              <View style={styles.profileMeta}>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {email || "Signed-in Creator"}
                </Text>
                <View style={styles.badgeRow}>
                  <PillBadge
                    label="STUDIO CREATOR"
                    variant="accent"
                    size="sm"
                  />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Export Credits Section */}
            <View style={styles.creditsSection}>
              <Text style={styles.sectionEyebrow}>EXPORT CREDITS</Text>
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
          </View>
        )}

        {/* Seasonal Themes Showcase */}
        {/* 
        {/* Studio & Support Card */}
        <View style={[styles.sectionCard, mobileTheme.shadows.card]}>
          <Text style={styles.sectionCardEyebrow}>STUDIO & LEGAL</Text>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View Terms of Service"
            onPress={() => openExternalUrl(`${WEB_ORIGIN}/terms`)}
            style={({ pressed }) => [
              styles.navRow,
              pressed && styles.navRowPressed,
            ]}
          >
            <View style={styles.navRowLeading}>
              <View style={styles.iconCircle}>
                <DocumentIcon size={16} />
              </View>
              <Text style={styles.navRowLabel}>Terms of Service</Text>
            </View>
            <Text style={styles.navRowArrow}>↗</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View Privacy Policy"
            onPress={() => openExternalUrl(`${WEB_ORIGIN}/privacy`)}
            style={({ pressed }) => [
              styles.navRow,
              pressed && styles.navRowPressed,
            ]}
          >
            <View style={styles.navRowLeading}>
              <View style={styles.iconCircle}>
                <ShieldIcon size={16} />
              </View>
              <Text style={styles.navRowLabel}>Privacy Policy</Text>
            </View>
            <Text style={styles.navRowArrow}>↗</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Contact Customer Support"
            onPress={() => openExternalUrl("mailto:support@cherryqube.com")}
            style={({ pressed }) => [
              styles.navRow,
              pressed && styles.navRowPressed,
            ]}
          >
            <View style={styles.navRowLeading}>
              <View style={styles.iconCircle}>
                <SupportIcon size={16} />
              </View>
              <View>
                <Text style={styles.navRowLabel}>Customer Support</Text>
                <Text style={styles.navRowSubLabel}>
                  support@cherryqube.com
                </Text>
              </View>
            </View>
            <Text style={styles.navRowArrow}>↗</Text>
          </Pressable>
        </View>

        {/* Account Actions: Sign Out & Delete Account (Signed In only) */}
        {isSignedIn ? (
          <View style={[styles.sectionCard, mobileTheme.shadows.card]}>
            <Text style={styles.sectionCardEyebrow}>ACCOUNT ACTIONS</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out of CherryQube"
              onPress={handleSignOutPress}
              disabled={isSigningOut || isDeleting}
              style={({ pressed }) => [
                styles.actionPillButton,
                pressed && styles.actionPillButtonPressed,
              ]}
            >
              {isSigningOut ? (
                <ActivityIndicator
                  size="small"
                  color={mobileTheme.colors.ink}
                />
              ) : (
                <Text style={styles.actionPillButtonText}>Sign Out</Text>
              )}
            </Pressable>

            <View style={styles.divider} />

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
        ) : null}

        {/* Editorial Footer */}
        <View style={styles.footer}>
          <FloralSprig
            size={24}
            color={mobileTheme.colors.quietInk}
            accentColor={mobileTheme.colors.palette.marigold}
          />
          <Text style={styles.footerBrand}>
            CHERRYQUBE · SEASONAL STUDIO v1.0.0
          </Text>
          <Text style={styles.footerCopy}>
            Crafted with botanical care for Thanksgiving, Christmas & New
            Year’s.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: mobileTheme.colors.background,
    flex: 1,
  },
  ambientGlow: {
    backgroundColor: mobileTheme.colors.palette.marigold + "1A",
    borderRadius: 999,
    height: 380,
    position: "absolute",
    right: -80,
    top: -60,
    width: 380,
  },
  scrollContent: {
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    paddingBottom: 20,
    paddingTop: 12,
  },
  kickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  kickerText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.6,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.sheet,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  medallionWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  medallion: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: 999,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68,
    ...mobileTheme.shadows.pill,
  },
  heroCardTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 21,
    lineHeight: 26,
    textAlign: "center",
  },
  heroCardCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  perksContainer: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.cardSmall,
    borderWidth: 1,
    gap: 8,
    marginVertical: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  perkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  perkText: {
    color: mobileTheme.colors.ink,
    flex: 1,
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryCta: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: mobileTheme.radius.pill,
    flexDirection: "row",
    gap: 8,
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
    ...mobileTheme.shadows.pill,
  },
  primaryCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryCtaText: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  primaryCtaArrow: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 17,
  },
  profileCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.sheet,
    borderWidth: 1,
    marginBottom: 16,
    padding: 22,
  },
  profileTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  avatarCircle: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  avatarInitial: {
    color: mobileTheme.colors.accent,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 24,
  },
  profileMeta: {
    flex: 1,
  },
  profileEmail: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    lineHeight: 22,
  },
  badgeRow: {
    alignItems: "flex-start",
    marginTop: 6,
  },
  creditsSection: {
    paddingTop: 6,
  },
  sectionEyebrow: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  creditsRow: {
    alignItems: "center",
    flexDirection: "row",
    marginVertical: 4,
  },
  creditsCount: {
    color: mobileTheme.colors.accent,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 24,
    lineHeight: 30,
  },
  creditsDescription: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    marginBottom: 16,
    padding: 20,
  },
  sectionCardEyebrow: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  sectionCardTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    lineHeight: 22,
  },
  sectionCardCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  themeList: {
    marginTop: 14,
  },
  themeItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  themeItemBorderTop: {
    borderTopColor: mobileTheme.colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  themeTextWrap: {
    flex: 1,
  },
  themeName: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  themeSeason: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  paletteDotsRow: {
    flexDirection: "row",
    gap: 6,
  },
  colorDot: {
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
  navRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: 6,
  },
  navRowPressed: {
    opacity: 0.75,
  },
  navRowLeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  navRowLabel: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  navRowSubLabel: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  navRowArrow: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
  },
  divider: {
    backgroundColor: mobileTheme.colors.hairline,
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  actionPillButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    marginTop: 4,
    width: "100%",
  },
  actionPillButtonPressed: {
    backgroundColor: mobileTheme.colors.canvas,
    opacity: 0.85,
  },
  actionPillButtonText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  deleteButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginTop: 2,
  },
  deleteButtonText: {
    color: "#8E1B2E",
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 16,
  },
  footerBrand: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.4,
    marginTop: 8,
    textAlign: "center",
  },
  footerCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    textAlign: "center",
  },
});
