import { Segmented, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import './index.scss';
import { DEFAULT_MODEL_ID, ModelType } from '@/constants/chat';
import { requestChatModels, type ChatModelOption } from '@/services/api/chat';
import { requestUserDefaultModel } from '@/services/api/user';
import { resolveEffectiveModelId, unavailableReasons } from '@/utils/defaultModel';

const fallbackModels = (available: boolean): ChatModelOption[] =>
  Object.values(ModelType).map((id) => ({
    id,
    provider: id.startsWith('deepseek') ? 'openai_compatible' : 'dashscope',
    available,
    unavailableReason: null
  }));

const Model: React.FC<{ onChange: (model: string) => void }> = ({ onChange }) => {
  const [models, setModels] = useState<ChatModelOption[]>(() => fallbackModels(false));
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [hint, setHint] = useState('正在确认模型是否可用');
  const pickedByUser = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      requestChatModels(),
      requestUserDefaultModel().catch(() => ({ defaultModelId: null, effectiveModelId: '' }))
    ])
      .then(([{ models: list, defaultModelId }, preference]) => {
        if (cancelled || !list.length) return;
        setModels(list);
        setHint('');
        setModel((current) => {
          if (pickedByUser.current && list.some((item) => item.id === current && item.available)) return current;
          return resolveEffectiveModelId(preference.defaultModelId, list, defaultModelId) || current;
        });
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

  const reasons = unavailableReasons(models);
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
          onChange={(value) => {
            pickedByUser.current = true;
            setModel(value);
          }}
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
