import { apiClient } from './apiClient'
import type { ApiResponse } from '@/types/api'
export interface Category { categoryId: number; parentId: number | null; name: string; code: string; isActive: boolean; sortOrder: number }
export type SaveCategory = Omit<Category, 'categoryId'>
export async function getCategories(lookup = false): Promise<Category[]> {
  return (await apiClient.get<ApiResponse<Category[]>>(`/categories${lookup ? '/lookup' : ''}`)).data.data
}
export async function saveCategory(value: SaveCategory, id?: number) {
  return (id ? apiClient.put(`/categories/${id}`, value) : apiClient.post('/categories', value))
}
