import { Form, Input, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTodoContext } from '../contexts/TodoContext';

export function TodoForm() {
  const [form] = Form.useForm();
  const { addTodo } = useTodoContext();

  const handleSubmit = async ({ title }: { title: string }) => {
    if (!title.trim()) return;
    
    try {
      await addTodo({ title: title.trim() });
      form.resetFields();
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit}>
      <Form.Item
        name="title"
        rules={[
          { required: true, message: 'Please enter a todo' },
          { whitespace: true, message: 'Todo cannot be empty' }
        ]}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="What needs to be done?"
            size="large"
          />
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            size="large"
          >
            Add
          </Button>
        </Space.Compact>
      </Form.Item>
    </Form>
  );
} 