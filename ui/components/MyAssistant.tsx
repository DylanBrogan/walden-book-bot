"use client";

import { useEdgeRuntime } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import { useState, useCallback, useEffect } from "react";

const MarkdownText = makeMarkdownText();

export function MyAssistant() {
  const runtime = useEdgeRuntime({ api: "/api/chat" });
  
  return (
    <Thread
      // runtime={runtime}
      assistantMessage={{ components: { Text: MarkdownText } }}
    />
  );
}