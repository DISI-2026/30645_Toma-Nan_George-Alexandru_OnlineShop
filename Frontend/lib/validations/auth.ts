import { z } from "zod"

/**
 * Schema de validare pentru înregistrare
 * 
 * Validări implementate:
 * - Email: format valid, obligatoriu
 * - Parolă: minim 8 caractere, literă mare, literă mică, cifră, caracter special
 * - Confirmare parolă: trebuie să coincidă cu parola
 * - Rol: obligatoriu, una din valorile permise
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email-ul este obligatoriu")
      .email("Adresa de email nu este validă"),
    
    password: z
      .string()
      .min(8, "Parola trebuie să aibă minim 8 caractere")
      .regex(/[A-Z]/, "Parola trebuie să conțină cel puțin o literă mare")
      .regex(/[a-z]/, "Parola trebuie să conțină cel puțin o literă mică")
      .regex(/[0-9]/, "Parola trebuie să conțină cel puțin o cifră")
      .regex(/[^A-Za-z0-9]/, "Parola trebuie să conțină cel puțin un caracter special"),
    
    confirmPassword: z
      .string()
      .min(1, "Confirmarea parolei este obligatorie"),
    
    role: z.enum(["buyer", "seller"], {
      required_error: "Selectarea rolului este obligatorie",
    }),
    address: z.string().max(500, "Adresa trebuie sa aiba maxim 500 caractere").optional(),
    company_name: z.string().max(255, "Numele companiei trebuie sa aiba maxim 255 caractere").optional(),
    description: z.string().max(4000, "Descrierea trebuie sa aiba maxim 4000 caractere").optional(),
  })
  .refine((data) => data.role !== "seller" || Boolean(data.company_name?.trim()), {
    message: "Numele companiei este obligatoriu pentru seller",
    path: ["company_name"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  })

// Type pentru datele de înregistrare
export type RegisterFormData = z.infer<typeof registerSchema>

/**
 * Schema de validare pentru autentificare
 * 
 * Validări implementate:
 * - Email: format valid, obligatoriu
 * - Parolă: obligatorie
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email-ul este obligatoriu")
    .email("Adresa de email nu este validă"),
  
  password: z
    .string()
    .min(1, "Parola este obligatorie"),
})

// Type pentru datele de autentificare
export type LoginFormData = z.infer<typeof loginSchema>
