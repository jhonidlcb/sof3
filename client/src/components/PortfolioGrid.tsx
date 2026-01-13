import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronRight } from "lucide-react";
import type { Portfolio } from "@shared/schema";

interface PortfolioGridProps {
  portfolio: Portfolio[];
}

export default function PortfolioGrid({ portfolio }: PortfolioGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {portfolio.filter(item => item.isActive).slice(0, 6).map((item) => {
        const technologies = JSON.parse(item.technologies || '[]');
        return (
          <div key={item.id} className="group relative overflow-hidden rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover-lift">
            <div className="aspect-video overflow-hidden">
              <img
                src={item.imageUrl}
                alt={`${item.title} - Proyecto de ${item.category} desarrollado en Paraguay por SoftwarePar`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=400&fit=crop";
                }}
              />
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary">{item.category}</Badge>
                <div className="flex space-x-2">
                  {technologies.slice(0, 2).map((tech: string, techIndex: number) => (
                    <Badge key={techIndex} variant="outline" className="text-xs">{tech}</Badge>
                  ))}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {item.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Completado en {new Date(item.completedAt).getFullYear()}
                </span>
                {item.demoUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary/80"
                    onClick={() => window.open(item.demoUrl!, '_blank')}
                  >
                    Ver demo →
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    Ver detalles →
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
