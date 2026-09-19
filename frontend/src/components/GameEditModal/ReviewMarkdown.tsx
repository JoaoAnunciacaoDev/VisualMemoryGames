import { Fragment, type ReactNode } from 'react';

interface Props {
  markdown: string;
  className?: string;
}

const inlineTokenPattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*\n]+)\*|_([^_\n]+)_)/g;

function safeExternalUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function renderInline(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of content.matchAll(inlineTokenPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(content.slice(cursor, index));

    const key = `${index}-${match[0]}`;
    if (match[2] !== undefined && match[3] !== undefined) {
      const href = safeExternalUrl(match[3].trim());
      nodes.push(href
        ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{match[2]}</a>
        : <Fragment key={key}>{match[2]}</Fragment>);
    } else if (match[4] !== undefined || match[5] !== undefined) {
      nodes.push(<strong key={key}>{match[4] ?? match[5]}</strong>);
    } else if (match[6] !== undefined) {
      nodes.push(<code key={key}>{match[6]}</code>);
    } else {
      nodes.push(<em key={key}>{match[7] ?? match[8]}</em>);
    }

    cursor = index + match[0].length;
  }

  if (cursor < content.length) nodes.push(content.slice(cursor));
  return nodes;
}

export default function ReviewMarkdown({ markdown, className }: Props) {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const content = renderInline(heading[2]);
      const key = `heading-${index}`;
      blocks.push(heading[1].length === 1
        ? <h1 key={key}>{content}</h1>
        : heading[1].length === 2
          ? <h2 key={key}>{content}</h2>
          : <h3 key={key}>{content}</h3>);
      index += 1;
      continue;
    }

    if (/^>\s+/.test(line)) {
      blocks.push(<blockquote key={`quote-${index}`}>{renderInline(line.replace(/^>\s+/, ''))}</blockquote>);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      const listStart = index;
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        const item = lines[index].replace(/^\s*[-*]\s+/, '');
        items.push(<li key={`item-${index}`}>{renderInline(item)}</li>);
        index += 1;
      }
      blocks.push(<ul key={`list-${listStart}`}>{items}</ul>);
      continue;
    }

    const paragraphLines = [line];
    const paragraphStart = index;
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index].trim();
      if (!nextLine || /^(#{1,3})\s+|^>\s+|^[-*]\s+/.test(nextLine)) break;
      paragraphLines.push(nextLine);
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${paragraphStart}`}>
        {paragraphLines.map((paragraphLine, lineIndex) => (
          <Fragment key={`${paragraphStart}-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {renderInline(paragraphLine)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className={className}>{blocks}</div>;
}
