"use client"

import { useState } from "react"
import { ArrowLeft, CreditCard, Shield, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"

const cartItems = [
  {
    id: 1,
    name: "Wireless Bluetooth Headphones",
    price: 79.99,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop",
    seller: "TechGear Pro",
  },
  {
    id: 2,
    name: "USB-C Fast Charger",
    price: 24.99,
    quantity: 2,
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=100&h=100&fit=crop",
    seller: "TechGear Pro",
  },
]

export default function CheckoutPage() {
  const [step, setStep] = useState(1)
  const [shippingMethod, setShippingMethod] = useState("standard")
  const [paymentMethod, setPaymentMethod] = useState("card")

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = shippingMethod === "express" ? 9.99 : 0
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  const renderStep1 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="John" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Doe" />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="123 Main Street" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="New York" />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="NY" />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" placeholder="10001" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Options</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={shippingMethod} onValueChange={setShippingMethod}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="standard" id="standard" />
              <div className="flex-1">
                <Label htmlFor="standard" className="font-medium">
                  Standard Delivery
                </Label>
                <p className="text-sm text-gray-600">5-7 business days • FREE</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="express" id="express" />
              <div className="flex-1">
                <Label htmlFor="express" className="font-medium">
                  Express Delivery
                </Label>
                <p className="text-sm text-gray-600">2-3 business days • $9.99</p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <RadioGroupItem value="card" id="card" />
            <CreditCard className="w-5 h-5" />
            <Label htmlFor="card" className="font-medium">
              Credit/Debit Card
            </Label>
          </div>
        </RadioGroup>

        {paymentMethod === "card" && (
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input id="expiry" placeholder="MM/YY" />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" placeholder="123" />
              </div>
            </div>
            <div>
              <Label htmlFor="cardName">Name on Card</Label>
              <Input id="cardName" placeholder="John Doe" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Order Confirmed!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Thank you for your order!</h3>
            <p className="text-gray-600 mb-4">Order #TM-2024-001234</p>
            <p className="text-sm text-gray-600">
              You'll receive an email confirmation shortly with tracking information.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
            <h1 className="text-2xl font-bold">Checkout</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Progress Steps */}
            <div className="flex items-center mb-8">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepNumber ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step > stepNumber ? <Check className="w-4 h-4" /> : stepNumber}
                  </div>
                  <div className={`ml-2 text-sm ${step >= stepNumber ? "text-blue-600" : "text-gray-600"}`}>
                    {stepNumber === 1 ? "Shipping" : stepNumber === 2 ? "Payment" : "Confirmation"}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`w-16 h-0.5 mx-4 ${step > stepNumber ? "bg-blue-600" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Navigation Buttons */}
            {step < 3 && (
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
                  Previous
                </Button>
                <Button onClick={() => setStep(Math.min(3, step + 1))} className="bg-blue-600 hover:bg-blue-700">
                  {step === 2 ? "Place Order" : "Continue"}
                </Button>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium line-clamp-2">{item.name}</h4>
                        <p className="text-xs text-gray-600">by {item.seller}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                          <span className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Pricing Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Trust & Security */}
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Secure Checkout</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">Your payment information is encrypted and secure</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
