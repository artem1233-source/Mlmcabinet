import { ShoppingCart, Tag, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

interface CatalogProps {
  products: any[];
  currentUserLevel: number;
  onSell: (product: any) => void;
  onSelectProduct: (product: any) => void;
}

export function CatalogNew({ products, currentUserLevel, onSell, onSelectProduct }: CatalogProps) {
  const levelLabels = ['Starter', 'Curator', 'Mentor', 'Leader'];
  
  const handleSell = (product: any) => {
    onSell(product);
    toast.success('Product sold!', {
      description: `${product.title} has been added to your orders.`
    });
  };
  
  const getPriceByLevel = (product: any, level: number) => {
    const prices = [product.price0, product.price1, product.price2, product.price3];
    return prices[level];
  };
  
  return (
    <div className="p-8" style={{ backgroundColor: '#F7FAFC' }}>
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '700' }}>
        Product Catalog
      </h1>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm mb-8 bg-white">
        <CardHeader>
          <CardTitle className="text-[#222]">Your Level: {levelLabels[currentUserLevel]}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#666]">
            As a {levelLabels[currentUserLevel]}, you can purchase products at special discounted prices and earn commissions on sales.
          </p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-3 gap-6">
        {products.map((product) => {
          const yourPrice = getPriceByLevel(product, currentUserLevel);
          const retailPrice = product.price0;
          const margin = retailPrice - yourPrice;
          
          return (
            <Card 
              key={product.sku} 
              className="border-[#E6E9EE] rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-pointer bg-white overflow-hidden"
              onClick={() => onSelectProduct(product)}
            >
              <div className="relative h-48 bg-gradient-to-br from-[#F7FAFC] to-[#E6E9EE]">
                <ImageWithFallback
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <Badge 
                  className="absolute top-4 right-4 bg-[#39B7FF] text-white border-0"
                  style={{ fontWeight: '600' }}
                >
                  {product.category}
                </Badge>
              </div>
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-[#222]">{product.title}</CardTitle>
                    <p className="text-[#666] mt-2">{product.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Tag size={14} className="text-[#666]" />
                      <span className="text-[#666]">{product.sku}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="bg-[#F7FAFC] rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[#666]">Retail Price</div>
                      <div className="text-[#222] mt-1" style={{ fontSize: '20px', fontWeight: '700' }}>
                        ₽{retailPrice.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#666]">Your Price</div>
                      <div className="text-[#39B7FF] mt-1" style={{ fontSize: '20px', fontWeight: '700' }}>
                        ₽{yourPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-[#E6E9EE]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#666]">Your margin</span>
                      <span className="text-[#12C9B6]" style={{ fontWeight: '700' }}>
                        +₽{margin.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="text-[#666]" style={{ fontWeight: '600' }}>Price Levels:</div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 bg-[#F7FAFC] rounded-lg text-center">
                      <div className="text-[#666]" style={{ fontSize: '11px' }}>L0</div>
                      <div className="text-[#222]" style={{ fontWeight: '600', fontSize: '13px' }}>₽{product.price0}</div>
                    </div>
                    <div className="p-2 bg-[#F7FAFC] rounded-lg text-center">
                      <div className="text-[#666]" style={{ fontSize: '11px' }}>L1</div>
                      <div className="text-[#222]" style={{ fontWeight: '600', fontSize: '13px' }}>₽{product.price1}</div>
                    </div>
                    <div className="p-2 bg-[#F7FAFC] rounded-lg text-center">
                      <div className="text-[#666]" style={{ fontSize: '11px' }}>L2</div>
                      <div className="text-[#222]" style={{ fontWeight: '600', fontSize: '13px' }}>₽{product.price2}</div>
                    </div>
                    <div className="p-2 bg-[#F7FAFC] rounded-lg text-center">
                      <div className="text-[#666]" style={{ fontSize: '11px' }}>L3</div>
                      <div className="text-[#222]" style={{ fontWeight: '600', fontSize: '13px' }}>₽{product.price3}</div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSell(product);
                  }}
                  className="w-full bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
                  style={{ fontWeight: '600' }}
                >
                  <ShoppingCart size={18} className="mr-2" />
                  Sell Product
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
