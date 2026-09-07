import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { FileText, PenTool, Trash2, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContractSigningViewProps {
  contractId: string;
  contractPdfUrl: string;
  brandColor?: string | null;
}

export function ContractSigningView({ contractId, contractPdfUrl, brandColor }: ContractSigningViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  useEffect(() => {
    if (dialogOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [dialogOpen]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSigning(true);
    try {
      // Get base64 without prefix
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.replace("data:image/png;base64,", "");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nicht eingeloggt");

      const res = await fetch(
        `https://gzgfyuftjvezqjkosntu.supabase.co/functions/v1/sign-contract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3p2bmF1cGRlY2VycHZ3em1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzEwNjUsImV4cCI6MjA5NDM0NzA2NX0.uXLnpeKILEDBoC8yCcX1ZL-hdlhFPUl-bVYcoxHKu2Y",
          },
          body: JSON.stringify({ contract_id: contractId, signature_data: base64 }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Fehler beim Unterschreiben");
      }

      toast.success("Vertrag erfolgreich unterzeichnet!");
      // Reload to show full panel
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Unterschreiben");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-6 lg:p-8 bg-slate-50">
      <div className="w-full space-y-4">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Arbeitsvertrag</h1>
          <p className="text-muted-foreground">
            Bitte lesen Sie Ihren Arbeitsvertrag sorgfältig durch und unterschreiben Sie anschließend digital.
          </p>
        </div>

        {/* Mobile Buttons (above PDF) */}
        <div className="flex flex-col items-center gap-2 lg:hidden">
          <Button
            size="lg"
            className="text-white gap-2 w-full max-w-sm"
            style={brandColor ? { backgroundColor: brandColor } : undefined}
            onClick={() => setDialogOpen(true)}
          >
            <PenTool className="h-5 w-5" />
            Vertrag unterschreiben
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            asChild
          >
            <a href={contractPdfUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
              Vertrag herunterladen
            </a>
          </Button>
        </div>

        {/* PDF Viewer */}
        <div className="max-w-3xl mx-auto w-full shadow-lg h-[50vh] md:h-[65vh]">
          <iframe
            src={`${contractPdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="w-full h-full bg-white"
            style={{ border: "none" }}
            title="Arbeitsvertrag PDF"
          />
        </div>

        {/* Desktop Sign Button (below PDF) */}
        <div className="hidden lg:flex flex-col items-center gap-2">
          <Button
            size="lg"
            className="text-white gap-2"
            style={brandColor ? { backgroundColor: brandColor } : undefined}
            onClick={() => setDialogOpen(true)}
          >
            <PenTool className="h-5 w-5" />
            Vertrag unterschreiben
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            asChild
          >
            <a href={contractPdfUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
              Vertrag herunterladen
            </a>
          </Button>
        </div>
      </div>

      {/* Signature Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Digital unterschreiben</DialogTitle>
            <DialogDescription>
              Bitte setzen Sie Ihre Unterschrift in das Feld unten.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={440}
                height={200}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Unterschrift
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={clearCanvas} disabled={signing}>
              <Trash2 className="h-4 w-4 mr-1" /> Löschen
            </Button>
            <Button
              onClick={handleSign}
              disabled={!hasDrawn || signing}
              className="text-white"
              style={brandColor ? { backgroundColor: brandColor } : undefined}
            >
              {signing ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Wird unterschrieben...</>
              ) : (
                "Bestätigen & Unterschreiben"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
