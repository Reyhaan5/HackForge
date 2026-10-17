import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./styles/MessageRenderer.module.css";

function parseText(raw) {
  if (typeof raw === "string") return raw;
  if (!raw) return "";
  if (Array.isArray(raw)) {
    return raw.map((item) => parseText(item)).filter(Boolean).join("\n\n");
  }
  if (typeof raw === "object") {
    if (raw.text) return parseText(raw.text);
    if (raw.answer) return parseText(raw.answer);
    if (raw.message) return parseText(raw.message);
    if (raw.content) return parseText(raw.content);
    return JSON.stringify(raw);
  }
  return String(raw);
}

export default function MessageRenderer({ text }) {
  const content = parseText(text);
  if (!content) return null;

  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a:({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table:({ children }) => (
            <div className={styles.tableWrap}>
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

