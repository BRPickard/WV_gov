/** Shared grid constants and helpers — safe to import from client components. */

/** Guard rails so one huge upload cannot lock up a browser tab. */
export const MAX_ROWS = 5000;
export const MAX_COLUMNS = 200;
export const MIN_ROWS = 12;
export const MIN_COLUMNS = 6;

/** Spreadsheet-style column labels: A, B, ... Z, AA, AB, ... */
export function columnLabel(index: number): string {
  let label = "";
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}
