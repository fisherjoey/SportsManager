import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "shadow-lg rounded-lg",
            footer: "hidden",
            footerAction: "hidden",
            footerActionLink: "hidden"
          }
        }}
      />
    </div>
  )
}
