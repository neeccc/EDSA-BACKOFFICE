"use client";

import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Typography, Empty, Progress } from "antd";
import {
  TeamOutlined,
  UserOutlined,
  ReadOutlined,
  BookOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

const { Title, Text } = Typography;

interface ProgressStats {
  total: number;
  completed: number;
  completionRate: number;
  avgScore: number | null;
}

interface Stats {
  teachers: number;
  students: number;
  classes: number;
  books: number;
  progress: ProgressStats;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backoffice/stats")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStats(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = [
    {
      key: "teachers",
      title: t("teachers"),
      value: stats?.teachers ?? 0,
      icon: <UserOutlined />,
      color: "#1677ff",
    },
    {
      key: "students",
      title: t("students"),
      value: stats?.students ?? 0,
      icon: <TeamOutlined />,
      color: "#52c41a",
    },
    {
      key: "classes",
      title: t("classes"),
      value: stats?.classes ?? 0,
      icon: <ReadOutlined />,
      color: "#faad14",
    },
    {
      key: "books",
      title: t("books"),
      value: stats?.books ?? 0,
      icon: <BookOutlined />,
      color: "#eb2f96",
    },
  ];

  const hasProgress = stats && stats.progress.total > 0;

  return (
    <>
      <Title level={2}>{t("title")}</Title>
      <Card style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 16 }}>
          {t("welcome", { name: session?.user?.name || "" })}
        </Text>
      </Card>

      <Row gutter={[16, 16]}>
        {items.map((item) => (
          <Col xs={12} sm={12} md={6} key={item.key}>
            <Card loading={loading}>
              <Statistic
                title={item.title}
                value={item.value}
                prefix={
                  <span style={{ color: item.color }}>{item.icon}</span>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
        {t("progress")}
      </Title>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={12} sm={12} md={6} key={i}>
              <Card loading />
            </Col>
          ))}
        </Row>
      ) : !hasProgress ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("noProgressYet")}
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title={t("totalAttempts")}
                value={stats.progress.total}
                prefix={
                  <span style={{ color: "#1677ff" }}>
                    <PlayCircleOutlined />
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title={t("completed")}
                value={stats.progress.completed}
                prefix={
                  <span style={{ color: "#52c41a" }}>
                    <CheckCircleOutlined />
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">{t("completionRate")}</Text>
              </div>
              <Progress
                type="dashboard"
                percent={stats.progress.completionRate}
                size={80}
                strokeColor="#52c41a"
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title={t("avgScore")}
                value={stats.progress.avgScore ?? "—"}
                prefix={
                  stats.progress.avgScore !== null ? (
                    <span style={{ color: "#faad14" }}>
                      <TrophyOutlined />
                    </span>
                  ) : undefined
                }
                suffix={stats.progress.avgScore !== null ? "pts" : undefined}
              />
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
}
