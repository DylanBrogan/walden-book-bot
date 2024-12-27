# AI-Powered Chatbot with Tool Integration

## Project Overview
This project is an AI chatbot built to learn how to integrate various technologies with GPT-4. Initially designed to analyze and retrieve information from a vector store of the text *Walden* by Henry David Thoreau, the chatbot has been enhanced with additional tools to fetch external data and generate images. Users can ask about books and authors to trigger the fetch of information from Open Library's API, as well as request DALL-E generated images directly within the chat interface.

## Features
- **Vector Store Integration** – Initial knowledge base contains *Walden* by Henry David Thoreau.  
- **Chat History** – Allows for follow-up questions and contextual conversations.  
- **Tool Calling** – Incorporates Open Library API to provide information about books and authors.  
- **Image Generation** – Integrates DALL-E-3 to generate creative images directly from user prompts.  
- **Dynamic User Interface** – Switches between text and image generation based on user input.

## Technologies Used
- **Frontend:** React (TypeScript)  
- **Backend:** Node.js, LangChain  
- **APIs:** Open Library, Azure AI Studio (DALL-E-3, GPT-4)
- **Deployment:** Azure Static Web Apps  
- **Packages:**  
  - **LangChain** – For managing tool chains and API interactions.  
  - **Zod** – Schema validation for tool calling.
  - **Assistant-ui** - Readymade frontend for chatbot interaction
  - **ai-sdk** – For displaying generated images directly in the chat interface.  

## Implementation Highlights
- **Function Calling:**  
  - Uses Open Library API for book and author searches.  
  - *ToolChain.ts* handles GPT-4’s tool calling process through LangChain and Zod for schema validation.  
- **Image Generation:**  
  - DALL-E-3 model is deployed on Azure, triggered through GPT-4’s tool calling capabilities.  
  - Images are displayed using the **ai-sdk** package.  
- **Frontend Integration:**  
  - Custom button initially added for triggering image generation; later automated using tool calls.  
  - Chatbot dynamically decides when to generate images or fetch data.


## Installation and Setup
1. Clone the repository.  
2. Install dependencies within ui folder with `npm install`.  
3. Set up environment variables for GPT-4 and DALL-E Azure deployment API keys.  
4. Deploy to Azure using Static Web Apps or run locally with `npm start`.  

