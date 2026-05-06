const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"


  export interface SellerCategory {
    id: string 
    name: string
  }

export interface SellerProfile {
  id: number
  company_name: string
  description: string | null
  logo_url: string | null
  member_since: string
  email: string
  phone: string | null
  address: string | null
  tax_id: string | null
  categories: SellerCategory[]
}

export interface SellerProfilePayload {
  company_name: string
  description: string
  phone: string
  address: string
  tax_id: string
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message
  }

  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail
  }

  return fallback
}

async function parseResponse(response: Response, fallback: string): Promise<SellerProfile> {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallback))
  }

  return data as SellerProfile
}

function appendOptional(formData: FormData, key: string, value: string): void {
  const cleaned = value.trim()
  if (cleaned) {
    formData.append(key, cleaned)
  }
}

function buildSellerFormData(payload: SellerProfilePayload, logo?: File | null): FormData {
  const formData = new FormData()
  formData.append("company_name", payload.company_name.trim())
  appendOptional(formData, "description", payload.description)
  appendOptional(formData, "phone", payload.phone)
  appendOptional(formData, "address", payload.address)
  appendOptional(formData, "tax_id", payload.tax_id)

  if (logo) {
    formData.append("logo", logo)
  }

  return formData
}

export function toBackendMediaUrl(path: string | null): string {
  if (!path) {
    return ""
  }

  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path
  }

  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export async function getSellerProfile(): Promise<SellerProfile> {
  const response = await fetch(`${API_URL}/api/v1/sellers/me`, {
    credentials: "include",
  })

  return parseResponse(response, "Nu am putut incarca profilul sellerului.")
}

export async function createSellerProfile(
  payload: SellerProfilePayload,
  logo?: File | null,
): Promise<SellerProfile> {
  const response = await fetch(`${API_URL}/api/v1/sellers/me`, {
    method: "POST",
    credentials: "include",
    body: buildSellerFormData(payload, logo),
  })

  return parseResponse(response, "Nu am putut crea profilul sellerului.")
}

export async function updateSellerProfile(
  payload: SellerProfilePayload,
  logo?: File | null,
): Promise<SellerProfile> {
  const response = await fetch(`${API_URL}/api/v1/sellers/me`, {
    method: "PATCH",
    credentials: "include",
    body: buildSellerFormData(payload, logo),
  })

  return parseResponse(response, "Nu am putut actualiza profilul sellerului.")
}
