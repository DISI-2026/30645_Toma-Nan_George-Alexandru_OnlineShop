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
    
    role: z.enum(["client", "seller", "admin"], {
      required_error: "Selectarea rolului este obligatorie",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  })

// Type pentru datele de înregistrare
export type RegisterFormData = z.infer<typeof registerSchema>
