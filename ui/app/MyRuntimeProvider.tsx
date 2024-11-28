"use client"

import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";
import { makeAssistantToolUI, makeAssistantTool, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChat } from "@ai-sdk/react";

type SampleToolArgs = {
  input: string;
};

type SampleToolResult = {
  output: string;
};

export const SampleToolUI = makeAssistantToolUI<SampleToolArgs, SampleToolResult>({
  toolName: "sampleTool",
  render: (props) => {
    return <p>BeforeCall: SampleTool input: ({props.args.input})</p>;
  },
});

export const SampleTooResult = makeAssistantTool<SampleToolArgs, SampleToolResult>({
  toolName: "sampleTool",
  parameters: {
    properties: {
      output: { type: "string" }
    }
  },
  render:  (props) => {
    return <p>AfterCall: SampleTool input: ({props.args.input}) =&gt; output: ({props.result?.output ?? 'N/A'})</p>;
  }
});

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chat = useChat({
    api: "/api/chat",
  });

  const runtime = useVercelUseChatRuntime(chat as ReturnType<typeof useChat>);

  return (
    <AssistantRuntimeProvider runtime={runtime} >
      <SampleToolUI />
      <SampleTooResult />
      {children}
    </AssistantRuntimeProvider>
  );
}