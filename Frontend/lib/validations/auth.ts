import { z } from "zod"

/**
 * Schema de validare pentru înregistrare
 * 
 * Validări implementate:
 * - Email: format valid, obligatoriu
 * - Parolă: minim 8 caractere, literă mare, cifră
 * - Confirmare parolă: trebuie să coincidă cu parola
 * - Full name: 2-100 caractere
 * - Rol: obligatoriu, buyer sau seller
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
      .regex(/[0-9]/, "Parola trebuie să conțină cel puțin o cifră"),
    
    confirmPassword: z
      .string()
      .min(1, "Confirmarea parolei este obligatorie"),
    
    full_name: z
      .string()
      .min(2, "Numele trebuie să aibă minim 2 caractere")
      .max(100, "Numele trebuie să aibă maxim 100 caractere"),
    
    role: z.enum(["buyer", "seller"], {
      required_error: "Selectarea rolului este obligatorie",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  })

// Type pentru datele de înregistrare
export type RegisterFormData = z.infer<typeof registerSchema>
