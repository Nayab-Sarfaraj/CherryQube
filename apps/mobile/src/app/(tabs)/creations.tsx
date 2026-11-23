import { Image } from "expo-image";
import { router } from "expo-router";
import { themeNames, type ThemeId } from "@greetings/shared";
import { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useCreations,
  useDeleteCreation,
} from "@/features/creations/use-creations";
import { FloralSprig } from "@/components/ui/floral-sprig";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import { useScreenActivity } from "@/hooks/use-screen-activity";
import { WEB_ORIGIN } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

function resolvePosterUrl(url?: string | null) {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${WEB_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatDate(isoString: string) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function CreationsTab() {
  const { isLoaded, isSignedIn } = useMobileAuth();
  const { isFocused, isForeground } = useScreenActivity();
  const deleteCreation = useDeleteCreation();

  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCreations({
    enabled: Boolean(isLoaded && isSignedIn),
    isFocused,
    isForeground,
  });

  const creations = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  useEffect(() => {
    if (isFocused && isForeground) {
      void refetch();
    }
  }, [isFocused, isForeground, refetch]);

  const confirmDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert(
        "Delete this creation?",
        `Are you sure you want to delete "${title}"? This cannot be undone and removes all associated guests and exports.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteCreation.mutate(id),
          },
        ],
      );
    },
    [deleteCreation],
  );

  if (!isLoaded) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={mobileTheme.colors.accent} />
          <Text style={styles.statusText}>Checking your account…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.contentContainer}>
          <FloralSprig size={48} style={styles.authSprig} />
          <Text style={styles.title}>Keep your celebrations close.</Text>
          <Text style={styles.copy}>
            Sign in to revisit your saved cards and invitations from any
            device.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in to your account"
            onPress={() => router.push("/(modals)/sign-in")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <FlatList
        data={creations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={mobileTheme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerBrandRow}>
              <FloralSprig size={28} />
              <Text style={styles.kicker}>CherryQube</Text>
            </View>
            <Text style={styles.title}>My creations</Text>
            <Text style={styles.copy}>
              Manage your saved cards, monitor exports, and share links.
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator
                size="small"
                color={mobileTheme.colors.accent}
              />
              <Text style={styles.emptyText}>Loading creations…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.errorTitle}>Could not load creations</Text>
              <Text style={styles.errorCopy}>
                {error instanceof Error
                  ? error.message
                  : "Please check your network connection and try again."}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading creations"
                onPress={() => void refetch()}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <FloralSprig size={48} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No creations yet</Text>
              <Text style={styles.emptyText}>
                You haven’t created any greetings or invitations yet. Browse our
                holiday templates to get started!
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a template"
                onPress={() => router.push("/")}
                style={styles.browseButton}
              >
                <Text style={styles.browseButtonText}>Browse templates</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator
                size="small"
                color={mobileTheme.colors.accent}
              />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const poster = resolvePosterUrl(item.posterUrl);
          const themeName = item.themeId
            ? (themeNames[item.themeId as ThemeId] ?? item.themeId)
            : "";
          const typeLabel = item.type === "card" ? "Card" : "Invitation";
          const status = item.status.toLowerCase();

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() =>
                router.push({
                  pathname: "/creation/[id]",
                  params: {
                    id: item.id,
                    renderId: item.currentRender?.id,
                  },
                })
              }
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.cardHeader}>
                {poster ? (
                  <Image
                    source={poster}
                    style={styles.posterThumbnail}
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                ) : (
                  <View style={styles.posterPlaceholder}>
                    <Text style={styles.posterPlaceholderText}>
                      {typeLabel}
                    </Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <View style={styles.tagRow}>
                    <Text style={styles.metaText}>
                      {themeName ? `${themeName} · ` : ""}
                      {typeLabel}
                    </Text>
                    <StatusBadge status={status} />
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.dateText}>
                    {formatDate(item.updatedAt || item.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${item.title}`}
                  hitSlop={8}
                  onPress={() => confirmDelete(item.id, item.title)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  let badgeStyle: ViewStyle = styles.badgeDraft;
  let textStyle: TextStyle = styles.badgeTextDraft;
  let label = "Draft";

  if (status === "queued" || status === "rendering") {
    badgeStyle = styles.badgeRendering;
    textStyle = styles.badgeTextRendering;
    label = "Rendering";
  } else if (status === "ready") {
    badgeStyle = styles.badgeReady;
    textStyle = styles.badgeTextReady;
    label = "Ready";
  } else if (status === "failed") {
    badgeStyle = styles.badgeFailed;
    textStyle = styles.badgeTextFailed;
    label = "Failed";
  }

  return (
    <View style={[styles.badgeBase, badgeStyle]}>
      <Text style={[styles.badgeTextBase, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  authSprig: { marginBottom: 16 },
  statusText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
    fontSize: 16,
    marginTop: 12,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: mobileTheme.colors.palette.marigold + "1A",
    borderColor: mobileTheme.colors.border + "44",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    padding: 20,
  },
  headerBrandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  kicker: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
    marginTop: 10,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 32,
    lineHeight: 38,
    marginTop: 6,
  },
  copy: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
  },
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border + "88",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 14,
  },
  posterThumbnail: {
    width: 68,
    height: 96,
    borderRadius: 12,
    backgroundColor: mobileTheme.colors.border,
  },
  posterPlaceholder: {
    width: 68,
    height: 96,
    borderRadius: 12,
    backgroundColor: mobileTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  posterPlaceholderText: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_500Medium",
    fontSize: 11,
    textAlign: "center",
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaText: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
  },
  cardTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 4,
  },
  dateText: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10,
    borderTopColor: mobileTheme.colors.border + "66",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  deleteButton: {
    borderColor: mobileTheme.colors.border + "55",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  badgeBase: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeTextBase: {
    fontSize: 11,
    fontFamily: "Figtree_600SemiBold",
    textTransform: "capitalize",
  },
  badgeDraft: {
    backgroundColor: mobileTheme.colors.status.draftBg,
  },
  badgeTextDraft: {
    color: mobileTheme.colors.status.draftText,
  },
  badgeRendering: {
    backgroundColor: mobileTheme.colors.status.renderingBg,
  },
  badgeTextRendering: {
    color: mobileTheme.colors.status.renderingText,
  },
  badgeReady: {
    backgroundColor: mobileTheme.colors.status.readyBg,
  },
  badgeTextReady: {
    color: mobileTheme.colors.status.readyText,
  },
  badgeFailed: {
    backgroundColor: mobileTheme.colors.status.failedBg,
  },
  badgeTextFailed: {
    color: mobileTheme.colors.status.failedText,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  browseButtonText: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
  },
  errorTitle: {
    color: mobileTheme.colors.accent,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    marginBottom: 6,
  },
  errorCopy: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    borderColor: mobileTheme.colors.accent,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButtonText: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
