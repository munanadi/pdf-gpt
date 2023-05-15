// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "langchain/llms/openai";
import { ConsoleCallbackHandler } from "langchain/callbacks";
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
  // // if (req.method === 'POST')

  // const model = new OpenAI({
  //   openAIApiKey: process.env.OPEN_API_KEY,
  //   temperature: 0.1,
  //   callbacks: [new ConsoleCallbackHandler()],
  // });

  // const response = await model.call("What's up?");

  // console.log(response);

  // return res
  //   .status(200)
  //   .json({ result: JSON.stringify(response) });

  if (req.method === "POST") {
    const form = new multiparty.Form();

    try {
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

      // Get the first page alone
      const firstPage = data.pages[0];

      const textContent = firstPage.content
        .map((item) => (item.str === "" ? `\n` : item.str))
        .join(" ")
        .split("\n")
        .toString();

      res
        .status(200)
        .json({ result: JSON.stringify(textContent) });
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
