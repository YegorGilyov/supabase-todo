import { useAuth } from '../hooks/useAuth';
import { TodoList } from '../components/TodoList';
import { Layout, Button, Typography, theme } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title } = Typography;

export function HomePage() {
  const { user, signOut } = useAuth();
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: token.colorBgContainer,
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Title level={4} style={{ margin: 0 }}>
          Welcome, {user?.email}!
        </Title>
        <Button 
          icon={<LogoutOutlined />}
          onClick={signOut}
          type="text"
        >
          Sign Out
        </Button>
      </Header>
      <Content style={{ 
        padding: '24px',
        maxWidth: '800px',
        width: '100%',
        margin: '0 auto'
      }}>
        <TodoList />
      </Content>
    </Layout>
  );
} 