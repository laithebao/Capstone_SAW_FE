import { createContext, useContext, useMemo, useState } from 'react'
import type { Dispatch, PropsWithChildren, SetStateAction } from 'react'
import type { CatalogLot } from '@/types/order'

interface DistributorCartState {
  selectedLots: CatalogLot[]
  setSelectedLots: Dispatch<SetStateAction<CatalogLot[]>>
}

const CartContext = createContext<DistributorCartState | null>(null)

// Profile checks may temporarily unmount the route layout; the cart belongs to the account session.
export function DistributorCartProvider({ children }: PropsWithChildren) {
  const [selectedLots, setSelectedLots] = useState<CatalogLot[]>([])
  const value = useMemo(() => ({ selectedLots, setSelectedLots }), [selectedLots])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useDistributorCart() {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('Distributor cart must be used inside its provider.')
  return cart
}
