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
import { PillBadge } from "@/components/ui/pill-badge";
import { PrimaryButton } from "@/components/ui/primary-button";
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
  const [featured, ...gallery] = templates;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <FlatList
        data={gallery}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <View style={styles.wordmark}>
                <FloralSprig size={22} />
                <Text style={styles.brand}>CHERRYQUBE</Text>
              </View>
              <Text style={styles.season}>The Holiday Studio</Text>
            </View>

            <View style={styles.heroIntro}>
              <Text style={styles.title}>Make a moment worth keeping.</Text>
              <Text style={styles.copy}>
                Personalise a moving card or video invitation for the people you
                love.
              </Text>
            </View>

            <TypeSegmentedControl selected={type} onSelect={setType} />
            <SeasonPillFilter selected={theme} onSelect={setTheme} />

            {featured ? <FeaturedTemplate template={featured} /> : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.galleryTitle}>All Creations</Text>
              <Text style={styles.galleryCount}>
                {templates.length} designs
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FloralSprig size={32} />
            <Text style={styles.empty}>No designs match those selections.</Text>
          </View>
        }
        renderItem={({ item }) => <TemplateTile template={item} />}
      />
    </SafeAreaView>
  );
}

function TypeSegmentedControl({
  selected,
  onSelect,
}: {
  selected: TypeFilter;
  onSelect: (value: TypeFilter) => void;
}) {
  const values = [
    { id: "all" as const, label: "All Designs" },
    { id: "card" as const, label: "Cards" },
    { id: "invitation" as const, label: "Invitations" },
  ];

  return (
    <View style={styles.segmentedContainer}>
      {values.map((item) => {
        const active = selected === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.id)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text
              style={[styles.segmentLabel, active && styles.segmentLabelActive]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SeasonPillFilter({
  selected,
  onSelect,
}: {
  selected: ThemeFilter;
  onSelect: (value: ThemeFilter) => void;
}) {
  const values = [
    { id: "all" as const, label: "All Holidays" },
    { id: "thanksgiving" as const, label: themeNames.thanksgiving },
    { id: "christmas" as const, label: themeNames.christmas },
    { id: "new-year" as const, label: themeNames["new-year"] },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.seasonList}
      style={styles.seasonScroll}
    >
      {values.map((item) => {
        const active = selected === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.id)}
            style={[styles.seasonPill, active && styles.seasonPillActive]}
          >
            <Text
              style={[
                styles.seasonPillText,
                active && styles.seasonPillTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function FeaturedTemplate({
  template,
}: {
  template: (typeof mobileTemplateCatalog)[number];
}) {
  const isCard = template.type === "card";

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
      style={[styles.featuredCard, mobileTheme.shadows.cardElevated]}
    >
      <View style={styles.featuredImageWrapper}>
        <Image
          source={posterUrl(template.posterPath)}
          style={styles.featuredPoster}
          contentFit="cover"
          cachePolicy="disk"
        />
        <View style={styles.floatingBadgeRow}>
          <PillBadge
            label={isCard ? "5–8 SEC" : "20–30 SEC"}
            variant="default"
            size="sm"
          />
        </View>
      </View>

      <View style={styles.featuredContent}>
        <View style={styles.featuredMetaRow}>
          <PillBadge
            label={themeNames[template.themeId]}
            variant="accent"
            size="sm"
          />
          <Text style={styles.featuredCategory}>
            {isCard ? "Animated Card" : "Video Invitation"}
          </Text>
        </View>

        <Text style={styles.featuredTitle}>{template.title}</Text>

        <PrimaryButton
          label="Make this design"
          size="sm"
          variant="primary"
          style={styles.featuredButton}
          onPress={() =>
            router.push({
              pathname: "/editor/[templateId]",
              params: { templateId: template.id },
            })
          }
        />
      </View>
    </Pressable>
  );
}

function TemplateTile({
  template,
}: {
  template: (typeof mobileTemplateCatalog)[number];
}) {
  const isCard = template.type === "card";

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
      style={[styles.tileCard, mobileTheme.shadows.card]}
    >
      <View style={styles.tileImageWrapper}>
        <Image
          source={posterUrl(template.posterPath)}
          style={styles.tilePoster}
          contentFit="cover"
          cachePolicy="disk"
        />
        <View style={styles.tileDurationBadge}>
          <PillBadge
            label={isCard ? "5–8s" : "20–30s"}
            variant="default"
            size="sm"
          />
        </View>
      </View>

      <View style={styles.tileContent}>
        <Text style={styles.tileOccasion}>{themeNames[template.themeId]}</Text>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {template.title}
        </Text>
        <Text style={styles.tileType}>{isCard ? "Card" : "Invitation"}</Text>
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
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  row: {
    gap: 12,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 2,
  },
  wordmark: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  brand: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    letterSpacing: 1.2,
  },
  season: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  heroIntro: {
    marginTop: 18,
    paddingHorizontal: 2,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 28,
    lineHeight: 34,
    maxWidth: 320,
  },
  copy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 320,
  },
  segmentedContainer: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderRadius: mobileTheme.radius.pill,
    flexDirection: "row",
    marginTop: 20,
    padding: 3,
  },
  segmentItem: {
    alignItems: "center",
    borderRadius: mobileTheme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
  },
  segmentItemActive: {
    backgroundColor: mobileTheme.colors.surface,
    elevation: 2,
    shadowColor: mobileTheme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  segmentLabel: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
  },
  segmentLabelActive: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
  },
  seasonScroll: {
    marginTop: 12,
  },
  seasonList: {
    gap: 8,
    paddingRight: 16,
  },
  seasonPill: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  seasonPillActive: {
    backgroundColor: mobileTheme.colors.ink,
    borderColor: mobileTheme.colors.ink,
  },
  seasonPillText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  seasonPillTextActive: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
  },
  featuredCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    marginTop: 20,
    overflow: "hidden",
    padding: 10,
  },
  featuredImageWrapper: {
    borderRadius: mobileTheme.radius.cardSmall,
    overflow: "hidden",
    position: "relative",
  },
  featuredPoster: {
    aspectRatio: 1.45,
    borderRadius: mobileTheme.radius.cardSmall,
    width: "100%",
  },
  floatingBadgeRow: {
    position: "absolute",
    right: 10,
    top: 10,
  },
  featuredContent: {
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 4,
  },
  featuredMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  featuredCategory: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  featuredTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
    lineHeight: 26,
    marginTop: 6,
  },
  featuredButton: {
    marginTop: 12,
  },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  galleryTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
  },
  galleryCount: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  tileCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.cardSmall,
    borderWidth: 1,
    flex: 1,
    marginBottom: 4,
    minWidth: 0,
    overflow: "hidden",
    padding: 8,
  },
  tileImageWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  tilePoster: {
    aspectRatio: 0.76,
    borderRadius: 12,
    width: "100%",
  },
  tileDurationBadge: {
    position: "absolute",
    right: 6,
    top: 6,
  },
  tileContent: {
    paddingHorizontal: 2,
    paddingTop: 8,
    paddingBottom: 2,
  },
  tileOccasion: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 11,
  },
  tileTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 15,
    lineHeight: 19,
    marginTop: 2,
  },
  tileType: {
    color: mobileTheme.colors.muted,
    fontFamily: "Figtree_500Medium",
    fontSize: 11,
    marginTop: 3,
  },
  emptyContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
  },
  empty: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
