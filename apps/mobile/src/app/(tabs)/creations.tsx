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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useCreations,
  useDeleteCreation,
} from "@/features/creations/use-creations";
import { FloralSprig } from "@/components/ui/floral-sprig";
import { PillBadge, type PillBadgeVariant } from "@/components/ui/pill-badge";
import { getCreationStatusBadge } from "@/features/creations/status";
import { PrimaryButton } from "@/components/ui/primary-button";
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
          <View style={[styles.authCard, mobileTheme.shadows.cardElevated]}>
            <FloralSprig size={44} style={styles.authSprig} />
            <Text style={styles.authTitle}>Keep your celebrations close.</Text>
            <Text style={styles.authCopy}>
              Sign in to revisit your saved cards and invitations from any
              device.
            </Text>
            <PrimaryButton
              label="Sign in"
              size="lg"
              variant="primary"
              style={styles.authButton}
              onPress={() => router.push("/(modals)/sign-in")}
            />
          </View>
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
              <FloralSprig size={22} />
              <Text style={styles.kicker}>CHERRYQUBE</Text>
            </View>
            <Text style={styles.title}>My Creations</Text>
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
            <View style={styles.emptyCard}>
              <Text style={styles.errorTitle}>Could not load creations</Text>
              <Text style={styles.errorCopy}>
                {error instanceof Error
                  ? error.message
                  : "Please check your network connection and try again."}
              </Text>
              <PrimaryButton
                label="Retry"
                size="md"
                variant="outline"
                onPress={() => void refetch()}
              />
            </View>
          ) : (
            <View style={[styles.emptyCard, mobileTheme.shadows.card]}>
              <FloralSprig size={40} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No creations yet</Text>
              <Text style={styles.emptyText}>
                You haven’t created any greetings or invitations yet. Browse our
                holiday templates to get started!
              </Text>
              <PrimaryButton
                label="Browse templates"
                size="md"
                variant="primary"
                onPress={() => router.push("/")}
              />
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
          const status = (
            item.currentRender?.status || item.status
          ).toLowerCase();

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
                styles.creationCard,
                mobileTheme.shadows.card,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.cardMainRow}>
                {poster ? (
                  <Image
                    source={poster}
                    style={styles.posterThumbnail}
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                ) : (
                  <View style={styles.posterPlaceholder}>
                    <FloralSprig size={20} />
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

                <PrimaryButton
                  label="View details"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: "/creation/[id]",
                      params: {
                        id: item.id,
                        renderId: item.currentRender?.id,
                      },
                    })
                  }
                />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { variant, label } = getCreationStatusBadge(status);
  return <PillBadge label={label} variant={variant} size="sm" />;
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: mobileTheme.colors.canvas,
    flex: 1,
  },
  centerContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  authCard: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    padding: 28,
  },
  authSprig: {
    marginBottom: 16,
  },
  authTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  authCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  authButton: {
    marginTop: 22,
    width: "100%",
  },
  statusText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
    fontSize: 15,
    marginTop: 12,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    paddingTop: 8,
  },
  headerBrandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  kicker: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 16,
    letterSpacing: 1.1,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 28,
    lineHeight: 34,
    marginTop: 8,
  },
  copy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  creationCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 14,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardMainRow: {
    flexDirection: "row",
    gap: 14,
  },
  posterThumbnail: {
    aspectRatio: 0.72,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: 14,
    height: 110,
  },
  posterPlaceholder: {
    alignItems: "center",
    aspectRatio: 0.72,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: 14,
    height: 110,
    justifyContent: "center",
    padding: 6,
  },
  posterPlaceholderText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  tagRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  cardTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 4,
  },
  dateText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
  },
  cardActions: {
    alignItems: "center",
    borderTopColor: mobileTheme.colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: mobileTheme.colors.status.failedText,
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    padding: 28,
  },
  emptyTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: "center",
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
    marginBottom: 16,
    textAlign: "center",
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: 16,
  },
});
