// Ported 1:1 from src/app/globals.css (the "Harbor" design language) in the web app.
// Keep these values in sync with that file if the web palette ever changes.

export interface HarborColors {
  paper: string;
  paperDim: string;
  surface: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  lineSoft: string;

  signal: string;
  signalDim: string;
  signalTint: string;

  amber: string;
  amberDim: string;
  amberTint: string;

  rose: string;
  roseTint: string;

  // M3-style secondary/tertiary tonal accents — used alongside signal blue
  // to give scenario categories, feature chips and pricing plans their own
  // identity, instead of one blue repeated everywhere.
  mint: string;
  mintDim: string;
  mintTint: string;

  violet: string;
  violetDim: string;
  violetTint: string;

  blossom: string;
  blossomDim: string;
  blossomTint: string;
}

export const lightColors: HarborColors = {
  paper: "#f5f7fa",
  paperDim: "#eaeef3",
  surface: "#ffffff",
  ink: "#12182b",
  inkSoft: "#57607a",
  inkFaint: "#98a1b8",
  line: "#dde3ec",
  lineSoft: "#e8ecf3",

  signal: "#1d4ed8",
  signalDim: "#1e3a8a",
  signalTint: "#e8eefc",

  amber: "#b45309",
  amberDim: "#7c3a09",
  amberTint: "#fdf1e2",

  rose: "#b91c1c",
  roseTint: "#fbe9e9",

  mint: "#0d9488",
  mintDim: "#0f766e",
  mintTint: "#e3f6f2",

  violet: "#7c3aed",
  violetDim: "#6025c0",
  violetTint: "#f1ecfd",

  blossom: "#db2777",
  blossomDim: "#a3175a",
  blossomTint: "#fce7f3",
};

export const darkColors: HarborColors = {
  paper: "#0b0f1a",
  paperDim: "#111624",
  surface: "#151b2c",
  ink: "#e8ecf5",
  inkSoft: "#a7b0c7",
  inkFaint: "#6b7490",
  line: "#262e44",
  lineSoft: "#1c2334",

  signal: "#6d97f7",
  signalDim: "#93b3fa",
  signalTint: "#16213d",

  amber: "#e8a34f",
  amberDim: "#f0bd7c",
  amberTint: "#2c2013",

  rose: "#e08a8a",
  roseTint: "#2b1a1a",

  mint: "#2dd4bf",
  mintDim: "#5eead4",
  mintTint: "#103330",

  violet: "#a78bfa",
  violetDim: "#c4b5fd",
  violetTint: "#241c3d",

  blossom: "#f472b6",
  blossomDim: "#f9a8d4",
  blossomTint: "#341a29",
};
