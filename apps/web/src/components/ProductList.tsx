import React from 'react';
import MtfProductCard from './MtfProductCard';
import DisProductCard from './DisProductCard';
import { Product } from '../lib/products';

type ProductListProps = {
  products: Product[];
  userRole: 'manufacturer' | 'distributor'; // Add userRole prop
};

const ProductList: React.FC<ProductListProps> = ({ products, userRole }) => {
  return (
    <div className="product-list mt-[2rem]">
      <div className='font-semibold text-4xl mb-4'>
        <h2>Products</h2>
      </div>
      <div className='flex flex-col gap-5'>
      {products.map((product) => {
        if (userRole === 'manufacturer') {
          return <MtfProductCard key={product.id} product={product}/>;
        } else if (userRole === 'distributor') {
          return <DisProductCard key={product.id} product={product} />;
        } else {
          return null; // Or a default card if the role is unknown
        }
      })}
      </div>
    </div>
  );
};

export default ProductList;