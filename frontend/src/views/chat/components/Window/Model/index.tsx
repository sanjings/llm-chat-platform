import { Segmented, Typography } from 'antd';
import { useState } from 'react';
import './index.scss';

const Model: React.FC = () => {
  const [model, setModel] = useState('Qwen-Max');

  return (
    <div className="model-container">
      <Typography.Title level={3}>使用 {model} 开始对话</Typography.Title>
      <Segmented<string> value={model} options={['Qwen-Max', 'DeepSeek']} onChange={setModel} />
    </div>
  );
};

export default Model;
