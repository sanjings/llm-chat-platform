import { message, Segmented, Typography } from 'antd';
import { useEffect, useState } from 'react';
import './index.scss';
import { ModelType } from '@/constants/chat';

const Model: React.FC<{ onChange: (model: ModelType) => void }> = ({ onChange }) => {
  const modelOptions = [
    { label: 'Qwen-Max', value: ModelType.QWEN_MAX },
    { label: 'DeepSeek', value: ModelType.DEEPSEEK_CHAT }
  ];
  const [model, setModel] = useState<ModelType>(ModelType.QWEN_MAX);
  const [modeText, setModeText] = useState('');

  const handleChange = (model: ModelType) => {
    if (model !== ModelType.QWEN_MAX) {
      message.warning('DeepSeek 模型暂未开放，请使用 Qwen-Max 模型');
      return;
    }
    setModel(model);
  };

  useEffect(() => {
    setModeText(modelOptions.find((option) => option.value === model)?.label || '');
    onChange(model);
  }, [model]);

  return (
    <div className="model-container">
      <Typography.Title level={3}>使用 {modeText} 开始对话</Typography.Title>
      <Segmented<ModelType> value={model} options={modelOptions} onChange={handleChange} />
    </div>
  );
};

export default Model;
