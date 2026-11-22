/*
  Case-study prose as it is typed in the admin: blank lines separate
  paragraphs, and a run of lines starting with "- " or "• " is a list.
  Single line breaks inside a paragraph stay as breaks.
*/

export type NarrativeBlock = { kind: "paragraph"; lines: string[] } | { kind: "list"; items: string[] };

const BULLET = /^\s*[-•]\s+/;

export function narrativeBlocks(text: string): NarrativeBlock[] {
  const blocks: NarrativeBlock[] = [];
  for (const chunk of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    let paragraph: string[] = [];
    let list: string[] = [];
    const flushParagraph = () => {
      if (paragraph.length) blocks.push({ kind: "paragraph", lines: paragraph });
      paragraph = [];
    };
    const flushList = () => {
      if (list.length) blocks.push({ kind: "list", items: list });
      list = [];
    };
    for (const line of lines) {
      if (BULLET.test(line)) {
        flushParagraph();
        list.push(line.replace(BULLET, ""));
      } else {
        flushList();
        paragraph.push(line);
      }
    }
    flushParagraph();
    flushList();
  }
  return blocks;
}
