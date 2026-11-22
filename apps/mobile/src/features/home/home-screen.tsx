import { Image } from "expo-image";
import { router } from "expo-router";
import { mobileTemplateCatalog } from "@greetings/remotion/mobile-template-catalog";
import { orderTemplates, themeNames, type ThemeId } from "@greetings/shared";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WEB_ORIGIN } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

type TypeFilter = "all" | "card" | "invitation";
type ThemeFilter = "all" | ThemeId;

function posterUrl(path: string) {
  return `${WEB_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function HomeScreen() {
  const [type, setType] = useState<TypeFilter>("all");
  const [theme, setTheme] = useState<ThemeFilter>("all");

  const templates = useMemo(
    () =>
      orderTemplates(mobileTemplateCatalog).filter(
        (template) =>
          (type === "all" || template.type === type) &&
          (theme === "all" || template.themeId === theme),
      ),
    [theme, type],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View>
            <Text style={styles.kicker}>CherryQube</Text>
            <Text style={styles.title}>Make this season feel personal.</Text>
            <Text style={styles.copy}>
              Choose a ready-to-customize card or invitation.
            </Text>
            <FilterRow
              values={["all", "card", "invitation"] as const}
              selected={type}
              label={(value) =>
                value === "all"
                  ? "All"
                  : value === "card"
                    ? "Cards"
                    : "Invitations"
              }
              onSelect={setType}
            />
            <FilterRow
              values={["all", "thanksgiving", "christmas", "new-year"] as const}
              selected={theme}
              label={(value) =>
                value === "all" ? "All holidays" : themeNames[value]
              }
              onSelect={setTheme}
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No templates match those filters.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Create ${item.title}`}
            onPress={() =>
              router.push({
                pathname: "/editor/[templateId]",
                params: { templateId: item.id },
              })
            }
            style={styles.card}
          >
            <View style={styles.posterContainer}>
              <Image
                source={posterUrl(item.posterPath)}
                style={styles.poster}
                contentFit="cover"
                cachePolicy="disk"
              />
              <View
                style={[
                  styles.badge,
                  item.type === "card"
                    ? styles.cardBadge
                    : styles.invitationBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.type === "card"
                      ? styles.cardBadgeText
                      : styles.invitationBadgeText,
                  ]}
                >
                  {item.type === "card" ? "Card" : "Invitation"}
                </Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {themeNames[item.themeId]} ·{" "}
              {item.type === "card" ? "5–8s" : "20–30s"}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function FilterRow<T extends string>({
  values,
  selected,
  label,
  onSelect,
}: {
  values: readonly T[];
  selected: T;
  label: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.filters}>
      {values.map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${label(value)}`}
          onPress={() => onSelect(value)}
          style={[styles.filter, selected === value && styles.filterSelected]}
        >
          <Text
            style={[
              styles.filterText,
              selected === value && styles.filterTextSelected,
            ]}
          >
            {label(value)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: mobileTheme.colors.background },
  list: { padding: 20, paddingBottom: 32 },
  row: { gap: 12 },
  kicker: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
    marginTop: 8,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 32,
    lineHeight: 38,
    marginTop: 12,
  },
  copy: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
    marginBottom: 8,
  },
  filter: {
    borderColor: mobileTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  filterSelected: {
    backgroundColor: mobileTheme.colors.accent,
    borderColor: mobileTheme.colors.accent,
  },
  filterText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
  },
  filterTextSelected: { color: mobileTheme.colors.surface },
  card: { flex: 1, marginTop: 16, minWidth: 0 },
  posterContainer: {
    width: "100%",
    aspectRatio: 0.69,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "33",
    position: "relative",
  },
  poster: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 11,
  },
  cardBadge: {
    backgroundColor: mobileTheme.colors.surface,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "55",
  },
  cardBadgeText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 11,
    color: mobileTheme.colors.ink,
  },
  invitationBadge: {
    backgroundColor: mobileTheme.colors.accent,
  },
  invitationBadgeText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 11,
    color: mobileTheme.colors.surface,
  },
  cardTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 17,
    marginTop: 9,
  },
  cardMeta: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    marginTop: 32,
    textAlign: "center",
  },
});
