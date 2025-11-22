import { useState } from 'react';
import { LogIn, UserPlus, Droplet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface AuthProps {
  onLogin: (email: string) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [authStep, setAuthStep] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    toast.success('Welcome back!', {
      description: 'Successfully logged in to Santa Maria Hydrogen Lab'
    });
    
    onLogin(email);
  };
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name || !phone) {
      toast.error('Please fill in all fields');
      return;
    }
    
    toast.success('Account created!', {
      description: 'Welcome to Santa Maria Hydrogen Lab'
    });
    
    onLogin(email);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #39B7FF 0%, #12C9B6 100%)' }}>
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-4">
            <Droplet size={40} className="text-[#39B7FF]" />
          </div>
          <h1 className="text-white" style={{ fontSize: '32px', fontWeight: '700' }}>
            Santa Maria
          </h1>
          <p className="text-white opacity-90 mt-2">Hydrogen Lab – MLM Cabinet</p>
        </div>
        
        <Card className="border-0 rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-[#222] text-center">
              {authStep === 'login' ? 'Sign In' : 'Create Account'}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={authStep === 'login' ? handleLogin : handleRegister}>
              <div className="space-y-4">
                {authStep === 'register' && (
                  <>
                    <div>
                      <Label htmlFor="name" className="text-[#666]">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 border-[#E6E9EE]"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-[#666]">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 border-[#E6E9EE]"
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <Label htmlFor="email" className="text-[#666]">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 border-[#E6E9EE]"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password" className="text-[#666]">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 border-[#E6E9EE]"
                  />
                </div>
                
                <Button 
                  type="submit"
                  className="w-full bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
                  style={{ fontWeight: '600' }}
                >
                  {authStep === 'login' ? (
                    <>
                      <LogIn size={18} className="mr-2" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} className="mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthStep(authStep === 'login' ? 'register' : 'login')}
                className="text-[#39B7FF] hover:underline"
                style={{ fontWeight: '600' }}
              >
                {authStep === 'login' 
                  ? "Don't have an account? Register" 
                  : 'Already have an account? Sign In'
                }
              </button>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-white text-center mt-6 opacity-75">
          © 2025 Santa Maria Hydrogen Lab. All rights reserved.
        </p>
      </div>
    </div>
  );
}
