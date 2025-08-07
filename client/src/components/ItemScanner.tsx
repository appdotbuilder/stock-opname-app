import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ItemScannerProps {
  onAddItem: (sku: string, lotNumber: string, quantity: number, barcodeData: string) => Promise<void>;
}

export function ItemScanner({ onAddItem }: ItemScannerProps) {
  const [barcodeData, setBarcodeData] = useState('');
  const [sku, setSku] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'barcode' | 'manual'>('barcode');

  // Auto-clear success/error messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Simulate barcode scanning - in real app, this would integrate with camera/scanner
  const handleBarcodeInput = (value: string) => {
    setBarcodeData(value);
    
    // Parse barcode data (this is a simplified example)
    // In real implementation, you'd parse based on your barcode format
    if (value.trim()) {
      // Example parsing: assuming format like "SKU123|LOT456"
      const parts = value.split('|');
      if (parts.length >= 2) {
        setSku(parts[0] || '');
        setLotNumber(parts[1] || '');
      } else {
        // If no delimiter, treat as SKU
        setSku(value);
        setLotNumber('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sku.trim()) {
      setError('SKU is required');
      return;
    }
    
    if (!lotNumber.trim()) {
      setError('Lot Number is required');
      return;
    }
    
    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    try {
      setIsAdding(true);
      setError(null);
      
      await onAddItem(
        sku.trim(), 
        lotNumber.trim(), 
        quantity, 
        barcodeData.trim() || `${sku.trim()}|${lotNumber.trim()}`
      );
      
      // Reset form
      setBarcodeData('');
      setSku('');
      setLotNumber('');
      setQuantity(1);
      setSuccess('Item added successfully! 🎉');
      
      // Focus back to barcode input for next scan
      if (scanMode === 'barcode') {
        const barcodeInput = document.getElementById('barcodeData');
        if (barcodeInput) {
          barcodeInput.focus();
        }
      }
    } catch (err) {
      setError('Failed to add item. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const resetForm = () => {
    setBarcodeData('');
    setSku('');
    setLotNumber('');
    setQuantity(1);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Input Mode</CardTitle>
              <CardDescription>Choose how to enter item data</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={scanMode === 'barcode' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScanMode('barcode')}
                className={scanMode === 'barcode' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                📱 Scan
              </Button>
              <Button 
                variant={scanMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScanMode('manual')}
                className={scanMode === 'manual' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                ✏️ Manual
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main input form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {scanMode === 'barcode' ? (
              <>
                <span>📱</span>
                <span>Scan Item</span>
              </>
            ) : (
              <>
                <span>✏️</span>
                <span>Manual Entry</span>
              </>
            )}
          </CardTitle>
          <CardDescription>
            {scanMode === 'barcode' 
              ? 'Scan or paste barcode/QR code data'
              : 'Manually enter item information'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Status messages */}
            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Barcode input (for scan mode) */}
            {scanMode === 'barcode' && (
              <div className="space-y-2">
                <Label htmlFor="barcodeData">Barcode/QR Code Data</Label>
                <Input
                  id="barcodeData"
                  type="text"
                  placeholder="Scan or paste barcode data here..."
                  value={barcodeData}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBarcodeInput(e.target.value)}
                  disabled={isAdding}
                  className="text-lg font-mono"
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  💡 Tip: Use your device's camera or external scanner to scan barcodes
                </p>
              </div>
            )}

            {/* Item details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  type="text"
                  placeholder="e.g., ITEM001"
                  value={sku}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSku(e.target.value)}
                  disabled={isAdding}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lotNumber">Lot Number *</Label>
                <Input
                  id="lotNumber"
                  type="text"
                  placeholder="e.g., LOT2024001"
                  value={lotNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLotNumber(e.target.value)}
                  disabled={isAdding}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="1"
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={isAdding}
                required
                className="sm:max-w-32"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
              <Button 
                type="submit" 
                disabled={isAdding || (!sku.trim() || !lotNumber.trim())}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isAdding ? (
                  <>⏳ Adding...</>
                ) : (
                  <>✅ Add Item</>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetForm}
                disabled={isAdding}
                className="sm:w-auto"
              >
                🔄 Clear
              </Button>
            </div>
          </form>

          {/* Quick info */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">💡</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Pro Tips:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Use Tab key to quickly navigate between fields</li>
                  <li>• Barcode format expected: SKU|LotNumber (e.g., ITEM001|LOT123)</li>
                  <li>• Form will reset automatically after adding each item</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}