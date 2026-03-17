"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Avatar,
  Descriptions,
  Statistic,
  Progress,
  Spin,
  Empty,
  Button,
  Popconfirm,
  message,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  BookOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  DeleteOutlined,
  UnlockOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const { Title } = Typography;

type PuzzleType = "MATCHING" | "ORDERING" | "FILL_BLANK" | "MULTIPLE_CHOICE";

const PUZZLE_TYPE_COLORS: Record<PuzzleType, string> = {
  MATCHING: "blue",
  ORDERING: "green",
  FILL_BLANK: "orange",
  MULTIPLE_CHOICE: "purple",
};

interface StudentData {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  createdAt: string;
  studentClasses: { class: { id: string; name: string } }[];
}

interface BookProgress {
  id: string;
  title: string;
  puzzleType: PuzzleType;
  order: number;
  totalPages: number;
  completedPages: number;
  avgScore: number | null;
  lastActivity: string | null;
  status: "not_started" | "in_progress" | "completed";
  manuallyUnlocked: boolean;
}

interface Stats {
  totalBooks: number;
  booksStarted: number;
  booksCompleted: number;
  completionRate: number;
  avgScore: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "default",
  in_progress: "processing",
  completed: "success",
};

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = use(params);
  const t = useTranslations("studentDetail");
  const tc = useTranslations("common");
  const router = useRouter();

  const [student, setStudent] = useState<StudentData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookProgress, setBookProgress] = useState<BookProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchStudent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/backoffice/students/${id}`);
      const json = await res.json();
      if (json.success) {
        setStudent(json.data.student);
        setStats(json.data.stats);
        setBookProgress(json.data.bookProgress);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const resetProgress = useCallback(async (bookId?: string) => {
    try {
      const url = bookId
        ? `/api/backoffice/students/${id}/progress?bookId=${bookId}`
        : `/api/backoffice/students/${id}/progress`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        message.success(t("progressReset"));
        fetchStudent();
      }
    } catch {
      message.error("Failed to reset progress");
    }
  }, [id, t, fetchStudent]);

  const unlockBook = useCallback(async (bookId: string) => {
    try {
      const res = await fetch(`/api/backoffice/students/${id}/unlocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookIds: [bookId] }),
      });
      const json = await res.json();
      if (json.success) {
        message.success(t("bookUnlocked"));
        fetchStudent();
      }
    } catch {
      message.error("Failed to unlock book");
    }
  }, [id, t, fetchStudent]);

  const lockBook = useCallback(async (bookId: string) => {
    try {
      const res = await fetch(`/api/backoffice/students/${id}/unlocks?bookId=${bookId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        message.success(t("bookLocked"));
        fetchStudent();
      }
    } catch {
      message.error("Failed to lock book");
    }
  }, [id, t, fetchStudent]);

  const unlockAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/backoffice/students/${id}/unlocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (json.success) {
        message.success(t("allBooksUnlocked"));
        fetchStudent();
      }
    } catch {
      message.error("Failed to unlock all books");
    }
  }, [id, t, fetchStudent]);

  const removeAllUnlocks = useCallback(async () => {
    try {
      const res = await fetch(`/api/backoffice/students/${id}/unlocks`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        message.success(t("allUnlocksRemoved"));
        fetchStudent();
      }
    } catch {
      message.error("Failed to remove unlocks");
    }
  }, [id, t, fetchStudent]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (notFound || !student || !stats) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Empty description={t("notFound")} />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(`/${locale}/students`)}
          style={{ marginTop: 16 }}
        >
          {t("backToList")}
        </Button>
      </div>
    );
  }

  const cls = student.studentClasses?.[0]?.class;
  const hasManualUnlocks = bookProgress.some((b) => b.manuallyUnlocked);

  const columns = [
    {
      title: "#",
      key: "order",
      width: 50,
      render: (_: unknown, record: BookProgress) => record.order,
    },
    {
      title: t("bookTitle"),
      dataIndex: "title",
      key: "title",
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
      title: t("progress"),
      key: "progress",
      render: (_: unknown, record: BookProgress) => {
        const percent =
          record.totalPages > 0
            ? Math.round((record.completedPages / record.totalPages) * 100)
            : 0;
        return (
          <div style={{ minWidth: 120 }}>
            <Progress percent={percent} size="small" />
            <span style={{ fontSize: 12, color: "#888" }}>
              {record.completedPages}/{record.totalPages}
            </span>
          </div>
        );
      },
    },
    {
      title: t("avgScore"),
      key: "avgScore",
      render: (_: unknown, record: BookProgress) =>
        record.avgScore !== null ? `${record.avgScore} pts` : "—",
    },
    {
      title: t("status"),
      key: "status",
      render: (_: unknown, record: BookProgress) => (
        <Tag color={STATUS_COLORS[record.status]}>
          {t(`status_${record.status}`)}
        </Tag>
      ),
    },
    {
      title: t("lastActivity"),
      key: "lastActivity",
      render: (_: unknown, record: BookProgress) =>
        record.lastActivity
          ? new Date(record.lastActivity).toLocaleDateString()
          : "—",
    },
    {
      title: t("unlock"),
      key: "unlock",
      width: 120,
      render: (_: unknown, record: BookProgress) => {
        if (record.manuallyUnlocked) {
          return (
            <Popconfirm
              title={t("lockBookConfirm")}
              onConfirm={() => lockBook(record.id)}
              okText={tc("confirm")}
              cancelText={tc("cancel")}
            >
              <Button
                type="link"
                size="small"
                icon={<LockOutlined />}
              >
                {t("lock")}
              </Button>
            </Popconfirm>
          );
        }
        return (
          <Button
            type="link"
            size="small"
            icon={<UnlockOutlined />}
            onClick={() => unlockBook(record.id)}
          >
            {t("unlockBook")}
          </Button>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_: unknown, record: BookProgress) =>
        record.status !== "not_started" ? (
          <Popconfirm
            title={t("resetBookConfirm")}
            onConfirm={() => resetProgress(record.id)}
            okText={t("resetProgress")}
            cancelText={tc("cancel")}
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              {t("resetProgress")}
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(`/${locale}/students`)}
        />
        <Title level={2} style={{ margin: 0 }}>
          {student.name}
        </Title>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col flex="none">
            <Avatar
              src={student.avatar ? `${student.avatar}?t=${Date.now()}` : undefined}
              icon={!student.avatar ? <UserOutlined /> : undefined}
              size={80}
            />
          </Col>
          <Col flex="auto">
            <Descriptions column={{ xs: 1, sm: 2, md: 2 }} colon={false} layout="vertical">
              <Descriptions.Item label={t("name")}>{student.name}</Descriptions.Item>
              <Descriptions.Item label={t("username")}>{student.username}</Descriptions.Item>
              <Descriptions.Item label={t("email")}>{student.email}</Descriptions.Item>
              <Descriptions.Item label={t("class")}>
                {cls ? <Tag color="blue">{cls.name}</Tag> : t("noClass")}
              </Descriptions.Item>
              <Descriptions.Item label={t("joinedAt")}>
                {new Date(student.createdAt).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title={t("booksStarted")}
              value={stats.booksStarted}
              suffix={`/ ${stats.totalBooks}`}
              prefix={<span style={{ color: "#1677ff" }}><BookOutlined /></span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title={t("booksCompleted")}
              value={stats.booksCompleted}
              prefix={<span style={{ color: "#52c41a" }}><CheckCircleOutlined /></span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title={t("completionRate")}
              value={stats.completionRate}
              suffix="%"
              prefix={<span style={{ color: "#52c41a" }}><CheckCircleOutlined /></span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card>
            <Statistic
              title={t("avgScore")}
              value={stats.avgScore ?? "—"}
              prefix={
                stats.avgScore !== null ? (
                  <span style={{ color: "#faad14" }}><TrophyOutlined /></span>
                ) : undefined
              }
              suffix={stats.avgScore !== null ? "pts" : undefined}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {t("bookProgress")}
        </Title>
        <Space>
          {hasManualUnlocks ? (
            <Popconfirm
              title={t("removeAllUnlocksConfirm")}
              onConfirm={removeAllUnlocks}
              okText={tc("confirm")}
              cancelText={tc("cancel")}
            >
              <Button icon={<LockOutlined />}>
                {t("removeAllUnlocks")}
              </Button>
            </Popconfirm>
          ) : null}
          <Popconfirm
            title={t("unlockAllConfirm")}
            onConfirm={unlockAll}
            okText={tc("confirm")}
            cancelText={tc("cancel")}
          >
            <Button type="primary" icon={<UnlockOutlined />}>
              {t("unlockAll")}
            </Button>
          </Popconfirm>
          {bookProgress.some((b) => b.status !== "not_started") && (
            <Popconfirm
              title={t("resetAllConfirm")}
              onConfirm={() => resetProgress()}
              okText={t("resetAllProgress")}
              cancelText={tc("cancel")}
            >
              <Button danger icon={<DeleteOutlined />}>
                {t("resetAllProgress")}
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={bookProgress}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </>
  );
}
