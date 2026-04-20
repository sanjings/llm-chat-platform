import { Input, message, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { requestSessionTitleUpdate } from '@/services/swagger/session';
import { ApiResponseCode } from '@/services/request';

export default function RenameModal({
  open,
  sessionId,
  sessionTitle,
  onFinish,
  onCancel
}: {
  open: boolean;
  sessionId?: string;
  sessionTitle?: string;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(sessionTitle);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(sessionTitle);
    } else {
      setTitle('');
    }
  }, [open, sessionTitle]);

  const submitRename = async () => {
    try {
      setConfirmLoading(true);
      const res = await requestSessionTitleUpdate({ id: sessionId, title: title });
      if (res.code === ApiResponseCode.SUCCESS) {
        onFinish();
        onCancel();
      } else {
        message.error(res.message);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Modal title="修改会话标题" open={open} onOk={submitRename} onCancel={onCancel} confirmLoading={confirmLoading}>
      <Input value={title} onChange={(e) => setTitle(e.target.value.trim())} maxLength={40} />
    </Modal>
  );
}
