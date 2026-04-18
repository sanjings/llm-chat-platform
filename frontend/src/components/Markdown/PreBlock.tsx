import { Children, isValidElement, useState, type ReactNode } from 'react';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import './PreBlock.scss';
import type { Components } from 'react-markdown';

function extractText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in (node as Record<string, unknown>)) {
    return extractText((node as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

function firstCodeProps(children: ReactNode): { className?: string; innerChildren?: unknown } {
  const first = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: unknown }>(first)) {
    return {};
  }
  const { className, children: innerChildren } = first.props;
  return { className, innerChildren };
}

const PreBlock: NonNullable<Components['pre']> = ({ className, children, ...props }) => {
  const [copied, setCopied] = useState(false);

  const { className: codeClassName, innerChildren } = firstCodeProps(children);
  const match = /language-(\w+)/.exec(codeClassName || '');
  const lang = match?.[1]?.toLowerCase() || 'code';
  const codeText = extractText(innerChildren).replace(/\n$/, '');

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
        {children}
      </pre>
    </div>
  );
};

export default PreBlock;
