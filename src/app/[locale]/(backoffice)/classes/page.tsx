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
  Tabs,
  Select,
  List,
  Card,
  Avatar,
  Tag,
  Divider,
  Empty,
  Image,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";

const { Title, Text } = Typography;

interface ClassRecord {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { teachers: number; students: number };
}

interface ClassForm {
  name: string;
  description?: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface MembersData {
  teachers: Member[];
  students: Member[];
}

export default function ClassesPage() {
  const t = useTranslations("classes");
  const { message } = App.useApp();

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ClassForm>();

  // Members modal state
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersClass, setMembersClass] = useState<ClassRecord | null>(null);
  const [members, setMembers] = useState<MembersData>({
    teachers: [],
    students: [],
  });
  const [membersLoading, setMembersLoading] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<Member[]>([]);
  const [studentOptions, setStudentOptions] = useState<Member[]>([]);

  const fetchClasses = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const res = await fetch(`/api/backoffice/classes${params}`);
      const json = await res.json();
      if (json.success) setClasses(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchClasses(value);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: ClassRecord) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description || undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const url = editing
        ? `/api/backoffice/classes/${editing.id}`
        : "/api/backoffice/classes";
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
        fetchClasses(search);
      } else {
        message.error(json.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (record: ClassRecord) => {
    Modal.confirm({
      title: t("deleteConfirm"),
      okType: "danger",
      onOk: async () => {
        const res = await fetch(`/api/backoffice/classes/${record.id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.success) {
          fetchClasses(search);
        } else {
          message.error(json.error);
        }
      },
    });
  };

  // --- Members modal logic ---
  const fetchMembers = async (classId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/backoffice/classes/${classId}/members`);
      const json = await res.json();
      if (json.success) setMembers(json.data);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchTeacherOptions = async (classId: string, searchVal = "") => {
    const params = new URLSearchParams({ excludeClassId: classId });
    if (searchVal) params.set("search", searchVal);
    const res = await fetch(`/api/backoffice/teachers?${params}`);
    const json = await res.json();
    if (json.success) setTeacherOptions(json.data);
  };

  const fetchStudentOptions = async (classId: string, searchVal = "") => {
    const params = new URLSearchParams({
      excludeClassId: classId,
      unassigned: "true",
    });
    if (searchVal) params.set("search", searchVal);
    const res = await fetch(`/api/backoffice/students?${params}`);
    const json = await res.json();
    if (json.success) setStudentOptions(json.data);
  };

  const openMembers = (record: ClassRecord) => {
    setMembersClass(record);
    setMembersOpen(true);
    fetchMembers(record.id);
    fetchTeacherOptions(record.id);
    fetchStudentOptions(record.id);
  };

  const handleAddMember = async (
    role: "teacher" | "student",
    userId: string
  ) => {
    if (!membersClass) return;
    const res = await fetch(
      `/api/backoffice/classes/${membersClass.id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", role, userId }),
      }
    );
    const json = await res.json();
    if (json.success) {
      message.success(
        role === "teacher" ? t("teacherAdded") : t("studentAdded")
      );
      fetchMembers(membersClass.id);
      fetchTeacherOptions(membersClass.id);
      fetchStudentOptions(membersClass.id);
      fetchClasses(search);
    } else {
      message.error(json.error);
    }
  };

  const handleRemoveMember = async (
    role: "teacher" | "student",
    userId: string
  ) => {
    if (!membersClass) return;
    const res = await fetch(
      `/api/backoffice/classes/${membersClass.id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", role, userId }),
      }
    );
    const json = await res.json();
    if (json.success) {
      message.success(
        role === "teacher" ? t("teacherRemoved") : t("studentRemoved")
      );
      fetchMembers(membersClass.id);
      fetchTeacherOptions(membersClass.id);
      fetchStudentOptions(membersClass.id);
      fetchClasses(search);
    } else {
      message.error(json.error);
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
      render: (_: unknown, __: ClassRecord, index: number) => index + 1,
    },
    { title: t("name"), dataIndex: "name", key: "name" },
    {
      title: t("description"),
      dataIndex: "description",
      key: "description",
      render: (val: string | null) => val || "—",
    },
    {
      title: t("teachers"),
      key: "teachers",
      render: (_: unknown, record: ClassRecord) => (
        <Tag color="cyan">{record._count.teachers}</Tag>
      ),
    },
    {
      title: t("students"),
      key: "students",
      render: (_: unknown, record: ClassRecord) => (
        <Tag color="green">{record._count.students}</Tag>
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
      render: (_: unknown, record: ClassRecord) => (
        <Space>
          <Button
            icon={<TeamOutlined />}
            size="small"
            onClick={() => openMembers(record)}
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
          {t("createClass")}
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
          dataSource={classes}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editing ? t("editClass") : t("createClass")}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t("name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("description")}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Members modal */}
      <Modal
        title={`${t("members")} — ${membersClass?.name || ""}`}
        open={membersOpen}
        onCancel={() => setMembersOpen(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        <Tabs
          items={[
            {
              key: "teachers",
              label: `${t("teachers")} (${members.teachers.length})`,
              children: (
                <>
                  <Text type="secondary">{t("searchAndAddTeacher")}</Text>
                  <Select
                    showSearch
                    placeholder={t("addTeacher")}
                    style={{ width: "100%", marginTop: 8, marginBottom: 4 }}
                    filterOption={false}
                    onSearch={(val) =>
                      membersClass &&
                      fetchTeacherOptions(membersClass.id, val)
                    }
                    onSelect={(val: string) => {
                      handleAddMember("teacher", val);
                    }}
                    value={null as unknown as string}
                    options={teacherOptions.map((t) => ({
                      label: `${t.name} (${t.email})`,
                      value: t.id,
                    }))}
                    notFoundContent={
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t("noTeachersAssigned")}
                      />
                    }
                  />
                  <Divider />
                  <Text strong>{t("currentTeachers")}</Text>
                  {members.teachers.length === 0 && !membersLoading ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t("noTeachersAssigned")}
                      style={{ margin: "16px 0" }}
                    />
                  ) : (
                    <List
                      loading={membersLoading}
                      dataSource={members.teachers}
                      style={{ marginTop: 8 }}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            <Button
                              key="rm"
                              size="small"
                              danger
                              onClick={() =>
                                handleRemoveMember("teacher", item.id)
                              }
                            >
                              {t("remove")}
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              item.avatar ? (
                                <Image
                                  src={`${item.avatar}?t=${Date.now()}`}
                                  alt={item.name}
                                  width={36}
                                  height={36}
                                  style={{ borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
                                  preview={{ mask: false }}
                                />
                              ) : (
                                <Avatar icon={<UserOutlined />} size={36} />
                              )
                            }
                            title={item.name}
                            description={item.email}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </>
              ),
            },
            {
              key: "students",
              label: `${t("students")} (${members.students.length})`,
              children: (
                <>
                  <Text type="secondary">{t("searchAndAddStudent")}</Text>
                  <Select
                    showSearch
                    placeholder={t("addStudent")}
                    style={{ width: "100%", marginTop: 8, marginBottom: 4 }}
                    filterOption={false}
                    onSearch={(val) =>
                      membersClass &&
                      fetchStudentOptions(membersClass.id, val)
                    }
                    onSelect={(val: string) => {
                      handleAddMember("student", val);
                    }}
                    value={null as unknown as string}
                    options={studentOptions.map((s) => ({
                      label: `${s.name} (${s.email})`,
                      value: s.id,
                    }))}
                    notFoundContent={
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={t("noStudentsAssigned")}
                      />
                    }
                  />
                  <Divider />
                  <Text strong>{t("currentStudents")}</Text>
                  {members.students.length === 0 && !membersLoading ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t("noStudentsAssigned")}
                      style={{ margin: "16px 0" }}
                    />
                  ) : (
                    <List
                      loading={membersLoading}
                      dataSource={members.students}
                      style={{ marginTop: 8 }}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            <Button
                              key="rm"
                              size="small"
                              danger
                              onClick={() =>
                                handleRemoveMember("student", item.id)
                              }
                            >
                              {t("remove")}
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              item.avatar ? (
                                <Image
                                  src={`${item.avatar}?t=${Date.now()}`}
                                  alt={item.name}
                                  width={36}
                                  height={36}
                                  style={{ borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
                                  preview={{ mask: false }}
                                />
                              ) : (
                                <Avatar icon={<UserOutlined />} size={36} />
                              )
                            }
                            title={item.name}
                            description={item.email}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </>
              ),
            },
          ]}
        />
      </Modal>
    </>
  );
}
