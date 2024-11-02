import {  LangChainAdapter, Message } from "ai";
import { vectorStoreRetriever } from "../../vector_store_init";

import { AzureChatOpenAI } from "@langchain/openai";
import { RunnableSequence, RunnablePassthrough, RunnableBranch } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BaseMessage } from "@langchain/core/messages";

const model = new AzureChatOpenAI();
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
 
const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_TEMPLATE],
  new MessagesPlaceholder("messages"),
]);

// Prompt and chainlink to allow chat history
const queryTransformPrompt = ChatPromptTemplate.fromMessages([
  new MessagesPlaceholder("messages"),
  [
    "user",
    "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation. Only respond with the query, nothing else.",
  ],
]);

// Parser for chain retriever
const parseRetrieverInput = (params: { messages: BaseMessage[] }) => {
  if (params && params.content && Array.isArray(params.content) && params.content.length > 0) {
    return params.content[0].text;
  } else {
    // Handle the case where the input is not in the expected format
    const errorMessage = `Invalid input format for parseRetrieverInput. Input params: ${JSON.stringify(params)}`;
    throw new Error(errorMessage);
  }
};

export const POST = async (request: Request) => {

  // Get user query as string
  const requestData = await request.json() as { messages: Message[] };
  const query = requestData.messages.pop();

  if (!process.env.AZURE_DEPLOYMENT) {
    throw Error("AZURE_DEPLOYMENT environment variable must be provided.");
  }

  // Initialize retriever from vector_store_init.ts
  const retriever = await vectorStoreRetriever; 

  // Chain to use context with questions
  const documentChain = await createStuffDocumentsChain({
    llm: model,
    prompt: prompt,
  });

  // Below is attempt to introduce chat messages into context to allow follow-up questions, currently non-functional
  const queryTransformingRetrieverChain = RunnableBranch.from([
    [
      (params: { messages: BaseMessage[] }) => params.messages.length === 1,
      RunnableSequence.from([parseRetrieverInput, retriever]),
    ],
    queryTransformPrompt.pipe(model).pipe(new StringOutputParser()).pipe(retriever),
  ]).withConfig({ runName: "chat_retriever_chain" });

  const conversationalRetrievalChain = RunnablePassthrough.assign({
    context: queryTransformingRetrieverChain,
  }).assign({
    answer: documentChain,
  });

  // Stream the response
  const stream = await conversationalRetrievalChain.stream({"messages": query});

  // Stream is in format {"answer": "chunk"}. This serves as a map to make stream streamable
  const transformedStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        // Transform each chunk here if necessary
        const transformedChunk = chunk.answer || '';
        controller.enqueue(transformedChunk);
      }
      controller.close();
    },
  });
  
  return LangChainAdapter.toDataStreamResponse(transformedStream);
};
