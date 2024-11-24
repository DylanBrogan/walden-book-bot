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
const authorSearchTool = tool(
  async (input) => {
      return await OpenLibraryAPI.authorSearchByName(input.name);
  },
  {
      name: "authorSearch",
      description: "Returns information about a single author from Open Library API.",
      schema: z.object({
      name: z.string().describe("The name of the author to search for. Input is solely a string containing the name of the author."),
      }),
  }
  )
  const imageGenerationTool = tool(
    async (input) => {
        const target = "https://dbrog-m3paj6v1-swedencentral.cognitiveservices.azure.com/openai/deployments/dall-e-3-2/images/generations?api-version=2024-02-01&api-key=3HhHlN8V4CfSYsBwYgknuvrWz2mM8ANT8S5yBB6vSEljqJtYXDylJQQJ99AKACfhMk5XJ3w3AAAAACOGbzTI";

        const payload = {
          prompt: JSON.stringify(input.prompt),
          size: "1024x1024",
          n: 1,
          quality: "hd",
          style: "vivid"
        };
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
          return "Error in generating URL"; // Return an empty string if there's an error
        }
    },
    {
        name: "imageGeneration",
        description: "Returns a URL to an AI generated image.",
        schema: z.object({
        prompt: z.string().describe("The user's prompt for the image to generate."),
        }),
    }
    )
  

// List of available tools to provide toolChain
const tools = [bookSearchTool, authorSearchTool, imageGenerationTool];

const toolChain = (modelOutput: { name: string | number; arguments: Record<string, any> }) => {
    // If no tool is chosen, indicate that in retured JSON output with tool name of none
    if (modelOutput.name === "none") {
        console.log("No tool used.")
        return new RunnableLambda({
        func: () => ("Model output was not valid JSON. No tool was invoked.")
        });
    }

    const toolMap: Record<string, StructuredToolInterface> = Object.fromEntries(
        tools.map((tool) => [tool.name, tool])
    );
    const chosenTool = toolMap[modelOutput.name];
    console.log("Using tool: " + modelOutput.name)
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

When analyzing user input, identify if the user asks about a specific book or a set of books, if the user assks about a specific author, or if the user wants to generate an image from the prompt.

If a specific book is mentioned, extract only the book's title. 
If a specific author is mentioned, extract only the author's name.
If an image should be generated, extract the full user input in JSON format.
Always use the JSON format below, and never add extra text. Here is the required response format:

{{
"name": "bookSearch",
"arguments": {{
    "title": "<BOOK_TITLE>"
}}
}}
or
{{
"name": "authorSearch",
"arguments": {{
    "name": "<AUTHOR_NAME>"
}}
}}
or
{{
"name": "imageGeneration",
"arguments": {{
    "name": "<USER_PROMPT>"
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
Title: Atlas Shrugged
{{
"name": "bookSearch",
"arguments": {{
    "title": "Atlas Shrugged"
}}
}}

Author Name: Ayn Rand
{{
"name": "authorSearch",
"arguments": {{
    "name": "Ayn Rand"
}}
}}

Generate an image of a statue of a man holding up the world.
{{
"name": "imageGeneration",
"arguments": {{
    "prompt": "Generate an image of a statue of a man holding up the world."
}}
}}

If no book or author is mentioned, or indication that an image should be generated, respond with:

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

    // Return parsed output, explicitly add output property
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