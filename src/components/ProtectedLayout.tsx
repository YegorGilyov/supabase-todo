import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { RegistryProvider } from '../contexts/RegistryContext';
import { useTodoState } from '../hooks/useTodoState';
import { useCategoryState } from '../hooks/useCategoryState';
import { useAuthContext } from '../contexts/AuthContext';
import { useMemo } from 'react';

function AuthenticatedContent({ user }: { user: NonNullable<ReturnType<typeof useAuthContext>['user']> }) {
  const { pathname } = useLocation();
  
  // Initialize states only when we have a user
  const todoState = useTodoState(user);
  const categoryState = useCategoryState(user);

  // Memoize the registry value
  const value = useMemo(() => ({
    todos: todoState,
    categories: categoryState,
  }), [todoState, categoryState]);

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

export function ProtectedLayout() {
  const { user, loading } = useAuthContext();

  if (loading) return null;
  if (!user) return null;

  return <AuthenticatedContent user={user} />;
} 