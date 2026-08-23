import { useState } from "react";
import { Document, Page } from "react-pdf";
import "@/lib/pdfWorker";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";


interface Props {
  url: string;
  label: string;
  thumbClassName?: string;
}

export default function KycDocumentPreview({ url, label, thumbClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const isPdf = url.toLowerCase().split("?")[0].endsWith(".pdf");

  const baseClass =
    thumbClassName ??
    "w-full rounded-xl border border-border object-cover group-hover:opacity-80 transition-opacity";

  const downloadName = url.split("/").pop()?.split("?")[0] || `${label}.${isPdf ? "pdf" : "jpg"}`;

  return (
    <>
      <div className="cursor-pointer group" onClick={() => setOpen(true)}>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
        {isPdf ? (
          <div className={`${baseClass} flex items-center justify-center bg-muted/30 overflow-hidden`}>
            <Document
              file={url}
              loading={
                <div className="flex items-center justify-center h-28 w-full">
                  <FileText className="h-10 w-10 text-muted-foreground animate-pulse" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-28 w-full text-muted-foreground">
                  <FileText className="h-10 w-10 mb-1" />
                  <span className="text-xs">PDF</span>
                </div>
              }
            >
              <Page
                pageNumber={1}
                width={280}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </Document>
          </div>
        ) : (
          <img src={url} alt={label} className={baseClass} />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {isPdf ? (
              <Document
                file={url}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<div className="py-12 text-center text-muted-foreground">Lade PDF…</div>}
                error={<div className="py-12 text-center text-muted-foreground">PDF konnte nicht geladen werden.</div>}
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i} className="mb-4 flex justify-center">
                    <Page
                      pageNumber={i + 1}
                      width={680}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  </div>
                ))}
              </Document>
            ) : (
              <img src={url} alt={label} className="w-full rounded-lg" />
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button asChild>
              <a href={url} download={downloadName} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" /> Herunterladen
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
