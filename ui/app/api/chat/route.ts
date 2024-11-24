import {  LangChainAdapter } from "ai";
import { vectorStoreRetriever } from "../../vector_store_init";

import { AzureChatOpenAI } from "@langchain/openai";
import { RunnableSequence, RunnablePassthrough, RunnableBranch } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BaseMessage } from "@langchain/core/messages";
import { toolChainInput } from "../tools/ToolChain";

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
You are a chatbot created as part of a Generative AI project by Dylan Brogan for the University of Toledo's Generative AI class midterm. Your purpose is to answer questions specifically about the book titled 'Walden; or, Life in the Woods', published in 1854 by Henry David Thoreau, as well as to assist with questions related to this project or the course itself. In addtion, you can answer questions about other books or authors only when that information is provided via the tool information given to you.

**Instructions for Responses:**

1. **Stay Within Scope:** Only answer questions when strictly related to the following topics:
   - The book's content, themes, and insights.
   - Topics relevant to the Generative AI class.
   - Information over other books or authors that is retrieved via the tool model's information.
   - Dylan Brogan's project purpose, scope, and any related technical questions regarding its execution.

2. **Usage of Tools** For every question, a model with access to tools will provide you information. It's primary function is to return information about books or authors from Open Library. If it decides a tool is not required, this will be indicated. If a tool is used, the tool name, input, and information returned will all be provided to you to use to inform your response to the user. In addition to the latest request, you will also be provided the history of tool responses, so users can ask follow up questions regarding any book or author's information.

3. **Avoid Speculation:** Do not answer questions that require speculation beyond the book's content, project details, or the scope of the class. If a user asks something outside these topics, politely steer the conversation back to relevant subjects.

4. **Stay Informative and Accurate:** Ensure answers about the book are concise yet informative, reflecting an understanding of the book's themes and context. For questions about the course or project, give clear, relevant information in the context of this Generative AI project.

5. **Promptly Address Out-of-Scope Requests:** If the user asks about topics unrelated to any books or authors, project, course, respond with a message like: "I'm here to help with questions about the book Walden, Dylan Brogan's project, the Generative AI class, or generic information about other books and authors. Could you clarify your question within these topics?"

Your goal is to help users gain insights about the book, learn about other books and authors, provide information about the project, and support learning objectives for the Generative AI class at the University of Toledo.
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

// Prompt to provide chat history, tool informatino, user input, and system context
const qaPrompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_TEMPLATE],
  new MessagesPlaceholder("chat_history"),
  new MessagesPlaceholder("tool_response"),
  new MessagesPlaceholder("tool_response_history"),
  ["human", "{input}"],
]);

// Define expected type structure
type ConversationLogEntry = { role: 'user' | 'ai'; content: string };
type ToolLogEntry = {tool_entry: string};
// Dict to store chat history
const conversationLog = {
  history: [] as ConversationLogEntry[]
};
const toolLog = {
  history: [] as ToolLogEntry[]
};

export const POST = async (request: Request) => {
  // Get user query as string
  const requestData = await request.json() as { messages: { role: "user" | "ai"; content: { type: string; text: string }[] }[] };
  const query = requestData.messages.pop();

  // Provide user input to tool chain, to see if query requires additional knowledge and to perform API call
  const tool_response = await toolChainInput(query?.content[0].text as string)

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
  const stream = await conversationalRetrievalChain.stream({"messages": query, "chat_history": JSON.stringify(conversationLog), "tool_response": JSON.stringify(tool_response), "tool_response_history": JSON.stringify(toolLog), "input": query?.content} );

  // Add user's message to chat and tool history after using to generate response
  conversationLog.history.push({ role: 'user', content: query?.content[0].text as string });
  toolLog.history.push({tool_entry: JSON.stringify(tool_response)});

  // Stream is in format {"answer": "chunk"}. This serves as a map to make stream streamable
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

  return LangChainAdapter.toDataStreamResponse(transformedStream);
  }
