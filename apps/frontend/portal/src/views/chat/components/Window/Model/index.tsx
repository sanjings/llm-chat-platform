import { Segmented, Typography } from 'antd';
import { useEffect, useState } from 'react';
import './index.scss';
import { DEFAULT_MODEL_ID, ModelType } from '@/constants/chat';
import { requestChatModels, type ChatModelOption } from '@/services/api/chat';

const fallbackModels = (available: boolean): ChatModelOption[] =>
  Object.values(ModelType).map((id) => ({
    id,
    provider: id.startsWith('deepseek') ? 'openai_compatible' : 'dashscope',
    available,
    unavailableReason: null
  }));

const pickModel = (list: ChatModelOption[], current: string) => {
  if (list.some((item) => item.id === current && item.available)) return current;
  const preferred = list.find((item) => item.id === DEFAULT_MODEL_ID && item.available);
  if (preferred) return preferred.id;
  return list.find((item) => item.available)?.id || current;
};

const uniqueReasons = (list: ChatModelOption[]) => {
  const seen = new Set<string>();
  const reasons: string[] = [];
  for (const item of list) {
    const reason = item.unavailableReason?.trim();
    if (item.available || !reason || seen.has(reason)) continue;
    seen.add(reason);
    reasons.push(reason);
  }
  return reasons;
};

const Model: React.FC<{ onChange: (model: string) => void }> = ({ onChange }) => {
  const [models, setModels] = useState<ChatModelOption[]>(() => fallbackModels(false));
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [hint, setHint] = useState('正在确认模型是否可用');

  useEffect(() => {
    let cancelled = false;
    requestChatModels()
      .then((list) => {
        if (cancelled || !list.length) return;
        setModels(list);
        setHint('');
        setModel((current) => pickModel(list, current));
      })
      .catch(() => {
        if (cancelled) return;
        setModels(fallbackModels(true));
        setHint('暂时无法确认密钥配置，发送时会按服务端结果校验');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onChange(model);
  }, [model, onChange]);

  const reasons = uniqueReasons(models);
  const title = models.find((item) => item.id === model)?.id || model;

  return (
    <div className="model-container">
      <Typography.Title level={3}>使用 {title} 开始对话</Typography.Title>
      <div className="model-options">
        <Segmented<string>
          value={model}
          options={models.map((item) => ({
            label: item.id,
            value: item.id,
            disabled: !item.available
          }))}
          onChange={setModel}
        />
      </div>
      {reasons.map((reason) => (
        <Typography.Text key={reason} type="warning" className="model-unavailable">
          {reason}
        </Typography.Text>
      ))}
      {hint ? (
        <Typography.Text type="secondary" className="model-unavailable">
          {hint}
        </Typography.Text>
      ) : null}
    </div>
  );
};

export default Model;
