export type ModuleNavEntry = { label: string; href: string };
export type FrontendModule = { name: string; nav: ModuleNavEntry[] };

// Hardcoded for now. Auto-discovery (reading `modules/*/module.json` at build
// time via Node fs) lands once a third module exists.
export const modules: FrontendModule[] = [
  { name: "hello", nav: [{ label: "Hello", href: "/hello" }] },
  {
    name: "agile_digests",
    nav: [{ label: "Agile Digests", href: "/agile_digests" }],
  },
];
