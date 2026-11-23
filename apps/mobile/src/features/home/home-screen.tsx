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
                <FloralSprig size={25} />
                <Text style={styles.brand}>CherryQube</Text>
              </View>
              <Text style={styles.season}>The holiday studio</Text>
            </View>
            <Text style={styles.title}>Make a moment worth keeping.</Text>
            <Text style={styles.copy}>
              Personalise a moving card or invitation for the people you love.
            </Text>
            <TypeNavigation selected={type} onSelect={setType} />
            <SeasonNavigation selected={theme} onSelect={setTheme} />
            {featured ? <FeaturedTemplate template={featured} /> : null}
            <Text style={styles.galleryTitle}>Choose a design</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No designs match those selections.</Text>
        }
        renderItem={({ item }) => <TemplateTile template={item} />}
      />
    </SafeAreaView>
  );
}

function TypeNavigation({
  selected,
  onSelect,
}: {
  selected: TypeFilter;
  onSelect: (value: TypeFilter) => void;
}) {
  const values = ["all", "card", "invitation"] as const;
  return (
    <View style={styles.typeNavigation}>
      {values.map((value) => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          style={styles.typeItem}
        >
          <Text
            style={[
              styles.typeLabel,
              selected === value && styles.typeLabelActive,
            ]}
          >
            {value === "all"
              ? "All designs"
              : value === "card"
                ? "Cards"
                : "Invitations"}
          </Text>
          <View
            style={[
              styles.typeRule,
              selected === value && styles.typeRuleActive,
            ]}
          />
        </Pressable>
      ))}
    </View>
  );
}

function SeasonNavigation({
  selected,
  onSelect,
}: {
  selected: ThemeFilter;
  onSelect: (value: ThemeFilter) => void;
}) {
  const values = ["all", "thanksgiving", "christmas", "new-year"] as const;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.seasonNavigation}
    >
      {values.map((value) => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          style={styles.seasonItem}
        >
          <Text
            style={[
              styles.seasonLabel,
              selected === value && styles.seasonLabelActive,
            ]}
          >
            {value === "all" ? "Every celebration" : themeNames[value]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function FeaturedTemplate({
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
      style={styles.featured}
    >
      <Image
        source={posterUrl(template.posterPath)}
        style={styles.featuredPoster}
        contentFit="cover"
        cachePolicy="disk"
      />
      <View style={styles.featuredCaption}>
        <Text style={styles.featuredMeta}>
          {themeNames[template.themeId]} ·{" "}
          {template.type === "card" ? "Animated card" : "Video invitation"}
        </Text>
        <Text style={styles.featuredTitle}>{template.title}</Text>
        <Text style={styles.featuredAction}>Make this design</Text>
      </View>
    </Pressable>
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
      style={styles.tile}
    >
      <Image
        source={posterUrl(template.posterPath)}
        style={styles.tilePoster}
        contentFit="cover"
        cachePolicy="disk"
      />
      <Text style={styles.tileTitle} numberOfLines={2}>
        {template.title}
      </Text>
      <Text style={styles.tileMeta}>
        {template.type === "card" ? "Card" : "Invitation"} ·{" "}
        {template.type === "card" ? "5–8 sec" : "20–30 sec"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: mobileTheme.colors.canvas },
  list: { paddingBottom: 28, paddingHorizontal: 18 },
  row: { gap: 14 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  wordmark: { alignItems: "center", flexDirection: "row", gap: 7 },
  brand: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 20,
  },
  season: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 34,
    lineHeight: 40,
    marginTop: 34,
    maxWidth: 320,
  },
  copy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    maxWidth: 300,
  },
  typeNavigation: { flexDirection: "row", gap: 20, marginTop: 28 },
  typeItem: { alignItems: "center", gap: 6, minHeight: 32 },
  typeLabel: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 14,
  },
  typeLabelActive: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
  },
  typeRule: { backgroundColor: "transparent", height: 1, width: "100%" },
  typeRuleActive: { backgroundColor: mobileTheme.colors.accent },
  seasonNavigation: { gap: 18, marginTop: 12, paddingRight: 18 },
  seasonItem: { minHeight: 34, justifyContent: "center" },
  seasonLabel: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 13,
  },
  seasonLabelActive: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
  },
  featured: { marginTop: 18 },
  featuredPoster: { aspectRatio: 1.42, borderRadius: 3, width: "100%" },
  featuredCaption: {
    backgroundColor: mobileTheme.colors.paper,
    marginHorizontal: 12,
    marginTop: -52,
    padding: 16,
  },
  featuredMeta: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 12,
  },
  featuredTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    lineHeight: 28,
    marginTop: 4,
  },
  featuredAction: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    marginTop: 10,
  },
  galleryTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 24,
    marginTop: 32,
  },
  tile: { flex: 1, marginTop: 16, minWidth: 0 },
  tilePoster: { aspectRatio: 0.72, borderRadius: 2, width: "100%" },
  tileTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
    marginTop: 9,
  },
  tileMeta: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    marginTop: 3,
  },
  empty: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    paddingVertical: 36,
    textAlign: "center",
  },
});
