"use client"

import React from "react"
import { Edit, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Definim structura unui produs
export interface Product {
  id: number;
  title: string;
  category: string;
  price: string;
  stock: string;
  //campuri optionale
  description?: string;
  images?: string[];
}

interface SellerProductsProps {
  products: Product[];
  onViewDetails: (product: Product) => void;    //functie de vizualizare detalii in pop-up
  onDeleteProduct: (productId: number) => void; //functie de stergere a unui produs
  onEditProduct: (product: Product) => void;    //functie de editare a unui produs
}

export default function SellerProducts({ products, onViewDetails, onDeleteProduct, onEditProduct }: SellerProductsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-2">
      <table className="w-full text-left border-collapse">
        {/* coloane tabel products */}
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="p-4 font-semibold text-sm text-slate-500 uppercase tracking-wider">Produs</th>
            <th className="p-4 font-semibold text-sm text-slate-500 uppercase tracking-wider text-right w-32">Meniu</th>
          </tr>
        </thead>

        {/* linii tabel products */}
        <tbody className="divide-y divide-slate-100">
          {products && products.length > 0 ? (
            products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 text-slate-900 font-medium">{product.title}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* buton afisare pop-up detalii produs*/}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                      onClick={() => onViewDetails(product)}
                    >
                      <Eye className="w-4 h-4 sm:mr-2" /> 
                      <span className="hidden sm:inline">Detalii</span>
                    </Button>

                    {/* buton pop-up editare date produs */} 
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      onClick={() => onEditProduct(product)}
                    >
                      <Edit className="w-4 h-4 sm:mr-2" /> 
                      <span className="hidden sm:inline">Editare</span>
                    </Button>

                    {/* buton stergere produs */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => onDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4 sm:mr-2" /> 
                      <span className="hidden sm:inline">Ștergere</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            // tabela de products goala
            <tr>
              <td colSpan={2} className="p-12 text-center">
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <p className="italic">No products listed yet.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}