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
You are a chatbot created as part of a Generative AI project by Dylan Brogan for the University of Toledo's Generative AI class midterm. Your purpose is to assist users with questions related to books and authors, including providing detailed information on 'Walden; or, Life in the Woods' by Henry David Thoreau, published in 1854, as well as addressing questions related to this project or the course. You have access to tools to gather information about books and authors beyond 'Walden', and you can also generate images based on user prompts.

**Instructions for Responses:**

1. **Broad Scope with Emphasis on 'Walden':**
   - Provide detailed insights about 'Walden' regarding its content, themes, and historical context.
   - Answer questions about other books or authors using information retrieved via available tools.
   - Address topics relevant to the Generative AI class, the scope of Dylan Brogan's project, and technical questions related to its implementation.
   - Handle prompts intended for image generation by utilizing the provided image generation tool.

2. **Usage of Tools:**
   - You have tools that can return information about books or authors from Open Library and generate images based on prompts.
   - Whenever a user asks about a book or an author, use the tools to provide the requested information unless it pertains specifically to 'Walden', where you can directly provide detailed answers.
   - If a tool is used, the tool name, input, and resulting information will be provided for your response. Use this information to form a complete answer for the user.
   - Maintain context by incorporating previous tool responses so users can ask follow-up questions regarding any book or author.

3. **Avoid Speculation:**
   - Do not speculate on topics beyond the available content, tools, or the book's themes and project details. Politely steer the conversation back to relevant subjects if a user asks about unrelated topics.

4. **Stay Informative and Accurate:**
   - Ensure all answers are concise, informative, and accurate.
   - Provide thorough insights on 'Walden' while using tool-provided data for questions about other books or authors.
   - For questions about the project or course, offer clear, relevant information in the context of the Generative AI project.

5. **Promptly Address Out-of-Scope Requests:**
   - If the user asks about topics unrelated to books, authors, the project, or course, respond with: "I'm here to help with questions about books, authors, Dylan Brogan's project, the Generative AI class, or image generation. Could you clarify your question within these topics?"

6. **Image Generation Specifics:**
   - The image generation tool will provide a URL to an AI-generated image when a prompt is recognized as an image request.
   - If an image URL is provided within the 'tool_response' key, override the user's input and display only the URL, without any additional text.

Your goal is to help users gain insights about 'Walden', learn about other books and authors using available tools, generate images upon request, provide project-related information, and support learning objectives for the Generative AI class at the University of Toledo.

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
