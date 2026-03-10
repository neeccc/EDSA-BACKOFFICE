"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Table,
  Button,
  Input,
  Modal,
  Form,
  Space,
  App,
  Select,
  List,
  Card,
  Avatar,
  Upload,
  Tag,
  Divider,
  Empty,
  Image,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

interface Teacher {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  _count: { teacherClasses: number };
}

interface TeacherForm {
  name: string;
  username: string;
  email: string;
  password?: string;
}

interface ClassOption {
  id: string;
  name: string;
  description: string | null;
}

export default function TeachersPage() {
  const t = useTranslations("teachers");
  const { message } = App.useApp();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<TeacherForm>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  // Classes modal state
  const [classesOpen, setClassesOpen] = useState(false);
  const [classesTeacher, setClassesTeacher] = useState<Teacher | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  const fetchTeachers = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/backoffice/teachers${params}`);
      const json = await res.json();
      if (json.success) setTeachers(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchTeachers(value);
  };

  const openCreate = () => {
    setEditing(null);
    setAvatarUrl(null);
    setPendingFile(null);
    setPendingPreview(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Teacher) => {
    setEditing(record);
    setAvatarUrl(record.avatar);
    form.setFieldsValue({ name: record.name, username: record.username, email: record.email });
    setModalOpen(true);
  };

  const uploadAvatar = async (file: File, userId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    const res = await fetch("/api/backoffice/upload", {
      method: "POST",
      body: formData,
    });
    return res.json();
  };

  const handleUpload = async (file: File) => {
    if (editing) {
      // Edit mode: upload immediately
      setUploading(true);
      try {
        const json = await uploadAvatar(file, editing.id);
        if (json.success) {
          setAvatarUrl(json.data.avatar);
          message.success(t("avatarUploaded"));
          fetchTeachers(search);
        } else {
          message.error(json.error);
        }
      } finally {
        setUploading(false);
      }
    } else {
      // Create mode: store file for upload after creation
      setPendingFile(file);
      setPendingPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const url = editing
        ? `/api/backoffice/teachers/${editing.id}`
        : "/api/backoffice/teachers";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();

      if (json.success) {
        // Upload pending avatar for newly created user
        if (!editing && pendingFile && json.data?.id) {
          const uploadJson = await uploadAvatar(pendingFile, json.data.id);
          if (!uploadJson.success) {
            message.warning(uploadJson.error);
          }
        }
        setPendingFile(null);
        setPendingPreview(null);
        setModalOpen(false);
        form.resetFields();
        fetchTeachers(search);
      } else {
        message.error(json.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (record: Teacher) => {
    Modal.confirm({
      title: t("deleteConfirm"),
      okType: "danger",
      onOk: async () => {
        const res = await fetch(`/api/backoffice/teachers/${record.id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.success) {
          fetchTeachers(search);
        } else {
          message.error(json.error);
        }
      },
    });
  };

  // --- Classes modal logic ---
  const fetchAssignedClasses = async (teacherId: string) => {
    setClassesLoading(true);
    try {
      const res = await fetch(`/api/backoffice/teachers/${teacherId}/classes`);
      const json = await res.json();
      if (json.success) setAssignedClasses(json.data);
    } finally {
      setClassesLoading(false);
    }
  };

  const fetchClassOptions = async (teacherId: string, searchVal = "") => {
    const params = new URLSearchParams({ excludeTeacherId: teacherId });
    if (searchVal) params.set("search", searchVal);
    const res = await fetch(`/api/backoffice/classes?${params}`);
    const json = await res.json();
    if (json.success) setClassOptions(json.data);
  };

  const openClasses = (record: Teacher) => {
    setClassesTeacher(record);
    setClassesOpen(true);
    fetchAssignedClasses(record.id);
    fetchClassOptions(record.id);
  };

  const handleAddClass = async (classId: string) => {
    if (!classesTeacher) return;
    const res = await fetch(
      `/api/backoffice/teachers/${classesTeacher.id}/classes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", classId }),
      }
    );
    const json = await res.json();
    if (json.success) {
      message.success(t("classAdded"));
      fetchAssignedClasses(classesTeacher.id);
      fetchClassOptions(classesTeacher.id);
      fetchTeachers(search);
    } else {
      message.error(json.error);
    }
  };

  const handleRemoveClass = async (classId: string) => {
    if (!classesTeacher) return;
    const res = await fetch(
      `/api/backoffice/teachers/${classesTeacher.id}/classes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", classId }),
      }
    );
    const json = await res.json();
    if (json.success) {
      message.success(t("classRemoved"));
      fetchAssignedClasses(classesTeacher.id);
      fetchClassOptions(classesTeacher.id);
      fetchTeachers(search);
    } else {
      message.error(json.error);
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      render: (_: unknown, __: Teacher, index: number) => index + 1,
    },
    {
      title: "",
      key: "avatar",
      width: 48,
      render: (_: unknown, record: Teacher) =>
        record.avatar ? (
          <Image
            src={`${record.avatar}?t=${Date.now()}`}
            alt={record.name}
            width={32}
            height={32}
            style={{ borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
            preview={{ mask: false }}
          />
        ) : (
          <Avatar icon={<UserOutlined />} size={32}>
            {record.name?.[0]?.toUpperCase()}
          </Avatar>
        ),
    },
    { title: t("name"), dataIndex: "name", key: "name" },
    { title: t("username"), dataIndex: "username", key: "username" },
    { title: t("email"), dataIndex: "email", key: "email" },
    {
      title: t("classes"),
      key: "classes",
      render: (_: unknown, record: Teacher) => (
        <a onClick={() => openClasses(record)}>
          {record._count.teacherClasses}
        </a>
      ),
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
      render: (_: unknown, record: Teacher) => (
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
          {t("createTeacher")}
        </Button>
      </div>

      <Input.Search
        placeholder={t("searchPlaceholder")}
        onSearch={handleSearch}
        allowClear
        style={{ marginBottom: 16, maxWidth: 400 }}
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={teachers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editing ? t("editTeacher") : t("createTeacher")}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
      >
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Avatar
            src={
              editing
                ? avatarUrl
                  ? `${avatarUrl}?t=${Date.now()}`
                  : undefined
                : pendingPreview || undefined
            }
            icon={
              !(editing ? avatarUrl : pendingPreview) ? (
                <UserOutlined />
              ) : undefined
            }
            size={80}
          />
          <div style={{ marginTop: 8 }}>
            <Upload
              showUploadList={false}
              accept="image/jpeg,image/png,image/webp,image/gif"
              beforeUpload={(file) => {
                handleUpload(file);
                return false;
              }}
            >
              <Button
                icon={<UploadOutlined />}
                size="small"
                loading={uploading}
              >
                {t("uploadAvatar")}
              </Button>
            </Upload>
          </div>
        </div>
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t("name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="username"
            label={t("username")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label={t("email")}
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("password")}
            rules={editing ? [] : [{ required: true }]}
            extra={editing ? t("passwordHint") : undefined}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* Classes modal */}
      <Modal
        title={`${t("classesFor")} ${classesTeacher?.name || ""}`}
        open={classesOpen}
        onCancel={() => setClassesOpen(false)}
        footer={null}
        width={480}
        destroyOnHidden
      >
        <Text type="secondary">{t("addClassLabel")}</Text>
        <Select
          showSearch
          placeholder={t("addClass")}
          style={{ width: "100%", marginTop: 8, marginBottom: 4 }}
          filterOption={false}
          onSearch={(val) =>
            classesTeacher && fetchClassOptions(classesTeacher.id, val)
          }
          onSelect={(val: string) => handleAddClass(val)}
          value={null as unknown as string}
          options={classOptions.map((c) => ({
            label: c.name,
            value: c.id,
          }))}
          notFoundContent={
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("noClassesAvailable")}
            />
          }
        />

        <Divider />

        <Text strong>
          {t("assignedClasses")} ({assignedClasses.length})
        </Text>
        {assignedClasses.length === 0 && !classesLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("noClassesAssigned")}
            style={{ margin: "16px 0" }}
          />
        ) : (
          <List
            loading={classesLoading}
            dataSource={assignedClasses}
            style={{ marginTop: 8 }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="rm"
                    size="small"
                    danger
                    onClick={() => handleRemoveClass(item.id)}
                  >
                    {t("remove")}
                  </Button>,
                ]}
              >
                <Tag color="blue">{item.name}</Tag>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  );
}
