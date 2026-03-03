'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Typography,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface Stat {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

interface Task {
  task: string;
  time: string;
}

/**
 * DashboardOverview Component
 * Main dashboard view with stats and quick actions
 */
export function DashboardOverview(): React.JSX.Element {
  // Placeholder stats - will be replaced with actual data hooks
  const stats: Stat[] = [
    { title: 'Total Leads', value: '248', change: '+12%', changeType: 'positive' },
    { title: 'Active Projects', value: '32', change: '+3', changeType: 'positive' },
    { title: 'Pending Quotes', value: '15', change: '-2', changeType: 'neutral' },
    { title: 'Revenue (MTD)', value: '₹24.5L', change: '+18%', changeType: 'positive' },
  ];

  const recentLeads = [
    { name: 'Sharma Residence', time: '2 hours ago', status: 'Hot Lead' },
    { name: 'ABC Industries', time: '4 hours ago', status: 'Warm Lead' },
    { name: 'XYZ Corp', time: '1 day ago', status: 'New Lead' },
  ];

  const upcomingTasks: Task[] = [
    { task: 'Site visit - Sharma Residence', time: '10:00 AM' },
    { task: 'Quote review - ABC Corp', time: '2:00 PM' },
    { task: 'Project handover - XYZ Ltd', time: '4:30 PM' },
  ];

  const getChangeColor = (type: Stat['changeType']): string => {
    switch (type) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-error';
      case 'neutral':
        return 'text-foreground-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Typography variant="h2">Dashboard</Typography>
        <Typography variant="body" color="muted" className="mt-1">
          Welcome back! Here&apos;s what&apos;s happening today.
        </Typography>
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
                <span className={cn('text-sm font-medium', getChangeColor(stat.changeType))}>
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
              {recentLeads.map((lead, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border-light last:border-0"
                >
                  <div>
                    <Typography variant="body" size="sm" weight="medium">
                      {lead.name}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      Added {lead.time}
                    </Typography>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-warning/10 text-warning">
                    {lead.status}
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
              {upcomingTasks.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border-light last:border-0"
                >
                  <Typography variant="body" size="sm" weight="medium">
                    {item.task}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {item.time}
                  </Typography>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
