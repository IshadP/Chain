import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Link from 'next/link';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { MoreVertical } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  description: string;
  image?: string;
  price?: number;
  status?: string;
  location?: string;
};

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
    return(
        <div>
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
                    {/* {product.badges.map((badge, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {badge}
                      </Badge>
                    ))} */}
                  </div>
                  <div className="text-xl font-semibold mb-2">{product.price}</div>
                  <div className="flex items-center gap-4">
                    <Link href="/distributor/dispatch">
                      <Button variant="outline" size="sm">
                        Recieve
                      </Button>
                    </Link>
                    <Link href="/distributor/dispatch">
                      <Button variant="outline" size="sm">
                        Dispatch
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Location:</div>
                    <div className="text-sm">{product.location}</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
            </div>
    )
}