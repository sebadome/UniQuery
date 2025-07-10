import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { databaseApi } from "@/lib/databaseApi";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

interface FeedbackModalProps {
  open: boolean;
  queryLogId?: number;
  onClose: () => void;
}

export function FeedbackModal({ open, queryLogId, onClose }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  const { mutate: submitFeedback, isPending } = useMutation({
    mutationFn: async () => {
      if (!queryLogId || feedback == null) throw new Error("No hay queryLogId o feedback");
      await databaseApi.sendQueryFeedback({
        logId: queryLogId,
        feedback,
        feedbackComment: comment.trim() ? comment : undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "¡Gracias por tu feedback!",
        description: "Tu opinión ayuda a mejorar la plataforma.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error al enviar feedback",
        description: error?.message || "Por favor intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitFeedback();
  };

  const handleClose = () => {
    setFeedback(null);
    setComment("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>¿Te fue útil la respuesta?</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Botones de Feedback */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center my-2">
            <button
              type="button"
              className={`
                flex flex-col items-center justify-center w-28 h-14 rounded-lg border
                transition-colors outline-none
                ${feedback === 1 ? "bg-primary text-white border-primary" : "bg-white text-slate-700 border-slate-200 hover:bg-primary/10"}
                focus-visible:ring-2 focus-visible:ring-primary
              `}
              aria-pressed={feedback === 1}
              tabIndex={0}
              onClick={() => setFeedback(1)}
              disabled={isPending}
            >
              <ThumbsUp className="h-6 w-6 mb-1" />
              <span className="text-sm font-medium">Sí</span>
            </button>
            <button
              type="button"
              className={`
                flex flex-col items-center justify-center w-28 h-14 rounded-lg border
                transition-colors outline-none
                ${feedback === -1 ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-700 border-slate-200 hover:bg-red-100"}
                focus-visible:ring-2 focus-visible:ring-red-500
              `}
              aria-pressed={feedback === -1}
              tabIndex={0}
              onClick={() => setFeedback(-1)}
              disabled={isPending}
            >
              <ThumbsDown className="h-6 w-6 mb-1" />
              <span className="text-sm font-medium">No</span>
            </button>
          </div>

          {/* Badge de feedback */}
          <div className="flex items-center justify-center min-h-[28px]">
            {feedback === 1 && (
              <Badge variant="secondary">¡Gracias por tu aprobación!</Badge>
            )}
            {feedback === -1 && (
              <Badge variant="destructive">Ayúdanos a mejorar</Badge>
            )}
          </div>

          {/* Comentario adicional */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentario adicional (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Cuéntanos cómo mejorar, o detalla tu experiencia..."
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isPending}
              className="resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={feedback == null || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Feedback"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
