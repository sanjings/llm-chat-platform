import { Avatar, Dropdown, message, Space, Typography } from 'antd';
import defaultAvatar from '@/assets/images/avatar.png';
import { useUserStore } from '@/store/user';
import { EllipsisOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import './index.scss';

const User: React.FC = () => {
  const userInfo = useUserStore((state) => state.userInfo);

  const items = [
    {
      label: '设置',
      key: 'setting',
      icon: <SettingOutlined />,
      onClick: () => {
        message.info('TO DO');
      }
    },
    {
      label: '退出登录',
      key: 'logout',
      icon: <LogoutOutlined />,
      onClick: () => {
        useUserStore.getState().logout();
      }
    }
  ];

  return (
    <div>
      <Dropdown menu={{ items }} arrow={false} trigger={['click']}>
        <div className="user-container">
          <Space className="user-info">
            <div className="user-avatar">
              <Avatar size={32} src={defaultAvatar} />
            </div>
            <Typography.Text className="user-name">{userInfo?.nickname}</Typography.Text>
          </Space>
          <EllipsisOutlined style={{ marginLeft: 8, fontSize: 16 }} />
        </div>
      </Dropdown>
    </div>
  );
};

export default User;
