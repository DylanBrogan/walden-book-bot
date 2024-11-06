import fs from 'fs';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "@langchain/openai";

// Interface for use in documents mapping
interface DataEntry {
  content: string;
  metadata: {
    source: string;
    loc: {
      lines: {
        from: number;
        to: number;
      };
    };
  };
}

// Async function to initialize and export the vector store retriever
async function initializeVectorStore() {
  // Load and parse the JSON file asynchronously
  const data = JSON.parse(fs.readFileSync(process.cwd() + "/vector_store.json", "utf8"));

  // Initialize embeddings (configure for Azure if needed)
  const embeddings = new OpenAIEmbeddings(
    {
      azureOpenAIApiDeploymentName: "text-embedding-ada-002",
      azureOpenAIApiVersion: "2023-05-15",
      azureOpenAIApiKey: "6fcf24c200bb4ca1bedd7fb7c32a7f47",
      azureOpenAIApiInstanceName: "dbrog-m2agopml-eastus",
      azureOpenAIEndpoint: "https://dbrog-m2agopml-eastus.openai.azure.com/",
    });

  // Prepare vectors and documents arrays
  const vectors = data.map((entry: { embedding: Iterable<number> }) => Float32Array.from(entry.embedding));
  const documents = data.map((entry: DataEntry) =>
    new Document({
      pageContent: entry.content,
      metadata: entry.metadata,
    })
  );

  // Initialize the MemoryVectorStore and add vectors/documents
  const memoryVectorStore = new MemoryVectorStore(embeddings);
  
  // Add vectors to the vector store
  await memoryVectorStore.addVectors(vectors, documents);

  console.log("MemoryVectorStore initialized from JSON file.");
  return memoryVectorStore.asRetriever(4);
}

// Export the vector store retriever as a Promise
export const vectorStoreRetriever = initializeVectorStore();
