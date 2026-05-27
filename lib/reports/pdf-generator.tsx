import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { ReportMetrics } from './reports';

// Register standard fonts if needed, but Helvetica/Helvetica-Bold are default and safe.
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1f2937', // gray-800
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6', // gray-100
    paddingBottom: 20,
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 'auto',
    maxHeight: 40,
  },
  agencyDetails: {
    alignItems: 'flex-end',
  },
  agencyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827', // gray-900
  },
  reportSubtitle: {
    fontSize: 9,
    color: '#6b7280', // gray-500
    marginTop: 2,
  },
  titleContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  siteUrl: {
    fontSize: 12,
    color: '#3b82f6', // blue-500
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // gray-200
    paddingBottom: 5,
    marginBottom: 10,
    marginTop: 15,
  },
  executiveSummary: {
    backgroundColor: '#f9fafb', // gray-50
    borderRadius: 6,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6', // primary brand color placeholder
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 10.5,
    color: '#374151', // gray-700
    lineHeight: 1.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  cardStatus: {
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  statusPassing: {
    color: '#10b981', // green-500
  },
  statusWarning: {
    color: '#f59e0b', // yellow-500
  },
  statusCritical: {
    color: '#ef4444', // red-500
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  tableCellIssue: {
    width: '50%',
  },
  tableCellSeverity: {
    width: '15%',
    textTransform: 'capitalize',
  },
  tableCellDate: {
    width: '20%',
  },
  tableCellDuration: {
    width: '15%',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#9ca3af',
    fontSize: 8,
  },
  footerText: {
    maxWidth: '75%',
  },
});

interface PdfDocumentProps {
  metrics: ReportMetrics;
  aiSummary: string;
  branding: {
    logoUrl?: string | null;
    brandColor?: string | null;
    customFooter?: string | null;
    orgName: string;
  };
}

const MaintlyReportDocument: React.FC<PdfDocumentProps> = ({ metrics, aiSummary, branding }) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const reportDateStr = `${monthNames[metrics.month - 1]} ${metrics.year}`;
  
  // Custom theme colors
  const primaryColor = branding.brandColor || '#3b82f6';
  const customSummaryStyle = [
    styles.executiveSummary,
    { borderLeftColor: primaryColor }
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          {branding.logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={branding.logoUrl} style={styles.logo} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: primaryColor }}>
              {branding.orgName}
            </Text>
          )}
          <View style={styles.agencyDetails}>
            <Text style={styles.agencyName}>Website Care Report</Text>
            <Text style={styles.reportSubtitle}>{reportDateStr}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{metrics.siteName}</Text>
          <Text style={styles.siteUrl}>{metrics.siteUrl}</Text>
        </View>

        {/* Executive Summary */}
        <View style={customSummaryStyle}>
          <Text style={styles.summaryText}>{aiSummary}</Text>
        </View>

        {/* Metrics Section */}
        <Text style={styles.sectionTitle}>Performance & Health Metrics</Text>
        <View style={styles.grid}>
          {/* Uptime Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Website Uptime</Text>
            <Text style={styles.cardValue}>{metrics.uptimePercent}%</Text>
            <Text style={[
              styles.cardStatus,
              metrics.uptimePercent >= 99.5 ? styles.statusPassing : metrics.uptimePercent >= 98 ? styles.statusWarning : styles.statusCritical
            ]}>
              {metrics.uptimePercent >= 99.5 ? 'Excellent Uptime' : metrics.uptimePercent >= 98 ? 'Warning Uptime' : 'Critical Interruption'}
            </Text>
          </View>

          {/* Form Audits Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Contact Form Audits</Text>
            <Text style={styles.cardValue}>
              {metrics.formCheckSuccessRate !== null ? `${metrics.formCheckSuccessRate}%` : 'N/A'}
            </Text>
            <Text style={[
              styles.cardStatus,
              metrics.formCheckSuccessRate === null ? { color: '#6b7280' } : metrics.formCheckSuccessRate >= 99 ? styles.statusPassing : styles.statusWarning
            ]}>
              {metrics.formCheckSuccessRate === null
                ? 'No Form Checks Configured'
                : `${Math.round((metrics.formCheckSuccessRate / 100) * metrics.formCheckTotal)} / ${metrics.formCheckTotal} successful runs`}
            </Text>
          </View>

          {/* SSL Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>SSL Certificate</Text>
            <Text style={styles.cardValue}>
              {metrics.sslExpiryDaysLeft !== null ? `${metrics.sslExpiryDaysLeft} Days` : 'Secure'}
            </Text>
            <Text style={[
              styles.cardStatus,
              metrics.sslExpiryDaysLeft === null ? styles.statusPassing : metrics.sslExpiryDaysLeft > 30 ? styles.statusPassing : metrics.sslExpiryDaysLeft > 7 ? styles.statusWarning : styles.statusCritical
            ]}>
              {metrics.sslExpiryDaysLeft === null ? 'Certificate Valid' : metrics.sslExpiryDaysLeft > 30 ? 'Fully Secure' : 'Expiring Soon'}
            </Text>
          </View>

          {/* Tracking Pixels Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Analytics & Pixels</Text>
            <Text style={styles.cardValue}>
              {metrics.trackingPixelStatus.expected.length - metrics.trackingPixelStatus.missing.length} / {metrics.trackingPixelStatus.expected.length}
            </Text>
            <Text style={[
              styles.cardStatus,
              metrics.trackingPixelStatus.missing.length === 0 ? styles.statusPassing : styles.statusWarning
            ]}>
              {metrics.trackingPixelStatus.missing.length === 0 ? 'All Tags Active' : `${metrics.trackingPixelStatus.missing.length} Tag(s) Missing`}
            </Text>
          </View>
        </View>

        {/* Incidents Table (if any exist) */}
        {metrics.incidentList.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Maintenance & Incident Logs</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellIssue}>Service/Issue Identified</Text>
                <Text style={styles.tableCellSeverity}>Severity</Text>
                <Text style={styles.tableCellDate}>Logged Date</Text>
                <Text style={styles.tableCellDuration}>Resolution</Text>
              </View>
              {metrics.incidentList.map((incident) => (
                <View style={styles.tableRow} key={incident.id}>
                  <Text style={styles.tableCellIssue}>{incident.issue}</Text>
                  <Text style={[
                    styles.tableCellSeverity,
                    incident.severity === 'critical' ? styles.statusCritical : styles.statusWarning
                  ]}>
                    {incident.severity}
                  </Text>
                  <Text style={styles.tableCellDate}>
                    {incident.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.tableCellDuration}>
                    {incident.resolvedAt 
                      ? `Fixed (${incident.durationMinutes}m)` 
                      : 'Pending'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {branding.customFooter || `Automated care plan summary report by ${branding.orgName}.`}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

/**
 * Generates a PDF as a Node Buffer from metrics and custom agency settings.
 */
export async function generatePdfBuffer(
  metrics: ReportMetrics,
  aiSummary: string,
  branding: {
    logoUrl?: string | null;
    brandColor?: string | null;
    customFooter?: string | null;
    orgName: string;
  }
): Promise<Buffer> {
  const doc = <MaintlyReportDocument metrics={metrics} aiSummary={aiSummary} branding={branding} />;
  const stream = await pdf(doc).toBuffer();
  
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err: Error) => reject(err));
  });
}
