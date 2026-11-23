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
import { PillBadge } from "@/components/ui/pill-badge";
import { PrimaryButton } from "@/components/ui/primary-button";
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
          <Text style={styles.headerTitle}>Guest Links</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredContent}>
          <ActivityIndicator size="small" color={mobileTheme.colors.accent} />
          <Text style={styles.loadingText}>Loading invitation…</Text>
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
          <Text style={styles.headerTitle}>Guest Links</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredContent}>
          <View style={[styles.errorCard, mobileTheme.shadows.cardElevated]}>
            <Text style={styles.emptyTitle}>Could not load invitation</Text>
            <Text style={styles.emptySubtitle}>
              {creationError instanceof Error
                ? creationError.message
                : "Unable to verify this invitation."}
            </Text>
            <PrimaryButton
              label="Try again"
              size="md"
              variant="primary"
              onPress={() => void refetchCreation()}
              style={{ width: "100%", marginTop: 16 }}
            />
          </View>
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
          <Text style={styles.headerTitle}>Guest Links</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centeredContent}>
          <View style={[styles.errorCard, mobileTheme.shadows.cardElevated]}>
            <Text style={styles.emptyTitle}>Cards do not have guest lists</Text>
            <Text style={styles.emptySubtitle}>
              Personalized guest links are designed exclusively for video
              invitations.
            </Text>
            <PrimaryButton
              label="Back to card"
              size="md"
              variant="primary"
              onPress={() => router.back()}
              style={{ width: "100%", marginTop: 16 }}
            />
          </View>
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
            <PillBadge
              label={`${guests.length}/200`}
              variant="ready"
              size="sm"
            />
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
                  <PrimaryButton
                    label={copiedAll ? "Copied all!" : "Copy all links"}
                    size="sm"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={handleCopyAll}
                  />

                  <PrimaryButton
                    label={
                      deleteAllGuests.isPending ? "Deleting…" : "Delete all"
                    }
                    size="sm"
                    variant="outline"
                    loading={deleteAllGuests.isPending}
                    style={{ flex: 0.8 }}
                    onPress={handleDeleteAll}
                  />
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
                <Text style={styles.loadingText}>Loading guest list…</Text>
              </View>
            ) : isGuestsError ? (
              <View style={[styles.errorCard, mobileTheme.shadows.card]}>
                <Text style={styles.emptyTitle}>Could not load guests</Text>
                <Text style={styles.emptySubtitle}>
                  {guestsError instanceof Error
                    ? guestsError.message
                    : "Something went wrong loading guest links."}
                </Text>
                <PrimaryButton
                  label="Try again"
                  size="sm"
                  variant="primary"
                  onPress={() => void refetchGuests()}
                  style={{ marginTop: 12 }}
                />
              </View>
            ) : (
              <View style={[styles.emptyCard, mobileTheme.shadows.card]}>
                <FloralSprig size={38} style={{ marginBottom: 12 }} />
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
    backgroundColor: mobileTheme.colors.canvas,
    flex: 1,
  },
  keyboardContainer: {
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
  headerTitleWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  headerTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 17,
  },
  headerSpacer: {
    minWidth: 44,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageDescription: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 320,
  },
  batchActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  centeredContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  loadingText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    marginTop: 10,
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
  emptyCard: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    marginTop: 12,
    padding: 28,
  },
  emptyTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: "center",
  },
});
