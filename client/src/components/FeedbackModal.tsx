import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { feedbackApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2 } from 'lucide-react';

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackModalProps {
  open: boolean;
  queryId?: number;
  onClose: () => void;
}

export function FeedbackModal({ open, queryId, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: feedbackApi.submit,
    onSuccess: () => {
      toast({
        title: "¡Gracias!",
        description: "Tu feedback ha sido enviado exitosamente",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error al enviar feedback",
        description: error.message || "Por favor intenta de nuevo",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    if (!queryId) return;
    
    submitFeedbackMutation.mutate({
      queryId,
      rating: data.rating,
      comment: data.comment || undefined,
    });
  };

  const handleClose = () => {
    reset();
    setRating(0);
    setHoveredRating(0);
    onClose();
  };

  const handleRatingClick = (value: number) => {
    setRating(value);
    setValue('rating', value);
  };

  const handleRatingHover = (value: number) => {
    setHoveredRating(value);
  };

  const handleRatingLeave = () => {
    setHoveredRating(0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <Label>¿Cómo calificarías esta respuesta?</Label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`p-1 transition-colors ${
                    (hoveredRating || rating) >= value
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                  onClick={() => handleRatingClick(value)}
                  onMouseEnter={() => handleRatingHover(value)}
                  onMouseLeave={handleRatingLeave}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {rating} estrella{rating !== 1 ? 's' : ''}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {rating === 1 && 'Malo'}
                  {rating === 2 && 'Regular'}
                  {rating === 3 && 'Bueno'}
                  {rating === 4 && 'Muy Bueno'}
                  {rating === 5 && 'Excelente'}
                </span>
              </div>
            )}
            {errors.rating && (
              <p className="text-sm text-destructive">Por favor selecciona una calificación</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comentarios Adicionales (Opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Cuéntanos más sobre tu experiencia..."
              rows={3}
              {...register('comment')}
              disabled={submitFeedbackMutation.isPending}
            />
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={submitFeedbackMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={rating === 0 || submitFeedbackMutation.isPending}
            >
              {submitFeedbackMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Feedback'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
