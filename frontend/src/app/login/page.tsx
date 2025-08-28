'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiClient } from '@/services/api';
import { useAppStore } from '@/store';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAppStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.login(email, password);
      if (response.success && response.data) {
        localStorage.setItem('auth_token', response.data.token);
        setUser(response.data.user as User);
        router.push('/dashboard');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (error: unknown) {
      let errorMessage = 'Login failed';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || 'Login failed';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-800/20 via-indigo-800/20 to-blue-800/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl blur-sm"></div>
                <Image 
                  src="/image.png" 
                  alt="Funnel AI Logo" 
                  width={64} 
                  height={64} 
                  className="relative rounded-xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm p-3 border border-white/20"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Funnel AI
                </h1>
                <p className="text-blue-100/90 text-lg font-medium">Customer Service Platform</p>
              </div>
            </div>
            <div className="space-y-6 text-lg">
              <p className="leading-relaxed text-blue-50/90 text-xl">
                Transform your customer service with AI-powered voice calls and automated follow-ups.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 group">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full shadow-lg"></div>
                  <span className="text-blue-50/90 group-hover:text-white transition-colors">AI-powered sales calls</span>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full shadow-lg"></div>
                  <span className="text-blue-50/90 group-hover:text-white transition-colors">Lead management & tracking</span>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full shadow-lg"></div>
                  <span className="text-blue-50/90 group-hover:text-white transition-colors">WhatsApp follow-up automation</span>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-lg"></div>
                  <span className="text-blue-50/90 group-hover:text-white transition-colors">Real-time analytics & reporting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-32 w-20 h-20 bg-gradient-to-br from-blue-500/15 to-indigo-500/15 rounded-full blur-lg"></div>
        <div className="absolute top-1/2 right-12 w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-md"></div>
        <div className="absolute top-32 left-16 w-24 h-24 bg-gradient-to-br from-blue-400/5 to-purple-400/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-32 left-20 w-40 h-40 bg-gradient-to-br from-purple-600/5 to-indigo-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <Image 
                src="/image.png" 
                alt="Funnel AI Logo" 
                width={48} 
                height={48} 
                className="rounded-lg"
              />
              <div className="text-center">
                <h1 className="text-2xl font-bold">Funnel AI</h1>
                <p className="text-muted-foreground text-sm">Customer Service Platform</p>
              </div>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground mt-2">
                Sign in to access your customer service dashboard
              </p>
            </div>
          </div>

          <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl shadow-purple-500/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Sign In
              </CardTitle>
              <CardDescription className="text-slate-600">
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="p-4 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-2">
                    <div className="w-1 h-6 bg-destructive rounded-full"></div>
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@company.com"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      required
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <Separator className="my-4" />
                <div className="text-center text-sm text-muted-foreground">
                  Need access? Contact your system administrator
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>Powered by Funnel AI • Secure & Encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}