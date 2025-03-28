import { useState } from 'react';
import { Menu, Button, Modal, Input, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEntity } from '../contexts/RegistryContext';

export function Categories() {
  const { categories, addCategory, editCategory, deleteCategory } = useEntity('categories');
  const { message, modal } = App.useApp();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: string; title: string } | null>(null);

  const handleAdd = () => {
    if (!categoryTitle.trim()) {
      message.error('Category title cannot be empty');
      return;
    }
    
    // Update UI immediately
    const title = categoryTitle.trim();
    setIsAddModalVisible(false);
    setCategoryTitle('');
    
    // Fire and forget - the state will be updated optimistically
    addCategory(title)
      .then(() => message.success('Category added successfully'))
      .catch(() => {
        message.error('Failed to add category');
      });
  };

  const handleEdit = () => {
    if (!editingCategory || !categoryTitle.trim()) {
      message.error('Category title cannot be empty');
      return;
    }
    
    // Update UI immediately
    const title = categoryTitle.trim();
    setIsEditModalVisible(false);
    setCategoryTitle('');
    setEditingCategory(null);
    
    // Fire and forget - the state will be updated optimistically
    editCategory(editingCategory.id, title)
      .then(() => message.success('Category updated successfully'))
      .catch(() => {
        message.error('Failed to update category');
      });
  };

  const handleDelete = (category: { id: string; title: string }) => {
    modal.confirm({
      title: 'Delete Category',
      content: `Are you sure you want to delete "${category.title}"?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: () => {
        // Fire and forget - the state will be updated optimistically
        deleteCategory(category.id)
          .then(() => message.success('Category deleted successfully'))
          .catch(() => {
            message.error('Failed to delete category');
          });
      },
    });
  };

  const menuItems = [
    {
      key: 'no-category',
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>No category</span>
        </div>
      ),
    },
    ...categories.map(category => ({
      key: category.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{category.title}</span>
          <div>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEditingCategory(category);
                setCategoryTitle(category.title);
                setIsEditModalVisible(true);
              }}
            />
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(category);
              }}
            />
          </div>
        </div>
      ),
    }))
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAddModalVisible(true)}
          block
        >
          Add Category
        </Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          onSelect={({ selectedKeys }) => setSelectedKeys(selectedKeys as string[])}
          items={menuItems}
        />
      </div>

      <Modal
        title="Add Category"
        open={isAddModalVisible}
        onOk={handleAdd}
        onCancel={() => {
          setIsAddModalVisible(false);
          setCategoryTitle('');
        }}
      >
        <Input
          placeholder="Category title"
          value={categoryTitle}
          onChange={(e) => setCategoryTitle(e.target.value)}
        />
      </Modal>

      <Modal
        title="Edit Category"
        open={isEditModalVisible}
        onOk={handleEdit}
        onCancel={() => {
          setIsEditModalVisible(false);
          setCategoryTitle('');
          setEditingCategory(null);
        }}
      >
        <Input
          placeholder="Category title"
          value={categoryTitle}
          onChange={(e) => setCategoryTitle(e.target.value)}
        />
      </Modal>
    </div>
  );
} 