import { Outlet } from 'react-router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Toaster } from '../components/ui/sonner';

export default function Root() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}