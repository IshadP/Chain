// Location: app/dashboard/page.tsx
"use client"; // This directive is now needed for useState

import { useState } from "react";
import {
  Card,
  CardContent,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  PlusCircle,
  MoreVertical,
  User,
  ArrowRight,
  Menu, // New Icon
  X, // New Icon
} from "lucide-react";

// Mock data remains the same
const products = [
  {
    title: "High-Performance Electric Motor",
    status: "Delivered",
    tags: ["Electronics", "Industrial", "High-Torque"],
    price: "4400.44",
    taxNo: "65464446164849189",
  },
  {
    title: "Advanced Sensor Array",
    status: "Shipped",
    tags: ["Sensors", "IoT", "Precision"],
    price: "1250.00",
    taxNo: "89347589347598347",
  },
  {
    title: "Carbon Fiber Chassis",
    status: "Processing",
    tags: ["Materials", "Automotive", "Lightweight"],
    price: "8900.50",
    taxNo: "23459823475982347",
  },
];

// Main Page Component
export default function DashboardPage() {
  // State to manage sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Function to toggle the sidebar state
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="bg-gray-50/50 min-h-screen">
      <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <main className="p-4 sm:p-6 md:p-8">
        {/* The grid layout is now dynamic */}
        <div className={`grid grid-cols-1 ${isSidebarOpen ? "lg:grid-cols-3" : "lg:grid-cols-1"} gap-8`}>
          {/* Main content area expands when sidebar is closed */}
          <div className={isSidebarOpen ? "lg:col-span-2" : "lg:col-span-3"}>
            <h1 className="text-3xl font-bold tracking-tight mb-6">Products</h1>
            <div className="space-y-4">
              {products.map((product, index) => (
                <ProductCard key={index} product={product} />
              ))}
            </div>
          </div>
          {/* Sidebar is conditionally rendered */}
          {isSidebarOpen && (
            <div className="lg:col-span-1">
              <UserProfileSidebar onClose={toggleSidebar} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---- Reusable Components ----

// 1. Header Component (Updated with new props)
function Header({ onToggleSidebar, isSidebarOpen }: { onToggleSidebar: () => void; isSidebarOpen: boolean }) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-4">
        {/* This button shows only when the sidebar is closed */}
        {!isSidebarOpen && (
          <Button onClick={onToggleSidebar} variant="outline" size="icon">
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="flex items-center gap-2">
          Profile <User className="h-4 w-4" />
        </Button>
        <Button variant="destructive">Log Out</Button>
      </div>
    </header>
  );
}

// 2. Product Card Component (No changes)
function ProductCard({ product }: { product: (typeof products)[0] }) {
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered": return "default";
      case "shipped": return "secondary";
      case "processing": return "outline";
      default: return "destructive";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant={getStatusVariant(product.status)}>{product.status}</Badge>
              {product.tags.map((tag, i) => (
                <Badge key={i} variant="outline">{tag}</Badge>
              ))}
            </div>
            <p className="text-2xl font-bold text-gray-800">${product.price}</p>
          </div>
          <ProductActions />
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">Tax no. {product.taxNo}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// 3. Dropdown Menu for Product Actions (No changes)
function ProductActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>View Details</DropdownMenuItem>
        <DropdownMenuItem>Update Status</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-500">Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 4. User Profile Sidebar Component (Updated with close button)
function UserProfileSidebar({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 pt-4 flex flex-col items-center text-center relative">
          {/* Close button added here */}
          <Button onClick={onClose} variant="ghost" size="icon" className="absolute top-2 right-2">
            <X className="h-4 w-4" />
          </Button>
          <Avatar className="w-24 h-24 mb-4 mt-6">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <h3 className="text-2xl font-semibold">John Doe</h3>
          <p className="text-sm text-gray-500">Company Name</p>
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full justify-between">
        Manage All Products
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
