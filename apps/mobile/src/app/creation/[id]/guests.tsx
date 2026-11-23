import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloralSprig } from "@/components/ui/floral-sprig";
import { useCreationDetail } from "@/features/creations/use-creations";
import {
  GuestAddForm,
  GuestBulkImport,
  GuestRow,
  formatAllGuestsText,
  useAddGuest,
  useDeleteAllGuests,
  useDeleteGuest,
  useGuests,
  useImportGuests,
} from "@/features/guests";
import { WEB_ORIGIN } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

export default function GuestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [copiedAll, setCopiedAll] = useState(false);

  const {
    data: creation,
    isLoading: isCreationLoading,
    isError: isCreationError,
    error: creationError,
    refetch: refetchCreation,
  } = useCreationDetail(id);

  const isInvitation =
    creation &&
    (creation.type === "invitation" || creation.props?.type === "invitation");

  const {
    data: guests = [],
    isLoading: isGuestsLoading,
    isError: isGuestsError,
    error: guestsError,
    refetch: refetchGuests,
    isRefetching,
  } = useGuests(id, Boolean(isInvitation));

  const addGuest = useAddGuest(id);
  const importGuests = useImportGuests(id);
  const deleteGuest = useDeleteGuest(id);
  const deleteAllGuests = useDeleteAllGuests(id);

  useFocusEffect(
    useCallback(() => {
      if (isInvitation) {
        void refetchGuests();
      } else {
        void refetchCreation();
      }
    }, [isInvitation, refetchGuests, refetchCreation]),
  );

  const handleCopyAll = async () => {
    if (guests.length === 0) return;
    const payload = formatAllGuestsText(guests, WEB_ORIGIN);
    await Clipboard.setStringAsync(payload);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      "Delete All Guests",
      `Are you sure you want to remove all ${guests.length} guest links? This action is permanent and cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => deleteAllGuests.mutate(),
        },
      ],
    );
  };

  if (isCreationLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <View style={styles.headerBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to creation"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Guests</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredContent}>
          <ActivityIndicator size="small" color={mobileTheme.colors.accent} />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isCreationError || !creation) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <View style={styles.headerBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to creation"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Guests</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.emptyTitle}>Could not load invitation</Text>
          <Text style={styles.emptySubtitle}>
            {creationError instanceof Error
              ? creationError.message
              : "Unable to verify this invitation."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading invitation"
            onPress={() => void refetchCreation()}
            style={styles.actionPill}
          >
            <Text style={styles.actionPillText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!isInvitation) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <View style={styles.headerBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to creation"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Guests</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.emptyTitle}>Cards do not have guest lists</Text>
          <Text style={styles.emptySubtitle}>
            Personalized guest links are designed exclusively for video
            invitations.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to card detail"
            onPress={() => router.back()}
            style={styles.actionPill}
          >
            <Text style={styles.actionPillText}>Back to Card</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to creation detail"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Guest Links</Text>
            <Text style={styles.headerBadge}>{guests.length} / 200</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={guests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetchGuests()}
              tintColor={mobileTheme.colors.accent}
            />
          }
          ListHeaderComponent={
            <View>
              <Text style={styles.pageDescription}>
                Each guest receives a unique link that plays their video
                invitation with their personalized name at the end.
              </Text>

              <GuestAddForm
                currentGuestCount={guests.length}
                onAdd={async (name) => {
                  await addGuest.mutateAsync({ name });
                }}
                isAdding={addGuest.isPending}
              />

              <GuestBulkImport
                currentGuestCount={guests.length}
                onImport={async (names) => {
                  await importGuests.mutateAsync(
                    names.map((n) => ({ name: n })),
                  );
                }}
                isImporting={importGuests.isPending}
              />

              {guests.length > 0 && (
                <View style={styles.batchActionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Copy all guest links"
                    onPress={handleCopyAll}
                    style={styles.batchButton}
                  >
                    <Text style={styles.batchButtonText}>
                      {copiedAll ? "Copied all!" : "Copy all (Name: Link)"}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete all guest links"
                    onPress={handleDeleteAll}
                    disabled={deleteAllGuests.isPending}
                    style={[styles.batchButton, styles.batchDeleteButton]}
                  >
                    <Text
                      style={[
                        styles.batchButtonText,
                        styles.batchDeleteButtonText,
                      ]}
                    >
                      {deleteAllGuests.isPending ? "Deleting..." : "Delete all"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <GuestRow
              guest={item}
              onDelete={(guestId) => deleteGuest.mutate(guestId)}
              isDeleting={
                deleteGuest.isPending && deleteGuest.variables === item.id
              }
            />
          )}
          ListEmptyComponent={
            isGuestsLoading ? (
              <View style={styles.centeredContent}>
                <ActivityIndicator
                  size="small"
                  color={mobileTheme.colors.accent}
                />
                <Text style={styles.loadingText}>Loading guest list...</Text>
              </View>
            ) : isGuestsError ? (
              <View style={styles.centeredContent}>
                <Text style={styles.emptyTitle}>Could not load guests</Text>
                <Text style={styles.emptySubtitle}>
                  {guestsError instanceof Error
                    ? guestsError.message
                    : "Something went wrong loading guest links."}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading guests"
                  onPress={() => void refetchGuests()}
                  style={styles.actionPill}
                >
                  <Text style={styles.actionPillText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.centeredContent}>
                <FloralSprig size={40} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No guests added yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add guests above to generate unique invitation links for
                  sharing via messaging or email.
                </Text>
              </View>
            )
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mobileTheme.colors.border + "44",
    backgroundColor: mobileTheme.colors.palette.marigold + "14",
  },
  backButton: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
  },
  backButtonText: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 17,
  },
  headerBadge: {
    backgroundColor: mobileTheme.colors.status.readyBg,
    color: mobileTheme.colors.status.readyText,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  headerSpacer: {
    minWidth: 48,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  pageDescription: {
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: mobileTheme.colors.muted,
    marginBottom: 16,
    maxWidth: 320,
  },
  batchActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  batchButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "55",
    backgroundColor: mobileTheme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  batchButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    color: mobileTheme.colors.ink,
  },
  batchDeleteButton: {
    flex: 0.6,
    borderColor: mobileTheme.colors.status.failedBg,
    backgroundColor: mobileTheme.colors.status.failedBg,
  },
  batchDeleteButtonText: {
    color: mobileTheme.colors.status.failedText,
  },
  centeredContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    color: mobileTheme.colors.muted,
  },
  emptyTitle: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    color: mobileTheme.colors.ink,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: mobileTheme.colors.muted,
    textAlign: "center",
    maxWidth: 280,
  },
  actionPill: {
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: mobileTheme.colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  actionPillText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
    color: mobileTheme.colors.surface,
  },
});
