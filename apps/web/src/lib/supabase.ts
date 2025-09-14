// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Product {
  id: string
  user_id: string // Clerk user ID
  name: string
  image?: string
  cost: number
  batch_id?: string // Optional blockchain batch ID
  description?: string
  category?: string
  created_at: string
  updated_at: string
}

// Service class for Supabase operations
export class SupabaseService {
  static async getProductsByUserId(userId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching products:', error)
      return []
    }
  }

  static async getProductByBatchId(batchId: string, userId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('batch_id', batchId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching product by batch ID:', error)
      return null
    }
  }

  static async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating product:', error)
      return null
    }
  }

  static async updateProduct(id: string, updates: Partial<Product>, userId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId) // Ensure user can only update their own products
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating product:', error)
      return null
    }
  }

  static async deleteProduct(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', userId) // Ensure user can only delete their own products

      if (error) {
        console.error('Supabase error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting product:', error)
      return false
    }
  }
}