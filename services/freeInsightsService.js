exports.generateFreeInsights = (orders = []) => {
  if (!orders.length) {
    return "No orders found. Start adding sales to generate insights.";
  }

  const totalOrders = orders.length;

  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.totalPrice || 0),
    0
  );

  const avgOrderValue = totalRevenue / totalOrders;

  
  const last7Days = orders.filter((o) => {
    const diff =
      (new Date() - new Date(o.createdAt)) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  const revenue7 = last7Days.reduce(
    (sum, o) => sum + (o.totalPrice || 0),
    0
  );

  
  const growth =
    totalRevenue > 0
      ? ((revenue7 / totalRevenue) * 100).toFixed(1)
      : 0;

  
  
  

  let insight = `📊 Business Overview:\n`;

  insight += `• Total Orders: ${totalOrders}\n`;
  insight += `• Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}\n`;
  insight += `• Avg Order Value: ₹${avgOrderValue.toFixed(0)}\n\n`;

  
  if (growth > 30) {
    insight += `🚀 Strong Growth: Sales are booming this week!\n`;
  } else if (growth > 10) {
    insight += `📈 Moderate Growth: Stable performance detected.\n`;
  } else {
    insight += `⚠ Low Growth: Consider marketing boost.\n`;
  }

  
  if (totalOrders < 5) {
    insight += `⚠ Low Order Volume: Need more customer acquisition.\n`;
  } else if (totalOrders > 20) {
    insight += `🔥 High Activity: Good customer engagement.\n`;
  }

  
  if (avgOrderValue > 1000) {
    insight += `💰 High-value customers detected.\n`;
  } else {
    insight += `📉 Low order value: Upselling recommended.\n`;
  }

  return insight;
};