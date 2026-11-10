export function formatStat(stat: { value: number; suffix: string }): string {
  return `${stat.value.toLocaleString("en-US")}${stat.suffix}`;
}
