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
  Tag,
  Card,
  Avatar,
  Upload,
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
  EyeOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";

const { Title, Text } = Typography;

interface StudentClass {
  class: { id: string; name: string };
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  _count: { studentClasses: number };
  studentClasses: StudentClass[];
}

interface StudentForm {
  name: string;
  email: string;
  password?: string;
}

interface ClassOption {
  id: string;
  name: string;
  description: string | null;
}

export default function StudentsPage() {
  const t = useTranslations("students");
  const { message } = App.useApp();
  const router = useRouter();
  const { locale } = useParams();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<StudentForm>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  // Class assignment modal state
  const [classOpen, setClassOpen] = useState(false);
  const [classStudent, setClassStudent] = useState<Student | null>(null);
  const [assignedClass, setAssignedClass] = useState<ClassOption | null>(null);
  const [classLoading, setClassLoading] = useState(false);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  const fetchStudents = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/backoffice/students${params}`);
      const json = await res.json();
      if (json.success) setStudents(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchStudents(value);
  };

  const openCreate = () => {
    setEditing(null);
    setAvatarUrl(null);
    setPendingFile(null);
    setPendingPreview(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Student) => {
    setEditing(record);
    setAvatarUrl(record.avatar);
    form.setFieldsValue({ name: record.name, email: record.email });
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
      setUploading(true);
      try {
        const json = await uploadAvatar(file, editing.id);
        if (json.success) {
          setAvatarUrl(json.data.avatar);
          message.success(t("avatarUploaded"));
          fetchStudents(search);
        } else {
          message.error(json.error);
        }
      } finally {
        setUploading(false);
      }
    } else {
      setPendingFile(file);
      setPendingPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const url = editing
        ? `/api/backoffice/students/${editing.id}`
        : "/api/backoffice/students";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();

      if (json.success) {
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
        fetchStudents(search);
      } else {
        message.error(json.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (record: Student) => {
    Modal.confirm({
      title: t("deleteConfirm"),
      okType: "danger",
      onOk: async () => {
        const res = await fetch(`/api/backoffice/students/${record.id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.success) {
          fetchStudents(search);
        } else {
          message.error(json.error);
        }
      },
    });
  };

  // --- Class assignment modal logic ---
  const fetchAssignedClass = async (studentId: string) => {
    setClassLoading(true);
    try {
      const res = await fetch(`/api/backoffice/students/${studentId}/classes`);
      const json = await res.json();
      if (json.success) {
        setAssignedClass(json.data.length > 0 ? json.data[0] : null);
      }
    } finally {
      setClassLoading(false);
    }
  };

  const fetchClassOptions = async (studentId: string, searchVal = "") => {
    const params = new URLSearchParams({ excludeStudentId: studentId });
    if (searchVal) params.set("search", searchVal);
    const res = await fetch(`/api/backoffice/classes?${params}`);
    const json = await res.json();
    if (json.success) setClassOptions(json.data);
  };

  const openClassModal = (record: Student) => {
    setClassStudent(record);
    setClassOpen(true);
    fetchAssignedClass(record.id);
    fetchClassOptions(record.id);
  };

  const handleAssignClass = async (classId: string) => {
    if (!classStudent) return;
    // If already assigned, remove old first
    if (assignedClass) {
      const removeRes = await fetch(
        `/api/backoffice/students/${classStudent.id}/classes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove", classId: assignedClass.id }),
        }
      );
      const removeJson = await removeRes.json();
      if (!removeJson.success) {
        message.error(removeJson.error);
        return;
      }
    }

    const res = await fetch(
      `/api/backoffice/students/${classStudent.id}/classes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", classId }),
      }
    );
    const json = await res.json();
    if (json.success) {
      message.success(t("classAssigned"));
      fetchAssignedClass(classStudent.id);
      fetchClassOptions(classStudent.id);
      fetchStudents(search);
    } else {
      message.error(json.error);
    }
  };

  const handleRemoveClass = async () => {
    if (!classStudent || !assignedClass) return;
    const res = await fetch(
      `/api/backoffice/students/${classStudent.id}/classes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", classId: assignedClass.id }),
      }
    );
    const json = await res.json();
    if (json.success) {
      message.success(t("classRemoved"));
      fetchAssignedClass(classStudent.id);
      fetchClassOptions(classStudent.id);
      fetchStudents(search);
    } else {
      message.error(json.error);
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      render: (_: unknown, __: Student, index: number) => index + 1,
    },
    {
      title: "",
      key: "avatar",
      width: 48,
      render: (_: unknown, record: Student) =>
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
    {
      title: t("name"),
      dataIndex: "name",
      key: "name",
      render: (name: string, record: Student) => (
        <a onClick={() => router.push(`/${locale}/students/${record.id}`)}>
          {name}
        </a>
      ),
    },
    { title: t("email"), dataIndex: "email", key: "email" },
    {
      title: t("class"),
      key: "class",
      render: (_: unknown, record: Student) => {
        const cls = record.studentClasses?.[0]?.class;
        return cls ? (
          <Tag
            color="blue"
            style={{ cursor: "pointer" }}
            onClick={() => openClassModal(record)}
          >
            {cls.name}
          </Tag>
        ) : (
          <Tag
            style={{ cursor: "pointer" }}
            onClick={() => openClassModal(record)}
          >
            {t("assignClass")}
          </Tag>
        );
      },
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
      render: (_: unknown, record: Student) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => router.push(`/${locale}/students/${record.id}`)}
          />
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
          {t("createStudent")}
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
          dataSource={students}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editing ? t("editStudent") : t("createStudent")}
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

      {/* Class assignment modal */}
      <Modal
        title={`${t("classFor")} ${classStudent?.name || ""}`}
        open={classOpen}
        onCancel={() => setClassOpen(false)}
        footer={null}
        width={440}
        destroyOnHidden
      >
        <Text strong>{t("currentClassLabel")}</Text>
        <div style={{ margin: "8px 0" }}>
          {classLoading ? (
            <div style={{ textAlign: "center", padding: 12 }}>Loading...</div>
          ) : assignedClass ? (
            <Space>
              <Tag color="blue" style={{ fontSize: 14, padding: "4px 8px" }}>
                {assignedClass.name}
              </Tag>
              <Button size="small" danger onClick={handleRemoveClass}>
                {t("remove")}
              </Button>
            </Space>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("noClassAssigned")}
              style={{ margin: "8px 0" }}
            />
          )}
        </div>

        <Divider />

        <Text type="secondary">{t("changeClassLabel")}</Text>
        <Select
          showSearch
          placeholder={t("selectClass")}
          style={{ width: "100%", marginTop: 8 }}
          filterOption={false}
          onSearch={(val) =>
            classStudent && fetchClassOptions(classStudent.id, val)
          }
          onSelect={(val: string) => handleAssignClass(val)}
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
      </Modal>
    </>
  );
}
