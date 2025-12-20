import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const products = [
    { id: 1, name: 'Product A', price: '$99.99', stock: 45, status: 'In Stock' },
    { id: 2, name: 'Product B', price: '$149.99', stock: 23, status: 'In Stock' },
    { id: 3, name: 'Product C', price: '$79.99', stock: 0, status: 'Out of Stock' },
    { id: 4, name: 'Product D', price: '$199.99', stock: 67, status: 'In Stock' },
    { id: 5, name: 'Product E', price: '$59.99', stock: 12, status: 'Low Stock' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Link href="/dashboard/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Active in catalog</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>A list of all your products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">Stock: {product.stock} units</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">{product.price}</p>
                    <p
                      className={`text-xs ${
                        product.status === 'In Stock'
                          ? 'text-emerald-600'
                          : product.status === 'Low Stock'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {product.status}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
