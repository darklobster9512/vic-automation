import { pdfjs } from "react-pdf";
// Bundle the worker locally instead of loading it from a CDN.
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
}

export { pdfjs };
