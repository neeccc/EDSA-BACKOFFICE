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
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  BookOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
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

      <Title level={4} style={{ marginBottom: 16 }}>
        {t("bookProgress")}
      </Title>
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
