import Image from "next/image";
import Navbar from "../components/Navbar";
import ProductList from "../components/ProductList";
import ProductCard from "../components/MtfProductCard";
import { products } from '../lib/products';

const dummyProduct = {
  id: '1',
  name: 'Sample Product',
  description: 'This is a sample product for testing.',
  image: '/placeholder.svg',
  price: 199.99,
  status: 'In Stock',
  taxNo: '1234567890',
};

export default function Home() {
  return (
    <div className="font-sans flex flex-col">
      Main
    </div>
  );
}
