import React, { useState } from 'react';
import { Input, Button, Space, Form } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { NewTodo } from '../types/todo';

interface TodoFormProps {
  onAddTodo: (todo: NewTodo) => void;
}

export const TodoForm: React.FC<TodoFormProps> = ({ onAddTodo }) => {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onAddTodo({ title: values.title.trim() });
      form.resetFields();
    } catch (error) {
      // Form validation error, no need to handle
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
            icon={<PlusOutlined />}
            htmlType="submit"
            size="large"
          >
            Add
          </Button>
        </Space.Compact>
      </Form.Item>
    </Form>
  );
}; 