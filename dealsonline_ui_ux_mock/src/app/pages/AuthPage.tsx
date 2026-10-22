import { Link, useSearchParams } from 'react-router';
import { Seo } from '../components/common/Seo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { LoginForm } from '../features/auth/components/LoginForm';
import { RegisterForm } from '../features/auth/components/RegisterForm';
import { ACCOUNT_AVAILABLE } from '../context/AuthContext';
import Logo from '../components/layout/Logo';

/**
 * Sign in / create account. While the build has no account service
 * (ACCOUNT_AVAILABLE false) the route says so and offers the catalogue,
 * rather than a form whose every submission fails (design audit §13). The
 * forms stay for the day the API is wired.
 */
export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  if (!ACCOUNT_AVAILABLE) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <Seo title="Sign in" noindex />
        <div className="w-full max-w-md text-center">
          <Logo showWordmark={false} size={56} className="mb-4" />
          <h1 className="page-title mb-2">Account features aren’t available yet.</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Favourites, price targets and comparisons are saved in this browser without an account.
          </p>
          <Button asChild variant="outline">
            <Link to="/browse">Browse products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Seo title="Sign in" noindex />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo showWordmark={false} size={56} className="mb-4" />
          <h1 className="page-title mb-2">Sign in</h1>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Create an account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <LoginForm redirect={redirect} />
          </TabsContent>

          <TabsContent value="register">
            <RegisterForm redirect={redirect} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
