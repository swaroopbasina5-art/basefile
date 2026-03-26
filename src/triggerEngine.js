const { analyzeStock, calculateRSI, detectSMACrossover } = require('./technicalAnalysis');

/**
 * Evaluate price-based triggers against live quotes
 */
function evaluatePriceTriggers(quotes, priceTriggers) {
  const fired = [];

  for (const trigger of priceTriggers) {
    const quote = quotes.find((q) => q.symbol === trigger.symbol);
    if (!quote || !quote.currentPrice) continue;

    const price = quote.currentPrice;
    let triggered = false;

    if (trigger.type === 'above' && price >= trigger.price) {
      triggered = true;
    } else if (trigger.type === 'below' && price <= trigger.price) {
      triggered = true;
    }

    if (triggered) {
      fired.push({
        ...trigger,
        currentPrice: price,
        triggerPrice: trigger.price,
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  return fired;
}

/**
 * Evaluate percentage change triggers
 */
function evaluatePercentChangeTriggers(quotes, percentTriggers) {
  const fired = [];

  for (const trigger of percentTriggers) {
    const targetQuotes =
      trigger.symbol === 'ALL' ? quotes : quotes.filter((q) => q.symbol === trigger.symbol);

    for (const quote of targetQuotes) {
      if (!quote || quote.changePercent === undefined) continue;

      const absChange = Math.abs(quote.changePercent);
      let triggered = false;

      if (trigger.direction === 'drop' && quote.changePercent <= -trigger.changePercent) {
        triggered = true;
      } else if (trigger.direction === 'rise' && quote.changePercent >= trigger.changePercent) {
        triggered = true;
      }

      if (triggered) {
        fired.push({
          symbol: quote.symbol,
          currentPrice: quote.currentPrice,
          changePercent: quote.changePercent,
          action: trigger.action,
          message: `${quote.symbol} ${trigger.message}`,
          triggeredAt: new Date().toISOString(),
        });
      }
    }
  }

  return fired;
}

/**
 * Evaluate technical indicator triggers
 */
function evaluateTechnicalTriggers(historicalDataMap, technicalTriggers) {
  const fired = [];

  for (const trigger of technicalTriggers) {
    const symbols =
      trigger.symbol === 'ALL'
        ? Object.keys(historicalDataMap)
        : [trigger.symbol];

    for (const symbol of symbols) {
      const history = historicalDataMap[symbol];
      if (!history || history.length < 50) continue;

      const closePrices = history.map((h) => h.close);

      if (trigger.indicator === 'RSI') {
        const rsi = calculateRSI(closePrices, trigger.params.period);
        if (rsi === null) continue;

        let triggered = false;
        if (trigger.condition === 'below' && rsi < trigger.threshold) {
          triggered = true;
        } else if (trigger.condition === 'above' && rsi > trigger.threshold) {
          triggered = true;
        }

        if (triggered) {
          fired.push({
            symbol,
            indicator: `RSI(${trigger.params.period})`,
            value: rsi.toFixed(2),
            action: trigger.action,
            message: `${symbol}: ${trigger.message} (RSI: ${rsi.toFixed(2)})`,
            triggeredAt: new Date().toISOString(),
          });
        }
      }

      if (trigger.indicator === 'SMA_CROSSOVER') {
        const crossover = detectSMACrossover(
          closePrices,
          trigger.params.shortPeriod,
          trigger.params.longPeriod
        );
        if (!crossover) continue;

        if (crossover === trigger.condition) {
          fired.push({
            symbol,
            indicator: `SMA(${trigger.params.shortPeriod}/${trigger.params.longPeriod})`,
            value: crossover,
            action: trigger.action,
            message: `${symbol}: ${trigger.message}`,
            triggeredAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return fired;
}

/**
 * Check if portfolio needs rebalancing
 */
function evaluateRebalanceTrigger(quotes, holdings, rebalanceConfig) {
  if (!rebalanceConfig.enabled) return [];

  const totalValue = holdings.reduce((sum, h) => {
    const quote = quotes.find((q) => q.symbol === h.symbol);
    const price = quote?.currentPrice || h.avgBuyPrice;
    return sum + price * h.quantity;
  }, 0);

  if (totalValue === 0) return [];

  const suggestions = [];
  let needsRebalance = false;

  for (const holding of holdings) {
    const quote = quotes.find((q) => q.symbol === holding.symbol);
    const price = quote?.currentPrice || holding.avgBuyPrice;
    const currentValue = price * holding.quantity;
    const currentWeight = (currentValue / totalValue) * 100;
    const deviation = currentWeight - holding.targetWeight;

    if (Math.abs(deviation) > rebalanceConfig.deviationThreshold) {
      needsRebalance = true;
    }

    let action = 'Hold';
    if (deviation > rebalanceConfig.deviationThreshold) {
      action = `Reduce by ~${((deviation / 100) * totalValue).toFixed(0)} (sell some)`;
    } else if (deviation < -rebalanceConfig.deviationThreshold) {
      action = `Increase by ~${((Math.abs(deviation) / 100) * totalValue).toFixed(0)} (buy more)`;
    }

    suggestions.push({
      symbol: holding.symbol,
      currentWeight,
      targetWeight: holding.targetWeight,
      deviation,
      action,
    });
  }

  return needsRebalance ? suggestions : [];
}

module.exports = {
  evaluatePriceTriggers,
  evaluatePercentChangeTriggers,
  evaluateTechnicalTriggers,
  evaluateRebalanceTrigger,
};
