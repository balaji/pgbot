import { NextRequest, NextResponse } from "next/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate, MessagesPlaceholder} from "@langchain/core/prompts";

const supabaseClient = createClient(
    process.env.SUPABASE_PUBLIC_URL!,
    process.env.ANON_KEY!,
);

const vectorStore = new SupabaseVectorStore(new OpenAIEmbeddings({
    model: "text-embedding-3-large",
}), {
    client: supabaseClient,
    tableName: "langchain_pg_embedding",
    queryName: "test_function",
});

const llm = new ChatOpenAI({
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
    streaming: true,
    modelName: 'gpt-4o-mini',
});

const instruction = `"You are an assistant for question-answering tasks.
 Use the following pieces of retrieved context to answer the question. 
 If you don't know the answer, just say that you don't know."`

const prompt = ChatPromptTemplate.fromMessages([
    ["system", instruction],
    new MessagesPlaceholder("context"),
    ["human", "{question}"],
]);

type State = {
    question?: string,
    context?: Document[],
};

const retrieve = async (question: string): Promise<State> => {
    const docs = await vectorStore.similaritySearch(question, 3);
    return {context: docs, question: question};
}

const generate = async (state: State) => {
    const content = state.context!.map((doc) => {
        return doc.pageContent;
    }).join("\n\n");
    const messages = await prompt.invoke({
        question: state.question,
        context: content
    });
    const response = await llm.invoke(messages);
    return response.content;
}

export async function POST(req: NextRequest) {
    const { input } = await req.json();
    const state = await retrieve(input);
    const response = await generate(state);
    const sources = (state.context!.map((doc) => { 
       return {title: doc.metadata.title, url: doc.metadata.source};
    }));
    return NextResponse.json({ answer: { role: "system", content: response, sources }});
}
