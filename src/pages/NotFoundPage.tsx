import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-skin-50">
      <Header />
      <main className="flex-1 flex items-center justify-center pt-16 px-6">
        <div className="text-center max-w-sm">
          <p className="font-serif text-8xl text-skin-200 font-light mb-4">404</p>
          <h1 className="font-serif text-2xl text-navy-900 mb-3">Strona nie istnieje</h1>
          <p className="text-sm text-navy-500 font-sans leading-relaxed mb-8">
            Nie znaleźliśmy strony, której szukasz. Wróć na stronę główną.
          </p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft size={14} />
            Strona główna
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
