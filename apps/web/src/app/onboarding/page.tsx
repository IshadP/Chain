'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './_actions'
import { Button } from '../../components/ui/button'

const ROLES = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
]

export default function OnboardingComponent() {
  const [error, setError] = React.useState('')
  const [selectedRole, setSelectedRole] = React.useState<string | undefined>(undefined)
  const { user } = useUser()
  const router = useRouter()

  // Get the user's current role from publicMetadata
  const currentRole = user?.publicMetadata?.role as string | undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    const formData = new FormData()
    formData.set('role', selectedRole)
    const res = await completeOnboarding(formData)
    if (res?.message) {
      await user?.reload()
      // Redirect based on role
      if (selectedRole === 'manufacturer') router.push('/manufacturer')
      else router.push('/')
    }
    if (res?.error) {
      setError(res?.error)
    }
  }

  React.useEffect(() => {
    if (currentRole) setSelectedRole(currentRole)
  }, [currentRole])

  return (
    <div>
      <h1>Welcome</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Role</label>
          <p>Select your role. This cannot be changed later.</p>
          <div className="flex flex-col gap-2">
            {ROLES.map((role) => (
              <Button
                key={role.value}
                type="button"
                variant={selectedRole === role.value ? "default" : "outline"}
                onClick={() => setSelectedRole(role.value)}
                disabled={!!currentRole}
              >
                {role.label}
              </Button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-600">Error: {error}</p>}
        <Button
          type="submit"
          className="mt-4"
          disabled={!selectedRole || !!currentRole}
        >
          Continue
        </Button>
      </form>
    </div>
  )
}