import { Fragment } from "react";

type RichTextProps = {
  text: string;
};

const TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;

function richSegments(line: string) {
  return line.split(TOKEN).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return (
        <span key={index} className="underline underline-offset-2">
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

const BULLET = /^\s*[-•]\s+/;

function isNumberedHeading(line: string) {
  return /^\d+[.)]\s+\S/.test(line) && line.length <= 80 && !/[.;:]$/.test(line);
}

/** Short line with no sentence punctuation reads as a sub-heading. */
function isPlainHeading(line: string) {
  if (line.length > 55) return false;
  if (/[.,;:?!]$/.test(line)) return false;
  return line.split(/\s+/).length <= 7;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: Block[] = [];

  for (const line of lines) {
    if (BULLET.test(line)) {
      const item = line.replace(BULLET, "");
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "list") last.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
      continue;
    }

    if (isNumberedHeading(line) || isPlainHeading(line)) {
      blocks.push({ kind: "heading", text: line });
      continue;
    }

    blocks.push({ kind: "paragraph", text: line });
  }

  return blocks;
}

export function RichText({ text }: RichTextProps) {
  const blocks = parseBlocks(text);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3
              key={index}
              className="pt-3 font-display text-sm font-bold uppercase tracking-wide text-foreground first:pt-0"
            >
              {richSegments(block.text)}
            </h3>
          );
        }

        if (block.kind === "list") {
          return (
            <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-primary">
              {block.items.map((item, i) => (
                <li key={i} className="leading-7">
                  {richSegments(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="leading-7">
            {richSegments(block.text)}
          </p>
        );
      })}
    </div>
  );
}
