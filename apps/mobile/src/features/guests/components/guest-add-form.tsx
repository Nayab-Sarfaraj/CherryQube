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
    <View style={[styles.container, mobileTheme.shadows.card]}>
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
          placeholderTextColor={mobileTheme.colors.quietInk + "88"}
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
            mobileTheme.shadows.pill,
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
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  label: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 16,
    marginBottom: 10,
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  input: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    color: mobileTheme.colors.ink,
    flex: 1,
    fontFamily: "Figtree_400Regular",
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 16,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: mobileTheme.radius.pill,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 70,
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  counterText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
  },
  errorText: {
    color: mobileTheme.colors.status.failedText,
    flex: 1,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
  },
});
