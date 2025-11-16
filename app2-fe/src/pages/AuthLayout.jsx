import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function AuthLayout({
  className,
  title,
  description,
  children,
  onClose,
  ...props
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-black/50 p-4">
      <Card
        data-slot="auth-card"
        className={cn(
          "relative w-full max-w-md gap-0 p-0 sm:rounded-lg sm:border sm:shadow-lg",
          className
        )}
        {...props}>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground absolute right-4 top-4 size-5 transition-colors">
            <XIcon className="size-5" />
          </button>
        )}
        <CardHeader className="px-6 py-6 text-center">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-base">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <div className="flex flex-col gap-4">{children}</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuthLayout