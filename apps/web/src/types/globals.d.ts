export {}

// Create a type for the roles
export type Roles = 'admin' | 'manufacturer' | 'distributor' | 'retailer' | 'member'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean
      role?: Roles
    }
  }
}