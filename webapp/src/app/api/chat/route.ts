import { NextRequest, NextResponse } from "next/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createRetrievalChain } from "langchain/chains/retrieval";

process.env.OPENAI_API_KEY = "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"
process.env.SUPABASE_PRIVATE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";
process.env.SUPABASE_URL = "http://localhost:8000";
const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PRIVATE_KEY,
);

const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-large",
});

const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient,
    tableName: "langchain_pg_embedding",
    queryName: "test_function",
});

const retriever = vectorStore.asRetriever();

const llm = new ChatOpenAI({
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
    streaming: true,
    modelName: 'gpt-4o-mini',
});


// Contextualize question
const contextualizeQSystemPrompt = `
Given a chat history and the latest user question
which might reference context in the chat history,
formulate a standalone question which can be understood
without the chat history. Do NOT answer the question, just
reformulate it if needed and otherwise return it as is.`;
const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
    ["system", contextualizeQSystemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
]);
const historyAwareRetriever = await createHistoryAwareRetriever({
    llm,
    retriever,
    rephrasePrompt: contextualizeQPrompt,
});

// Answer question
const qaSystemPrompt = `
You are an assistant for question-answering tasks. Use
the following pieces of retrieved context to answer the
question. If you don't know the answer, just say that you
don't know. Use three sentences maximum and keep the answer
concise.
\n\n
{context}`;
const qaPrompt = ChatPromptTemplate.fromMessages([
    ["system", qaSystemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
]);

// Below we use createStuffDocuments_chain to feed all retrieved context
// into the LLM. Note that we can also use StuffDocumentsChain and other
// instances of BaseCombineDocumentsChain.
const questionAnswerChain = await createStuffDocumentsChain({
    llm,
    prompt: qaPrompt,
});

const ragChain = await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain: questionAnswerChain,
});

export async function POST(req: NextRequest) {
    const { messages, input } = await req.json();
    const response = await ragChain.invoke({
        chat_history: messages,
        input
    });
    const sources = (response.context.map((doc) => { 
       return {title: doc.metadata.title, url: doc.metadata.source};
    }));
    // Remove duplicates
    const uniqueSources = sources.filter((value, index, self) =>
        index === self.findIndex((t) => (
            t.title === value.title
        ))
    );
    return NextResponse.json({ answer: { role: "system", content: response.answer, sources: uniqueSources }});
}
