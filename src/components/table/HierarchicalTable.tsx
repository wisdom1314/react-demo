import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Radio, message } from 'antd';
import { PlusOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import './styles.css'; // 引入 CSS 文件

export type IColumnType = "CUSTOMIZE" | "FIXED" | "REMARK" | "USER_FILL";

interface Column {
  children: Column[] | null;
  id: string;
  level: number;
  name?: null | string;
  parentId: string;
  title: string | null;
  type: IColumnType;
}

const initialData: Column[] = [
  {
    id: "code",
    parentId: "-1",
    children: null,
    name: null,
    level: 0,
    title: "编号",
    type: "FIXED",
  },
  {
    id: "name",
    parentId: "-1",
    children: null,
    name: null,
    level: 0,
    title: "名称",
    type: "FIXED",
  },
  {
    id: "remark",
    parentId: "-1",
    children: null,
    name: null,
    level: 0,
    title: "工料概要说明",
    type: "FIXED",
  },
];

const HierarchicalTable: React.FC = () => {
  const [data, setData] = useState<Column[]>(initialData);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Column | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend'>('ascend');

  const handleNewRoot = () => {
    setEditingRecord(null);
    setParentId(null);
    setIsModalVisible(true);
  };

  const handleNewChild = (record: Column) => {
    setEditingRecord(null);
    setParentId(record.id);
    setIsModalVisible(true);
  };

  const handleEdit = (record: Column) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (record: Column) => {
    const deleteRecursive = (data: Column[], id: string): Column[] => {
      return data.reduce((acc, item) => {
        if (item.id === id) {
          return acc; // 跳过要删除的项
        }
        if (item.children) {
          item.children = deleteRecursive(item.children, id);
        }
        acc.push(item);
        return acc;
      }, [] as Column[]);
    };
    setData(deleteRecursive(data, record.id));
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const newData = { ...values, id: editingRecord ? editingRecord.id : String(Date.now()), children: editingRecord ? editingRecord.children : null, level: parentId ? 1 : 0 };
  
      const updateData = (data: Column[], newItem: Column): Column[] => {
        return data.map(item => {
          if (item.id === newItem.id) {
            return { ...item, ...newItem }; // 更新节点
          } else if (item.children) {
            item.children = updateData(item.children, newItem);
          }
          return item;
        });
      };
  
      if (editingRecord) {
        setData(updateData(data, newData));
      } else if (parentId) {
        const addChild = (data: Column[], parentId: string, child: Column): Column[] => {
          return data.map(item => {
            if (item.id === parentId) {
              item.children = item.children ? [...item.children, child] : [child];
            } else if (item.children) {
              item.children = addChild(item.children, parentId, child);
            }
            return item;
          });
        };
        setData(addChild(data, parentId, newData));
      } else {
        setData([...data, newData]);
      }
  
      setIsModalVisible(false);
      form.resetFields();
    } catch (errorInfo) {
      console.error('表单验证失败:', errorInfo);
    }
  };
  

  const handleSort = () => {
    const sortRecursive = (data: Column[]): Column[] => {
      return data
        .map(item => ({
          ...item,
          children: item.children ? sortRecursive(item.children) : null,
        }))
        .sort((a, b) => {
          if (a.parentId === b.parentId) {
            const comparison = (a.title || '').localeCompare(b.title || '');
            return sortOrder === 'ascend' ? comparison : -comparison;
          }
          return 0;
        });
    };

    setData(sortRecursive(data));
    setSortOrder(sortOrder === 'ascend' ? 'descend' : 'ascend');
    message.success(`排序方式已切换为 ${sortOrder === 'ascend' ? '降序' : '升序'}`);
  };

  const columns = [
    {
      title: '表头名称',
      dataIndex: 'title',
      key: 'title',
      fixed: 'left' as 'left',
    },
    {
      title: '列类型',
      dataIndex: 'type',
      key: 'type',
      fixed: 'left' as 'left',
      render: (text: IColumnType) => (
        <span>
          {text === 'CUSTOMIZE' && '自定义逻辑'}
          {text === 'FIXED' && '系统默认'}
          {text === 'REMARK' && '备注列'}
          {text === 'USER_FILL' && '用户填列'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (text: any, record: Column) => (
        <span className="action-buttons">
          <Button type="link" disabled={record.type === 'FIXED'} onClick={() => handleNewChild(record)}>新建子级</Button>
          <Button type='link' onClick={() => handleEdit(record)}>编辑</Button>
          <Button danger type='link' disabled={record.type === 'FIXED'} onClick={() => handleDelete(record)}>删除</Button>
        </span>
      ),
    },
  ];

  const renderData = (data: Column[]): any[] => {
    return data.map(item => ({
      ...item,
      children: item.children ? renderData(item.children) : null,
    }));
  };

  return (
    <div>
      <div className="button-group">
        <Button type="primary" onClick={handleNewRoot} icon={<PlusOutlined />}>新建</Button>
        <Button onClick={handleSort} icon={sortOrder === 'ascend' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}>
          {sortOrder === 'ascend' ? '升序' : '降序'}
        </Button>
      </div>
      <Table columns={columns} dataSource={renderData(data)} pagination={false} rowKey="id" />
      <Modal title={editingRecord ? '编辑' : '新建'} visible={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)} okText="确定" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          {editingRecord?.type !== 'FIXED' && (
            <Form.Item name="type" label="列类型" rules={[{ required: true, message: '请选择列类型' }]}>
              <Radio.Group>
                <Radio value="CUSTOMIZE">自定义逻辑</Radio>
                <Radio value="REMARK">备注列</Radio>
                <Radio value="USER_FILL">用户填列</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default HierarchicalTable;
