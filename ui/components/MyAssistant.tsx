"use client";

import {
  Thread,
  ThreadWelcome,
  Composer,
  type ThreadConfig,
  useEdgeRuntime
} from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";

// Step 1: Custom Composer with a Button
const MyComposer: React.FC = () => {
  const handleImageButtonClick = () => {
    console.log("Image button clicked!");
    // Add button logic here
  };

  return (
    <Composer.Root>
      <Composer.Attachments />
      <Composer.AddAttachment />
      <Composer.Input autoFocus />
      <Composer.Action />
      {/* Image Button */}
      <div style={{ marginLeft: "7px", textAlign: "center" }}>
        <Composer.Send onClick={handleImageButtonClick} >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
        </Composer.Send>
      </div>
    </Composer.Root>
  );
};

const MyThread: React.FC<ThreadConfig> = (config) => {
  return (
    <Thread.Root config={config}>
      <Thread.Viewport>
        <ThreadWelcome />
        <Thread.Messages />
        <Thread.FollowupSuggestions />
        <Thread.ViewportFooter>
          <Thread.ScrollToBottom />
          <MyComposer />
        </Thread.ViewportFooter>
      </Thread.Viewport>
    </Thread.Root>
  );
};

const MarkdownText = makeMarkdownText();

export function MyAssistant() {
  const runtime = useEdgeRuntime({ api: "/api/chat" });

  return (
    <MyThread
      runtime={runtime}
      assistantMessage={{ components: { Text: MarkdownText } }}
    />
  );
}
