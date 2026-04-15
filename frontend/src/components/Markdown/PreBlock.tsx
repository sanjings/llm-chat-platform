import { useState } from 'react';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import './PreBlock.scss';

function extractText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in (node as Record<string, unknown>)) {
    return extractText((node as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

export default function PreBlock({ className, children, ...props }) {
  const [copied, setCopied] = useState(false);

  const match = /language-(\w+)/.exec(children.props.className || '');
  const lang = match?.[1]?.toLowerCase() || 'code';
  const codeText = extractText(children.props.children).replace(/\n$/, '');

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="pre-block-wrapper">
      <div className="pre-header">
        <span className="pre-lang">{lang}</span>
        <CopyToClipboard text={codeText} onCopy={handleCopy}>
          <button className="pre-copy-btn" type="button">
            {copied ? <CheckOutlined /> : <CopyOutlined />}
            <span style={{ marginLeft: 2 }}>复制</span>
          </button>
        </CopyToClipboard>
      </div>
      <pre className={className} {...props}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
