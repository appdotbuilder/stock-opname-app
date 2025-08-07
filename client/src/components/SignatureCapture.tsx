import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SignatureCaptureProps {
  onComplete: (signatureData: string | null) => Promise<void>;
  isLoading: boolean;
}

export function SignatureCapture({ onComplete, isLoading }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set up canvas
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Clear canvas with white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setError(null);
  };

  const getSignatureData = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;

    try {
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to get signature data:', err);
      return null;
    }
  };

  const handleComplete = async () => {
    if (!hasSignature) {
      setError('Please provide a signature before completing the session');
      return;
    }

    try {
      setError(null);
      const signatureData = getSignatureData();
      await onComplete(signatureData);
    } catch (err) {
      setError('Failed to complete session. Please try again.');
    }
  };

  const handleCompleteWithoutSignature = async () => {
    try {
      setError(null);
      await onComplete(null);
    } catch (err) {
      setError('Failed to complete session. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium text-gray-900">Digital Signature</h3>
              <p className="text-sm text-gray-600">Draw your signature in the box below</p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50">
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="w-full max-w-full border border-gray-200 rounded bg-white cursor-crosshair touch-none"
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearSignature}
                disabled={!hasSignature || isLoading}
                className="flex-1 sm:flex-none"
              >
                🔄 Clear
              </Button>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 flex-1">
                <Button
                  onClick={handleCompleteWithoutSignature}
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? '⏳ Completing...' : '✅ Complete without signature'}
                </Button>
                
                <Button
                  onClick={handleComplete}
                  disabled={!hasSignature || isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? '⏳ Completing...' : '✅ Complete with signature'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>💡 Use your finger on mobile or mouse on desktop to sign</p>
        <p>Signature is optional but recommended for audit trail</p>
      </div>
    </div>
  );
}