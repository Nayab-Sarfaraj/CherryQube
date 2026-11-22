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
  MAX_GUEST_NAME_LENGTH,
  canAddGuests,
  sanitizeGuestName,
} from "../guest-rules";
import { mobileTheme } from "@/theme/theme";

type GuestAddFormProps = {
  currentGuestCount: number;
  onAdd: (name: string) => Promise<void>;
  isAdding?: boolean;
};

export function GuestAddForm({
  currentGuestCount,
  onAdd,
  isAdding,
}: GuestAddFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const atCapacity = !canAddGuests(currentGuestCount, 1);
  const sanitized = sanitizeGuestName(name);
  const isValidLength =
    sanitized.length > 0 && sanitized.length <= MAX_GUEST_NAME_LENGTH;

  const handleSubmit = async () => {
    if (atCapacity) {
      setError("An invitation can have at most 200 guests.");
      return;
    }
    if (!sanitized) {
      setError("Please enter a guest name.");
      return;
    }
    if (sanitized.length > MAX_GUEST_NAME_LENGTH) {
      setError(`Name cannot exceed ${MAX_GUEST_NAME_LENGTH} characters.`);
      return;
    }

    setError(null);
    try {
      await onAdd(sanitized);
      setName("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to add guest. Try again.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Add a guest</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Guest full name"
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (error) setError(null);
          }}
          placeholder="e.g. Aunt Sarah"
          placeholderTextColor={mobileTheme.colors.muted + "88"}
          maxLength={MAX_GUEST_NAME_LENGTH}
          editable={!isAdding && !atCapacity}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit add guest"
          onPress={handleSubmit}
          disabled={!isValidLength || isAdding || atCapacity}
          style={[
            styles.addButton,
            (!isValidLength || isAdding || atCapacity) && styles.disabledButton,
          ]}
        >
          {isAdding ? (
            <ActivityIndicator
              size="small"
              color={mobileTheme.colors.surface}
            />
          ) : (
            <Text style={styles.addButtonText}>Add</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.counterText}>
            {name.length}/{MAX_GUEST_NAME_LENGTH}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "33",
  },
  label: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
    color: mobileTheme.colors.ink,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: mobileTheme.colors.background,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "55",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: "Figtree_400Regular",
    fontSize: 15,
    color: mobileTheme.colors.ink,
  },
  addButton: {
    minHeight: 48,
    minWidth: 70,
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
    color: mobileTheme.colors.surface,
  },
  footerRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  counterText: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    color: mobileTheme.colors.muted,
  },
  errorText: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    color: mobileTheme.colors.status.failedText,
    flex: 1,
  },
});
