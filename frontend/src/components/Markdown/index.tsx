import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import 'highlight.js/styles/atom-one-dark.css';
import './index.scss';
import PreBlock from './PreBlock';

export const Markdown = ({ children }: { children: string }) => {
  return (
    <div className="markdown-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={{
          pre: PreBlock
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
