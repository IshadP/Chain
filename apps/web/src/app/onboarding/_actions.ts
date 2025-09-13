'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export const completeOnboarding = async (formData: FormData) => {
  const { userId } = await auth()
  if (!userId) {
    return { message: 'No Logged In User' }
  }

  const client = await clerkClient()
  try {
    // Fetch current user to check if role is already set
    const user = await client.users.getUser(userId)
    const currentRole = user.publicMetadata?.role

    // Only allow setting role if not already set
    const newMetadata: any = {
      onboardingComplete: true,
    }
    if (!currentRole) {
      newMetadata.role = formData.get('role')
    }

    const res = await client.users.updateUser(userId, {
      publicMetadata: newMetadata,
    })
    return { message: res.publicMetadata }
  } catch (err) {
    return { error: 'There was an error updating the user metadata.' }
  }
}