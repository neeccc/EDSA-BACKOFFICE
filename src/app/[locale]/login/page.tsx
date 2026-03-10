"use client";

import { Button, Card, Form, Input, Typography, Alert, Flex, theme } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

const { Title } = Typography;

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function onFinish(values: { username: string; password: string }) {
    setError(false);
    setLoading(true);

    const result = await signIn("credentials", {
      username: values.username,
      password: values.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(true);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <Flex
      justify="center"
      align="center"
      style={{ minHeight: "100vh", background: token.colorBgLayout }}
    >
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          {t("loginTitle")}
        </Title>

        {error && (
          <Alert
            title={t("loginError")}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="username"
            rules={[{ required: true }]}
          >
            <Input prefix={<UserOutlined />} placeholder={t("username")} />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t("password")}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {t("loginButton")}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Flex>
  );
}
