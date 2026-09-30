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

/** A short line with no sentence punctuation acts as a sub-heading. */
function isSubHeading(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return false;
  if (/^\d+[.)]\s/.test(trimmed)) return true;
  if (/[.,;:?!]$/.test(trimmed)) return false;
  return trimmed.split(/\s+/).length <= 7;
}

function isListItem(line: string) {
  return /^\s*[-•*]\s+/.test(line);
}

export function RichText({ text }: RichTextProps) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  // Fall back to line-by-line when the text has no blank-line paragraphs.
  const paragraphs =
    blocks.length > 1 ? blocks : text.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((block, index) => {
        const lines = block.split("\n");
        const heading = lines.length === 1 && isSubHeading(block);

        if (heading) {
          return (
            <h3
              key={index}
              className="pt-2 font-display text-sm font-bold uppercase tracking-wide text-foreground first:pt-0"
            >
              {richSegments(block.replace(/^\s*[-•*]\s+/, ""))}
            </h3>
          );
        }

        if (lines.every(isListItem) && lines.length > 0) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{richSegments(line.replace(/^\s*[-•*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="leading-7">
            {lines.map((line, i) => (
              <Fragment key={i}>
                {richSegments(line)}
                {i < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
