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

                {/* Footer Navigation */}
                <nav className="flex items-center gap-4 md:gap-6">
                  <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Về chúng tôi
                  </Link>
                  <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Liên hệ
                  </Link>
                  <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Chính sách
                  </Link>
                </nav>
              </div>
            </div>
          </footer>
        );
      };
