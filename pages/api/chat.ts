// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "langchain/llms/openai";
import { ConsoleCallbackHandler } from "langchain/callbacks";

type Data = {
  result?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // if (req.method === 'POST')

  const model = new OpenAI({
    openAIApiKey: process.env.OPEN_API_KEY,
    temperature: 0.1,
    callbacks: [new ConsoleCallbackHandler()],
  });

  const response = await model.call("What's up?");

  console.log(response);

  return res
    .status(200)
    .json({ result: JSON.stringify(response) });
}
