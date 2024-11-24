"use client";

import {
  Thread,
  ThreadWelcome,
  Composer,
  type ThreadConfig,
  useEdgeRuntime,
  AssistantRuntimeProvider,
  useContentPartImage, 
  UserMessage,
  AssistantMessage,
  ThreadPrimitive
} from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import { useState, useCallback, useEffect } from "react";


// Custom Composer with image Button
const MyComposer: React.FC<{ isImageRequest: boolean, setIsImageRequest: React.Dispatch<React.SetStateAction<boolean>> }> = ({ setIsImageRequest }) => {
  
  // Update IsImageRequest to True
  const handleImageButtonClick = async () => {
    console.log("Image button clicked!");
    // window.isImageRequest = true;
    setIsImageRequest(true);
    // const Image = () => {
    //   const image = useContentPartImage();
     
    //   return <img src={image} alt="AI" />;
    // };
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

const MyThread: React.FC<ThreadConfig & { runtime: any, isImageRequest: boolean, setIsImageRequest: React.Dispatch<React.SetStateAction<boolean>> }> = ({
  runtime,
  isImageRequest,
  setIsImageRequest,
  ...config
}) => {

  return (
    <Thread.Root config={config}>
      <Thread.Viewport>
        <ThreadWelcome />
        {/* Last, was checking what changing this to primitive does. Also added the components, but seemed like those were default */}
        {/* <ThreadPrimitive.Messages components={{UserMessage, AssistantMessage}}/> */}
        <Thread.Messages />
        {/* <img src={"https://covers.openlibrary.org/b/id/240727-S.jpg"} /> */}
        <Thread.FollowupSuggestions />
        <Thread.ViewportFooter>
          <Thread.ScrollToBottom />
          <MyComposer isImageRequest={isImageRequest} setIsImageRequest={setIsImageRequest} />
        </Thread.ViewportFooter>
      </Thread.Viewport>
    </Thread.Root>
  );
};

const MarkdownText = makeMarkdownText();

export function MyAssistant() {
  const [isImageRequest, setIsImageRequest] = useState(false);


  // useEffect to log the state when it changes
  useEffect(() => {
    console.log("Updated IMAGE REQUEST: ", isImageRequest);
  }, [isImageRequest]);

  console.log("BEFORE RUNTIME CONST " + isImageRequest)
  const runtime = useEdgeRuntime({ 
    api: "/api/chat", 
    headers: {"Content-Type": "application/json"},
    body: {
      tools: [
        {
          name: "imageRequest",
          type: "flag",
          value: isImageRequest ? "true" : "false",
        }
      ],
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MyThread
        runtime={runtime}
        assistantMessage={{ components: { Text: MarkdownText } }}
        isImageRequest={isImageRequest}
        setIsImageRequest={setIsImageRequest}
      />
    </AssistantRuntimeProvider>
  );
}
