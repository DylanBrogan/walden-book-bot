// Creates tool for use in route.ts
import { AzureChatOpenAI } from "@langchain/openai";
import { OpenLibraryAPI } from "../tools/OpenLibrary";
import { tool, StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import { renderTextDescription } from "langchain/tools/render";
import { RunnablePassthrough, RunnablePick, RunnableLambda } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AIMessageChunk } from "@langchain/core/messages";

const tool_model = new AzureChatOpenAI({
    azureOpenAIApiDeploymentName: "gpt-35-turbo-2",
    azureOpenAIApiKey: "6fcf24c200bb4ca1bedd7fb7c32a7f47",
    azureOpenAIApiInstanceName: "dbrog-m2agopml-eastus",
    azureOpenAIEndpoint: "https://dbrog-m2agopml-eastus.openai.azure.com/",
    azureOpenAIApiVersion: "2024-08-01-preview",
    temperature: 0
  });

// List of tools that call Open Library wrapper functions and provide schema for when to use
const bookSearchTool = tool(
async (input) => {
    return await OpenLibraryAPI.bookSearchByTitle(input.title);
},
{
    name: "bookSearch",
    description: "Returns information about books from Open Library API.",
    schema: z.object({
    title: z.string().describe("The title of the book to search for. Input is solely a string containing the title of the book"),
    }),
}
)

// List of available tools to provide toolChain
const tools = [bookSearchTool];

const toolChain = (modelOutput: { name: string | number; arguments: Record<string, any> }) => {

    // If no tool is chosen, indicate that in retured JSON output with tool name of none
    if (modelOutput.name === "none") {
        return new RunnableLambda({
        func: () => ("Model output was not valid JSON. No tool was invoked.")
        });
    }

    const toolMap: Record<string, StructuredToolInterface> = Object.fromEntries(
        tools.map((tool) => [tool.name, tool])
    );
    const chosenTool = toolMap[modelOutput.name];

    return new RunnablePick("arguments").pipe(
        new RunnableLambda({
        func: (input: string) =>
            chosenTool.invoke(input),
        })
    );
};

const toolChainRunnable = new RunnableLambda({
func: toolChain,
});

const renderedTools = renderTextDescription(tools);

const systemPrompt = `You are an assistant that has access to the following set of tools. Here are the names and descriptions for each tool:

{{rendered_tools}}

When analyzing user input, identify if the user asks about a specific book or a set of books.

If a specific book is mentioned, extract only the book's title. 
Always use the JSON format below, and never add extra text. Here is the required response format:

{{
"name": "bookSearch",
"arguments": {{
    "title": "<BOOK_TITLE>"
}}
}}

If no tool should be used, always respond with:

{{
"name": "none",
"arguments": {{}}
}}

### Important Notes:
- Only output a valid JSON object, and do not add anything else.
- Always use the exact key names and structure as shown.
- If the user input is ambiguous, assume that "<BOOK_TITLE>" is the name of the book that was provided.

Example output:
{{
"name": "bookSearch",
"arguments": {{
    "title": "Atlas Shrugged"
}}
}}

If no book is mentioned, respond with:

{{
"name": "none",
"arguments": {{}}
}}
`;




const tool_prompt = ChatPromptTemplate.fromMessages([
["system", systemPrompt],
["user", "{input}"],
]);

const tool_chain = tool_prompt
.pipe(tool_model)
.pipe(new RunnableLambda<AIMessageChunk, Record<string, any>>({
  func: async (modelOutput: AIMessageChunk) => {
    // Extract the content from AIMessageChunk
    let modelContent = modelOutput.content;
    // Check that stringified JSON is received
    if (typeof modelContent !== 'string') {
      console.error("Expected content to be a string but got:", typeof modelContent);
      return {
        name: "none",
        arguments: {},
        output: "Invalid output format. Expected a string. No tool was invoked."
      };
    }

    // Validate and parse JSON output
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(modelContent);
      console.log("Parsed model output:", parsedOutput);
    } catch (error) {
      // console.error("Failed to parse model output as JSON:", error);
      // If invalid JSON error is caught, no tool is required and response below is sent.
      // Return a fallback response in case of invalid JSON
      return {
        name: "none",
        arguments: {},
        output: "Model output was not valid JSON. No tool was invoked."
      };
    }

    // Step 2: Return parsed output, explicitly add output property
    return {
      ...parsedOutput,
      output: parsedOutput // Adding 'output' explicitly
    };
  }
}))
.pipe(RunnablePassthrough.assign({ output: toolChainRunnable }));

export async function toolChainInput(input: string): Promise<any> {
    const formattedInput = {
      input,
      rendered_tools: renderedTools,
    };
  
    // Invoke the tool chain with the provided input
    const response = await tool_chain.invoke(formattedInput);
    return response;

  }