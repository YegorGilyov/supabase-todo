import { Auth } from '../components/Auth';
import { Layout } from 'antd';

const { Content } = Layout;

export function AuthPage() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px'
      }}>
        <Auth />
      </Content>
    </Layout>
  );
} 