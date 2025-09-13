export type Product = {
  id: string;
  name: string;
  description: string;
  image?: string;
  price?: number;
  status?: string;
  taxNo?: string;
};

export const products: Product[] = [
  {
    id: '1',
    name: 'Apple MacBook Pro 16"',
    description: 'Apple M3 Pro chip, 16GB RAM, 1TB SSD, Space Black.',
    image: '/images/macbookpro.jpg',
    price: 2499.99,
    status: 'In Stock',
    taxNo: 'MAC123456',
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    description: '6.8" QHD+ AMOLED, 12GB RAM, 256GB, Phantom Black.',
    image: '/images/24ultra.jpg',
    price: 1199.99,
    status: 'In Stock',
    taxNo: 'SAM987654',
  },
  {
    id: '3',
    name: 'Sony WH-1000XM5 Headphones',
    description: 'Wireless Noise Cancelling Over-Ear Headphones, Black.',
    image: '/images/sonyheads.jpg',
    price: 399.99,
    status: 'Out of Stock',
    taxNo: 'SONY555888',
  },
  {
    id: '4',
    name: 'Dell XPS 13 Plus',
    description: '13.4" FHD+, Intel Core i7, 16GB RAM, 512GB SSD.',
    image: '/images/XPSultra.jpg',
    price: 1499.99,
    status: 'In Stock',
    taxNo: 'DELL333222',
  },
  {
    id: '5',
    name: 'Apple iPad Pro 12.9"',
    description: 'M4 chip, 256GB, Wi-Fi, Space Gray.',
    image: '/images/ipadpro.jpg',
    price: 1099.99,
    status: 'In Stock',
    taxNo: 'IPAD444777',
  },
];