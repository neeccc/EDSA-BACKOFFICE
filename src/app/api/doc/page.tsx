"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { useEffect, useState } from "react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocPage() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch("/api/doc/spec")
      .then((res) => res.json())
      .then(setSpec);
  }, []);

  if (!spec) return <div style={{ padding: 24 }}>Loading API docs...</div>;

  return <SwaggerUI spec={spec} />;
}
