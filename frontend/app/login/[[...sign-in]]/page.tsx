import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/30 dark:from-background dark:via-primary/10 dark:to-accent/20">
      {/* Decorative blur circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/40 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand logo and header */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-48 h-16">
              <Image
                src="/synced-sports-horizontal.svg"
                alt="SyncedSport Logo"
                fill
                className="object-contain dark:brightness-110"
                priority
              />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to manage your sports organization
            </p>
          </div>
        </div>

        {/* Login card */}
        <Card variant="elevated" className="backdrop-blur-sm bg-card/95 border-border/50">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none bg-transparent border-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "bg-secondary hover:bg-secondary/80 border border-border/50 text-foreground font-medium transition-all duration-200 hover:shadow-md",
                socialButtonsBlockButtonText: "font-medium",
                formButtonPrimary:
                  "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 font-semibold normal-case",
                formFieldInput:
                  "bg-input border-border/50 text-input-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 rounded-lg",
                formFieldLabel: "text-foreground font-medium text-sm",
                footerActionLink: "text-primary hover:text-primary/80 font-medium transition-colors",
                identityPreviewText: "text-foreground",
                identityPreviewEditButton: "text-primary hover:text-primary/80",
                formHeaderTitle: "text-foreground text-xl font-semibold",
                formHeaderSubtitle: "text-muted-foreground text-sm",
                dividerLine: "bg-border/50",
                dividerText: "text-muted-foreground text-xs",
                footer: "hidden",
                formResendCodeLink: "text-primary hover:text-primary/80 font-medium",
                otpCodeFieldInput: "border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20",
              },
              layout: {
                socialButtonsPlacement: "top",
                socialButtonsVariant: "blockButton",
              },
            }}
          />
        </Card>

        {/* Footer text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
