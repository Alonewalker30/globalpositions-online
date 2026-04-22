interface Props { text: string; className?: string; }

export default function MarkdownText({ text, className }: Props) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`ul-${key}`} className="md-list">
        {listItems.map((item, i) => <li key={i}>{inline(item)}</li>)}
      </ul>
    );
    listItems = [];
  };

  const inline = (s: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
      else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
      else if (m[4]) parts.push(<code key={m.index} className="md-code">{m[4]}</code>);
      last = m.index + m[0].length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts.length === 1 ? parts[0] : parts;
  };

  lines.forEach((line, idx) => {
    const bullet = line.match(/^(\s*[-•*]\s+)(.+)/);
    const numbered = line.match(/^(\s*\d+\.\s+)(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);

    if (bullet) {
      listItems.push(bullet[2]);
    } else if (numbered) {
      listItems.push(numbered[2]);
    } else {
      flushList(String(idx));
      if (h3) {
        nodes.push(<h4 key={idx} className="md-h3">{inline(h3[1])}</h4>);
      } else if (h2) {
        nodes.push(<h3 key={idx} className="md-h2">{inline(h2[1])}</h3>);
      } else if (line.trim() === '') {
        if (nodes.length > 0) nodes.push(<div key={idx} className="md-gap" />);
      } else {
        nodes.push(<p key={idx} className="md-p">{inline(line)}</p>);
      }
    }
  });
  flushList('end');

  return <div className={`md-body ${className ?? ''}`}>{nodes}</div>;
}
