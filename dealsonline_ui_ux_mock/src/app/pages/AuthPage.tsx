import { useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LoginForm } from '../features/auth/components/LoginForm';
import { RegisterForm } from '../features/auth/components/RegisterForm';
import Logo from '../components/layout/Logo';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <Logo showWordmark={false} size={56} className="mb-4" />
          <h1 className="page-title mb-2">Welcome to SokoPulse</h1>
          <p className="text-sm text-muted-foreground">Sign in to sync your data across devices</p>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Create account</TabsTrigger>
          </TabsList>

          {/* Login Form */}
          <TabsContent value="login">
            <LoginForm redirect={redirect} />
          </TabsContent>

          {/* Register Form */}
          <TabsContent value="register">
            <RegisterForm redirect={redirect} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
