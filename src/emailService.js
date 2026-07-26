const nodemailer = require('nodemailer');

let transporter = null;

function initTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

/**
 * Send an alert email
 */
async function sendAlert({ subject, body, to }) {
  const transport = initTransporter();
  const recipient = to || process.env.GMAIL_USER;

  const mailOptions = {
    from: `Portfolio Triggers <${process.env.GMAIL_USER}>`,
    to: recipient,
    subject: `[Portfolio Alert] ${subject}`,
    html: body,
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('Failed to send email:', err.message);
    throw err;
  }
}

/**
 * Format price trigger alert as HTML email
 */
function formatPriceTriggerEmail(triggers) {
  const rows = triggers
    .map(
      (t) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${t.symbol}</td>
        <td style="padding:8px;border:1px solid #ddd;">₹${t.currentPrice.toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #ddd;">₹${t.triggerPrice}</td>
        <td style="padding:8px;border:1px solid #ddd;color:${t.action === 'buy_signal' ? '#16a34a' : '#dc2626'}">
          ${t.action === 'buy_signal' ? '🟢 BUY' : '🔴 SELL'}
        </td>
        <td style="padding:8px;border:1px solid #ddd;">${t.message}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;">
      <h2 style="color:#1e40af;">📊 Price Trigger Alert</h2>
      <p>The following price triggers have been activated:</p>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;border:1px solid #ddd;">Stock</th>
            <th style="padding:8px;border:1px solid #ddd;">Current Price</th>
            <th style="padding:8px;border:1px solid #ddd;">Trigger Price</th>
            <th style="padding:8px;border:1px solid #ddd;">Signal</th>
            <th style="padding:8px;border:1px solid #ddd;">Note</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">
        Generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>`;
}

/**
 * Format percentage change alert as HTML email
 */
function formatPercentChangeEmail(alerts) {
  const rows = alerts
    .map(
      (a) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${a.symbol}</td>
        <td style="padding:8px;border:1px solid #ddd;">₹${a.currentPrice.toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #ddd;color:${a.changePercent >= 0 ? '#16a34a' : '#dc2626'}">
          ${a.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(a.changePercent).toFixed(2)}%
        </td>
        <td style="padding:8px;border:1px solid #ddd;">${a.message}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;">
      <h2 style="color:#1e40af;">📈 Percentage Change Alert</h2>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;border:1px solid #ddd;">Stock</th>
            <th style="padding:8px;border:1px solid #ddd;">Price</th>
            <th style="padding:8px;border:1px solid #ddd;">Change</th>
            <th style="padding:8px;border:1px solid #ddd;">Note</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">
        Generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>`;
}

/**
 * Format technical indicator alert as HTML email
 */
function formatTechnicalEmail(alerts) {
  const rows = alerts
    .map(
      (a) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${a.symbol}</td>
        <td style="padding:8px;border:1px solid #ddd;">${a.indicator}</td>
        <td style="padding:8px;border:1px solid #ddd;">${a.value}</td>
        <td style="padding:8px;border:1px solid #ddd;color:${a.action === 'buy_signal' ? '#16a34a' : '#dc2626'}">
          ${a.action === 'buy_signal' ? '🟢 BUY' : '🔴 SELL'}
        </td>
        <td style="padding:8px;border:1px solid #ddd;">${a.message}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;">
      <h2 style="color:#1e40af;">🔬 Technical Analysis Alert</h2>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;border:1px solid #ddd;">Stock</th>
            <th style="padding:8px;border:1px solid #ddd;">Indicator</th>
            <th style="padding:8px;border:1px solid #ddd;">Value</th>
            <th style="padding:8px;border:1px solid #ddd;">Signal</th>
            <th style="padding:8px;border:1px solid #ddd;">Note</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">
        Generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>`;
}

/**
 * Format rebalance suggestion email
 */
function formatRebalanceEmail(suggestions) {
  const rows = suggestions
    .map(
      (s) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${s.symbol}</td>
        <td style="padding:8px;border:1px solid #ddd;">${s.currentWeight.toFixed(1)}%</td>
        <td style="padding:8px;border:1px solid #ddd;">${s.targetWeight}%</td>
        <td style="padding:8px;border:1px solid #ddd;color:${s.deviation > 0 ? '#dc2626' : '#16a34a'}">
          ${s.deviation > 0 ? '+' : ''}${s.deviation.toFixed(1)}%
        </td>
        <td style="padding:8px;border:1px solid #ddd;">${s.action}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;">
      <h2 style="color:#1e40af;">⚖️ Portfolio Rebalance Suggestion</h2>
      <p>Your portfolio weights have drifted beyond the configured threshold:</p>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;border:1px solid #ddd;">Stock</th>
            <th style="padding:8px;border:1px solid #ddd;">Current %</th>
            <th style="padding:8px;border:1px solid #ddd;">Target %</th>
            <th style="padding:8px;border:1px solid #ddd;">Deviation</th>
            <th style="padding:8px;border:1px solid #ddd;">Suggestion</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">
        Generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>`;
}

const FLOOD_RISK_COLORS = {
  minimal: '#16a34a',
  low: '#65a30d',
  moderate: '#d97706',
  high: '#ea580c',
  severe: '#dc2626',
};

/**
 * Format rainfall trigger alert as HTML email
 */
function formatRainfallEmail(alerts) {
  const rows = alerts
    .map((a) => {
      const riskColor = FLOOD_RISK_COLORS[a.floodRisk?.level] || '#6b7280';
      return `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${a.location}</td>
        <td style="padding:8px;border:1px solid #ddd;">${a.summary.totalMm}mm</td>
        <td style="padding:8px;border:1px solid #ddd;">${a.summary.maxHourlyMm}mm/hr</td>
        <td style="padding:8px;border:1px solid #ddd;color:${riskColor};font-weight:bold;">
          ${(a.floodRisk?.level || 'unknown').toUpperCase()}
        </td>
        <td style="padding:8px;border:1px solid #ddd;">${a.message}</td>
      </tr>`;
    })
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;">
      <h2 style="color:#1e40af;">🌧️ Rainfall Trigger Alert (Next 12 Hours)</h2>
      <p>The following locations have crossed configured rainfall thresholds:</p>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;border:1px solid #ddd;">Location</th>
            <th style="padding:8px;border:1px solid #ddd;">12h Total</th>
            <th style="padding:8px;border:1px solid #ddd;">Peak Intensity</th>
            <th style="padding:8px;border:1px solid #ddd;">Flood Risk</th>
            <th style="padding:8px;border:1px solid #ddd;">Note</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">
        Generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>`;
}

/**
 * Format street/urban flood risk alert as HTML email
 */
function formatFloodRiskEmail(alerts) {
  const rows = alerts
    .map((a) => {
      const riskColor = FLOOD_RISK_COLORS[a.floodRisk?.level] || '#6b7280';
      return `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${a.location}</td>
        <td style="padding:8px;border:1px solid #ddd;color:${riskColor};font-weight:bold;">
          ${a.floodRisk.level.toUpperCase()}
        </td>
        <td style="padding:8px;border:1px solid #ddd;">${a.floodRisk.reason}</td>
        <td style="padding:8px;border:1px solid #ddd;">${a.summary.totalMm}mm / ${a.summary.maxHourlyMm}mm/hr</td>
      </tr>`;
    })
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;">
      <h2 style="color:#dc2626;">🌊 Street Flooding Risk Alert</h2>
      <p>Rainfall forecasts indicate possible street/urban flooding in the next 12 hours:</p>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px;border:1px solid #ddd;">Location</th>
            <th style="padding:8px;border:1px solid #ddd;">Risk Level</th>
            <th style="padding:8px;border:1px solid #ddd;">Reason</th>
            <th style="padding:8px;border:1px solid #ddd;">12h Total / Peak</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">
        Generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
      </p>
    </div>`;
}

module.exports = {
  sendAlert,
  formatPriceTriggerEmail,
  formatPercentChangeEmail,
  formatTechnicalEmail,
  formatRebalanceEmail,
  formatRainfallEmail,
  formatFloodRiskEmail,
};
