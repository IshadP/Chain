'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { completeOnboarding } from './_actions'

// Shadcn UI component imports
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
// Correct Lucide icons for the new roles
import { Factory, Truck, Store } from 'lucide-react'

// 1. Updated the Role type for the new business logic
type Role = 'manufacturer' | 'distributor' | 'retailer'

// The submit button component remains the same
function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={disabled || pending} className="w-full">
      {pending ? 'Finalizing...' : 'Choose Role'}
    </Button>
  )
}

export default function OnboardingComponent() {
  const [error, setError] = React.useState<string | undefined>('')
  const [selectedRole, setSelectedRole] = React.useState<Role | ''>('')
  const { user } = useUser()
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    setError(undefined)
    const result = await completeOnboarding(formData)
      await user?.reload()
      router.push('/dashboard')
    if (result?.error) {
      setError(result.error)
    }
  }

  // 2. Updated the roles array with new labels and correct Lucide icons
  const roles: { id: Role; label: string; icon: React.ElementType }[] = [
    { id: 'manufacturer', label: 'Manufacturer', icon: Factory },
    { id: 'distributor', label: 'Distributor', icon: Truck },
    { id: 'retailer', label: 'Retailer', icon: Store },
  ]

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Select Your Role</CardTitle>
        <CardDescription>
          This will determine your permissions across the application.
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent>
          <ToggleGroup
            type="single"
            value={selectedRole}
            onValueChange={(value: Role | '') => {
              if (value) setSelectedRole(value)
            }}
            className="grid grid-cols-3 gap-4"
          >
            {roles.map((role) => {
              // 3. Correctly render the icon component dynamically
              const Icon = role.icon
              return (
                <ToggleGroupItem
                  key={role.id}
                  value={role.id}
                  className="h-auto flex-col p-4"
                  aria-label={role.label}
                >
                  <Icon className="h-6 w-6" />
                  <span className="mt-2 font-semibold">{role.label}</span>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>

          <input type="hidden" name="role" value={selectedRole} />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <SubmitButton disabled={!selectedRole} />
          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
