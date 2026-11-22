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

  // Combine state: renderJob takes precedence if active, else creation.currentRender or creation.status
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
          <Text style={styles.errorTitle}>Could not load creation</Text>
          <Text style={styles.errorCopy}>
            {creationError instanceof Error
              ? creationError.message
              : "Something went wrong loading this creation."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading creation"
            onPress={() => void refetchCreation()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to creations list"
            onPress={() => router.back()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Back to creations</Text>
          </Pressable>
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
        {/* Creation metadata header */}
        <View style={styles.metaCard}>
          <Text style={styles.kicker}>
            {themeName ? `${themeName} · ` : ""}
            {typeLabel}
          </Text>
          <Text style={styles.creationTitle}>{creation?.title}</Text>
          <Text style={styles.metaSub}>
            Status: <Text style={styles.statusBold}>{currentStatus}</Text>
          </Text>
        </View>

        {/* 1. Rendering / Queued state */}
        {(currentStatus === "queued" || currentStatus === "rendering") && (
          <View style={styles.stateCard}>
            <ActivityIndicator
              size="large"
              color={mobileTheme.colors.accent}
              style={styles.spinner}
            />
            <Text style={styles.stateTitle}>Your video is rendering</Text>
            <Text style={styles.stateCopy}>
              We’re rendering your high-quality video. This usually takes under
              a minute. You can wait here or come back anytime.
            </Text>
          </View>
        )}

        {/* 2. Ready state */}
        {currentStatus === "ready" && (
          <View style={styles.stateCard}>
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
                <Text style={styles.placeholderText}>
                  Your video is ready to view and share.
                </Text>
              </View>
            )}

            <View style={styles.actionButtonGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share video and link"
                onPress={() => void handleShare()}
                disabled={isSharing}
                style={[
                  styles.primaryButton,
                  isSharing && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isSharing ? "Preparing share…" : "Share video"}
                </Text>
              </Pressable>

              {publicUrl && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy public invitation link"
                  onPress={() => void handleCopyLink()}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {copied ? "Link copied!" : "Copy public link"}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Invitation Guests button */}
            {isInvitation && (
              <View style={styles.guestsEntryCard}>
                <View style={styles.guestsEntryInfo}>
                  <Text style={styles.guestsEntryTitle}>Guest List</Text>
                  <Text style={styles.guestsEntryCopy}>
                    {creation?.guestCount ?? 0} guest
                    {(creation?.guestCount ?? 0) === 1 ? "" : "s"} added
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Manage guests"
                  onPress={() =>
                    router.push({
                      pathname: "/creation/[id]/guests",
                      params: { id: creation.id },
                    })
                  }
                  style={styles.manageGuestsButton}
                >
                  <Text style={styles.manageGuestsButtonText}>
                    Manage guests →
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* 3. Failed state */}
        {currentStatus === "failed" && (
          <View style={[styles.stateCard, styles.failedBorder]}>
            <Text style={styles.errorTitle}>Render failed</Text>
            <Text style={styles.stateCopy}>
              {renderJob?.error ||
                creation?.currentRender?.error ||
                "There was an error while rendering this video. You can retry the export without using an extra credit."}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry rendering video"
              disabled={retryRender.isPending}
              onPress={handleRetry}
              style={[
                styles.primaryButton,
                retryRender.isPending && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {retryRender.isPending ? "Retrying…" : "Retry export"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* 4. Draft state */}
        {currentStatus === "draft" && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Draft saved</Text>
            <Text style={styles.stateCopy}>
              This creation is currently saved as a draft. Open the editor to
              customize your message or export when ready.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue editing in editor"
              onPress={() =>
                router.push({
                  pathname: "/editor/[templateId]",
                  params: {
                    templateId: creation?.templateId ?? "",
                    draft: creation?.id,
                  },
                })
              }
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Continue editing</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border,
    backgroundColor: mobileTheme.colors.surface,
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  },
  backButtonText: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 17,
  },
  headerSpacer: {
    minWidth: 44,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  metaCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  kicker: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  creationTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 6,
  },
  metaSub: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
  },
  statusBold: {
    fontFamily: "Figtree_600SemiBold",
    textTransform: "capitalize",
    color: mobileTheme.colors.ink,
  },
  stateCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  failedBorder: {
    borderColor: mobileTheme.colors.accent,
  },
  spinner: {
    marginVertical: 16,
  },
  stateTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  stateCopy: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 16,
  },
  videoWrapper: {
    width: "100%",
    aspectRatio: 9 / 16,
    maxHeight: 480,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: mobileTheme.colors.videoBackdrop,
    marginBottom: 16,
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  placeholderBox: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: mobileTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    padding: 16,
  },
  placeholderText: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  actionButtonGroup: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  primaryButtonText: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: mobileTheme.colors.border,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    backgroundColor: mobileTheme.colors.background,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  guestsEntryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: mobileTheme.colors.border,
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
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  manageGuestsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  manageGuestsButtonText: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  statusText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
    fontSize: 16,
    marginTop: 12,
  },
  errorTitle: {
    color: mobileTheme.colors.accent,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  errorCopy: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
});
