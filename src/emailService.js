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

/**
 * Format market intelligence report as HTML email
 */
function formatIntelligenceEmail(reports) {
  const stockSections = reports
    .map((r) => {
      const scoreColor =
        r.intelligence.score >= 20 ? '#16a34a' :
        r.intelligence.score <= -20 ? '#dc2626' : '#d97706';

      const patternsHtml = r.candlestickPatterns.length > 0
        ? r.candlestickPatterns
            .map((p) => `<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:12px;font-size:11px;background:${p.type === 'bullish' ? '#dcfce7' : p.type === 'bearish' ? '#fecaca' : '#fef3c7'};color:${p.type === 'bullish' ? '#166534' : p.type === 'bearish' ? '#991b1b' : '#92400e'}">${p.name} ${'★'.repeat(p.strength)}</span>`)
            .join(' ')
        : '<span style="color:#9ca3af;">No significant patterns</span>';

      const fibHtml = r.fibonacci
        ? `<div style="margin:4px 0;font-size:12px;color:#6b7280;">Fib Zone: ${r.fibonacci.zone}</div>`
        : '';

      const volHtml = r.volume
        ? `<div style="font-size:12px;">Vol: ${r.volume.volumeRatio}x avg — ${r.volume.description}</div>`
        : '';

      const trendHtml = r.trendStrength
        ? `<div style="font-size:12px;">Trend: ${r.trendStrength.description}</div>`
        : '';

      const srHtml = r.supportResistance
        ? `<div style="font-size:12px;">
             Support: ${r.supportResistance.supports.map((s) => '₹' + s.toFixed(2)).join(', ') || 'N/A'} |
             Resistance: ${r.supportResistance.resistances.map((s) => '₹' + s.toFixed(2)).join(', ') || 'N/A'}
           </div>`
        : '';

      const pivotHtml = r.pivotPoints
        ? `<div style="font-size:12px;">Pivot: ₹${r.pivotPoints.standard.pivot.toFixed(2)} | S1: ₹${r.pivotPoints.standard.s1.toFixed(2)} | R1: ₹${r.pivotPoints.standard.r1.toFixed(2)}</div>`
        : '';

      const rsiVal = r.technicalIndicators.rsi;
      const rsiColor = rsiVal < 30 ? '#16a34a' : rsiVal > 70 ? '#dc2626' : '#6b7280';

      return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="margin:0;color:#1e293b;">${r.symbol} — ₹${r.currentPrice.toFixed(2)}</h3>
          <div style="text-align:right;">
            <span style="font-size:24px;font-weight:bold;color:${scoreColor};">${r.intelligence.score > 0 ? '+' : ''}${r.intelligence.score}</span>
            <div style="font-size:14px;font-weight:bold;color:${scoreColor};">${r.intelligence.recommendation}</div>
          </div>
        </div>

        <div style="margin-bottom:8px;">
          <strong>Candlestick Patterns:</strong><br/>${patternsHtml}
        </div>

        <div style="margin-bottom:8px;font-size:12px;">
          <strong>Indicators:</strong>
          RSI: <span style="color:${rsiColor}">${rsiVal?.toFixed(1) || 'N/A'}</span> |
          SMA20: ₹${r.technicalIndicators.sma20?.toFixed(2) || 'N/A'} |
          SMA50: ₹${r.technicalIndicators.sma50?.toFixed(2) || 'N/A'} |
          MACD: ${r.technicalIndicators.macd?.histogram?.toFixed(2) || 'N/A'}
        </div>

        ${srHtml}
        ${pivotHtml}
        ${fibHtml}
        ${volHtml}
        ${trendHtml}

        <div style="margin-top:8px;padding:8px;background:#f8fafc;border-radius:4px;font-size:11px;">
          <strong>Score Breakdown:</strong> ${r.intelligence.reasons.join(' | ')}
        </div>
      </div>`;
    })
    .join('');

  // Summary section - top buys and sells
  const sorted = [...reports].sort((a, b) => b.intelligence.score - a.intelligence.score);
  const topBuys = sorted.filter((r) => r.intelligence.score >= 10).slice(0, 5);
  const topSells = sorted.filter((r) => r.intelligence.score <= -10).slice(0, 5);

  const summaryHtml = `
    <div style="margin-bottom:20px;padding:16px;background:#f0fdf4;border-radius:8px;">
      <h3 style="margin:0 0 8px;color:#166534;">🟢 Top Buy Signals</h3>
      ${topBuys.length > 0
        ? topBuys.map((r) => `<div>${r.symbol}: Score ${r.intelligence.score} — ${r.intelligence.recommendation}</div>`).join('')
        : '<div style="color:#6b7280;">No strong buy signals today</div>'}
    </div>
    <div style="margin-bottom:20px;padding:16px;background:#fef2f2;border-radius:8px;">
      <h3 style="margin:0 0 8px;color:#991b1b;">🔴 Top Sell Signals</h3>
      ${topSells.length > 0
        ? topSells.map((r) => `<div>${r.symbol}: Score ${r.intelligence.score} — ${r.intelligence.recommendation}</div>`).join('')
        : '<div style="color:#6b7280;">No strong sell signals today</div>'}
    </div>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:700px;">
      <h2 style="color:#1e40af;">🧠 Market Intelligence Report</h2>
      <p style="color:#6b7280;">Full analysis with candlestick patterns, technical indicators, support/resistance, Fibonacci levels, volume analysis, and trend strength.</p>

      ${summaryHtml}

      <h3 style="color:#1e293b;">Detailed Stock Analysis</h3>
      ${stockSections}

      <p style="color:#6b7280;font-size:12px;margin-top:16px;">
        Generated at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br/>
        <em>This is not financial advice. Always do your own research before trading.</em>
      </p>
    </div>`;
}

module.exports = {
  sendAlert,
  formatPriceTriggerEmail,
  formatPercentChangeEmail,
  formatTechnicalEmail,
  formatRebalanceEmail,
  formatIntelligenceEmail,
};
