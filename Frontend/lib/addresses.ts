

import { getAddressesFromBuyer, saveAddressesToBuyer } from "@/lib/api/orders"

export interface SavedAddress {
  id: string
  name: string
  address: string
}

export async function getAddressesFromDB(): Promise<SavedAddress[]> {
  return getAddressesFromBuyer()
}

export async function addAddressToDB(addr: Omit<SavedAddress, "id">): Promise<SavedAddress> {
  const addresses = await getAddressesFromBuyer()
  const newAddr: SavedAddress = { ...addr, id: Date.now().toString() }
  await saveAddressesToBuyer([...addresses, newAddr])
  return newAddr
}

export async function deleteAddressFromDB(id: string): Promise<void> {
  const addresses = await getAddressesFromBuyer()
  await saveAddressesToBuyer(addresses.filter((a: SavedAddress) => a.id !== id))
}

export function getAddresses(): SavedAddress[] { return [] }
export function saveAddress(addr: Omit<SavedAddress, "id">): SavedAddress {
  return { ...addr, id: Date.now().toString() }
}
export function deleteAddress(_id: string): void {}
