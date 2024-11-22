import {  LangChainAdapter, Message } from "ai";
import { vectorStoreRetriever } from "../../vector_store_init";

import { AzureChatOpenAI } from "@langchain/openai";
import { RunnableSequence, RunnablePassthrough, RunnableBranch } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BaseMessage } from "@langchain/core/messages";


const model = new AzureChatOpenAI({
  azureOpenAIApiDeploymentName: "gpt-35-turbo-2",
  azureOpenAIApiKey: "6fcf24c200bb4ca1bedd7fb7c32a7f47",
  azureOpenAIApiInstanceName: "dbrog-m2agopml-eastus",
  azureOpenAIEndpoint: "https://dbrog-m2agopml-eastus.openai.azure.com/",
  azureOpenAIApiVersion: "2024-08-01-preview"
});
export const maxDuration = 30;

// Create a system & human prompt for the chat model
const SYSTEM_TEMPLATE = `
You are a chatbot created as part of a Generative AI project by Dylan Brogan for the University of Toledo's Generative AI class midterm. Your purpose is to answer questions specifically about the book titled 'Walden; or, Life in the Woods', published in 1854 by Henry David Thoreau, as well as to assist with questions related to this project or the course itself.

**Instructions for Responses:**

1. **Stay Within Scope:** Answer questions strictly related to:
   - The book's content, themes, and insights.
   - Topics relevant to the Generative AI class.
   - Dylan Brogan's project purpose, scope, and any related technical questions regarding its execution.

2. **Avoid Speculation:** Do not answer questions that require speculation beyond the book's content, project details, or the scope of the class. If a user asks something outside these topics, politely steer the conversation back to relevant subjects.

3. **Stay Informative and Accurate:** Ensure answers about the book are concise yet informative, reflecting an understanding of the book's themes and context. For questions about the course or project, give clear, relevant information in the context of this Generative AI project.

4. **Promptly Address Out-of-Scope Requests:** If the user asks about topics unrelated to the book, project, or course, respond with a message like: "I'm here to help with questions about the book Walden, Dylan Brogan's project, or the Generative AI class. Could you clarify your question within these topics?"

Your goal is to help users gain insights about the book, provide information about the project, and support learning objectives for the Generative AI class at the University of Toledo. Now here is the book.
-------------------
<context>
{context}
<context>
`;
 
// Prompt and chainlink to allow chat history
const queryTransformPrompt = ChatPromptTemplate.fromMessages([
  new MessagesPlaceholder("messages"),
  [
    "user",
    "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation. Only respond with the query, nothing else.",
  ],
]);

// Parser for retriever chain
const parseRetrieverInput = (params: { messages: BaseMessage[] }) => {
  return params.messages[params.messages.length - 1].content;
};

// Prompt to reformulate chat history around user's query
const contextualizeQSystemPrompt =
  "Given a chat history and the latest user question " +
  "which might reference context in the chat history, " +
  "formulate a standalone question which can be understood " +
  "without the chat history. Do NOT answer the question, " +
  "just reformulate it if needed and otherwise return it as is.";

const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
  ["system", contextualizeQSystemPrompt],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

// Prompt to provide chat history with user input and system context
const qaPrompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_TEMPLATE],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

// Dict to store chat history
type ConversationLogEntry = { role: 'user' | 'ai'; content: string };
const conversationLog = {
  history: [] as ConversationLogEntry[]
};

// BEGIN Image Generation Code
const target = "https://dbrog-m3paj6v1-swedencentral.cognitiveservices.azure.com/openai/deployments/dall-e-3-2/images/generations?api-version=2024-02-01&api-key=3HhHlN8V4CfSYsBwYgknuvrWz2mM8ANT8S5yBB6vSEljqJtYXDylJQQJ99AKACfhMk5XJ3w3AAAAACOGbzTI";
// END Image Generation Code

export const POST = async (request: Request) => {

  // Get user query as string
  const requestData = await request.json() as {  tools: { name: string; type: string; value: string }[]; isImageRequest: true | false; messages: { role: "user" | "ai"; content: { type: string; text: string }[] }[] };
  const query = requestData.messages.pop();
  console.log(requestData)

  const isImageButtonUsed = false;
  
  let url = "";

  // BEGIN Image Generation Code
  if (isImageButtonUsed) {
    const payload = {
      prompt: JSON.stringify(query?.content[0].text),
      size: "1024x1024",
      n: 1,
      quality: "hd",
      style: "vivid"
    };

    const generateUrl = async () => {
      try {
        const response = await fetch(target, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.statusText}`);
        }
  
        const data = await response.json();
        console.log("Response:", data.data[0].url);
        return data.data[0].url; // Return the generated URL
      } 
      catch (error) {
        console.error("Error:", error);
        return ""; // Return an empty string if there's an error
      }
    };

    url = await generateUrl();
  }
  // END Image Generation Code

  // Initialize retriever from vector_store_init.ts
  const retriever = await vectorStoreRetriever; 

  // Transform into History Aware Retriever
  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm: model,
    retriever,
    rephrasePrompt: contextualizeQPrompt,
  });

  // Chain to use context with questions
  const questionAnswerChain = await createStuffDocumentsChain({
    llm: model,
    prompt: qaPrompt,
  });

  // Chain to use retriever
  const queryTransformingRetrieverChain = RunnableBranch.from([
    [
      (params: { messages: BaseMessage[] }) => params.messages.length === 1,
      RunnableSequence.from([parseRetrieverInput, historyAwareRetriever]),
    ],
    queryTransformPrompt.pipe(model).pipe(new StringOutputParser()).pipe(retriever),
  ]).withConfig({ runName: "chat_retriever_chain" });

  const conversationalRetrievalChain = RunnablePassthrough.assign({
    context: queryTransformingRetrieverChain,
  }).assign({
    answer: questionAnswerChain,
  });

  // Stream the response
  let input = "";
  if (isImageButtonUsed) {
    input = "Print the following url exactly:" + url;
  }
  else {
    input = JSON.stringify(query?.content[0].text);
  }

  const stream = await conversationalRetrievalChain.stream({"messages": query, "chat_history": JSON.stringify(conversationLog), "input": input} );

  // Add user's message to chat history after using to generate response
  conversationLog.history.push({ role: 'user', content: query?.content[0].text as string });

  let aiResponse = '';
  const transformedStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        // Transform each chunk here if necessary
        const transformedChunk = chunk.answer || '';
        aiResponse += transformedChunk;
        controller.enqueue(transformedChunk);
      }
      // Add model's response to chat history
      conversationLog.history.push({role: 'ai', content: aiResponse})
      controller.close();
    },
  });

  const responseData = {
    aiResponse: aiResponse,
    imageUrl: url,
  };

  // Either return image data, or text to stream
  if (isImageButtonUsed) {
    return new Response(JSON.stringify(responseData), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  else {
    return LangChainAdapter.toDataStreamResponse(transformedStream);
  }
  // Stream is in format {"answer": "chunk"}. This serves as a map to make stream streamable




  }
