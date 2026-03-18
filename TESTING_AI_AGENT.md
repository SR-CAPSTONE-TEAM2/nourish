# Local Testing Guide for AI Assistant Feature

This document provides instructions for QA testers and developers on how to run and test the new "Ask AI" feature locally.

## 1. Prerequisites
Ensure you have the following installed on your machine:
- Node.js & npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Expo CLI

Ensure that your `supabase/.env` file is populated with the required `GEMINI_API_KEY` and any other necessary environment variables.

## 2. Start the Local Supabase Edge Function
The AI Assistant relies on the `gemini-query` Supabase edge function to handle the conversation and retrieval augmented generation (RAG) using OpenAI/Gemini models. 

Open a terminal in the root `LifestyleExposureGeneralHealthApp` directory and run:

```bash
npx supabase functions serve gemini-query --env-file supabase/.env --no-verify-jwt
```

Keep this terminal running. You should see logs indicating the `gemini-query` function is being served on `http://127.0.0.1:54321`.

## 3. Start the Expo Frontend App
Open a second terminal, navigate to the Expo app directory, and start the development server:

```bash
npx expo start
```

