import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import type { GuestItemDto } from "@greetings/shared";
import { formatGuestShareText } from "../guest-rules";
import { mobileTheme } from "@/theme/theme";

type GuestRowProps = {
  guest: GuestItemDto;
  onDelete: (guestId: string) => void;
  isDeleting?: boolean;
};

export function GuestRow({ guest, onDelete, isDeleting }: GuestRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(guest.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: formatGuestShareText(guest.name, guest.link),
        title: `Invitation for ${guest.name}`,
        url: guest.link,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Delete Guest",
      `Remove ${guest.name} from this invitation? Their personalized link will stop working.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(guest.id),
        },
      ],
    );
  };

  const initial = guest.name.trim().charAt(0).toUpperCase() || "G";

  return (
    <View style={[styles.card, mobileTheme.shadows.card]}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.name} numberOfLines={1}>
            {guest.name}
          </Text>
          <Text style={styles.link} numberOfLines={1} ellipsizeMode="middle">
            {guest.link}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy link for ${guest.name}`}
          onPress={handleCopy}
          style={styles.pillButton}
          hitSlop={6}
        >
          <Text style={styles.pillButtonText}>
            {copied ? "Copied!" : "Copy link"}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share link for ${guest.name}`}
          onPress={handleShare}
          style={styles.pillButton}
          hitSlop={6}
        >
          <Text style={styles.pillButtonText}>Share</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${guest.name}`}
          onPress={handleDeletePress}
          disabled={isDeleting}
          style={[styles.pillButton, styles.deleteButton]}
          hitSlop={6}
        >
          <Text style={[styles.pillButtonText, styles.deleteButtonText]}>
            {isDeleting ? "…" : "Delete"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.cardSmall,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: mobileTheme.radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarInitial: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 16,
  },
  infoCol: {
    flex: 1,
  },
  name: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 16,
  },
  link: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    borderTopColor: mobileTheme.colors.hairline,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 10,
  },
  pillButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: mobileTheme.radius.pill,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
  },
  pillButtonText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: mobileTheme.colors.status.failedBg,
  },
  deleteButtonText: {
    color: mobileTheme.colors.status.failedText,
  },
});
