import React from 'react';
import { cn } from '@/lib/utils';

interface StepperProps {
  currentStep: number;
  steps: Array<{
    id: number;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

export function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="flex items-center justify-between w-full mb-8">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        const IconComponent = step.icon;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  !isActive && !isCompleted && "border-muted-foreground bg-background"
                )}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-sm mt-2 font-medium transition-colors",
                  (isActive || isCompleted) && "text-foreground",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-4 transition-colors",
                  isCompleted ? "bg-green-500" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}