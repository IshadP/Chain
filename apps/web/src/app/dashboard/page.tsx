
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Plus } from "lucide-react"
import { SignOutButton, UserButton } from "@clerk/nextjs"

const products = [
  {
    id: 1,
    name: "Glacier Bay 1.28 GPF Single Flush Round Toilet",
    price: "$4400.44",
    taxNo: "6546444616484189",
    status: "Delivered",
    badges: ["Badge", "Badge", "Badge", "Badge"],
    image: "/simple-white-toilet.png",
  },
  {
    id: 2,
    name: "HDX Black and Yellow Plastic Storage Tote",
    price: "$4400.44",
    taxNo: "6546444616484189",
    status: "Delivered",
    badges: ["Badge", "Badge", "Badge", "Badge"],
    image: "/storage-tote.png",
  },
  {
    id: 3,
    name: "Whirlpool Over the Range Microwave",
    price: "$4400.44",
    taxNo: "6546444616484189",
    status: "Delivered",
    badges: ["Badge", "Badge", "Badge", "Badge"],
    image: "/modern-microwave.png",
  },
  {
    id: 4,
    name: "Leviton Decora Smart Wi-Fi 15 Amp Light Switch",
    price: "$4400.44",
    taxNo: "6546444616484189",
    status: "Delivered",
    badges: ["Badge", "Badge", "Badge", "Badge"],
    image: "/single-pole-light-switch.png",
  },
  {
    id: 5,
    name: "Philips Sonicare ProtectiveClean 5100 Gum Health Electric Toothbrush",
    price: "$4400.44",
    taxNo: "6546444616484189",
    status: "Delivered",
    badges: ["Badge", "Badge", "Badge", "Badge"],
    image: "/electric-toothbrush.png",
  },
  {
    id: 6,
    name: "LG 5.5 cu. ft. Top Load Washer with TurboWash3D",
    price: "$4400.44",
    taxNo: "6546444616484189",
    status: "Delivered",
    badges: ["Badge", "Badge", "Badge", "Badge"],
    image: "/modern-washing-machine.png",
  },
]

const statusFilters = ["Shipped", "Shipping", "Processing", "Manufactured"]
const dayFilters = ["Today", "Yesterday", "Last Week", "Last Month"]
const typeFilters = ["Belts", "Trunks", "Tshirts"]

export default function ManufacturerPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-semibold">
              SupChain
            </Link>
            <Link href="/add-product">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button className="bg-red-400 hover:bg-red-700">
            <SignOutButton redirectURL="/"/>
            </Button>
           <UserButton/>
          </div>
        </div>
      </header>

      <div className="flex">
        

        {/* Main Content */}
        <main className="flex-1 p-6">
          <h1 className="text-2xl font-semibold mb-6">Products</h1>

          <div className="space-y-4">
            {products.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-lg mb-2">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {product.status}
                      </Badge>
                      {product.badges.map((badge, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xl font-semibold">{product.price}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Tax no.</div>
                      <div className="text-sm">{product.taxNo}</div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
