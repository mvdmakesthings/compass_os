import { createTheme, rem, type MantineColorsTuple } from "@mantine/core";

// Linear-leaning saturated violet. Mantine expects a 10-tuple (lightest → darkest).
const accent: MantineColorsTuple = [
  "#f3f0ff",
  "#e0d7ff",
  "#beadff",
  "#9b80ff",
  "#7d59ff",
  "#6b41ff",
  "#6234ff",
  "#5128e6",
  "#4622cd",
  "#3a1ab5",
];

export const theme = createTheme({
  primaryColor: "accent",
  primaryShade: { dark: 5 },
  colors: { accent },
  defaultRadius: "sm",
  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif",
  fontFamilyMonospace:
    "var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  headings: {
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: rem(24), lineHeight: "1.3" },
      h2: { fontSize: rem(20), lineHeight: "1.35" },
      h3: { fontSize: rem(16), lineHeight: "1.4" },
      h4: { fontSize: rem(14), lineHeight: "1.4" },
    },
  },
  components: {
    Button: { defaultProps: { size: "sm" } },
    TextInput: { defaultProps: { size: "sm" } },
    Textarea: { defaultProps: { size: "sm" } },
    Select: { defaultProps: { size: "sm" } },
    NumberInput: { defaultProps: { size: "sm" } },
    Card: { defaultProps: { padding: "md", withBorder: true, radius: "sm" } },
    ActionIcon: { defaultProps: { size: "sm", variant: "subtle" } },
    Badge: { defaultProps: { variant: "light", radius: "sm" } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 200 } },
  },
});
