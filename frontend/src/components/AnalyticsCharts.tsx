'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  overview: {
    totalCalls: number;
    totalLeads: number;
    conversionRate: number;
    avgCallDuration: number;
    totalCampaigns: number;
    successRate: number;
  };
  trends: {
    callsOverTime: Array<{ date: string; calls: number; successful: number; failed: number }>;
    leadsOverTime: Array<{ date: string; leads: number; converted: number }>;
    campaignPerformance: Array<{ campaign: string; success: number; total: number }>;
  };
  demographics: {
    callOutcomes: Array<{ outcome: string; count: number; percentage: number }>;
    callsByHour: Array<{ hour: number; calls: number }>;
    callsByDay: Array<{ day: string; calls: number }>;
  };
  performance: {
    topPerformers: Array<{ agent: string; calls: number; success: number; rate: number }>;
    campaignStats: Array<{ name: string; leads: number; called: number; success: number; status: string }>;
  };
}

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const maxCalls = Math.max(...data.trends.callsOverTime.map(d => d.calls));
  const maxLeads = Math.max(...data.trends.leadsOverTime.map(d => d.leads));
  const maxHourCalls = Math.max(...data.demographics.callsByHour.map(d => d.calls));
  const maxDayCalls = Math.max(...data.demographics.callsByDay.map(d => d.calls));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calls Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Calls Trend</CardTitle>
          <CardDescription>Daily call volume and success rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2 pt-4">
            {data.trends.callsOverTime.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col gap-1 items-end mb-2">
                  {/* Successful calls bar */}
                  <div 
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${(day.successful / maxCalls) * 160}px` }}
                    title={`Successful: ${day.successful}`}
                  ></div>
                  {/* Failed calls bar */}
                  <div 
                    className="w-full bg-red-400"
                    style={{ height: `${(day.failed / maxCalls) * 160}px` }}
                    title={`Failed: ${day.failed}`}
                  ></div>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {new Date(day.date).getDate()}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Successful</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span>Failed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Conversion */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Conversion</CardTitle>
          <CardDescription>Daily leads and conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2 pt-4">
            {data.trends.leadsOverTime.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-end mb-2 relative">
                  {/* Total leads bar */}
                  <div 
                    className="w-full bg-blue-200 rounded"
                    style={{ height: `${(day.leads / maxLeads) * 160}px` }}
                    title={`Total leads: ${day.leads}`}
                  ></div>
                  {/* Converted leads overlay */}
                  <div 
                    className="w-full bg-blue-600 rounded absolute bottom-0"
                    style={{ height: `${(day.converted / maxLeads) * 160}px` }}
                    title={`Converted: ${day.converted}`}
                  ></div>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {new Date(day.date).getDate()}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-200 rounded"></div>
              <span>Total Leads</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span>Converted</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calls by Hour */}
      <Card>
        <CardHeader>
          <CardTitle>Calls by Hour</CardTitle>
          <CardDescription>Peak calling hours during the day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-1 pt-4">
            {data.demographics.callsByHour.map((hour, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t"
                  style={{ height: `${(hour.calls / maxHourCalls) * 160}px` }}
                  title={`${hour.calls} calls at ${hour.hour}:00`}
                ></div>
                <div className="text-xs text-center text-muted-foreground mt-2">
                  {hour.hour}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calls by Day */}
      <Card>
        <CardHeader>
          <CardTitle>Calls by Day of Week</CardTitle>
          <CardDescription>Weekly calling patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2 pt-4">
            {data.demographics.callsByDay.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t"
                  style={{ height: `${(day.calls / maxDayCalls) * 160}px` }}
                  title={`${day.calls} calls on ${day.day}`}
                ></div>
                <div className="text-xs text-center text-muted-foreground mt-2 transform -rotate-45 origin-bottom">
                  {day.day.slice(0, 3)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Performance Comparison */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Campaign Success Rates</CardTitle>
          <CardDescription>Comparative performance across campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.trends.campaignPerformance.map((campaign, index) => {
              const successRate = (campaign.success / campaign.total) * 100;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{campaign.campaign}</span>
                    <span className="text-sm text-muted-foreground">
                      {campaign.success}/{campaign.total} ({successRate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${
                        successRate >= 70 ? 'bg-green-500' :
                        successRate >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${successRate}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Call Outcomes Pie Chart Representation */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Call Outcomes Distribution</CardTitle>
          <CardDescription>Visual breakdown of all call results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.demographics.callOutcomes.map((outcome, index) => {
              const colors = {
                'Appointment': 'bg-green-500',
                'Interested': 'bg-blue-500', 
                'Callback': 'bg-yellow-500',
                'Not Interested': 'bg-red-500',
                'No Answer': 'bg-gray-500'
              };
              
              return (
                <div key={index} className="text-center space-y-2">
                  <div className="relative mx-auto w-20 h-20">
                    {/* Simple circular progress representation */}
                    <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                    <div 
                      className={`absolute inset-0 rounded-full ${colors[outcome.outcome as keyof typeof colors]} opacity-80`}
                      style={{
                        background: `conic-gradient(${colors[outcome.outcome as keyof typeof colors].replace('bg-', 'var(--')} 0deg, ${colors[outcome.outcome as keyof typeof colors].replace('bg-', 'var(--')} ${outcome.percentage * 3.6}deg, transparent ${outcome.percentage * 3.6}deg)`
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{outcome.percentage}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{outcome.outcome}</p>
                    <p className="text-xs text-muted-foreground">{outcome.count} calls</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}