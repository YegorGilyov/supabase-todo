import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { Card, Form, Input, Button, Typography, Alert, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface AuthFormData {
  email: string;
  password: string;
}

export function Auth() {
  const { signIn, signUp } = useAuthContext();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [form] = Form.useForm();

  const handleSubmit = async (values: AuthFormData) => {
    setError('');

    try {
      if (isLogin) {
        await signIn(values.email, values.password);
      } else {
        await signUp(values.email, values.password);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid login credentials')) {
        try {
          await signUp(values.email, values.password);
        } catch (signUpError) {
          message.error('Failed to create account. Please try again.');
          console.error('Sign up error:', signUpError);
        }
      } else {
        message.error('Authentication failed. Please try again.');
        console.error('Auth error:', err);
      }
    }
  };

  return (
    <Card style={{ width: '100%', maxWidth: 400 }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
        {isLogin ? 'Sign In' : 'Sign Up'}
      </Title>
      
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        name="auth"
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please input your email!' },
            { type: 'email', message: 'Please enter a valid email!' }
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Email"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: 'Please input your password!' },
            { min: 6, message: 'Password must be at least 6 characters!' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Password"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </Form.Item>
      </Form>

      <Button
        type="link"
        block
        onClick={() => {
          setIsLogin(!isLogin);
          form.resetFields();
          setError('');
        }}
      >
        {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
      </Button>
    </Card>
  );
} 