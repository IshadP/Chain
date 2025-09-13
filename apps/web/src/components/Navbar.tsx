"use client"

import { useUser } from '@clerk/nextjs'
import { Button } from "./ui/button";
import Link from "next/link"
import { SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import {
  Plus,
  MoveRight,
} from "lucide-react";


export default function UserNav() {
  const router = useRouter();

  const { user, isLoaded } = useUser();
  const userRole = user?.publicMetadata?.role
  console.log(userRole)

  const handleAddProduct = () => {
  router.push('/addproductpage');
};
    return (
        <div className="flex w-full items-center justify-between p-8 ">
          <div className="flex items-center gap-8 ">
            <Link href="/" className="text-xl font-semibold">
              SupChain
            </Link>
            {(userRole === 'manufacturer') && (
              <Link href="/addproductpage">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
            </Link>
        )}
         {(userRole === 'distributor') && (
            <Button className="bg-blue-700 hover:bg-blue-900 text-white" onClick={handleAddProduct}>
              <Plus className="w-4 h-4 mr-2" />
              ReInventory
            </Button>
        )}
          </div>
          <div className="flex items-center gap-4">
             <SignedOut>
              <SignInButton />
              <SignUpButton>
                <button className="bg-[#6c47ff] text-ceramic-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignInButton>
              <UserButton/>
            </SignInButton>
          </div>
        </div>
    )
}