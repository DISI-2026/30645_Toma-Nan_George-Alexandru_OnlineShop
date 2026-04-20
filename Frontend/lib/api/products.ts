import type { Product } from "@/lib/types/product"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const MOCK_PRODUCTS: Record<string, Product> = {
  "1": {
    id: 1,
    title: "Laptop Gaming ASUS ROG Strix",
    slug: "laptop-gaming-asus-rog-strix",
    description: "Laptop gaming performant cu procesor Intel Core i7, 16GB RAM, SSD 512GB și placă video NVIDIA RTX 3070. Ideal pentru gaming și productivitate.",
    price: 5999.99,
    discount_percent: 15,
    stock: 10,
    is_available: true,
    avg_rating: 4.5,
    review_count: 128,
    category: { id: 1, name: "Laptopuri" },
    seller: {
      id: 1,
      company_name: "LaptopMania Romania",
      logo_url: "https://placehold.co/40x40?text=LM",
      avg_rating: 3.8,
    },
    images: [
      { id: 1, url: "https://placehold.co/600x600?text=Laptop+Front", is_thumbnail: true, order: 0 },
      { id: 2, url: "https://placehold.co/600x600?text=Laptop+Side", is_thumbnail: false, order: 1 },
      { id: 3, url: "https://placehold.co/600x600?text=Laptop+Back", is_thumbnail: false, order: 2 },
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  "2": {
    id: 2,
    title: "Telefon Samsung Galaxy S24",
    slug: "telefon-samsung-galaxy-s24",
    description: "Smartphone flagship cu ecran Dynamic AMOLED 6.2\", cameră de 50MP și baterie de 4000mAh.",
    price: 3499.00,
    discount_percent: 0,
    stock: 0,
    is_available: false,
    avg_rating: 4.2,
    review_count: 64,
    category: { id: 2, name: "Telefoane" },
    seller: {
      id: 2,
      company_name: "MobileStore",
      logo_url: "https://placehold.co/40x40?text=MS",
      avg_rating: 4.5,
    },
    images: [
      { id: 4, url: "https://placehold.co/600x600?text=Phone+Front", is_thumbnail: true, order: 0 },
      { id: 4, url: "https://placehold.co/600x600?text=Phone+Back", is_thumbnail: false, order: 1 },
      { id: 4, url: "https://placehold.co/600x600?text=Phone+Side", is_thumbnail: false, order: 2 },

    ],
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
}


 // Preia detaliile unui produs după ID.
 // Endpoint public: GET /api/v1/products/{id}
export async function getProductById(id: string): Promise<Product> {

  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    await new Promise((r) => setTimeout(r, 400))
    const mock = MOCK_PRODUCTS[id]
    if (!mock) throw new Error("Produsul nu a fost găsit sau a fost șters")
    return mock
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/products/${id}`)

    if (response.status === 404) {
      throw new Error("Produsul nu a fost găsit sau a fost șters")
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || data.detail || "Eroare la preluarea produsului")
    }

    return response.json() as Promise<Product>
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.")
  }
}
