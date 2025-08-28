'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/services/api';

interface UploadResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicates: number;
  total: number;
}

interface LeadUploadProps {
  onSuccess?: () => void;
  className?: string;
  showTemplateButton?: boolean;
}

export function LeadUpload({ 
  onSuccess, 
  className = "",
  showTemplateButton = true 
}: LeadUploadProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setUploadFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      const result = await apiClient.uploadLeads(uploadFile);
      if (result.data) {
        setUploadResult({
          success: result.success,
          ...result.data
        });
        
        // Call success callback if provided
        if (result.success && result.data.imported > 0 && onSuccess) {
          onSuccess();
        }
      }
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadResult({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Upload failed'],
        duplicates: 0,
        total: 0
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiClient.downloadLeadsTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leads_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadResult(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showTemplateButton && (
        <div className="flex gap-2">
          <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </div>
      )}
      
      <div 
        className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-sm font-medium">
            {uploadFile ? uploadFile.name : 'Drop files here or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground">CSV, Excel files up to 10MB</p>
        </div>
      </div>
      
      <Input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex gap-2">
        <Button 
          className="flex-1" 
          onClick={uploadFile ? handleUpload : () => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : uploadFile ? 'Upload File' : 'Choose Files'}
        </Button>
        {(uploadFile || uploadResult) && (
          <Button variant="outline" onClick={resetUpload}>
            Clear
          </Button>
        )}
      </div>
      
      {/* Upload Results */}
      {uploadResult && (
        <div className={`p-4 rounded-lg ${
          uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {uploadResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <p className={`text-sm font-medium ${
              uploadResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {uploadResult.success 
                ? `Successfully imported ${uploadResult.imported} leads`
                : 'Upload completed with errors'
              }
            </p>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            <p>Total processed: {uploadResult.total}</p>
            <p>Imported: {uploadResult.imported}</p>
            <p>Duplicates: {uploadResult.duplicates}</p>
          </div>
          
          {uploadResult.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
              <div className="max-h-32 overflow-y-auto">
                {uploadResult.errors.slice(0, 5).map((error, index) => (
                  <p key={index} className="text-xs text-red-600">{error}</p>
                ))}
                {uploadResult.errors.length > 5 && (
                  <p className="text-xs text-red-600">...and {uploadResult.errors.length - 5} more errors</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}