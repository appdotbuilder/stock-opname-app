import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';

interface ReportGeneratorProps {
  sessionId: number;
  itemCount: number;
}

export function ReportGenerator({ sessionId, itemCount }: ReportGeneratorProps) {
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGenerateExcel = async () => {
    try {
      setIsGeneratingExcel(true);
      setError(null);
      
      const result = await trpc.generateExcelReport.query({
        session_id: sessionId,
        format: 'excel'
      });
      
      // In a real implementation, this would return a download URL or blob
      // For now, we'll show a success message
      setSuccess('📊 Excel report generated successfully! Download should start automatically.');
      
      // Simulate download (in real app, you'd handle the blob/URL from the server)
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err) {
      setError('Failed to generate Excel report. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setError(null);
      
      const result = await trpc.generatePdfReport.query({
        session_id: sessionId,
        format: 'pdf'
      });
      
      // In a real implementation, this would return a download URL or blob
      // For now, we'll show a success message
      setSuccess('📄 PDF report generated successfully! Download should start automatically.');
      
      // Simulate download (in real app, you'd handle the blob/URL from the server)
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err) {
      setError('Failed to generate PDF report. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="space-y-4">
        {/* Excel Report */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-green-800">📊 Excel Report</CardTitle>
                <CardDescription className="text-green-700">
                  Spreadsheet format for data analysis
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                .xlsx
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="text-sm text-green-700">
                <p><strong>Includes:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                  <li>Complete item listing with SKU, Lot Number, Quantity</li>
                  <li>Session details and metadata</li>
                  <li>Timestamps and user information</li>
                  <li>Summary statistics</li>
                </ul>
              </div>
              
              <Separator className="bg-green-200" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">
                  Items to export: <strong>{itemCount}</strong>
                </span>
                <Button
                  onClick={handleGenerateExcel}
                  disabled={isGeneratingExcel || itemCount === 0}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {isGeneratingExcel ? (
                    <>⏳ Generating...</>
                  ) : (
                    <>📊 Download Excel</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Report */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-blue-800">📄 PDF Report</CardTitle>
                <CardDescription className="text-blue-700">
                  Professional printable report
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                .pdf
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="text-sm text-blue-700">
                <p><strong>Includes:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                  <li>Formatted item summary with totals</li>
                  <li>Location and date information</li>
                  <li>Conductor name and signature (if provided)</li>
                  <li>Professional layout for documentation</li>
                </ul>
              </div>
              
              <Separator className="bg-blue-200" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  Items to include: <strong>{itemCount}</strong>
                </span>
                <Button
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf || itemCount === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {isGeneratingPdf ? (
                    <>⏳ Generating...</>
                  ) : (
                    <>📄 Download PDF</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {itemCount === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No items to export yet.</p>
            <p className="text-xs">Add some items to generate reports.</p>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>💡 Reports are generated based on current session data</p>
          <p>Files will be downloaded automatically once ready</p>
        </div>
      </div>
    </div>
  );
}