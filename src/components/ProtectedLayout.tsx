import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { RegistryProvider } from '../contexts/RegistryContext';
import { useTodoState } from '../hooks/useTodoState';
import { useCategoryState } from '../hooks/useCategoryState';
import { useAuthContext } from '../contexts/AuthContext';

export function ProtectedLayout() {
  const { user } = useAuthContext();
  const { pathname } = useLocation();
  const todoState = useTodoState(user);
  const categoryState = useCategoryState(user);

  const value = {
    todos: todoState,
    categories: categoryState,
  };

  return (
    <RegistryProvider value={value}>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Header>
          <Menu
            theme="dark"
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
        </Layout.Header>
        <Layout.Content>
          <Outlet />
        </Layout.Content>
      </Layout>
    </RegistryProvider>
  );
} 