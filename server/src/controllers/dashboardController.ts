import { Request, Response } from 'express';
import { Report } from '../models/Report.js';

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const [
      totalReports,
      submittedCount,
      underReviewCount,
      assignedCount,
      resolvedCount,
      highSeverityCount,
      mediumSeverityCount,
      lowSeverityCount,
      allReports,
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: 'Submitted' }),
      Report.countDocuments({ status: 'Under Review' }),
      Report.countDocuments({ status: 'Assigned' }),
      Report.countDocuments({ status: 'Resolved' }),
      Report.countDocuments({ severity: 'high', status: { $ne: 'Resolved' } }),
      Report.countDocuments({ severity: 'medium' }),
      Report.countDocuments({ severity: 'low' }),
      Report.find({}, 'status severity location submittedAt resolvedAt isPothole').lean(),
    ]);

    const awaitingReview = submittedCount + underReviewCount;
    const resolutionRate = totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0;

    // Calculate average resolution time for resolved reports
    const resolvedReports = allReports.filter((r) => r.status === 'Resolved' && r.resolvedAt && r.submittedAt);
    let avgResolutionTimeHours = 18.5; // default benchmark
    if (resolvedReports.length > 0) {
      const totalHours = resolvedReports.reduce((acc, r) => {
        const diff = (new Date(r.resolvedAt!).getTime() - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60);
        return acc + Math.max(diff, 1);
      }, 0);
      avgResolutionTimeHours = Math.round((totalHours / resolvedReports.length) * 10) / 10;
    }

    // Severity distribution for Recharts
    const severityDistribution = [
      { name: 'High', count: highSeverityCount, color: '#EF4444' },
      { name: 'Medium', count: mediumSeverityCount, color: '#F59E0B' },
      { name: 'Low', count: lowSeverityCount, color: '#10B981' },
    ];

    // Status distribution
    const statusDistribution = [
      { name: 'Submitted', count: submittedCount, color: '#3B82F6' },
      { name: 'Under Review', count: underReviewCount, color: '#F59E0B' },
      { name: 'Assigned', count: assignedCount, color: '#8B5CF6' },
      { name: 'Resolved', count: resolvedCount, color: '#10B981' },
    ];

    // Location distribution
    const locationCounts: Record<string, number> = {};
    allReports.forEach((r) => {
      const loc = r.location || 'Other Area';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const locationDistribution = Object.entries(locationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    res.json({
      success: true,
      data: {
        totalReports,
        awaitingReview,
        highSeverity: highSeverityCount,
        assignedRepairs: assignedCount,
        resolvedReports: resolvedCount,
        resolutionRate,
        avgResolutionTimeHours,
        severityDistribution,
        statusDistribution,
        locationDistribution,
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error calculating stats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard statistics' });
  }
}

export async function getDashboardActivity(req: Request, res: Response): Promise<void> {
  try {
    const recentReports = await Report.find({})
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const activityFeed: Array<{
      id: string;
      ticketId: string;
      action: string;
      details: string;
      actor: string;
      timestamp: Date;
      status: string;
      severity: string;
      location: string;
    }> = [];

    recentReports.forEach((r) => {
      // If report has history, add latest 2 history items
      if (r.statusHistory && r.statusHistory.length > 0) {
        const sortedHistory = [...r.statusHistory].reverse().slice(0, 2);
        sortedHistory.forEach((h, idx) => {
          activityFeed.push({
            id: `${r.ticketId}-hist-${idx}`,
            ticketId: r.ticketId,
            action: `Status: ${h.status}`,
            details: h.notes || `Report transitioned to ${h.status}`,
            actor: h.changedBy || 'Municipal System',
            timestamp: h.changedAt,
            status: h.status,
            severity: r.severity,
            location: r.location,
          });
        });
      } else {
        activityFeed.push({
          id: `${r.ticketId}-sub`,
          ticketId: r.ticketId,
          action: 'Report Submitted',
          details: `Pothole identified at ${r.location}`,
          actor: 'Citizen',
          timestamp: r.submittedAt,
          status: r.status,
          severity: r.severity,
          location: r.location,
        });
      }
    });

    // Sort all activity descending
    activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: activityFeed.slice(0, 15),
    });
  } catch (error) {
    console.error('[Dashboard] Error fetching activity feed:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve activity feed' });
  }
}
