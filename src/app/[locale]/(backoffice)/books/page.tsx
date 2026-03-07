"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Table,
  Button,
  Input,
  Modal,
  Form,
  Select,
  Space,
  Tag,
  App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title } = Typography;

const PUZZLE_TYPES = [
  "MATCHING",
  "ORDERING",
  "FILL_BLANK",
  "MULTIPLE_CHOICE",
] as const;

type PuzzleType = (typeof PUZZLE_TYPES)[number];

const PUZZLE_TYPE_COLORS: Record<PuzzleType, string> = {
  MATCHING: "blue",
  ORDERING: "green",
  FILL_BLANK: "orange",
  MULTIPLE_CHOICE: "purple",
};

interface Book {
  id: string;
  title: string;
  description: string | null;
  puzzleType: PuzzleType;
  createdAt: string;
  _count: { pages: number };
}

interface BookForm {
  title: string;
  description?: string;
  puzzleType: PuzzleType;
}

export default function BooksPage() {
  const t = useTranslations("books");
  const { message } = App.useApp();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<BookForm>();

  const fetchBooks = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/backoffice/books${params}`);
      const json = await res.json();
      if (json.success) setBooks(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchBooks(value);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Book) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description || undefined,
      puzzleType: record.puzzleType,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const url = editing
        ? `/api/backoffice/books/${editing.id}`
        : "/api/backoffice/books";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();

      if (json.success) {
        setModalOpen(false);
        form.resetFields();
        fetchBooks(search);
      } else {
        message.error(json.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (record: Book) => {
    Modal.confirm({
      title: t("deleteConfirm"),
      okType: "danger",
      onOk: async () => {
        const res = await fetch(`/api/backoffice/books/${record.id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.success) {
          fetchBooks(search);
        } else {
          message.error(json.error);
        }
      },
    });
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      render: (_: unknown, __: Book, index: number) => index + 1,
    },
    { title: t("bookTitle"), dataIndex: "title", key: "title" },
    {
      title: t("description"),
      dataIndex: "description",
      key: "description",
      render: (val: string | null) => val || "—",
    },
    {
      title: t("puzzleType"),
      dataIndex: "puzzleType",
      key: "puzzleType",
      render: (val: PuzzleType) => (
        <Tag color={PUZZLE_TYPE_COLORS[val]}>{val.replace("_", " ")}</Tag>
      ),
    },
    {
      title: t("pages"),
      key: "pages",
      render: (_: unknown, record: Book) => record._count.pages,
    },
    {
      title: t("createdAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: t("actions"),
      key: "actions",
      render: (_: unknown, record: Book) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEdit(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          {t("title")}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("createBook")}
        </Button>
      </div>

      <Input.Search
        placeholder={t("searchPlaceholder")}
        onSearch={handleSearch}
        allowClear
        style={{ marginBottom: 16, maxWidth: 400 }}
      />

      <Table
        dataSource={books}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editing ? t("editBook") : t("createBook")}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={t("bookTitle")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("description")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="puzzleType"
            label={t("puzzleType")}
            rules={[{ required: true }]}
          >
            <Select>
              {PUZZLE_TYPES.map((type) => (
                <Select.Option key={type} value={type}>
                  {type.replace("_", " ")}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
