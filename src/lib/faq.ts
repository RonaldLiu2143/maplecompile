export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is MapleCompile free?",
    answer:
      "Yes. All calculators and character tools are free to use in the browser. There is no paid plan and no account is required.",
  },
  {
    question: "Do I need a MapleStory login or Nexon API key?",
    answer:
      "No. Character Search uses public GMS ranking and MapleHub data. Your gear, HEXA, and boss trackers stay in this browser unless you optionally share a scouter build.",
  },
  {
    question: "Where is my roster and scouter data stored?",
    answer:
      "Most data lives in localStorage on your device. Shared scouter gallery posts are stored in Redis only when you choose to share. Clearing site data or switching browsers removes local progress.",
  },
  {
    question: "Is MapleCompile affiliated with Nexon?",
    answer:
      "No. MapleCompile is an unofficial fan tool. MapleStory names, art, and game data are © Nexon. Numbers are estimates and can differ from in-game values.",
  },
  {
    question: "How do I look up a character?",
    answer:
      "Open Character Search, enter a GMS IGN, and pick NA or EU. Ranked or MapleHub-tracked characters return a profile. You can save lookups separately from your roster.",
  },
  {
    question: "What is Scouter used for?",
    answer:
      "Scouter estimates combat power and related stats from the numbers you enter, with equipment setup, presets, and an optional public gallery share.",
  },
];
