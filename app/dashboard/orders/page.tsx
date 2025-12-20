import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function OrdersPage() {
  const orders = [
    {
      id: '#ORD-001',
      customer: 'John Doe',
      total: '$299.99',
      status: 'completed',
      date: '2024-01-15',
    },
    {
      id: '#ORD-002',
      customer: 'Jane Smith',
      total: '$449.99',
      status: 'processing',
      date: '2024-01-16',
    },
    {
      id: '#ORD-003',
      customer: 'Bob Johnson',
      total: '$199.99',
      status: 'pending',
      date: '2024-01-16',
    },
    {
      id: '#ORD-004',
      customer: 'Alice Brown',
      total: '$599.99',
      status: 'completed',
      date: '2024-01-17',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      processing: 'secondary',
      pending: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Manage and track all customer orders</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o) => o.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o) => o.status === 'processing').length}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o) => o.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest orders from your customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium">{order.id}</p>
                  <p className="text-sm text-muted-foreground">{order.customer}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">{order.total}</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
