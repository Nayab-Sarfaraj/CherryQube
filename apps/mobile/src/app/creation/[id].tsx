import * as Clipboard from "expo-clipboard";
import { useVideoPlayer, VideoView } from "expo-video";
import { router, useLocalSearchParams } from "expo-router";
import { themeNames, type ThemeId } from "@greetings/shared";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useCreationDetail,
  useRenderJob,
  useRetryRender,
} from "@/features/creations/use-creations";
import { FloralSprig } from "@/components/ui/floral-sprig";
import { PillBadge, type PillBadgeVariant } from "@/components/ui/pill-badge";
import { PrimaryButton } from "@/components/ui/primary-button";
import { useScreenActivity } from "@/hooks/use-screen-activity";
import { WEB_ORIGIN } from "@/lib/mobile-config";
import { shareCreation } from "@/lib/native-share";
import { mobileTheme } from "@/theme/theme";

function resolveMediaUrl(url?: string | null) {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${WEB_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function CreationDetailRoute() {
  const { id, renderId: initialRenderId } = useLocalSearchParams<{
    id: string;
    renderId?: string;
  }>();

  const { isFocused, isForeground } = useScreenActivity();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const {
    data: creation,
    isLoading: isCreationLoading,
    error: creationError,
    refetch: refetchCreation,
  } = useCreationDetail(id);

  const activeRenderId = initialRenderId || creation?.currentRender?.id;

  const { data: renderJob } = useRenderJob(activeRenderId, {
    isFocused,
    isForeground,
  });

  const retryRender = useRetryRender();

  const currentStatus = (
    renderJob?.status ||
    creation?.currentRender?.status ||
    creation?.status ||
    "draft"
  ).toLowerCase();

  const videoUrl = resolveMediaUrl(
    renderJob?.fileUrl || creation?.currentRender?.fileUrl,
  );
  const publicUrl = creation?.publicUrl;

  const player = useVideoPlayer(videoUrl ?? null, (p) => {
    p.loop = true;
    if (videoUrl) {
      p.play();
    }
  });

  useEffect(() => {
    if (videoUrl && player) {
      player.play();
    }
  }, [player, videoUrl]);

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    await Clipboard.setStringAsync(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await shareCreation(videoUrl, publicUrl);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRetry = () => {
    if (activeRenderId) {
      retryRender.mutate(activeRenderId);
    }
  };

  const themeName = creation?.themeId
    ? (themeNames[creation.themeId as ThemeId] ?? creation.themeId)
    : "";
  const typeLabel = creation?.type === "card" ? "Card" : "Invitation";
  const isInvitation = creation?.type === "invitation";

  let statusVariant: PillBadgeVariant = "draft";
  let statusText = "Draft";
  if (currentStatus === "queued" || currentStatus === "rendering") {
    statusVariant = "rendering";
    statusText = "Rendering";
  } else if (currentStatus === "ready") {
    statusVariant = "ready";
    statusText = "Ready";
  } else if (currentStatus === "failed") {
    statusVariant = "failed";
    statusText = "Failed";
  }

  if (isCreationLoading && !creation) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={mobileTheme.colors.accent} />
          <Text style={styles.statusText}>Loading creation details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (creationError && !creation) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <View style={styles.centerContainer}>
          <View style={[styles.errorCard, mobileTheme.shadows.cardElevated]}>
            <Text style={styles.errorTitle}>Could not load creation</Text>
            <Text style={styles.errorCopy}>
              {creationError instanceof Error
                ? creationError.message
                : "Something went wrong loading this creation."}
            </Text>
            <PrimaryButton
              label="Retry"
              size="md"
              variant="primary"
              onPress={() => void refetchCreation()}
              style={{ width: "100%", marginTop: 16 }}
            />
            <PrimaryButton
              label="Back to creations"
              size="md"
              variant="outline"
              onPress={() => router.back()}
              style={{ width: "100%", marginTop: 8 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <View style={styles.headerBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {creation?.title ?? "Creation Detail"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Creation metadata header card */}
        <View style={[styles.metaCard, mobileTheme.shadows.card]}>
          <View style={styles.metaTopRow}>
            <PillBadge
              label={themeName ? `${themeName} · ${typeLabel}` : typeLabel}
              variant="accent"
              size="sm"
            />
            <PillBadge label={statusText} variant={statusVariant} size="sm" />
          </View>
          <Text style={styles.creationTitle}>{creation?.title}</Text>
        </View>

        {/* 1. Rendering / Queued state */}
        {(currentStatus === "queued" || currentStatus === "rendering") && (
          <View style={[styles.stateCard, mobileTheme.shadows.card]}>
            <ActivityIndicator
              size="large"
              color={mobileTheme.colors.accent}
              style={styles.spinner}
            />
            <Text style={styles.stateTitle}>
              {typeof renderJob?.progress === "number" && renderJob.progress > 0
                ? `Rendering your video (${renderJob.progress}%)`
                : "Your video is rendering"}
            </Text>
            {typeof renderJob?.progress === "number" &&
              renderJob.progress > 0 && (
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(5, renderJob.progress))}%`,
                      },
                    ]}
                  />
                </View>
              )}
            <Text style={styles.stateCopy}>
              We’re rendering your high-quality video. This usually takes under
              a minute. You can wait here or come back anytime.
            </Text>
          </View>
        )}

        {/* 2. Ready state */}
        {currentStatus === "ready" && (
          <View style={[styles.stateCard, mobileTheme.shadows.cardElevated]}>
            {videoUrl ? (
              <View style={styles.videoWrapper}>
                <VideoView
                  style={styles.videoPlayer}
                  player={player}
                  fullscreenOptions={{ enable: true }}
                  allowsPictureInPicture
                />
              </View>
            ) : (
              <View style={styles.placeholderBox}>
                <FloralSprig size={32} />
                <Text style={styles.placeholderText}>
                  Your video is ready to view and share.
                </Text>
              </View>
            )}

            <View style={styles.actionButtonGroup}>
              <PrimaryButton
                label={isSharing ? "Preparing share…" : "Share video"}
                size="md"
                variant="primary"
                loading={isSharing}
                onPress={() => void handleShare()}
              />

              {publicUrl && (
                <PrimaryButton
                  label={copied ? "Link copied!" : "Copy public link"}
                  size="md"
                  variant="secondary"
                  onPress={() => void handleCopyLink()}
                />
              )}
            </View>

            {/* Invitation Guests button */}
            {isInvitation && (
              <View style={styles.guestsEntryCard}>
                <View style={styles.guestsEntryInfo}>
                  <Text style={styles.guestsEntryTitle}>Guest Links</Text>
                  <Text style={styles.guestsEntryCopy}>
                    {creation?.guestCount ?? 0} guest
                    {(creation?.guestCount ?? 0) === 1 ? "" : "s"} added
                  </Text>
                </View>
                <PrimaryButton
                  label="Manage guests →"
                  size="sm"
                  variant="outline"
                  onPress={() =>
                    router.push({
                      pathname: "/creation/[id]/guests",
                      params: { id: creation.id },
                    })
                  }
                />
              </View>
            )}
          </View>
        )}

        {/* 3. Failed state */}
        {currentStatus === "failed" && (
          <View
            style={[
              styles.stateCard,
              styles.failedBorder,
              mobileTheme.shadows.card,
            ]}
          >
            <Text style={styles.errorTitle}>Render failed</Text>
            <Text style={styles.stateCopy}>
              {renderJob?.error ||
                creation?.currentRender?.error ||
                "There was an error while rendering this video. You can retry the export without using an extra credit."}
            </Text>

            <PrimaryButton
              label={retryRender.isPending ? "Retrying…" : "Retry export"}
              size="md"
              variant="primary"
              loading={retryRender.isPending}
              onPress={handleRetry}
              style={{ width: "100%", marginTop: 8 }}
            />
          </View>
        )}

        {/* 4. Draft state */}
        {currentStatus === "draft" && (
          <View style={[styles.stateCard, mobileTheme.shadows.card]}>
            <FloralSprig size={32} style={{ marginBottom: 10 }} />
            <Text style={styles.stateTitle}>Draft saved</Text>
            <Text style={styles.stateCopy}>
              This creation is currently saved as a draft. Open the editor to
              customize your message or export when ready.
            </Text>
            <PrimaryButton
              label="Continue editing"
              size="md"
              variant="primary"
              style={{ width: "100%", marginTop: 8 }}
              onPress={() =>
                router.push({
                  pathname: "/editor/[templateId]",
                  params: {
                    templateId: creation?.templateId ?? "",
                    draft: creation?.id,
                  },
                })
              }
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: mobileTheme.colors.canvas,
    flex: 1,
  },
  headerBar: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.canvas,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  backButtonText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
  },
  headerTitle: {
    color: mobileTheme.colors.ink,
    flex: 1,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 17,
    textAlign: "center",
  },
  headerSpacer: {
    minWidth: 44,
  },
  centerContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  metaCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  metaTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  creationTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    lineHeight: 28,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    padding: 16,
  },
  failedBorder: {
    borderColor: mobileTheme.colors.status.failedText + "44",
  },
  spinner: {
    marginVertical: 18,
  },
  stateTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  progressBarBg: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    height: 8,
    marginVertical: 12,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: mobileTheme.radius.pill,
    height: "100%",
  },
  stateCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
    textAlign: "center",
  },
  videoWrapper: {
    aspectRatio: 9 / 16,
    backgroundColor: mobileTheme.colors.videoBackdrop,
    borderRadius: mobileTheme.radius.cardSmall,
    marginBottom: 16,
    maxHeight: 460,
    overflow: "hidden",
    width: "100%",
  },
  videoPlayer: {
    height: "100%",
    width: "100%",
  },
  placeholderBox: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: mobileTheme.radius.cardSmall,
    gap: 8,
    height: 180,
    justifyContent: "center",
    marginBottom: 16,
    padding: 16,
    width: "100%",
  },
  placeholderText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  actionButtonGroup: {
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  guestsEntryCard: {
    alignItems: "center",
    borderTopColor: mobileTheme.colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 16,
    width: "100%",
  },
  guestsEntryInfo: {
    flex: 1,
  },
  guestsEntryTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 16,
  },
  guestsEntryCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  statusText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
    fontSize: 15,
    marginTop: 12,
  },
  errorCard: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    padding: 24,
    width: "100%",
  },
  errorTitle: {
    color: mobileTheme.colors.status.failedText,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  errorCopy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
