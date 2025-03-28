import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useAuthContext } from '../contexts/AuthContext';
import { RegistryProvider } from '../contexts/RegistryContext';
import { useCategoryState } from '../hooks/useCategoryState';
import { useTodoState } from '../hooks/useTodoState';

export function ProtectedLayout() {
  const { signOut, user } = useAuthContext();
  const { pathname } = useLocation();
  const categoryState = useCategoryState(user);
  const todoState = useTodoState(user);

  const value = {
    categories: categoryState,
    todos: todoState,
  };

  return (
    <RegistryProvider value={value}>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 24px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Menu
            style={{ flex: 1, border: 'none' }}
            mode="horizontal"
            selectedKeys={[pathname === '/' ? 'todos' : 'categories']}
            items={[
              {
                key: 'todos',
                label: <Link to="/">Todo List</Link>,
              },
              {
                key: 'categories',
                label: <Link to="/categories">Categories</Link>,
              },
            ]}
          />
          <Button 
            icon={<LogoutOutlined />}
            onClick={signOut}
          >
            Logout
          </Button>
        </Layout.Header>
        <Layout.Content>
          <Outlet />
        </Layout.Content>
      </Layout>
    </RegistryProvider>
  );
} 