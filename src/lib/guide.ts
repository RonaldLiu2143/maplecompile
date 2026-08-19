export const GUIDE_STEPS = [
  {
    n: 1,
    title: "Find your character",
    body: "Search your GMS IGN and add them to your roster. Ranked or MapleHub-tracked names work.",
    href: "/calc/character",
    cta: "Character Search",
  },
  {
    n: 2,
    title: "Lock your main",
    body: "On the Dashboard, set them as primary and lock Active Character so tools open on this character.",
    href: "/dashboard",
    cta: "Open Dashboard",
  },
  {
    n: 3,
    title: "Fill Scouter stats",
    body: "Enter character-window stats. Main, sub, and attack are enough to get a first combat-power read.",
    href: "/calc/scouter",
    cta: "Open Scouter",
  },
  {
    n: 4,
    title: "Set up gear",
    body: "On the same Scouter page, pick equipment and review set effects. Gear saves with Character Stats presets.",
    href: "/calc/scouter",
    cta: "Equipment on Scouter",
  },
  {
    n: 5,
    title: "Track the rest",
    body: "Use Boss Income, Liberation, and HEXA when you are ready. Sharing to the gallery is optional.",
    href: "/services",
    cta: "All tools",
  },
] as const;
