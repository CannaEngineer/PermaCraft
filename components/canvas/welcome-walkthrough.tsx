'use client';

import { useState, useCallback } from 'react';
import { useUnifiedCanvas } from '@/contexts/unified-canvas-context';
import {
  Leaf, Map, PanelLeft, Rocket,
  Home, Layers, Globe, Sprout, GraduationCap,
  ChevronRight, X,
} from 'lucide-react';

interface WelcomeWalkthroughProps {
  userName: string | null;
  onComplete: () => void;
}

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'map', label: 'The Map' },
  { id: 'panels', label: 'Panels' },
  { id: 'start', label: 'Get Started' },
] as const;

export function WelcomeWalkthrough({ userName, onComplete }: WelcomeWalkthroughProps) {
  const [step, setStep] = useState(0);
  const { setActiveSection } = useUnifiedCanvas();

  const finish = useCallback(() => {
    try { localStorage.setItem('onboarding-complete', 'true'); } catch {}
    onComplete();
  }, [onComplete]);

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };

  const skip = () => finish();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-primary' : i < step ? 'w-2 bg-primary/40' : 'w-2 bg-muted-foreground/20'
              }`}
              aria-label={`Go to step: ${s.label}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="relative min-h-[320px]">
          {step === 0 && (
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                <Leaf className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  Welcome{userName ? `, ${userName}` : ''}!
                </h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Design sustainable landscapes with AI-powered permaculture planning.
                  Let&apos;s take a quick tour of what you can do here.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="h-20 w-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mx-auto">
                <Map className="h-10 w-10 text-blue-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Your Design Canvas</h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  The full-screen map is where your farm comes to life. Switch between satellite
                  and terrain views, draw zones and plantings, and get AI analysis of your design.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['Satellite view', 'Draw zones', 'AI analysis'].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-blue-500/10 text-xs font-medium text-blue-600 dark:text-blue-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <PanelLeft className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Everything at Your Fingertips</h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Use the side navigation to access all features:
                </p>
              </div>
              <div className="space-y-2 text-left max-w-xs mx-auto">
                {[
                  { icon: Home, label: 'Home', desc: 'Dashboard and stats', color: 'text-primary' },
                  { icon: Layers, label: 'Farm', desc: 'Design tools and features', color: 'text-orange-500' },
                  { icon: Globe, label: 'Explore', desc: 'Community designs', color: 'text-blue-500' },
                  { icon: Sprout, label: 'Plants', desc: 'Species database', color: 'text-emerald-500' },
                  { icon: GraduationCap, label: 'Learn', desc: 'Lessons and XP', color: 'text-purple-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 p-2 rounded-lg">
                    <item.icon className={`h-5 w-5 ${item.color} flex-shrink-0`} />
                    <div>
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="h-20 w-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto">
                <Rocket className="h-10 w-10 text-amber-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Ready to Grow?</h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Start designing your permaculture landscape or explore what others have created.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <a
                  href="/farm/new"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Create Your First Farm
                  <ChevronRight className="h-4 w-4" />
                </a>
                <button
                  onClick={() => {
                    finish();
                    setActiveSection('explore');
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent hover:bg-accent/80 text-sm font-medium transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Explore the Community
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={skip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {step < 3 ? 'Skip tour' : ''}
          </button>
          {step < 3 && (
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {step === 0 ? "Let's go" : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
