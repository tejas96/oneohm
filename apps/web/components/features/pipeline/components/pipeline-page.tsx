'use client';

import { TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { FunnelChart, DrillDownDrawer, StatsCard ,type  FunnelStage as SharedFunnelStage } from '@/components/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateRangePicker,
  Typography,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

// Extends SharedFunnelStage with a count property for display
interface FunnelStage extends SharedFunnelStage {
  count: number;
}

interface Property {
  id: string;
  name: string;
  customer: string;
  value: number;
  daysInStage: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockFunnelStages: FunnelStage[] = [
  { id: 'leads', label: 'New Leads', count: 150, value: 22500000, color: '#6366F1', conversionRate: 100 },
  { id: 'qualified', label: 'Qualified', count: 95, value: 14250000, color: '#8B5CF6', conversionRate: 63.3 },
  { id: 'quoted', label: 'Quote Sent', count: 60, value: 9000000, color: '#A855F7', conversionRate: 63.2 },
  { id: 'negotiation', label: 'Negotiation', count: 35, value: 5250000, color: '#D946EF', conversionRate: 58.3 },
  { id: 'won', label: 'Won', count: 25, value: 3750000, color: '#22C55E', conversionRate: 71.4 },
];

const mockStats = {
  totalPipeline: '₹2.25 Cr',
  avgDealSize: '₹3.5 L',
  conversionRate: '16.7%',
  avgCycleTime: '28 days',
};

const mockPropertiesInStage: Record<string, Property[]> = {
  leads: [
    { id: 'p1', name: 'Green Valley Residence', customer: 'Rajesh Sharma', value: 350000, daysInStage: 2 },
    { id: 'p2', name: 'Sunset Apartments', customer: 'Priya Kulkarni', value: 450000, daysInStage: 5 },
  ],
  qualified: [
    { id: 'p3', name: 'Tech Park Office', customer: 'ABC Corp', value: 850000, daysInStage: 8 },
  ],
  quoted: [
    { id: 'p4', name: 'Farm House', customer: 'Amit Patil', value: 280000, daysInStage: 3 },
  ],
  negotiation: [
    { id: 'p5', name: 'Industrial Unit', customer: 'XYZ Manufacturing', value: 1200000, daysInStage: 12 },
  ],
  won: [
    { id: 'p6', name: 'Residential Complex', customer: 'Housing Society', value: 550000, daysInStage: 0 },
  ],
};

// ============================================================================
// Component
// ============================================================================

export function PipelinePage(): React.JSX.Element {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [salesPerson, setSalesPerson] = React.useState('all');
  const [selectedStage, setSelectedStage] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleStageClick = (stage: SharedFunnelStage) => {
    setSelectedStage(stage.id);
    setDrawerOpen(true);
  };

  const selectedStageData = selectedStage ? mockFunnelStages.find(s => s.id === selectedStage) : null;
  const propertiesInSelectedStage = selectedStage ? mockPropertiesInStage[selectedStage] || [] : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h2">Pipeline</Typography>
          <Typography variant="body" color="muted" size="sm" className="mt-1">
            Sales funnel overview and insights
          </Typography>
        </div>
        <div className="flex items-center gap-4">
          <Select value={salesPerson} onValueChange={setSalesPerson}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Salespersons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salespersons</SelectItem>
              <SelectItem value="amit">Amit Kumar</SelectItem>
              <SelectItem value="priya">Priya Sharma</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="Select date range"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          title="Total Pipeline Value"
          value={mockStats.totalPipeline}
          trend={{ value: 12, direction: 'up' }}
          icon={<TrendingUp className="size-icon text-primary" />}
        />
        <StatsCard
          title="Average Deal Size"
          value={mockStats.avgDealSize}
          trend={{ value: 5, direction: 'up' }}
          icon={<FileText className="size-icon text-info" />}
        />
        <StatsCard
          title="Win Rate"
          value={mockStats.conversionRate}
          trend={{ value: 2.3, direction: 'up' }}
          icon={<CheckCircle className="size-icon text-success" />}
        />
        <StatsCard
          title="Avg. Sales Cycle"
          value={mockStats.avgCycleTime}
          trend={{ value: 3, direction: 'down' }}
          icon={<Users className="size-icon text-warning" />}
        />
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart
            stages={mockFunnelStages}
            onStageClick={handleStageClick}
            showValues
            showConversionRates
          />
        </CardContent>
      </Card>

      {/* Stage Insights */}
      <div className="grid grid-cols-2 gap-6">
        {/* Conversion Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Stage Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockFunnelStages.map((stage, index) => {
                if (index === 0) return null;
                const prevStage = mockFunnelStages[index - 1];
                if (!prevStage) return null;
                const conversionRate = ((stage.count / prevStage.count) * 100).toFixed(1);
                return (
                  <div key={stage.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground-secondary">{prevStage.label}</span>
                      <span className="text-foreground-tertiary">→</span>
                      <span className="text-sm font-medium">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${conversionRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{conversionRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Deals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Deals in Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.values(mockPropertiesInStage).flat().slice(0, 5).map(property => (
                <div key={property.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{property.name}</p>
                    <p className="text-xs text-foreground-secondary">{property.customer}</p>
                  </div>
                  <p className="text-sm font-semibold">₹{(property.value / 100000).toFixed(1)}L</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drill Down Drawer */}
      <DrillDownDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selectedStageData?.label || ''}
        subtitle={`${selectedStageData?.count || 0} properties • ₹${((selectedStageData?.value || 0) / 100000).toFixed(1)}L`}
        items={propertiesInSelectedStage.map(property => ({
          id: property.id,
          title: property.name,
          subtitle: property.customer,
          value: `₹${(property.value / 100000).toFixed(1)}L`,
          meta: `${property.daysInStage} days in stage`,
        }))}
        searchable
        searchPlaceholder="Search properties..."
      />
    </div>
  );
}
