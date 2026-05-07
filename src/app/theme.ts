export type HomieThemeId = "homie-light" | "homie-warm" | "homie-dark";

export const defaultThemeId: HomieThemeId = "homie-light";

export const themeOptions: Array<{
  id: HomieThemeId;
  name: string;
  description: string;
}> = [
  {
    id: "homie-light",
    name: "Homie light",
    description: "Bright, airy blue for daytime planning",
  },
  {
    id: "homie-warm",
    name: "Homie warm",
    description: "Soft cream with cozy icon-inspired accents",
  },
  {
    id: "homie-dark",
    name: "Homie dark",
    description: "Deep purple for low-light task wrangling",
  },
];

export function isHomieThemeId(value: string | null): value is HomieThemeId {
  return value === "homie-light" || value === "homie-warm" || value === "homie-dark";
}

export const homieThemeCss = String.raw`:root,
:root[data-theme="homie-light"] {
  color-scheme: light;

  /* Core palette */
  --color-transparent: transparent;
  --color-white: #ffffff;
  --color-ink: #111c45;
  --color-ink-muted: #8b96ad;
  --color-ink-subtle: #7f8aa3;
  --color-ink-quieter: #6f7b96;
  --color-ink-link: #2f3d66;
  --palette-background: #f6faff;
  --color-background-top: #f9fcff;
  --color-background-mid: #f4f8ff;
  --color-background-bottom: #eef5fe;
  --color-surface: #ffffff;
  --color-surface-soft: #edf4ff;
  --color-surface-success: #fbfffd;
  --color-surface-muted: #f4f7fc;
  --color-surface-muted-2: #f6f8fc;
  --color-surface-blue: #eaf4ff;
  --color-surface-blue-2: #eef5ff;
  --color-line: #dfe7f3;
  --color-hero: #096dc9;
  --color-hero-deep: #0875d8;
  --color-hero-bright: #48a4f6;
  --color-hero-glow: #52adff;
  --color-aqua: #75d8ff;
  --color-teal: #17b5ad;
  --color-teal-soft: #ecfffb;
  --color-green: #28ad68;
  --color-green-text: #23764f;
  --color-success: #28ad68;
  --color-success-surface: #eaf8f1;
  --color-success-soft: #edf9f3;
  --color-coral: #ff6a2f;
  --color-coral-text: #b85b18;
  --color-coral-soft: #fff1e6;
  --color-coral-wash: #fff3ec;
  --color-gold: #c89300;
  --color-danger: #e2332c;
  --color-danger-soft: #fff1f2;
  --color-violet: #7c32ff;
  --color-violet-soft: #f4edff;
  --color-neutral-dot: #a4aec2;
  --person-unassigned: #7b8794;
  --person-ryan: #167c80;
  --person-caroline: #d65a31;
  --category-house: #2f6f4e;
  --category-sell-donate: #7c32ff;
  --category-errands: #b5651d;
  --category-kai: #17b5ad;
  --theme-preview-light-hero: #0875d8;
  --theme-preview-light-glow: #52adff;
  --theme-preview-light-bg: #f6faff;
  --theme-preview-light-surface: #ffffff;
  --theme-preview-warm-ink: #18130f;
  --theme-preview-warm-hero: #c55a34;
  --theme-preview-warm-surface: #fff6eb;
  --theme-preview-dark-ink: #090712;
  --theme-preview-dark-violet: #6f51d8;
  --theme-preview-dark-surface: #211934;
  --theme-preview-dark-glow: #b89aff;
  --theme-preview-border: rgb(17 28 69 / 18%);

  /* Current scheme semantic aliases */
  --background: var(--palette-background);
  --foreground: var(--color-ink);
  --surface: var(--color-surface);
  --surface-soft: var(--color-surface-soft);
  --ink-soft: var(--color-ink-muted);
  --line: var(--color-line);
  --hero: var(--color-hero);
  --hero-bright: var(--color-hero-bright);
  --aqua: var(--color-aqua);
  --teal: var(--color-teal);
  --green: var(--color-green);
  --coral: var(--color-coral);
  --gold: var(--color-gold);
  --danger: var(--color-danger);
  --violet: var(--color-violet);

  /* Alpha and gradient tokens */
  --alpha-black-shadow-strong: rgb(0 0 0 / 28%);
  --alpha-aqua-weak: rgb(117 216 255 / 12%);
  --alpha-aqua-medium: rgb(117 216 255 / 34%);
  --alpha-focus-ring: rgb(117 216 255 / 75%);
  --alpha-hero-tab-fill: rgb(151 218 255 / 34%);
  --alpha-success-border: rgb(40 173 104 / 18%);
  --alpha-ink-hairline: rgb(16 27 66 / 7%);
  --alpha-ink-shadow: rgb(17 28 69 / 10%);
  --alpha-ink-title-shadow: rgb(17 28 69 / 14%);
  --alpha-ink-overlay: rgb(17 28 69 / 42%);
  --alpha-ink-overlay-strong: rgb(17 28 69 / 76%);
  --alpha-aqua-border: rgb(185 233 255 / 42%);
  --alpha-blue-border-soft: rgb(210 225 246 / 86%);
  --alpha-blue-count-bg: rgb(214 231 251 / 78%);
  --alpha-blue-shadow: rgb(22 72 132 / 11%);
  --alpha-blue-shadow-14: rgb(22 72 132 / 14%);
  --alpha-blue-shadow-7: rgb(22 72 132 / 7%);
  --alpha-blue-shadow-8: rgb(22 72 132 / 8%);
  --alpha-blue-shadow-9: rgb(22 72 132 / 9%);
  --alpha-line-86: rgb(223 231 243 / 86%);
  --alpha-line-90: rgb(223 231 243 / 90%);
  --alpha-orange-border: rgb(224 126 54 / 26%);
  --alpha-danger-border-18: rgb(226 51 44 / 18%);
  --alpha-danger-border-22: rgb(226 51 44 / 22%);
  --alpha-danger-border-24: rgb(226 51 44 / 24%);
  --alpha-danger-border-28: rgb(226 51 44 / 28%);
  --alpha-danger-border-34: rgb(226 51 44 / 34%);
  --alpha-plan-surface: rgb(237 244 255 / 72%);
  --alpha-coral-border: rgb(255 110 45 / 36%);
  --alpha-white-16: rgb(255 255 255 / 16%);
  --alpha-white-18: rgb(255 255 255 / 18%);
  --alpha-white-22: rgb(255 255 255 / 22%);
  --alpha-white-72: rgb(255 255 255 / 72%);
  --alpha-white-76: rgb(255 255 255 / 76%);
  --alpha-white-78: rgb(255 255 255 / 78%);
  --alpha-white-88: rgb(255 255 255 / 88%);
  --alpha-white-90: rgb(255 255 255 / 90%);
  --alpha-white-92: rgb(255 255 255 / 92%);
  --alpha-white-94: rgb(255 255 255 / 94%);
  --alpha-complete-shimmer-weak: rgb(40 173 104 / 10%);
  --alpha-complete-shimmer: rgb(40 173 104 / 16%);
  --alpha-complete-ring: rgb(40 173 104 / 38%);
  --alpha-complete-halo: rgb(40 173 104 / 8%);
  --alpha-green-border: rgb(40 173 104 / 24%);
  --alpha-hero-shadow-18: rgb(9 109 201 / 18%);
  --alpha-hero-shadow-20: rgb(9 109 201 / 20%);
  --alpha-hero-shadow-30: rgb(9 109 201 / 30%);

  /* Effect tokens */
  --shadow: 0 18px 40px var(--alpha-blue-shadow);
  --shadow-pull-refresh: 0 10px 22px var(--alpha-blue-shadow-14);
  --shadow-hero: 0 18px 40px var(--alpha-hero-shadow-18);
  --shadow-tabs: inset 0 0 0 1px var(--alpha-white-18), 0 8px 22px var(--alpha-ink-shadow);
  --shadow-card-soft: 0 16px 34px var(--alpha-blue-shadow-8);
  --shadow-button: 0 7px 14px var(--alpha-blue-shadow-9);
  --shadow-stack: 0 10px 20px var(--alpha-blue-shadow-7);
  --shadow-complete-halo: 0 0 0 5px var(--alpha-complete-halo);
  --shadow-primary-action: 0 12px 22px var(--alpha-hero-shadow-20);
  --shadow-lightbox: 0 22px 58px var(--alpha-black-shadow-strong);
  --shadow-floating-add: 0 14px 26px var(--alpha-hero-shadow-30);
  --shadow-mobile-shell: 0 0 0 1px var(--alpha-ink-hairline);

  /* App-specific surfaces */
  --shell-radial-center: var(--alpha-white-90);
  --shell-radial-corner: var(--alpha-aqua-weak);
  --hero-radial: var(--alpha-aqua-medium);
  --detail-backdrop-bg: var(--alpha-ink-overlay);
  --photo-lightbox-bg: var(--alpha-ink-overlay-strong);
  --week-day-card-bg: var(--alpha-white-92);
  --done-gradient: linear-gradient(90deg, var(--color-transparent) 0%, var(--alpha-complete-shimmer-weak) 45%, var(--alpha-complete-shimmer) 55%, var(--color-transparent) 100%);
}

:root[data-theme="homie-warm"] {
  color-scheme: light;
  --color-ink: #18130f;
  --color-ink-muted: #8d7e6f;
  --color-ink-subtle: #948170;
  --color-ink-quieter: #796a5c;
  --color-ink-link: #4e392c;
  --palette-background: #fff6eb;
  --color-background-top: #fffaf2;
  --color-background-mid: #fff4e7;
  --color-background-bottom: #f6ead9;
  --color-surface: #fffdf8;
  --color-surface-soft: #f6eadb;
  --color-surface-success: #fbfff6;
  --color-surface-muted: #f5eee5;
  --color-surface-muted-2: #f7f1e9;
  --color-surface-blue: #fff0df;
  --color-surface-blue-2: #fff5eb;
  --color-line: #ead9c6;
  --color-hero: #c55a34;
  --color-hero-deep: #a94725;
  --color-hero-bright: #e97043;
  --color-hero-glow: #f4a56e;
  --color-aqua: #f3c38b;
  --color-teal: #3f9d87;
  --color-teal-soft: #effbf5;
  --color-green: #7aa66a;
  --color-green-text: #526f44;
  --color-success: #7aa66a;
  --color-success-surface: #f1f7ec;
  --color-success-soft: #f3f7ed;
  --color-coral: #e96035;
  --color-coral-text: #a24821;
  --color-coral-soft: #fff0e6;
  --color-coral-wash: #fff4eb;
  --color-gold: #bd8418;
  --color-danger: #d94134;
  --color-danger-soft: #fff0ed;
  --color-violet: #7a5bbd;
  --color-violet-soft: #f2edff;
  --color-neutral-dot: #b8aa9c;
  --person-unassigned: #8b7b6c;
  --person-ryan: #2f7f75;
  --person-caroline: #bd5a3c;
  --category-house: #5f814d;
  --category-sell-donate: #8b5bb8;
  --category-errands: #a96d2a;
  --category-kai: #3f9d87;
  --alpha-aqua-weak: rgb(233 112 67 / 9%);
  --alpha-aqua-medium: rgb(244 165 110 / 28%);
  --alpha-focus-ring: rgb(233 112 67 / 58%);
  --alpha-hero-tab-fill: rgb(248 220 194 / 54%);
  --alpha-success-border: rgb(122 166 106 / 22%);
  --alpha-ink-shadow: rgb(83 53 25 / 10%);
  --alpha-ink-title-shadow: rgb(83 53 25 / 14%);
  --alpha-ink-overlay: rgb(31 22 14 / 42%);
  --alpha-ink-overlay-strong: rgb(31 22 14 / 76%);
  --alpha-aqua-border: rgb(255 191 136 / 58%);
  --alpha-blue-border-soft: rgb(239 214 187 / 86%);
  --alpha-blue-count-bg: rgb(255 225 199 / 82%);
  --alpha-blue-shadow: rgb(130 82 38 / 11%);
  --alpha-blue-shadow-14: rgb(130 82 38 / 14%);
  --alpha-blue-shadow-7: rgb(130 82 38 / 7%);
  --alpha-blue-shadow-8: rgb(130 82 38 / 8%);
  --alpha-blue-shadow-9: rgb(130 82 38 / 9%);
  --alpha-line-86: rgb(234 217 198 / 86%);
  --alpha-line-90: rgb(234 217 198 / 90%);
  --alpha-orange-border: rgb(197 90 52 / 26%);
  --alpha-danger-border-18: rgb(217 65 52 / 18%);
  --alpha-danger-border-22: rgb(217 65 52 / 22%);
  --alpha-danger-border-24: rgb(217 65 52 / 24%);
  --alpha-danger-border-28: rgb(217 65 52 / 28%);
  --alpha-danger-border-34: rgb(217 65 52 / 34%);
  --alpha-plan-surface: rgb(255 239 224 / 82%);
  --alpha-coral-border: rgb(233 112 67 / 34%);
  --week-day-card-bg: rgb(255 250 244 / 88%);
  --alpha-complete-shimmer-weak: rgb(122 166 106 / 10%);
  --alpha-complete-shimmer: rgb(122 166 106 / 16%);
  --alpha-complete-ring: rgb(122 166 106 / 38%);
  --alpha-complete-halo: rgb(122 166 106 / 8%);
  --alpha-green-border: rgb(122 166 106 / 24%);
  --alpha-hero-shadow-18: rgb(197 90 52 / 18%);
  --alpha-hero-shadow-20: rgb(197 90 52 / 20%);
  --alpha-hero-shadow-30: rgb(197 90 52 / 28%);
}

:root[data-theme="homie-dark"] {
  color-scheme: dark;
  --color-white: #f1eaff;
  --color-ink: #f3ecff;
  --color-ink-muted: #ab9bc9;
  --color-ink-subtle: #9d8bbf;
  --color-ink-quieter: #82719f;
  --color-ink-link: #decfff;
  --palette-background: #090712;
  --color-background-top: #17102a;
  --color-background-mid: #0e0a1c;
  --color-background-bottom: #07050e;
  --color-surface: #171225;
  --color-surface-soft: #211934;
  --color-surface-success: #14261f;
  --color-surface-muted: #1b1430;
  --color-surface-muted-2: #120d22;
  --color-surface-blue: #21173a;
  --color-surface-blue-2: #1b1430;
  --color-line: #3a3153;
  --color-hero: #6f51d8;
  --color-hero-deep: #251747;
  --color-hero-bright: #896cff;
  --color-hero-glow: #523b8d;
  --color-aqua: #9d7cff;
  --color-teal: #65d5c7;
  --color-teal-soft: #123832;
  --color-green: #78d7b8;
  --color-green-text: #9ee9d0;
  --color-success: #78d7b8;
  --color-success-surface: #112b28;
  --color-success-soft: #122824;
  --color-coral: #ff9777;
  --color-coral-text: #ffc1aa;
  --color-coral-soft: #41231f;
  --color-coral-wash: #2f1c1d;
  --color-gold: #f0c36b;
  --color-danger: #ff7676;
  --color-danger-soft: #371d2a;
  --color-violet: #b89aff;
  --color-violet-soft: #2a2044;
  --color-neutral-dot: #6d6185;
  --person-unassigned: #9b8db3;
  --person-ryan: #72d5c9;
  --person-caroline: #ffac91;
  --category-house: #8ad7c0;
  --category-sell-donate: #d5c3ff;
  --category-errands: #f0c878;
  --category-kai: #65d5c7;
  --alpha-black-shadow-strong: rgb(0 0 0 / 52%);
  --alpha-aqua-weak: rgb(157 124 255 / 11%);
  --alpha-aqua-medium: rgb(184 154 255 / 18%);
  --alpha-focus-ring: rgb(157 124 255 / 72%);
  --alpha-hero-tab-fill: rgb(137 108 255 / 34%);
  --alpha-success-border: rgb(120 215 184 / 24%);
  --alpha-ink-hairline: rgb(255 255 255 / 7%);
  --alpha-ink-shadow: rgb(0 0 0 / 34%);
  --alpha-ink-title-shadow: rgb(0 0 0 / 40%);
  --alpha-ink-overlay: rgb(6 4 14 / 62%);
  --alpha-ink-overlay-strong: rgb(6 4 14 / 88%);
  --alpha-aqua-border: rgb(185 154 255 / 36%);
  --alpha-blue-border-soft: rgb(79 65 112 / 74%);
  --alpha-blue-count-bg: rgb(55 43 91 / 86%);
  --alpha-blue-shadow: rgb(0 0 0 / 36%);
  --alpha-blue-shadow-14: rgb(0 0 0 / 40%);
  --alpha-blue-shadow-7: rgb(0 0 0 / 24%);
  --alpha-blue-shadow-8: rgb(0 0 0 / 30%);
  --alpha-blue-shadow-9: rgb(0 0 0 / 32%);
  --alpha-line-86: rgb(58 49 83 / 86%);
  --alpha-line-90: rgb(58 49 83 / 90%);
  --alpha-orange-border: rgb(255 151 119 / 28%);
  --alpha-danger-border-18: rgb(255 118 118 / 18%);
  --alpha-danger-border-22: rgb(255 118 118 / 22%);
  --alpha-danger-border-24: rgb(255 118 118 / 24%);
  --alpha-danger-border-28: rgb(255 118 118 / 28%);
  --alpha-danger-border-34: rgb(255 118 118 / 34%);
  --alpha-plan-surface: rgb(33 25 52 / 88%);
  --alpha-coral-border: rgb(255 151 119 / 36%);
  --week-day-card-bg: linear-gradient(180deg, rgb(28 22 44 / 94%) 0%, rgb(20 15 33 / 94%) 100%);
  --alpha-white-16: rgb(243 236 255 / 10%);
  --alpha-white-18: rgb(243 236 255 / 12%);
  --alpha-white-22: rgb(243 236 255 / 16%);
  --alpha-white-72: rgb(243 236 255 / 70%);
  --alpha-white-76: rgb(23 18 37 / 76%);
  --alpha-white-78: rgb(243 236 255 / 62%);
  --alpha-white-88: rgb(23 18 37 / 88%);
  --alpha-white-90: rgb(23 18 37 / 90%);
  --alpha-white-92: rgb(243 236 255 / 26%);
  --alpha-white-94: rgb(23 18 37 / 94%);
  --alpha-complete-shimmer-weak: rgb(120 215 184 / 12%);
  --alpha-complete-shimmer: rgb(120 215 184 / 20%);
  --alpha-complete-ring: rgb(120 215 184 / 42%);
  --alpha-complete-halo: rgb(120 215 184 / 12%);
  --alpha-green-border: rgb(120 215 184 / 28%);
  --alpha-hero-shadow-18: rgb(38 23 76 / 38%);
  --alpha-hero-shadow-20: rgb(111 81 216 / 28%);
  --alpha-hero-shadow-30: rgb(111 81 216 / 34%);
}
`;

export const webAppThemeColors = {
  background: "#f6faff",
  theme: "#0875d8",
};

export const missingPhotoTheme = {
  background: "#edf4ff",
  illustration: "#9fc7f6",
  accent: "#0875d8",
  text: "#8b96ad",
};

export const catalogTheme = {
  people: {
    unassigned: "var(--person-unassigned)",
    ryan: "var(--person-ryan)",
    caroline: "var(--person-caroline)",
  },
  categories: {
    house: "var(--category-house)",
    sellDonate: "var(--category-sell-donate)",
    errands: "var(--category-errands)",
    kai: "var(--category-kai)",
  },
};
