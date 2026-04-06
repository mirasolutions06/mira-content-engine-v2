export function Footer() {
  return (
    <footer className="border-t border-border/30">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          {/* Brand */}
          <div className="max-w-xs">
            <a href="/" className="text-xl font-bold tracking-tight">
              mira<span className="text-gradient">.</span>
            </a>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              AI-powered content production for e-commerce brands and creators.
              Campaign-grade images, video, copy, and monetization from a single brief.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
                Product
              </h4>
              <div className="space-y-3">
                <a href="#how-it-works" className="block text-sm text-foreground/60 hover:text-foreground transition-colors">
                  How It Works
                </a>
                <a href="#portfolio" className="block text-sm text-foreground/60 hover:text-foreground transition-colors">
                  Portfolio
                </a>
                <a href="#pricing" className="block text-sm text-foreground/60 hover:text-foreground transition-colors">
                  Pricing
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
                Company
              </h4>
              <div className="space-y-3">
                <a href="/contact" className="block text-sm text-foreground/60 hover:text-foreground transition-colors">
                  Contact
                </a>
                <a href="#faq" className="block text-sm text-foreground/60 hover:text-foreground transition-colors">
                  FAQ
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="divider mt-12 mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Mira. All rights reserved.
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground tracking-wider">
            <span>Built with</span>
            <span className="text-foreground/40">Claude</span>
            <span>&middot;</span>
            <span className="text-foreground/40">Gemini</span>
            <span>&middot;</span>
            <span className="text-foreground/40">Kling</span>
            <span>&middot;</span>
            <span className="text-foreground/40">Veo</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
