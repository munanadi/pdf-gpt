import { Inter } from "next/font/google";
import { FormEvent, SetStateAction } from "react";
import { ChangeEvent } from "react";
import { useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { ChatResponseData } from "./api/upload";

// To get pdfjs working
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const inter = Inter({ subsets: ["latin"] });

interface PDFParserResult {
  text: string;
  error?: string | undefined;
}

export default function Home() {
  const [file, setFile] = useState<File | undefined>();
  const [result, setResult] = useState<PDFParserResult>({
    text: "",
  });
  const [input, setInput] = useState<string>("");

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setInput(e.target.value);
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile);

    try {
      if (!selectedFile) return;

      const pdfData = await selectedFile
        .arrayBuffer()
        .then((arrBuffer) => Buffer.from(arrBuffer));

      const loadingTask = pdfjs.getDocument({
        data: pdfData,
      });

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();

      const finalTextString = textContent.items
        .map((item: any) =>
          item.str === "" ? "\n" : item.str
        )
        .join(" ");

      setResult({
        text: finalTextString,
        error: undefined,
      });
    } catch (error) {
      setResult({
        text: "",
        error: "Error parsing the PDF file",
      });
      console.error(error);
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (file) {
      const formData = new FormData();
      formData.append("pdf", file);

      try {
        const response: ChatResponseData = await fetch(
          "/api/upload",
          {
            method: "POST",
            body: formData,
          }
        ).then((res) => res.json());

        if (response.result) {
          // Document embeddings created. Query documents now
          setResult((state) => ({
            error: undefined,
            text: state.text,
          }));
          alert("Document uploaded suceesfully!");
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleSubmitQuery = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const data = { query: input };

    try {
      const response: any = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((res) => res.json());
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main
      className={`flex min-h-screen flex-col items-center p-24 ${inter.className}`}
    >
      <form onSubmit={handleSubmit}>
        <label htmlFor="pdf-file">
          <input
            id="pdf-file"
            accept=".pdf"
            type="file"
            onChange={handleFileChange}
          />
        </label>
        <button
          className="border-x-white border-2 p-2"
          type="submit"
        >
          Submit
        </button>
      </form>

      <div className="mt-2">
        {result.error && <p>Error: {result.error}</p>}
        {result.text && (
          <>
            <h2>Preview:</h2>
            {result.text && result.text.slice(0, 100)}...
          </>
        )}
      </div>

      {!result.error && (
        <div className="mt-2 ">
          <h2>Enter your query about the document</h2>
          <form
            onSubmit={handleSubmitQuery}
            className="flex items-center space-x-3"
          >
            <label htmlFor="input">
              <input
                className="text-green-600 p-2"
                type="text"
                placeholder="What does the document talk about?"
                onChange={handleInputChange}
                value={input}
              />
            </label>
            <button
              className="border-x-white border-2 p-2"
              type="submit"
            >
              Submit
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
