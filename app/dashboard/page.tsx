'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth-client';
import type { User } from '@/lib/db';
import { Activity, CreditCard, DollarSign, Users, TrendingUp, Package } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231.89',
      change: '+20.1% from last month',
      icon: DollarSign,
    },
    {
      title: 'Active Users',
      value: '+2,350',
      change: '+180.1% from last month',
      icon: Users,
    },
    {
      title: 'Sales',
      value: '+12,234',
      change: '+19% from last month',
      icon: CreditCard,
    },
    {
      title: 'Active Products',
      value: '+573',
      change: '+201 since last hour',
      icon: Package,
    },
  ];

  const recentActivity = [
    { id: 1, action: 'New order placed', time: '2 minutes ago', icon: Activity },
    { id: 2, action: 'User registration', time: '5 minutes ago', icon: Users },
    { id: 3, action: 'Product added', time: '10 minutes ago', icon: Package },
    { id: 4, action: 'Payment received', time: '15 minutes ago', icon: DollarSign },
    { id: 5, action: 'New order placed', time: '20 minutes ago', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Selamat datang, {user?.nama || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Berikut adalah ringkasan aktivitas hari ini.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - Revenue over time
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <activity.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Your performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Conversion Rate</span>
                </div>
                <span className="text-sm font-bold">3.24%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Avg. Order Value</span>
                </div>
                <span className="text-sm font-bold">$127.45</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Customer Retention</span>
                </div>
                <span className="text-sm font-bold">92%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best selling items this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Product A', 'Product B', 'Product C'].map((product, index) => (
                <div key={product} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{product}</span>
                  </div>
                  <span className="text-sm font-bold">${(1234 - index * 123).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
