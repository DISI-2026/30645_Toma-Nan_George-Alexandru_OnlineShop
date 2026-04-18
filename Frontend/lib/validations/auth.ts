import { z } from "zod"

/**
 * Schema de validare pentru înregistrare
 * Câmpuri comune + câmpuri specifice per rol
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

    role: z.enum(["buyer", "seller"], {
      required_error: "Selectarea rolului este obligatorie",
    }),

    // Buyer fields
    address: z.string().optional(),

    // Seller fields
    company_name: z.string().optional(),
    description: z.string().optional(),
    logo_url: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "buyer") {
        return data.address && data.address.length > 0
      }
      return true
    },
    {
      message: "Adresa este obligatorie pentru buyer",
      path: ["address"],
    }
  )
  .refine(
    (data) => {
      if (data.role === "seller") {
        return data.company_name && data.company_name.length > 0
      }
      return true
    },
    {
      message: "Numele companiei este obligatoriu pentru seller",
      path: ["company_name"],
    }
  )

export type RegisterFormData = z.infer<typeof registerSchema>
