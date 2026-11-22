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
        style={styles.toggleButton}
      >
        <Text style={styles.toggleButtonText}>+ Paste multiple names</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
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
        placeholderTextColor={mobileTheme.colors.muted + "88"}
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
    minHeight: 44,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: mobileTheme.colors.border,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  toggleButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
    color: mobileTheme.colors.accent,
  },
  container: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "33",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
    color: mobileTheme.colors.ink,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    color: mobileTheme.colors.muted,
  },
  helpText: {
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    color: mobileTheme.colors.muted,
    marginBottom: 10,
    lineHeight: 18,
  },
  textArea: {
    minHeight: 90,
    backgroundColor: mobileTheme.colors.background,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "55",
    borderRadius: 8,
    padding: 10,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    color: mobileTheme.colors.ink,
    marginBottom: 10,
  },
  previewBox: {
    backgroundColor: mobileTheme.colors.background,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  previewSummary: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    color: mobileTheme.colors.ink,
  },
  invalidList: {
    marginTop: 6,
  },
  invalidText: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    color: mobileTheme.colors.status.failedText,
    marginTop: 2,
  },
  capacityWarning: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 12,
    color: mobileTheme.colors.status.failedText,
    marginTop: 6,
  },
  errorText: {
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    color: mobileTheme.colors.status.failedText,
    marginBottom: 10,
  },
  submitButton: {
    minHeight: 48,
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
    color: mobileTheme.colors.surface,
  },
});
