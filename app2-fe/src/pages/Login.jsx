import * as React from "react"
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner" 
import AuthLayout from "./AuthLayout"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Field, FieldContent } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group"

const LoginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
})

function Login({ onRegisterClick, onLoginSuccess }) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })
  const navigate = useNavigate();
  const location = useLocation()

  React.useEffect(() => {
    if (location.state?.registrationSuccess) {
      toast.success("Registration successful! Please log in with your new account.")
      navigate(location.pathname, { replace: true, state: {} }); 
    }
  }, [location.state?.registrationSuccess])


  const apiUrl = import.meta.env.VITE_API_URL

  async function onSubmit(values) {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Login failed. Check your credentials.")
      }

      const data = await response.json()
      const token = data.token
      const user = data.user

      localStorage.setItem("authToken", token)
      localStorage.setItem("userProfile", JSON.stringify(user))

      console.log("Login successful", data)
      onLoginSuccess?.(data)
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
    <AuthLayout title="Account Log In">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          {form.formState.errors.root?.serverError && (
            <p className="text-destructive text-sm" role="alert">
              {form.formState.errors.root.serverError.message}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Logging In..." : "Log In"}
          </Button>
        </form>
      </Form>

      <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onRegisterClick()
          }}
          className="text-primary hover:underline underline-offset-4"
        >
          Register
        </a>
      </div>
    </AuthLayout>
  )
}

export default Login