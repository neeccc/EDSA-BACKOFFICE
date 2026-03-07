"use client";

import { Layout, Menu, Typography, Button, Flex, Dropdown, theme, Divider } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  LogoutOutlined,
  GlobalOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { signOut } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

function BackofficeShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { token } = theme.useToken();

  const menuItems = [
    {
      key: `/${locale}/dashboard`,
      icon: <DashboardOutlined />,
      label: t("dashboard"),
    },
    { type: "divider" as const },
    {
      key: "people",
      type: "group" as const,
      label: t("people"),
      children: [
        {
          key: `/${locale}/teachers`,
          icon: <SolutionOutlined />,
          label: t("teachers"),
        },
        {
          key: `/${locale}/students`,
          icon: <UserOutlined />,
          label: t("students"),
        },
        {
          key: `/${locale}/classes`,
          icon: <TeamOutlined />,
          label: t("classes"),
        },
      ],
    },
    { type: "divider" as const },
    {
      key: "content",
      type: "group" as const,
      label: t("content"),
      children: [
        {
          key: `/${locale}/books`,
          icon: <BookOutlined />,
          label: t("books"),
        },
      ],
    },
  ];

  const localeItems = [
    { key: "en", label: "English" },
    { key: "id", label: "Bahasa Indonesia" },
  ];

  function switchLocale(newLocale: string) {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        breakpoint="lg"
        collapsedWidth={80}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex
          justify="center"
          align="center"
          style={{ height: 64 }}
        >
          <Text strong style={{ fontSize: 20 }}>
            EDSA
          </Text>
        </Flex>
        <Divider style={{ margin: 0 }} />
        <Menu
          mode="inline"
          style={{ border: "none" }}
          selectedKeys={[
            `/${locale}/dashboard`,
            `/${locale}/teachers`,
            `/${locale}/students`,
            `/${locale}/classes`,
            `/${locale}/books`,
          ].filter((key) => pathname === key || pathname.startsWith(key + "/"))}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: "0 24px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ThemeToggle />
          <Dropdown
            menu={{
              items: localeItems,
              onClick: ({ key }) => switchLocale(key),
            }}
          >
            <Button icon={<GlobalOutlined />} type="text">
              {locale.toUpperCase()}
            </Button>
          </Dropdown>
          <Button
            icon={<LogoutOutlined />}
            type="text"
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
          >
            {tAuth("logout")}
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <BackofficeShell>{children}</BackofficeShell>
    </SessionProvider>
  );
}
