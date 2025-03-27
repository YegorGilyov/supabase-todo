import { Button, Form, Input } from 'antd';
import { useEntity } from '../contexts/RegistryContext';

export function TodoForm() {
  const [form] = Form.useForm();
  const { addTodo } = useEntity('todos');

  const handleSubmit = async ({ title }: { title: string }) => {
    await addTodo(title);
    form.resetFields();
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="inline" style={{ marginBottom: '20px' }}>
      <Form.Item
        name="title"
        rules={[{ required: true, message: 'Please enter a todo title' }]}
        style={{ flex: 1 }}
      >
        <Input placeholder="What needs to be done?" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Add Todo
        </Button>
      </Form.Item>
    </Form>
  );
} 