import fs from 'fs';
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

// Load the text file using TextLoader
const loader = new TextLoader("../walden.txt");

// Load the documents from the text file
const docs = await loader.load();

// Split the text into chunks
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const splits = await textSplitter.splitDocuments(docs);

// Create a vector store from the chunks
const vectorStore = await MemoryVectorStore.fromDocuments(
  splits,
  new OpenAIEmbeddings(
  {
    azureOpenAIApiDeploymentName: "text-embedding-ada-002",
  }
)
);

// Extract and prepare the vector data for JSON export
const vectorData = vectorStore.memoryVectors.map(entry => ({
  content: entry.content,
  embedding: Array.from(entry.embedding),
  metadata: entry.metadata,
  id: entry.id
}));

fs.writeFileSync("app/api/vector_store.json", JSON.stringify(vectorData, null, 2));
console.log("Vector store saved to app/api/vector_store.json");