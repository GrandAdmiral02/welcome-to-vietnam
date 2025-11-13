import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-muted/40 border-t mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and Copyright */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-primary/60 rounded-lg p-2">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Hippo Lovely. All rights reserved.
            </p>
          </div>

          {/* Footer Links */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Điều khoản dịch vụ
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Chính sách bảo mật
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
