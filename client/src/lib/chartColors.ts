// Validated categorical order — assign by slot index, never cycle arbitrarily.
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

// Single-hue sequential ramp (blue), light -> dark, for magnitude encodings.
export const SEQUENTIAL_BLUE = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];

// Diverging pair: blue (negative/cool) <-> red (positive/warm), neutral gray midpoint.
export const DIVERGING = { negative: '#2a78d6', neutral: '#f0efec', positive: '#e34948' };

// Fixed status palette — reserved for state, never reused as a categorical series.
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

// Universe lifecycle -> status-family colors (ordered untapped -> productive, then critical for lapsed).
export const UNIVERSE_STATUS_COLOR: Record<string, string> = {
  UNTAPPED: '#898781',
  COVERED: '#eda100',
  PRODUCTIVE: '#0ca30c',
  NON_PRODUCTIVE: '#d03b3b',
};

export const CHART_INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  surface: '#ffffff',
};
