import { Inter } from "next/font/google";
import { FormEvent } from "react";
import { ChangeEvent } from "react";
import { useState } from "react";
import * as pdfjs from "pdfjs-dist";

// To get pdfjs working
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const inter = Inter({ subsets: ["latin"] });

interface PDFParserResult {
  text: string;
  error?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | undefined>();
  const [result, setResult] = useState<PDFParserResult>({
    text: "",
  });

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
        const response = await fetch("/api/chat", {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        console.log(response);
      } catch (error) {
        console.error(error);
      }
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
        {result.text &&
          result.text.split("\n").map((r, i) => (
            <p className="m-0.5" key={i}>
              {r}
            </p>
          ))}
      </div>
    </main>
  );
}
