// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { createClient } from "@supabase/supabase-js";
import { SupabaseHybridSearch } from "langchain/retrievers/supabase";

export type ChatResponseData = {
  result?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponseData>
) {
  if (req.method === "POST") {
    try {
      if (
        !process.env.SUPABASE_URL ||
        !process.env.SUPABASE_PRIVATE_KEY ||
        !process.env.OPEN_API_KEY
      ) {
        return res
          .status(401)
          .json({ error: "Missing API keys" });
      }

      console.log(req.body);

      if (!req.body) {
        return res
          .status(400)
          .json({ error: "Missing body for request" });
      }

      const supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_PRIVATE_KEY
      );

      const embeddings = new OpenAIEmbeddings();

      const retriever = new SupabaseHybridSearch(
        embeddings,
        {
          client: supabaseClient,
          similarityK: 2,
          keywordK: 2,
          tableName: "documents",
          similarityQueryName: "match_documents",
        }
      );

      const { query } = req.body;

      console.log(`Query was : ${query}`);

      const results = await retriever.getRelevantDocuments(
        query
      );

      console.log({ results });

      return res.status(200).json({ result: "Found" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Error processing the uploaded file",
      });
    }
  } else {
    return res
      .status(405)
      .json({ error: "Method Not Allowed" });
  }
}
