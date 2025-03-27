import { Button, Card, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { TodoList } from '../components/TodoList';
import { TodoForm } from '../components/TodoForm';
import { useAuthContext } from '../contexts/AuthContext';

const { Title } = Typography;

export function HomePage() {
  const { signOut } = useAuthContext();

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Todo List
        </Title>
        <Button 
          icon={<LogoutOutlined />}
          onClick={signOut}
          type="text"
          size="large"
        >
          Logout
        </Button>
      </div>
      <Card>
        <TodoForm />
        <div style={{ marginTop: 24 }}>
          <TodoList />
        </div>
      </Card>
    </div>
  );
} 