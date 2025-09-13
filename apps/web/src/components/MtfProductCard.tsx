import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MoreVertical } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  description: string;
  image?: string;
  price?: number;
  status?: string;
  taxNo?: string;
};

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
    return(
        <div className="flex items-center gap-4 border-2 border-gray-400 rounded-lg p-4">
                  <div className="w-32 h-32 bg-white rounded-lg flex-shrink-0">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-lg mb-2">{product.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {product.status}
                      </Badge>
                    </div>
                    <div className="text-xl font-semibold">${product.price}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Tax No.</div>
                      <div className="text-sm">{product.taxNo}</div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
    )
}