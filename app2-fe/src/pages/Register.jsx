import * as React from "react"
import { EyeIcon, EyeOffIcon, UserIcon, MailIcon, LockIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import AuthLayout from "./AuthLayout"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Field, FieldContent } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group"

const RegisterSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters."),
    email: z.string().email("Invalid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords do not match.",
    path: ["passwordConfirmation"],
  })

function Register({ onLoginClick, onRegisterSuccess }) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  })

  const apiUrl = import.meta.env.VITE_API_URL

  async function onSubmit(values) {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Registration failed.")
      }

      console.log("Registration successful", values)
      onRegisterSuccess?.()
    } catch (error) {
      console.error("API Error:", error.message)
      form.setError("root.serverError", {
        type: "400",
        message: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title="Register">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field, fieldState }) => (
              <Field orientation="vertical">
                <FieldContent>
                  <InputGroup>
                    <InputGroupAddon>
                      <UserIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder="Username"
                      aria-label="Username"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                  </InputGroup>
                  <FormMessage />
                </FieldContent>
              </Field>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field orientation="vertical">
                <FieldContent>
                  <InputGroup>
                    <InputGroupAddon>
                      <MailIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="email"
                      placeholder="Email"
                      aria-label="Email"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                  </InputGroup>
                  <FormMessage />
                </FieldContent>
              </Field>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field orientation="vertical">
                <FieldContent>
                  <InputGroup>
                    <InputGroupAddon>
                      <LockIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      aria-label="Password"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        size="icon-xs"
                        variant="ghost"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FormMessage />
                </FieldContent>
              </Field>
            )}
          />

          <FormField
            control={form.control}
            name="passwordConfirmation"
            render={({ field, fieldState }) => (
              <Field orientation="vertical">
                <FieldContent>
                  <InputGroup>
                    <InputGroupAddon>
                      <LockIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      type={showPassword ? "text" : "password"}
                      placeholder="Password confirmation"
                      aria-label="Password confirmation"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        size="icon-xs"
                        variant="ghost"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FormMessage />
                </FieldContent>
              </Field>
            )}
          />

          {form.formState.errors.root?.serverError && (
            <p className="text-destructive text-sm" role="alert">
              {form.formState.errors.root.serverError.message}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
          </Button>
        </form>
      </Form>

      <div className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onLoginClick()
          }}
          className="text-primary hover:underline underline-offset-4"
        >
          Log In
        </a>
      </div>
    </AuthLayout>
  )
}

export default Register