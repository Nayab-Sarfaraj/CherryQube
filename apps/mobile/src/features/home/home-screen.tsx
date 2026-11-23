import { Image } from "expo-image";
import { router } from "expo-router";
import { mobileTemplateCatalog } from "@greetings/remotion/mobile-template-catalog";
import { orderTemplates, themeNames, type ThemeId } from "@greetings/shared";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloralSprig } from "@/components/ui/floral-sprig";
import { WEB_ORIGIN } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

type TypeFilter = "all" | "card" | "invitation";
type ThemeFilter = "all" | ThemeId;

function posterUrl(path: string) {
  return `${WEB_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

const typeOptions: { label: string; value: TypeFilter }[] = [
  { label: "All designs", value: "all" },
  { label: "Cards", value: "card" },
  { label: "Invitations", value: "invitation" },
];

const seasonOptions: { label: string; value: ThemeFilter }[] = [
  { label: "All celebrations", value: "all" },
  { label: "Thanksgiving", value: "thanksgiving" },
  { label: "Christmas", value: "christmas" },
  { label: "New Year's Eve", value: "new-year" },
];

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
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <FloralSprig size={26} />
                <Text style={styles.brandTitle}>CHERRYQUBE</Text>
              </View>
              <Text style={styles.brandKicker}>The holiday studio</Text>
            </View>

            <View style={styles.greetingBlock}>
              <Text style={styles.headline}>Make a moment worth keeping.</Text>
              <Text style={styles.subhead}>
                Personalise a moving card or video invitation for the people you
                love.
              </Text>
            </View>

            <View style={styles.typeRow}>
              {typeOptions.map((opt) => {
                const active = type === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${opt.label}`}
                    onPress={() => setType(opt.value)}
                    style={[styles.typePill, active && styles.typePillActive]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        active && styles.typePillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.seasonChips}
            >
              {seasonOptions.map((opt) => {
                const active = theme === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${opt.label}`}
                    onPress={() => setTheme(opt.value)}
                    style={[
                      styles.seasonChip,
                      active && styles.seasonChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.seasonChipText,
                        active && styles.seasonChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Choose a design</Text>
              <Text style={styles.countText}>
                {templates.length}{" "}
                {templates.length === 1 ? "design" : "designs"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No designs found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your format or celebration filters above.
            </Text>
          </View>
        }
        renderItem={({ item }) => <TemplateTile template={item} />}
      />
    </SafeAreaView>
  );
}

function TemplateTile({
  template,
}: {
  template: (typeof mobileTemplateCatalog)[number];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Create ${template.title}`}
      onPress={() =>
        router.push({
          pathname: "/editor/[templateId]",
          params: { templateId: template.id },
        })
      }
      style={({ pressed }) => [
        styles.tileCard,
        pressed && styles.tileCardPressed,
      ]}
    >
      <View style={styles.posterWrapper}>
        <Image
          source={posterUrl(template.posterPath)}
          style={styles.tilePoster}
          contentFit="cover"
          cachePolicy="disk"
        />
        <View style={styles.badgeWrap}>
          <View
            style={[
              styles.typeBadge,
              template.type === "card"
                ? styles.cardBadge
                : styles.invitationBadge,
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                template.type === "card"
                  ? styles.cardBadgeText
                  : styles.invitationBadgeText,
              ]}
            >
              {template.type === "card" ? "Card" : "Video"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tileInfo}>
        <Text style={styles.tileMeta}>
          {themeNames[template.themeId]} ·{" "}
          {template.type === "card" ? "5–8s" : "20–30s"}
        </Text>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {template.title}
        </Text>
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>Make design</Text>
          <Text style={styles.actionArrow}>→</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: mobileTheme.colors.canvas,
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  row: {
    gap: 12,
  },
  header: {
    marginBottom: 16,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 8,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  brandTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    letterSpacing: 1.5,
  },
  brandKicker: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  greetingBlock: {
    marginTop: 14,
    marginBottom: 18,
  },
  headline: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 26,
    lineHeight: 32,
    maxWidth: 320,
  },
  subhead: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 300,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  typePill: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 10,
    ...mobileTheme.shadows.pill,
  },
  typePillActive: {
    backgroundColor: mobileTheme.colors.accent,
    borderColor: mobileTheme.colors.accent,
  },
  typePillText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
  },
  typePillTextActive: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
  },
  seasonChips: {
    gap: 8,
    paddingRight: 24,
    paddingBottom: 4,
  },
  seasonChip: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 14,
  },
  seasonChipActive: {
    backgroundColor: mobileTheme.colors.ink,
    borderColor: mobileTheme.colors.ink,
  },
  seasonChipText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  seasonChipTextActive: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 19,
  },
  countText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  tileCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    marginBottom: 12,
    minWidth: 0,
    padding: 8,
    ...mobileTheme.shadows.card,
  },
  tileCardPressed: {
    opacity: 0.92,
  },
  posterWrapper: {
    aspectRatio: 0.72,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  tilePoster: {
    height: "100%",
    width: "100%",
  },
  badgeWrap: {
    left: 7,
    position: "absolute",
    top: 7,
  },
  typeBadge: {
    borderRadius: mobileTheme.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 10,
  },
  cardBadge: {
    backgroundColor: mobileTheme.colors.surface + "EE",
    borderColor: mobileTheme.colors.hairline,
    borderWidth: 1,
  },
  cardBadgeText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 10,
  },
  invitationBadge: {
    backgroundColor: mobileTheme.colors.accent,
  },
  invitationBadgeText: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 10,
  },
  tileInfo: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 2,
  },
  tileMeta: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 11,
  },
  tileTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 15,
    lineHeight: 19,
    marginTop: 3,
  },
  actionRow: {
    alignItems: "center",
    borderTopColor: mobileTheme.colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
  },
  actionText: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 12,
  },
  actionArrow: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
  },
  emptyWrap: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    paddingVertical: 36,
    paddingHorizontal: 20,
    ...mobileTheme.shadows.card,
  },
  emptyTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    marginBottom: 6,
  },
  emptyText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
