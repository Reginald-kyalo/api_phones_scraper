import { useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LoginForm } from '../features/auth/components/LoginForm';
import { RegisterForm } from '../features/auth/components/RegisterForm';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-semibold text-xl">D</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to DealsOnline</h1>
          <p className="text-sm text-muted-foreground">Sign in to sync your data across devices</p>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
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
