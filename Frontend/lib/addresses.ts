import { apiClient } from '@/lib/api/client'

export interface SavedAddress {
  id: string
  name: string
  address: string
}

interface BuyerAddressData {
  addresses: SavedAddress[]
}

async function getBuyerAddressData(): Promise<BuyerAddressData> {
  try {
    const response = await apiClient.get("/me")
    const raw = response.data?.buyer?.address
    if (!raw) return { addresses: [] }
    
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed)) {
        return { addresses: parsed }
      }
      return { addresses: parsed.addresses ?? [] }
    }
    return { addresses: [] }
  } catch {
    return { addresses: [] }
  }
}

async function saveBuyerAddressData(data: BuyerAddressData): Promise<void> {
  await apiClient.patch("/buyer/me", {
    address: JSON.stringify(data),
  })
}

export async function getAddressesFromDB(): Promise<SavedAddress[]> {
  const data = await getBuyerAddressData()
  return data.addresses
}

export async function addAddressToDB(addr: Omit<SavedAddress, "id">): Promise<SavedAddress> {
  const data = await getBuyerAddressData()
  const newAddr: SavedAddress = { 
    ...addr, 
    id: Date.now().toString() 
  }
  
  const updatedData = {
    addresses: [...data.addresses, newAddr]
  }
  
  await saveBuyerAddressData(updatedData)
  return newAddr
}

export async function deleteAddressFromDB(id: string): Promise<void> {
  const data = await getBuyerAddressData()
  const updatedData = {
    addresses: data.addresses.filter(addr => addr.id !== id)
  }
  
  await saveBuyerAddressData(updatedData)
}