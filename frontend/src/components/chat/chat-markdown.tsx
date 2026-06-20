import { memo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const REMARK_PLUGINS = [remarkGfm];

function ChatMarkdownRenderer({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>
      {children}
    </ReactMarkdown>
  );
}

export const MemoizedChatMarkdown = memo(ChatMarkdownRenderer);
export default MemoizedChatMarkdown;
