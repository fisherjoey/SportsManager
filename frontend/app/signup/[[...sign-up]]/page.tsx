'use client'

import { SignUp } from '@clerk/nextjs'
import Image from 'next/image'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30 dark:from-background dark:via-primary/10 dark:to-accent/20 p-4 theme-transition">
      <div className="w-full max-w-md animate-in fade-in-50 slide-in-from-bottom-5">
        {/* Logo Header */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 relative animate-in zoom-in-50 duration-500">
              <Image
                src="/sportsync-icon.svg"
                alt="SyncedSport Logo"
                fill
                className="object-contain logo"
                priority
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SyncedSport</h1>
            <p className="text-sm text-muted-foreground mt-1">Create your sports management account</p>
          </div>
        </div>

        {/* Clerk SignUp Component */}
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-lg rounded-lg bg-card border-border",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-background hover:bg-muted border-input",
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
              formFieldInput: "bg-background border-input focus:ring-primary",
              footer: "hidden",
              footerAction: "hidden",
              footerActionLink: "hidden",
              identityPreviewText: "text-foreground",
              formFieldLabel: "text-foreground",
              formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
              formHeaderTitle: "text-foreground",
              formHeaderSubtitle: "text-muted-foreground",
              otpCodeFieldInput: "border-input",
              formResendCodeLink: "text-primary hover:text-primary/90"
            }
          }}
        />
      </div>
    </div>
  )
}
