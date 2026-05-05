
export interface SavedAddress {
  id: string
  name: string      
  address: string
}

const KEY = "saved_addresses"

export function getAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveAddress(addr: Omit<SavedAddress, "id">): SavedAddress {
  const addresses = getAddresses()
  const newAddr: SavedAddress = { ...addr, id: Date.now().toString() }
  localStorage.setItem(KEY, JSON.stringify([...addresses, newAddr]))
  return newAddr
}

export function deleteAddress(id: string): void {
  const addresses = getAddresses().filter((a) => a.id !== id)
  localStorage.setItem(KEY, JSON.stringify(addresses))
}
