// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ConsoleCallbackHandler } from "langchain/callbacks";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
// @ts-ignore
import multiparty from "multiparty";
import fs from "fs";
import { PDFExtract } from "pdf.js-extract";

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

      const supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_PRIVATE_KEY
      );

      const form = new multiparty.Form();
      const { fields, files } = await new Promise<any>(
        (resolve, reject) => {
          form.parse(
            req,
            (err: Error, fields: any, files: any) => {
              if (err) reject({ err });
              resolve({ fields, files });
            }
          );
        }
      );

      // Access the uploaded file from files.pdf[0]
      const file = files.pdf[0];
      const filePath = file.path;

      // Read the file data
      const fileData = fs.readFileSync(filePath);

      // Process the file data
      const pdfExtract = new PDFExtract();
      const data = await pdfExtract.extractBuffer(fileData);

      const textContent = data.pages
        .map((page) =>
          page.content
            .map((item) =>
              item.str === "" ? `\n` : item.str
            )
            .join(" ")
            .toString()
        )
        .toString();

      const splitter = new CharacterTextSplitter({
        separator: "\n",
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const textContentChunks = await splitter.splitText(
        textContent
      );

      const ids = textContentChunks.map((text) => ({
        id: uuidv4(),
      }));

      const vectorStore =
        await SupabaseVectorStore.fromTexts(
          textContentChunks,
          ids,
          new OpenAIEmbeddings({
            openAIApiKey: process.env.OPEN_API_KEY,
            modelName: "text-embedding-ada-002",
          }),
          {
            client: supabaseClient,
            tableName: "documents",
            queryName: "match_documents",
          }
        );

      res.status(200).json({ result: "Stored documents" });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Error processing the uploaded file",
      });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
