import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  canAddGuests,
  getRemainingGuestCapacity,
  parsePastedGuestNames,
} from "../guest-rules";
import { mobileTheme } from "@/theme/theme";

type GuestBulkImportProps = {
  currentGuestCount: number;
  onImport: (names: string[]) => Promise<void>;
  isImporting?: boolean;
};

export function GuestBulkImport({
  currentGuestCount,
  onImport,
  isImporting,
}: GuestBulkImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const remaining = getRemainingGuestCapacity(currentGuestCount);
  const parsed = parsePastedGuestNames(text);
  const validCount = parsed.validNames.length;
  const exceedsCapacity = !canAddGuests(currentGuestCount, validCount);

  const handleImport = async () => {
    if (validCount === 0) return;
    if (exceedsCapacity) {
      setServerError(`You can only add up to ${remaining} more guests.`);
      return;
    }

    setServerError(null);
    try {
      await onImport(parsed.validNames);
      setText("");
      setIsOpen(false);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Failed to import guests.",
      );
    }
  };

  if (!isOpen) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open paste multiple names"
        onPress={() => setIsOpen(true)}
        style={[styles.toggleButton, mobileTheme.shadows.pill]}
      >
        <Text style={styles.toggleButtonText}>+ Paste multiple names</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, mobileTheme.shadows.card]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Paste guest names</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close paste multiple names"
          onPress={() => {
            setIsOpen(false);
            setServerError(null);
          }}
          style={styles.closeButton}
          hitSlop={8}
        >
          <Text style={styles.closeButtonText}>Cancel</Text>
        </Pressable>
      </View>

      <Text style={styles.helpText}>
        Paste names separated by new lines. We will clean extra spaces and
        remove duplicates.
      </Text>

      <TextInput
        accessibilityLabel="Paste newline-separated guest names"
        value={text}
        onChangeText={(val) => {
          setText(val);
          if (serverError) setServerError(null);
        }}
        placeholder={"Uncle Bob\nSarah Jenkins\nGrandma Rose"}
        placeholderTextColor={mobileTheme.colors.quietInk + "88"}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!isImporting}
        style={styles.textArea}
      />

      {text.trim().length > 0 && (
        <View style={styles.previewBox}>
          <Text style={styles.previewSummary}>
            {validCount} valid {validCount === 1 ? "name" : "names"} detected
            {parsed.duplicateCount > 0 &&
              ` (${parsed.duplicateCount} duplicate${parsed.duplicateCount > 1 ? "s" : ""} skipped)`}
          </Text>

          {parsed.invalidLines.length > 0 && (
            <View style={styles.invalidList}>
              {parsed.invalidLines.slice(0, 3).map((inv) => (
                <Text key={inv.line} style={styles.invalidText}>
                  • Line {inv.line}: {inv.reason}
                </Text>
              ))}
              {parsed.invalidLines.length > 3 && (
                <Text style={styles.invalidText}>
                  • and {parsed.invalidLines.length - 3} more...
                </Text>
              )}
            </View>
          )}

          {exceedsCapacity && (
            <Text style={styles.capacityWarning}>
              Exceeds 200 guest cap. You have {remaining} slot
              {remaining === 1 ? "" : "s"} remaining.
            </Text>
          )}
        </View>
      )}

      {serverError && <Text style={styles.errorText}>{serverError}</Text>}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Import ${validCount} guests`}
        onPress={handleImport}
        disabled={validCount === 0 || exceedsCapacity || isImporting}
        style={[
          styles.submitButton,
          mobileTheme.shadows.pill,
          (validCount === 0 || exceedsCapacity || isImporting) &&
            styles.disabledButton,
        ]}
      >
        {isImporting ? (
          <ActivityIndicator size="small" color={mobileTheme.colors.surface} />
        ) : (
          <Text style={styles.submitButtonText}>
            Import {validCount > 0 ? `${validCount} Guests` : "Guests"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: 16,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  toggleButtonText: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  container: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 16,
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    minWidth: 40,
    padding: 4,
  },
  closeButtonText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
  },
  helpText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.cardSmall,
    borderWidth: 1,
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    marginBottom: 10,
    minHeight: 90,
    padding: 12,
  },
  previewBox: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
  },
  previewSummary: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
  },
  invalidList: {
    marginTop: 6,
  },
  invalidText: {
    color: mobileTheme.colors.status.failedText,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  capacityWarning: {
    color: mobileTheme.colors.status.failedText,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 12,
    marginTop: 6,
  },
  errorText: {
    color: mobileTheme.colors.status.failedText,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    marginBottom: 10,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: mobileTheme.radius.pill,
    justifyContent: "center",
    minHeight: 46,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
});
