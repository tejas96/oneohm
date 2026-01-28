import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

/**
 * Dashboard Home Page
 * Shows overview stats and quick actions
 */
// eslint-disable-next-line import/no-default-export -- Next.js requires default export for pages
export default function DashboardPage(): React.JSX.Element {
  // Placeholder stats
  const stats = [
    { title: 'Total Leads', value: '248', change: '+12%', changeType: 'positive' },
    { title: 'Active Projects', value: '32', change: '+3', changeType: 'positive' },
    { title: 'Pending Quotes', value: '15', change: '-2', changeType: 'neutral' },
    { title: 'Revenue (MTD)', value: '₹24.5L', change: '+18%', changeType: 'positive' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back! Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'positive'
                      ? 'text-green-600'
                      : stat.changeType === 'negative'
                        ? 'text-red-600'
                        : 'text-gray-500'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest customer inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">Customer {i}</p>
                    <p className="text-xs text-muted-foreground">Added 2 hours ago</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    Hot Lead
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Your schedule for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { task: 'Site visit - Sharma Residence', time: '10:00 AM' },
                { task: 'Quote review - ABC Corp', time: '2:00 PM' },
                { task: 'Project handover - XYZ Ltd', time: '4:30 PM' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <p className="font-medium text-sm">{item.task}</p>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
