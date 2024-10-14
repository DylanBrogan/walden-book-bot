[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=16542749)
# Midterm Project Instructions

## Overview
For your midterm project, you will set up two Azure resources using your **Azure for Students** subscription, which includes $100 credits to use throughout the course. The project is divided into three parts:

1. **Azure Resources Setup**
2. **Model Customization** (Details to be covered in upcoming classes)
3. **Project Report**

The application you will be working on is located in the `/ui` folder of your GitHub repository.

## Part One: Azure Resources Setup

You are required to set up the following Azure resources in order:

1. **Azure OpenAI**
2. **Azure Static Web App**

> **Best Practice:** Create both resources in the same **Resource Group** (e.g., llm-course) and choose a region close to us, such as **North Central US** or **East US**, to reduce latency and manage resources more efficiently.


Follow the steps below to successfully create, configure, and deploy your application.

### Step 1: Set Up Azure OpenAI
You will first create an **Azure OpenAI** resource, which will allow your application to interact with advanced language models.

1. **Create the Azure OpenAI resource**:
   - Follow the step-by-step instructions in the official Microsoft documentation to set up your Azure OpenAI instance: [Azure OpenAI Quickstart Guide](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/quickstart).

2. **Create a deployment**:
   - Once your Azure OpenAI resource is created, set up a deployment for the model you plan to use (e.g., gpt-35-turbo).
   - Be sure to note down the following values:
     - **API Key**
     - **Resource Name**
     - **Deployment Name**

### Step 2: Set Up Azure Static Web App
Next, you will deploy the application located in the `/ui` folder using an **Azure Static Web App**.

1. **Create the Azure Static Web App**:
   - Follow this guide to set up your Static Web App: [Azure Static Web Apps Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/get-started-portal?tabs=vanilla-javascript&pivots=github#create-a-static-web-app).
   - Since you already have a repository (e.g., `https://github.com/utoledo-eecs/genai-and-llms-project-{your-username}`), skip the first section about creating a repository.
   - The Free Tier of Azure Static Web Apps is sufficient for this project. It provides all the necessary resources to deploy and run your application without exceeding your student credit limits.
   - During the setup, for **Source**, choose **GitHub**, authorize access, and point to **your** repository (`https://github.com/utoledo-eecs/genai-and-llms-project-{your-username}`).
   - Ensure that the **source directory** for the deployment is set to the `/ui` folder within your repository.
   - The Static Web App will automatically build and deploy your application after the setup is complete.

### Step 3: Configure Environment Variables
To ensure that your application interacts with Azure OpenAI, you need to configure environment variables both locally and in Azure.

1. **Set up environment variables locally**:
   - Navigate to the `/ui` folder of your repository.
   - You will find a file named `.env.example`. Make a copy of this file and rename it to `.env.local`.
   - Open the `.env.local` file and update it with your Azure OpenAI resource details:
     - **AZURE_API_KEY**: Your Azure OpenAI API key.
     - **AZURE_RESOURCE_NAME**: The resource name of your Azure OpenAI instance.
     - **AZURE_DEPLOYMENT**: The deployment name of your model.

     Your `.env.local` file should look like this:

     AZURE_API_KEY=your-openai-api-key  
     AZURE_RESOURCE_NAME=your-resource-name  
     AZURE_DEPLOYMENT=your-deployment-name  

2. **Set environment variables in Azure**:
   - In the Azure portal, go to your Azure Static Web App settings.
   - Under the "Configuration" section, add the following environment variables:
     - **AZURE_API_KEY**
     - **AZURE_RESOURCE_NAME**
     - **AZURE_DEPLOYMENT**

3. **Restart your Static Web App**:
   - After configuring the environment variables in Azure, you need to restart the Static Web App for the changes to take effect.
   - In the Azure portal, navigate to your Static Web App resource, and in the "Overview" tab, click the **Restart** button.

### Step 4: Test Locally
To test the application locally, follow these steps:

1. Navigate to the `/ui` folder in your terminal.
2. Run the following commands to install dependencies and start the development server:

   npm install  
   npm run dev  

3. Open your browser and go to `http://localhost:3000` to view and test your application.
4. Ensure that the application correctly communicates with Azure OpenAI and returns appropriate responses for test inputs.

### Step 5: Deploy Your Application
After confirming that the app works locally, ensure your Azure Static Web App is properly set up to deploy the latest version. The Static Web App will automatically deploy changes made in the GitHub repository.

Monitor the deployment status in the Azure portal and ensure everything is running as expected once deployed.

## Part Two: Customizing the Azure OpenAI Model
In this part of the project, you will customize the Azure OpenAI model to respond to questions based on the eBook you selected at the beginning of the semester.

Details on this customization process, including prompt engineering and fine-tuning, will be covered in upcoming classes. Please stay tuned for those lectures, where we will walk through the steps together.

## Part Three: Final Report

Once you’ve completed the technical setup and customization, you will write a project report summarizing your work. The report should include:

- **Overview of the project**: Briefly describe the eBook you chose and how you integrated Azure OpenAI with your application.
- **Azure resource setup**: Explain the steps you took to set up the Azure OpenAI and Static Web App, including any challenges you faced.
- **Model customization**: Provide a brief overview of how you customized the Azure OpenAI model (you can refer to the lessons from Part Two).
- **Application functionality**: Describe how your application works, including testing and user interaction with the Azure OpenAI model.
- **Challenges and reflections**: Reflect on the challenges you encountered and how you overcame them, as well as any insights you gained during the project.

## Extra Credit Opportunity (Up to 5 Points)

You have the opportunity to earn up to 5 extra credit points if you demonstrate exceptional skills or innovative solutions in the following areas:

- **UI Customization**: Advanced, user-friendly, and polished interface design beyond the basic requirements.
- **Fine-Tuning**: Successfully fine-tuning the Azure OpenAI model to provide more accurate and tailored responses related to your eBook.
- **Prompt Engineering**: Creative use of prompt engineering to optimize model performance, leading to sophisticated responses.
- **Additional Features**: Any added functionality that enhances the overall user experience or the capabilities of your application.

**Important**: If you believe you have earned extra credit, you must **explain in your report** why you deserve it. Clearly describe the innovative skills or features you implemented and how they contribute to the overall improvement of the project.

## Submission Instructions

For the submission of your midterm project, you are required to:

1. **Provide the link to your working public Azure Static Web App**:
   - Ensure that the application is publicly accessible.
   - You can find the link to your deployed web app in the Azure portal under your Static Web App resource.

2. **Submit your final project report**:
   - The report must be submitted as a PDF file through Blackboard.
   - Make sure your report includes the link to your public web app and follows the guidelines outlined in the project instructions.

Both the **public web app link** and the **final report** are required for successful submission of the project.

---

Good luck with your midterm project! Remember to manage your Azure credits carefully and reach out if you need assistance.
