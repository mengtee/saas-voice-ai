'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Phone, 
  Mail, 
  Target, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { Lead } from '@/types';

interface AddLeadProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface LeadFormData {
  name: string;
  phoneNumber: string;
  email: string;
  purpose: string;
  notes: string;
}

const initialFormData: LeadFormData = {
  name: '',
  phoneNumber: '',
  email: '',
  purpose: '',
  notes: ''
};

export function AddLead({ onSuccess, onCancel, className = "" }: AddLeadProps) {
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: keyof LeadFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
    if (success) setSuccess(false);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Name is required';
    }
    
    if (!formData.phoneNumber.trim()) {
      return 'Phone number is required';
    }

    // Basic phone number validation (allows various formats)
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      return 'Please enter a valid phone number';
    }

    // Email validation (optional but if provided, must be valid)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        return 'Please enter a valid email address';
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare lead data according to the Lead interface
      const leadData: Omit<Lead, "id" | "createdAt" | "updatedAt"> = {
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim() || undefined,
        purpose: formData.purpose.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: 'pending'
      };

      const response = await apiClient.createLead(leadData);

      if (response.success) {
        setSuccess(true);
        setFormData(initialFormData);
        
        // Call success callback after a brief delay to show success message
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      } else {
        setError('Failed to create lead. Please try again.');
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      setError('Failed to create lead. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-medium text-green-900 mb-2">Lead Added Successfully!</h3>
            <p className="text-sm text-green-600 mb-4">
              {formData.name} has been added to your leads database.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleReset} variant="outline">
                Add Another Lead
              </Button>
              {onCancel && (
                <Button onClick={onCancel}>
                  Done
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Add New Lead
        </CardTitle>
        <CardDescription>
          Enter lead information to add them to your database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Enter lead's full name"
              disabled={loading}
              required
            />
          </div>

          {/* Phone Number Field */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number *
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleInputChange('phoneNumber')}
              placeholder="e.g., +1 (555) 123-4567"
              disabled={loading}
              required
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="lead@example.com"
              disabled={loading}
            />
          </div>

          {/* Purpose Field */}
          <div className="space-y-2">
            <Label htmlFor="purpose" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Purpose/Interest
            </Label>
            <Input
              id="purpose"
              type="text"
              value={formData.purpose}
              onChange={handleInputChange('purpose')}
              placeholder="e.g., Product inquiry, Demo request"
              disabled={loading}
            />
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={handleInputChange('notes')}
              placeholder="Additional notes or context about this lead..."
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={loading || !formData.name.trim() || !formData.phoneNumber.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Lead...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Add Lead
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            
            <Button type="button" variant="ghost" onClick={handleReset} disabled={loading}>
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}