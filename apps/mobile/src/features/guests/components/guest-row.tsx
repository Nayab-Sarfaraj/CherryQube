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

  return (
    <View style={styles.card}>
      <View style={styles.infoCol}>
        <Text style={styles.name} numberOfLines={1}>
          {guest.name}
        </Text>
        <Text style={styles.link} numberOfLines={1} ellipsizeMode="middle">
          {guest.link}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy link for ${guest.name}`}
          onPress={handleCopy}
          style={styles.actionButton}
          hitSlop={6}
        >
          <Text style={styles.actionButtonText}>
            {copied ? "Copied" : "Copy"}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share link for ${guest.name}`}
          onPress={handleShare}
          style={styles.actionButton}
          hitSlop={6}
        >
          <Text style={styles.actionButtonText}>Share</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${guest.name}`}
          onPress={handleDeletePress}
          disabled={isDeleting}
          style={[styles.actionButton, styles.deleteButton]}
          hitSlop={6}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            {isDeleting ? "..." : "Delete"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "33",
  },
  infoCol: {
    marginBottom: 10,
  },
  name: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
    color: mobileTheme.colors.ink,
    marginBottom: 4,
  },
  link: {
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    color: mobileTheme.colors.muted,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "55",
    backgroundColor: mobileTheme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    color: mobileTheme.colors.ink,
  },
  deleteButton: {
    borderColor: mobileTheme.colors.status.failedBg,
    backgroundColor: mobileTheme.colors.status.failedBg,
  },
  deleteButtonText: {
    color: mobileTheme.colors.status.failedText,
  },
});
